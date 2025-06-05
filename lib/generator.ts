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

	// for efficient lookup
	const modificationsMap = new Map<string, Modification<T>>();
	for (const mod of modifications) {
		modificationsMap.set(`${mod.itemId}:${mod.index}`, mod);
	}

	const isInRange = (date: Temporal.PlainDate): boolean => {
		if (!range) return true;

		const afterStart =
			!range.start || Temporal.PlainDate.compare(date, range.start) >= 0;
		const beforeEnd =
			!range.end || Temporal.PlainDate.compare(date, range.end) <= 0;

		return afterStart && beforeEnd;
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
			// For single payments, we don't need to apply modifications, they are as is
			const newEntry = { ...entry };
			result.push({
				$: newEntry,
				index: 1,
				actualDate: entry.date,
				paymentDate: entry.date,
			});

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

		// Generate occurrences
		for (let i = 0; i < maxInterval; i++) {
			const baseDate = addByPeriod(start, i * every, period);

			// Special handling for weekly period when no 'each' is specified
			if (period === "week" && (!each || each.length === 0)) {
				// For simple weekly cycles, calculate the date by adding weeks
				let cycleDate = addByPeriod(start, i * every * 7, "none");

				// Apply date adjustment if exists
				if (applyToRestPayload && dateAdjustment) {
					cycleDate = cycleDate.add(dateAdjustment);
				}

				const nextDate = paymentDate(
					cycleDate,
					gracePeriod,
					holidays,
					weekendDays,
					workdaysOnly,
				);

				index++;
				const newEntryDollar = {
					...entry,
					...(applyToRestPayload || {}),
				};

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

				if (isInRange(tempGeneratedEntry.actualDate)) {
					result.push(tempGeneratedEntry);
				}

				continue;
			}

			// Handle 'each' option for different period types
			if (each?.length) {
				const occurrenceDates: Temporal.PlainDate[] = [];

				for (const target of each) {
					let targetDate: Temporal.PlainDate | null = baseDate;

					switch (period) {
						case "week": {
							// For weekly payments, each represents days of the week (1-7)
							// Calculate the target day within the current week
							if (target < 1 || target > 7) {
								// Skip invalid day of week
								continue;
							}

							// Add the offset for this specific period ('every' weeks)
							const weekOffset = i * every * 7;
							const periodStart = start.add({ days: weekOffset });
							const periodStartOfWeek = periodStart.with({
								day: periodStart.day - periodStart.dayOfWeek + 1,
							});

							// Add days to get to the target day within this period
							targetDate = periodStartOfWeek.add({ days: target - 1 });

							// Apply date adjustment if exists
							if (applyToRestPayload && dateAdjustment) {
								targetDate = targetDate.add(dateAdjustment);
							}
							break;
						}
						case "month": {
							// Adjust to the target day within the current month
							targetDate = targetDate.with({ day: target });
							break;
						}
						case "year": {
							// Adjust to the target month within the current year
							targetDate = targetDate.with({ month: target });

							// Apply date adjustment if exists
							if (applyToRestPayload && dateAdjustment) {
								// For yearly entries, we need to maintain the modified month and day
								if (dateAdjustment.months !== undefined) {
									targetDate = targetDate.with({
										month: target + dateAdjustment.months,
									});
								}
								if (dateAdjustment.days !== undefined) {
									targetDate = targetDate.with({
										day: targetDate.day + dateAdjustment.days,
									});
								}
							}

							// Apply ordinal specification for yearly payments if provided
							if (on && targetDate) {
								targetDate = getOrdinalDate(targetDate, on, weekendDays);
							}
							break;
						}
					}

					// Only add the occurrence if the date is valid
					if (targetDate) {
						occurrenceDates.push(targetDate);
					}
				}

				// Sort dates chronologically
				occurrenceDates.sort((a, b) => Temporal.PlainDate.compare(a, b));

				// Process each occurrence date
				for (const occurrenceDate of occurrenceDates) {
					const nextDate = paymentDate(
						occurrenceDate,
						gracePeriod,
						holidays,
						weekendDays,
						workdaysOnly,
					);

					index++;
					const newEntryDollar = {
						...entry,
						...(applyToRestPayload || {}),
					};

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
					gracePeriod,
					holidays,
					weekendDays,
					workdaysOnly,
				);

				index++;
				const newEntryDollar = {
					...entry,
					...(applyToRestPayload || {}),
				};

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
			}

			// If a deletion modification flagged the rest to be removed, exit early.
			if (deleteRest) {
				break;
			}
		}
	}

	// Apply range filtering after all entries are generated
	return range ? result.filter((entry) => isInRange(entry.actualDate)) : result;
}
