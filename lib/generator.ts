import { Temporal } from "temporal-polyfill";
import { MAX_INTERVALS } from "./defaults";
import type {
	BaseEntry,
	GeneratedEntry,
	Modification,
	Ordinal,
	Period,
} from "./types";
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

// OPTIMIZATION: Specialized function for simple monthly payments (no 'each', no modifications, no holidays)
function generateSimpleMonthly<T extends BaseEntry>(
	entry: T,
	maxInterval: number,
	rangeStart?: Temporal.PlainDate,
	rangeEnd?: Temporal.PlainDate,
): Array<GeneratedEntry<T>> {
	const result: Array<GeneratedEntry<T>> = [];
	if (!entry.config) return result;
	const { start, options } = entry.config;
	const every = options?.every || 1;

	// Pre-compute range flags
	const hasRangeStart = !!rangeStart;
	const hasRangeEnd = !!rangeEnd;

	// Optimized loop for simple monthly case
	for (let i = 0; i < maxInterval; i++) {
		const actualDate = addByPeriod(start, i * every, "month");

		// Fast range check
		if (
			hasRangeStart &&
			rangeStart &&
			Temporal.PlainDate.compare(actualDate, rangeStart) < 0
		)
			continue;
		if (
			hasRangeEnd &&
			rangeEnd &&
			Temporal.PlainDate.compare(actualDate, rangeEnd) > 0
		)
			break;

		// Create entry directly (no modifications, holidays, or payment date adjustments)
		result.push({
			$: entry,
			index: i + 1,
			actualDate,
			paymentDate: actualDate,
		});
	}

	return result;
}

// OPTIMIZATION: Specialized function for simple weekly payments
function generateSimpleWeekly<T extends BaseEntry>(
	entry: T,
	maxInterval: number,
	rangeStart?: Temporal.PlainDate,
	rangeEnd?: Temporal.PlainDate,
): Array<GeneratedEntry<T>> {
	const result: Array<GeneratedEntry<T>> = [];
	if (!entry.config) return result;
	const { start, options } = entry.config;
	const every = options?.every || 1;

	// Pre-compute range flags
	const hasRangeStart = !!rangeStart;
	const hasRangeEnd = !!rangeEnd;

	// Optimized loop for simple weekly case
	for (let i = 0; i < maxInterval; i++) {
		const actualDate = addByPeriod(start, i * every * 7, "none");

		// Fast range check
		if (
			hasRangeStart &&
			rangeStart &&
			Temporal.PlainDate.compare(actualDate, rangeStart) < 0
		)
			continue;
		if (
			hasRangeEnd &&
			rangeEnd &&
			Temporal.PlainDate.compare(actualDate, rangeEnd) > 0
		)
			break;

		// Create entry directly
		result.push({
			$: entry,
			index: i + 1,
			actualDate,
			paymentDate: actualDate,
		});
	}

	return result;
}

// OPTIMIZATION: Specialized function for simple yearly payments (no 'each', no modifications, no holidays)
function generateSimpleYearly<T extends BaseEntry>(
	entry: T,
	maxInterval: number,
	rangeStart?: Temporal.PlainDate,
	rangeEnd?: Temporal.PlainDate,
): Array<GeneratedEntry<T>> {
	const result: Array<GeneratedEntry<T>> = [];
	if (!entry.config) return result;
	const { start, options } = entry.config;
	const every = options?.every || 1;

	// Pre-compute range flags
	const hasRangeStart = !!rangeStart;
	const hasRangeEnd = !!rangeEnd;

	// Optimized loop for simple yearly case
	for (let i = 0; i < maxInterval; i++) {
		const actualDate = addByPeriod(start, i * every, "year");

		// Fast range check
		if (
			hasRangeStart &&
			rangeStart &&
			Temporal.PlainDate.compare(actualDate, rangeStart) < 0
		)
			continue;
		if (
			hasRangeEnd &&
			rangeEnd &&
			Temporal.PlainDate.compare(actualDate, rangeEnd) > 0
		)
			break;

		// Create entry directly (no modifications, holidays, or payment date adjustments)
		result.push({
			$: entry,
			index: i + 1,
			actualDate,
			paymentDate: actualDate,
		});
	}

	return result;
}

