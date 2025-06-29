import { Temporal } from "temporal-polyfill";
import { MAX_INTERVALS } from "./defaults";
import type { BaseEntry, GeneratedEntry, Modification, Period } from "./types";
import { addByPeriod, getOrdinalDate, paymentDate } from "./utils";

type DateAdjustment = {
	days?: number;
	months?: number;
	years?: number;
};

// Simplified helper function to calculate date adjustment
export function calculateDateAdjustment(
	originalDate: Temporal.PlainDate,
	modifiedDate: Temporal.PlainDate,
	period: Period,
): DateAdjustment {
	switch (period) {
		case "year": {
			// For yearly entries, we need to:
			// 1. Calculate the relative position within the year (month and day)
			// 2. Ignore the year difference as it's handled by the base interval
			return {
				days: modifiedDate.day - originalDate.day,
				months: modifiedDate.month - originalDate.month,
			};
		}
		case "month": {
			// For monthly entries, only adjust the day position
			return { days: modifiedDate.day - originalDate.day };
		}
		case "week": {
			// For weekly entries, calculate the day-of-week difference
			const origDayOfWeek = originalDate.dayOfWeek;
			const modDayOfWeek = modifiedDate.dayOfWeek;
			const dayDiff = modDayOfWeek - origDayOfWeek;
			return { days: dayDiff };
		}
		default:
			return {}; // No adjustment for single payments
	}
}

// Helper function to calculate the maximum number of intervals
export function calculateMaxInterval(
	interval: number,
	period: Period,
	maxIntervalsDefaults: typeof MAX_INTERVALS,
): number {
	if (period === "none") return 1; // Single payments have only one "interval"

	return interval === 0
		? maxIntervalsDefaults[period]
		: Math.min(interval, maxIntervalsDefaults[period]);
}

/**
 * Generates recurring entries based on the provided configuration and modifications.
 *
 * @param options - The configuration options for generating entries
 * @param options.data - Array of base entries to generate recurrences from
 * @param options.modifications - Array of modifications to apply to the generated entries
 * @param options.maxIntervals - Maximum number of intervals to generate for each period type (defaults to MAX_INTERVALS)
 * @param options.holidays - Array of dates to be considered as holidays
 * @param options.weekendDays - Array of numbers representing weekend days (6-7, where 7 is Sunday)
 * @param options.range - Optional date range to filter generated entries
 * @param options.range.start - Start date of the range (inclusive)
 * @param options.range.end - End date of the range (inclusive)
 *
 * @returns Array of generated entries with their occurrence information including actual and payment dates
 *
 * @remarks
 * - Handles both single payments and recurring entries
 * - Supports different period types: monthly, yearly
 * - Applies modifications like deletions and edits to entries
 * - Handles workdays-only option and grace periods
 * - Supports multiple occurrences within a period using the 'each' option
 * - Supports specific day targeting using the 'on' option
 * - Automatically adjusts dates for holidays and weekends based on configuration
 */
