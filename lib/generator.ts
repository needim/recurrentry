import { Temporal } from "temporal-polyfill";
import { MAX_INTERVALS } from "./defaults";
import type { BaseEntry, GeneratedEntry, Modification } from "./types";
import { addByPeriod, getOrdinalDate, paymentDate } from "./utils";

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

  const isInRange = (date: Temporal.PlainDate): boolean => {
    if (!range) return true;

    const afterStart =
      !range.start || Temporal.PlainDate.compare(date, range.start) >= 0;
    const beforeEnd =
      !range.end || Temporal.PlainDate.compare(date, range.end) <= 0;

    return afterStart && beforeEnd;
  };

  // Updated helper function to apply modifications to an occurrence entry
  function applyModifications<T extends BaseEntry>(
    entry: T,
    index: number,
    modifications: Array<Modification<T>>,
    lastEntry: GeneratedEntry<T>
  ): {
    shouldDelete: boolean;
    deleteFuture: boolean;
    applyToRestData: Partial<T> | null;
    dateOverride?: Temporal.PlainDate;
  } {
    for (const mod of modifications) {
      if (mod.itemId === entry.id && mod.index === index) {
        if (mod.type === "delete") {
          return {
            shouldDelete: true,
            deleteFuture: !!mod.applyToFuture,
            applyToRestData: null,
          };
        }
        if (mod.type === "edit") {
          lastEntry.$ = { ...lastEntry.$, ...mod.data };
          if (mod.applyToFuture) {
            return {
              shouldDelete: false,
              deleteFuture: false,
              applyToRestData: mod.data,
            };
          }
          if (mod.data.date) {
            lastEntry.actualDate = mod.data.date;
            lastEntry.paymentDate = mod.data.date;
            if (mod.applyToFuture) {
              return {
                shouldDelete: false,
                deleteFuture: false,
                applyToRestData: null,
                dateOverride: mod.data.date,
              };
            }
          }
        }
      }
    }
    return { shouldDelete: false, deleteFuture: false, applyToRestData: null };
  }

  for (const entry of data) {
    // Handle single payments
    if (!entry.config || entry.config.period === "none") {
      // Skip if payment date is out of range
      if (!isInRange(entry.date)) continue;

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
      workdaysOnly = false,
      gracePeriod = 0,
      each,
      on,
    } = options;

    let applyToRestData: Partial<T> | null = null;
    let deleteRest = false;
    let index = 0;

    const maxInterval = Math.min(interval, maxIntervals[period]);

    // Generate occurrences
    for (let i = 0; i < maxInterval; i++) {
      const baseDate = addByPeriod(start, i * every, period);

      // Special handling for weekly period when no 'each' is specified
      if (period === "week" && (!each || each.length === 0)) {
        // For simple weekly cycles, calculate the date by adding weeks
        const cycleDate = addByPeriod(start, i * every * 7, "none");

        // Skip if occurrence date is invalid or out of range
        if (!isInRange(cycleDate)) continue;

        const nextDate = paymentDate(
          cycleDate,
          gracePeriod,
          holidays,
          weekendDays,
          workdaysOnly
        );

        index++;
        const newEntry = {
          ...entry,
          ...(applyToRestData || {}),
        };

        result.push({
          $: newEntry,
          index,
          actualDate: cycleDate,
          paymentDate: nextDate,
        });

        const lastEntry = result[result.length - 1];
        const {
          shouldDelete,
          deleteFuture,
          applyToRestData: modData,
        } = applyModifications(entry, index, modifications, lastEntry);
        deleteRest = deleteFuture;

        if (shouldDelete) {
          result.pop();
          if (deleteFuture) break;
          continue;
        }

        if (modData) {
          applyToRestData = modData;
        }

        continue;
      }

      // Handle 'each' option for different period types
      if (each?.length) {
        const occurrenceDates: Temporal.PlainDate[] = [];

        for (const target of each) {
          let targetDate = baseDate;

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
            workdaysOnly
          );

          // Skip if occurrence date is out of range
          if (!isInRange(occurrenceDate)) continue;

          index++;
          const newEntry = {
            ...entry,
            ...(applyToRestData || {}),
          };

          result.push({
            $: newEntry,
            index,
            actualDate: occurrenceDate,
            paymentDate: nextDate,
          });
          const lastEntry = result[result.length - 1];
          const {
            shouldDelete,
            deleteFuture,
            applyToRestData: modData,
          } = applyModifications(entry, index, modifications, lastEntry);
          deleteRest = deleteFuture;
          if (shouldDelete) {
            result.pop();
            if (deleteFuture) break;
            continue;
          }
          if (modData) {
            applyToRestData = modData;
          }
        }
      } else {
        // Handle single date per period
        let _baseDate = baseDate;

        // Apply ordinal specification if provided
        if (on) {
          _baseDate = getOrdinalDate(_baseDate, on, weekendDays);
        }

        // Skip if occurrence date is invalid or out of range
        if (!_baseDate || !isInRange(_baseDate)) continue;

        const fixedNextDate = paymentDate(
          _baseDate,
          gracePeriod,
          holidays,
          weekendDays,
          workdaysOnly
        );

        index++;
        const newEntry = {
          ...entry,
          ...(applyToRestData || {}),
        };

        result.push({
          $: newEntry,
          index,
          actualDate: _baseDate,
          paymentDate: fixedNextDate,
        });
        const lastEntry = result[result.length - 1];
        const {
          shouldDelete,
          deleteFuture,
          applyToRestData: modData,
        } = applyModifications(entry, index, modifications, lastEntry);
        deleteRest = deleteFuture;

        if (shouldDelete) {
          result.pop();
          if (deleteFuture) break;
          continue; // Added to immediately skip deleted occurrence
        }

        if (modData) {
          applyToRestData = modData;
        }
      }

      // If a deletion modification flagged the rest to be removed, exit early.
      if (deleteRest) {
        break;
      }
    }
  }

  return result;
}