// OPTIMIZATION: Batch process 'each' arrays more efficiently
function processBatchEach(
	each: number[],
	baseDate: Temporal.PlainDate,
	period: Period,
	on?: Ordinal,
	dateAdjustment?: DateAdjustment,
	weekendDays?: number[],
): Temporal.PlainDate[] {
	const results: Temporal.PlainDate[] = [];

	// Pre-sort targets for better processing order
	const sortedTargets =
		each.length > 1 ? each.slice().sort((a, b) => a - b) : each;

	// Batch process all targets (month and year only)
	for (const target of sortedTargets) {
		let targetDate: Temporal.PlainDate | null = baseDate;

		// Fast path for each period type
		switch (period) {
			case "month": {
				if (target < 1 || target > 31) continue;
				try {
					targetDate = baseDate.with({ day: target });
				} catch {
					targetDate = null;
				}
				break;
			}
			case "year": {
				if (target < 1 || target > 12) continue;
				try {
					targetDate = baseDate.with({ month: target });

					// Apply date adjustment batch
					if (dateAdjustment) {
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

					// Apply ordinal specification
					if (on && targetDate) {
						targetDate = getOrdinalDate(targetDate, on, weekendDays || []);
					}
				} catch {
					targetDate = null;
				}
				break;
			}
		}

		// Apply general date adjustments for non-year periods
		if (targetDate && dateAdjustment && period !== "year") {
			targetDate = targetDate.add(dateAdjustment);
		}

		if (targetDate) {
			results.push(targetDate);
		}
	}

	// Results are already sorted due to pre-sorted targets
	return results;
}

// Helper function to detect if entry qualifies for fast path
function canUseSimplePath<T extends BaseEntry>(
	entry: T,
	modifications: Array<Modification<T>>,
	holidays: Temporal.PlainDate[],
	weekendDays: number[],
): boolean {
	if (!entry.config || entry.config.period === "none") return false;

	const { options } = entry.config;

	// Must be simple case: no modifications, holidays, complex options
	return (
		modifications.length === 0 &&
		holidays.length === 0 &&
		weekendDays.length === 0 &&
		!options?.each &&
		!options?.on &&
		!options?.workdaysOnly &&
		(!options?.gracePeriod || options.gracePeriod === 0)
	);
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

	// OPTIMIZATION 1: Avoid creating empty Set if no holidays
	const holidaySet =
		holidays.length > 0
			? new Set(holidays.map((h) => h.toString()))
			: new Set<string>(); // Use empty Set instead of null

	// OPTIMIZATION 2: Skip modifications map if no modifications
	const modificationsMap =
		modifications.length > 0 ? new Map<string, Modification<T>>() : null;

	if (modificationsMap) {
		for (const mod of modifications) {
			modificationsMap.set(`${mod.itemId}:${mod.index}`, mod);
		}
	}

	// OPTIMIZATION 3: Pre-compute range flags for better branch prediction
	const hasRange = !!range;
	const rangeStart = range?.start;
	const rangeEnd = range?.end;
	const hasRangeStart = hasRange && !!rangeStart;
	const hasRangeEnd = hasRange && !!rangeEnd;

	// OPTIMIZATION 4: Inline range checks for hot path (avoid function calls)
	const isInRangeFast = (date: Temporal.PlainDate): boolean => {
		if (!hasRange) return true;
		if (
			hasRangeStart &&
			rangeStart &&
			Temporal.PlainDate.compare(date, rangeStart) < 0
		)
			return false;
		if (
			hasRangeEnd &&
			rangeEnd &&
			Temporal.PlainDate.compare(date, rangeEnd) > 0
		)
			return false;
		return true;
	};

	const isAfterRangeFast = (date: Temporal.PlainDate): boolean => {
		return (
			hasRangeEnd && rangeEnd && Temporal.PlainDate.compare(date, rangeEnd) > 0
		);
	};

	// Helper function to apply modifications to an occurrence
	function applyModifications<T extends BaseEntry>(
		entry: T,
		index: number,
		lastEntry: GeneratedEntry<T>,
	): {
		shouldDelete: boolean;
		deleteFuture: boolean;
		applyToRestPayload: Partial<T> | null;
		dateAdjustment?: DateAdjustment;
	} {
		// OPTIMIZATION 5: Early return if no modifications to process
		if (!modificationsMap) {
			return {
				shouldDelete: false,
				deleteFuture: false,
				applyToRestPayload: null,
			};
		}

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
							applyToRestPayload: mod.restPayload as Partial<T>,
							dateAdjustment,
						};
					}
				}

				if (mod.restPayload) {
					return {
						shouldDelete: false,
						deleteFuture: false,
						applyToRestPayload: mod.restPayload as Partial<T>,
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
			if (isInRangeFast(entry.date)) {
				result.push({
					$: entry, // Avoid unnecessary object spread for single payments
					index: 1,
					actualDate: entry.date,
					paymentDate: entry.date,
				});
			}
			continue;
		}

		// OPTIMIZATION: Use specialized fast path for simple cases
		if (canUseSimplePath(entry, modifications, holidays, weekendDays)) {
			const { period } = entry.config;
			const maxInterval = calculateMaxInterval(
				entry.config.interval || 0,
				period,
				maxIntervals,
			);

			let fastPathResult: Array<GeneratedEntry<T>> = [];

			if (period === "month") {
				fastPathResult = generateSimpleMonthly(
					entry,
					maxInterval,
					rangeStart,
					rangeEnd,
				);
			} else if (period === "week") {
				fastPathResult = generateSimpleWeekly(
					entry,
					maxInterval,
					rangeStart,
					rangeEnd,
				);
			} else if (period === "year") {
				fastPathResult = generateSimpleYearly(
					entry,
					maxInterval,
					rangeStart,
					rangeEnd,
				);
			}

			if (fastPathResult.length > 0) {
				result.push(...fastPathResult);
				continue; // Skip complex processing
			}
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
				} = applyModifications(entry, index, tempGeneratedEntry);

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
				if (isInRangeFast(tempGeneratedEntry.actualDate)) {
					result.push(tempGeneratedEntry);
				}

				// Early exit if we've passed the range end - all future occurrences will also be out of range
				if (isAfterRangeFast(tempGeneratedEntry.actualDate)) {
					break;
				}

				continue;
			}

			// Handle 'each' option for different period types
			if (hasEach && each?.length) {
				// For weekly processing, use original approach since batch processing is complex
				if (period === "week") {
					// Original weekly 'each' processing logic
					const sortedTargets =
						each.length > 1 ? each.slice().sort((a, b) => a - b) : each;
					const occurrenceDates: Temporal.PlainDate[] = [];

					for (const target of sortedTargets) {
						if (target < 1 || target > 7) continue; // Skip invalid day

						// Calculate week offset properly
						const weekOffset = i * every * 7;
						const periodStart = start.add({ days: weekOffset });
						const periodStartOfWeek = periodStart.with({
							day: periodStart.day - periodStart.dayOfWeek + 1,
						});

						let targetDate = periodStartOfWeek.add({ days: target - 1 });

						// Apply date adjustment if exists
						if (applyToRestPayload && dateAdjustment) {
							targetDate = targetDate.add(dateAdjustment);
						}

						occurrenceDates.push(targetDate);
					}

					// Process each occurrence date
					for (const occurrenceDate of occurrenceDates) {
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
						} = applyModifications(entry, index, tempGeneratedEntry);

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

						if (isInRangeFast(tempGeneratedEntry.actualDate)) {
							result.push(tempGeneratedEntry);
						}

						// Early exit if we've passed the range end
						if (isAfterRangeFast(tempGeneratedEntry.actualDate)) {
							deleteRest = true;
							break;
						}
					}
				} else {
					// OPTIMIZATION: Use batch processing for month/year 'each' arrays
					const occurrenceDates = processBatchEach(
						each,
						baseDate,
						period,
						on,
						dateAdjustment,
						weekendDays,
					);

					// Process each occurrence date
					for (let k = 0; k < occurrenceDates.length; k++) {
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
						} = applyModifications(entry, index, tempGeneratedEntry);

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

						if (isInRangeFast(tempGeneratedEntry.actualDate)) {
							result.push(tempGeneratedEntry);
						}

						// Early exit if we've passed the range end - all future occurrences will also be out of range
						if (isAfterRangeFast(tempGeneratedEntry.actualDate)) {
							deleteRest = true;
							break;
						}
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
					_baseDate = getOrdinalDate(_baseDate, on, weekendDays || []);
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
				} = applyModifications(entry, index, tempGeneratedEntry);

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

				if (isInRangeFast(tempGeneratedEntry.actualDate)) {
					result.push(tempGeneratedEntry);
				}

				// Early exit if we've passed the range end - all future occurrences will also be out of range
				if (isAfterRangeFast(tempGeneratedEntry.actualDate)) {
					break;
				}
			}

			if (deleteRest) break;
		}
	}

	return result;
}