export function generator<T extends BaseEntry>({
	data,
	modifications,
	maxIntervals = MAX_INTERVALS,
	holidays = [],
	weekendDays = [],
	range,
}: {
	data: T[];
	modifications: Array<Modification<T>>;
	maxIntervals?: typeof MAX_INTERVALS;
	holidays?: Temporal.PlainDate[];
	weekendDays?: number[];
	range?: {
		start?: Temporal.PlainDate;
		end?: Temporal.PlainDate;
	};
}): Array<GeneratedEntry<T>> {
	const result: Array<GeneratedEntry<T>> = [];

	const holidaySet = new Set(holidays.map((h) => h.toString()));

	const modificationsMap = new Map<string, Modification<T>>();
	for (const mod of modifications) {
		modificationsMap.set(`${mod.itemId}:${mod.index}`, mod);
	}

	const hasRange = !!range;
	const rangeStart = range?.start;
	const rangeEnd = range?.end;

	const isInRange = (date: Temporal.PlainDate): boolean => {
		if (!hasRange) return true;

		if (rangeStart && Temporal.PlainDate.compare(date, rangeStart) < 0)
			return false;
		if (rangeEnd && Temporal.PlainDate.compare(date, rangeEnd) > 0)
			return false;

		return true;
	};

	const isAfterRange = (date: Temporal.PlainDate): boolean => {
		return !!rangeEnd && Temporal.PlainDate.compare(date, rangeEnd) > 0;
	};

	// Helper function to apply modifications to an occurrence
	function applyModifications<T extends BaseEntry>(
		entry: T,
		index: number,
		modificationsMap: Map<string, Modification<T>>,
		lastEntry: GeneratedEntry<T>,
	): {
		shouldDelete: boolean;
		deleteFuture: boolean;
		applyToRestPayload: Partial<T> | null;
		dateAdjustment?: DateAdjustment;
	} {
		const modKey = `${entry.id}:${index}`;
		const mod = modificationsMap.get(modKey);

		if (mod) {
			if (mod.payload.deleted) {
				return {
					shouldDelete: true,
					deleteFuture: !!mod.restPayload?.deleted,
					applyToRestPayload: null,
				};
			}

			if (mod.payload || mod.restPayload) {
				lastEntry.$ = {
					...lastEntry.$,
					...mod.restPayload,
					...mod.payload,
				};

				// Handle date modifications
				if (mod.payload?.date) {
					const originalDate = lastEntry.actualDate;
					const modifiedDate = mod.payload.date;
					lastEntry.actualDate = modifiedDate;
					lastEntry.paymentDate = modifiedDate;

					// Calculate date adjustment for future occurrences
					if (mod.restPayload) {
						const dateAdjustment = calculateDateAdjustment(
							originalDate,
							modifiedDate,
							entry.config?.period || "none",
						);

						return {
							shouldDelete: false,
							deleteFuture: false,
							applyToRestPayload: mod.restPayload,
							dateAdjustment,
						};
					}
				}

				if (mod.restPayload) {
					return {
						shouldDelete: false,
						deleteFuture: false,
						applyToRestPayload: mod.restPayload,
					};
				}
			}
		}

		return {
			shouldDelete: false,
			deleteFuture: false,
			applyToRestPayload: null,
		};
	}

	for (const entry of data) {
		// Handle single payments
		if (!entry.config || entry.config.period === "none") {
			if (isInRange(entry.date)) {
				result.push({
					$: entry, // Avoid unnecessary object spread for single payments
					index: 1,
					actualDate: entry.date,
					paymentDate: entry.date,
				});
			}
			continue;
		}

		const { start, period, interval, options } = entry.config;
		const {
			every = 1,
			workdaysOnly = undefined,
			gracePeriod = 0,
			each,
			on,
		} = options || {};

		let applyToRestPayload: Partial<T> | null = null;
		let deleteRest = false;
		let index = 0;
		let dateAdjustment: DateAdjustment | undefined;

		const maxInterval = calculateMaxInterval(
			interval || 0,
			period,
			maxIntervals,
		);

		// Pre-allocate arrays for better performance when processing 'each' arrays
		const eachLength = each?.length || 0;
		const hasEach = eachLength > 0;

		// Generate occurrences with optimized loops
		for (let i = 0; i < maxInterval; i++) {
			if (deleteRest) break; // Early exit optimization

			const baseDate = addByPeriod(start, i * every, period);

			// Special handling for weekly period when no 'each' is specified
			if (period === "week" && !hasEach) {
				// For simple weekly cycles, calculate the date by adding weeks
				let cycleDate = addByPeriod(start, i * every * 7, "none");

				// Apply date adjustment if exists
				if (applyToRestPayload && dateAdjustment) {
					cycleDate = cycleDate.add(dateAdjustment);
				}

				const nextDate = paymentDate(
					cycleDate,
					holidaySet,
					gracePeriod,
					weekendDays,
					workdaysOnly,
				);

				index++;

				// Optimize object creation - avoid spreading when possible
				const newEntryDollar = applyToRestPayload
					? { ...entry, ...applyToRestPayload }
					: entry;

				const tempGeneratedEntry: GeneratedEntry<T> = {
					$: newEntryDollar,
					index,
					actualDate: cycleDate,
					paymentDate: nextDate,
				};

				const {
					shouldDelete,
					deleteFuture,
					applyToRestPayload: modPayload,
					dateAdjustment: newDateAdjustment,
				} = applyModifications(
					entry,
					index,
					modificationsMap,
					tempGeneratedEntry,
				);

				if (modPayload) {
					applyToRestPayload = modPayload;
				}
				if (newDateAdjustment) {
					dateAdjustment = newDateAdjustment;
				}

				deleteRest = deleteFuture;

				if (shouldDelete) {
					if (deleteFuture) break;
					continue;
				}

				// Only add to result if in range (avoid creating objects for out-of-range dates)
				if (isInRange(tempGeneratedEntry.actualDate)) {
					result.push(tempGeneratedEntry);
				}

				// Early exit if we've passed the range end - all future occurrences will also be out of range
				if (isAfterRange(tempGeneratedEntry.actualDate)) {
					break;
				}

				continue;
			}

			// Handle 'each' option for different period types
			if (hasEach && each?.length) {
				// Pre-allocate array for occurrence dates
				const occurrenceDates: Temporal.PlainDate[] = [];
				occurrenceDates.length = eachLength; // Reserve capacity
				let occurrenceCount = 0;

				for (let j = 0; j < eachLength; j++) {
					const target = each[j];
					let targetDate: Temporal.PlainDate | null = baseDate;

					switch (period) {
						case "week": {
							// For weekly payments, each represents days of the week (1-7)
							if (target < 1 || target > 7) continue; // Skip invalid day

							// Optimize week calculation
							const weekOffset = i * every * 7;
							const periodStart = start.add({ days: weekOffset });
							const periodStartOfWeek = periodStart.with({
								day: periodStart.day - periodStart.dayOfWeek + 1,
							});

							targetDate = periodStartOfWeek.add({ days: target - 1 });

							// Apply date adjustment if exists
							if (applyToRestPayload && dateAdjustment) {
								targetDate = targetDate.add(dateAdjustment);
							}
							break;
						}
						case "month": {
							// Optimize month adjustment
							try {
								targetDate = targetDate.with({ day: target });
							} catch {
								targetDate = null; // Invalid day for this month
							}
							break;
						}
						case "year": {
							// Optimize year adjustment
							try {
								targetDate = targetDate.with({ month: target });

								// Apply date adjustment if exists
								if (applyToRestPayload && dateAdjustment) {
									if (dateAdjustment.months !== undefined) {
										targetDate = targetDate.with({
											month: Math.min(
												12,
												Math.max(1, target + dateAdjustment.months),
											),
										});
									}
									if (dateAdjustment.days !== undefined) {
										const newDay = Math.min(
											targetDate.daysInMonth,
											Math.max(1, targetDate.day + dateAdjustment.days),
										);
										targetDate = targetDate.with({ day: newDay });
									}
								}

								// Apply ordinal specification for yearly payments if provided
								if (on && targetDate) {
									targetDate = getOrdinalDate(targetDate, on, weekendDays);
								}
							} catch {
								targetDate = null; // Invalid month/day combination
							}
							break;
						}
					}

					// Only add valid dates
					if (targetDate) {
						occurrenceDates[occurrenceCount++] = targetDate;
					}
				}

				// Trim array to actual size and sort
				occurrenceDates.length = occurrenceCount;
				if (occurrenceCount > 1) {
					occurrenceDates.sort((a, b) => Temporal.PlainDate.compare(a, b));
				}

				// Process each occurrence date
				for (let k = 0; k < occurrenceCount; k++) {
					const occurrenceDate = occurrenceDates[k];
					const nextDate = paymentDate(
						occurrenceDate,
						holidaySet,
						gracePeriod,
						weekendDays,
						workdaysOnly,
					);

					index++;
					const newEntryDollar = applyToRestPayload
						? { ...entry, ...applyToRestPayload }
						: entry;

					const tempGeneratedEntry: GeneratedEntry<T> = {
						$: newEntryDollar,
						index,
						actualDate: occurrenceDate,
						paymentDate: nextDate,
					};

					const {
						shouldDelete,
						deleteFuture,
						applyToRestPayload: modPayload,
						dateAdjustment: newDateAdjustment,
					} = applyModifications(
						entry,
						index,
						modificationsMap,
						tempGeneratedEntry,
					);

					if (modPayload) {
						applyToRestPayload = modPayload;
					}
					if (newDateAdjustment) {
						dateAdjustment = newDateAdjustment;
					}

					deleteRest = deleteFuture;

					if (shouldDelete) {
						if (deleteFuture) break;
						continue;
					}

					if (isInRange(tempGeneratedEntry.actualDate)) {
						result.push(tempGeneratedEntry);
					}

					// Early exit if we've passed the range end - all future occurrences will also be out of range
					if (isAfterRange(tempGeneratedEntry.actualDate)) {
						deleteRest = true;
						break;
					}
				}
			} else {
				// Handle single date per period
				let _baseDate: Temporal.PlainDate | null = baseDate;

				// Apply date adjustment if exists
				if (applyToRestPayload && dateAdjustment) {
					_baseDate = _baseDate.add(dateAdjustment);
				}

				// Apply ordinal specification if provided
				if (on) {
					_baseDate = getOrdinalDate(_baseDate, on, weekendDays);
				}

				// Skip if occurrence date is invalid
				if (!_baseDate) continue;

				const fixedNextDate = paymentDate(
					_baseDate,
					holidaySet,
					gracePeriod,
					weekendDays,
					workdaysOnly,
				);

				index++;
				const newEntryDollar = applyToRestPayload
					? { ...entry, ...applyToRestPayload }
					: entry;

				const tempGeneratedEntry: GeneratedEntry<T> = {
					$: newEntryDollar,
					index,
					actualDate: _baseDate,
					paymentDate: fixedNextDate,
				};

				const {
					shouldDelete,
					deleteFuture,
					applyToRestPayload: modPayload,
					dateAdjustment: newDateAdjustment,
				} = applyModifications(
					entry,
					index,
					modificationsMap,
					tempGeneratedEntry,
				);

				if (modPayload) {
					applyToRestPayload = modPayload;
				}
				if (newDateAdjustment) {
					dateAdjustment = newDateAdjustment;
				}

				deleteRest = deleteFuture;

				if (shouldDelete) {
					if (deleteFuture) break;
					continue;
				}

				if (isInRange(tempGeneratedEntry.actualDate)) {
					result.push(tempGeneratedEntry);
				}

				// Early exit if we've passed the range end - all future occurrences will also be out of range
				if (isAfterRange(tempGeneratedEntry.actualDate)) {
					break;
				}
			}

			if (deleteRest) break;
		}
	}

	return result;
}
