import type { Temporal } from "temporal-polyfill";
import { MAX_INTERVALS } from "./defaults";
import { generator } from "./generator";
import type { BaseEntry, GeneratedEntry, Modification } from "./types";

export { generator } from "./generator";
export * from "./type-guards";
export * from "./types";
export {
	addByPeriod,
	createDate,
	paymentDate,
} from "./utils";

/**
 * Creates a recurrentry instance with pre-configured weekend days and holidays.
 *
 * @param weekendDays - Array of numbers representing weekend days (1-7, where 7 is Sunday)
 * @param holidays - Array of dates to be considered as holidays
 * @returns An object with a generate method
 */
export function recurrentry(
	weekendDays: number[] = [],
	holidays: Temporal.PlainDate[] = [],
) {
	return {
		/**
		 * Generates recurring entries using the pre-configured weekend days and holidays.
		 *
		 * @param options - The generation options
		 * @param options.data - Array of base entries to generate recurrences from
		 * @param options.modifications - Array of modifications to apply to the generated entries
		 * @param options.maxIntervals - Maximum number of intervals to generate for each period type
		 * @param options.range - Optional date range to filter generated entries
		 * @returns Array of generated entries
		 */
		generate<T extends BaseEntry>({
			data,
			modifications = [],
			maxIntervals = MAX_INTERVALS,
			range,
		}: {
			data: T[];
			modifications?: Array<Modification<T>>;
			maxIntervals?: typeof MAX_INTERVALS;
			range?: {
				start?: Temporal.PlainDate;
				end?: Temporal.PlainDate;
			};
		}): Array<GeneratedEntry<T>> {
			return generator({
				data,
				modifications,
				maxIntervals,
				holidays,
				weekendDays,
				range,
			});
		},
	};
}
