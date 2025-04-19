import { describe, expect, it } from "vitest";
import { MAX_INTERVALS } from "../lib/defaults";
import { calculateMaxInterval, generator } from "../lib/generator";
import { PERIOD, type YearlyPayment } from "../lib/types";
import { createDate } from "../lib/utils";

describe("Generator deletion modifications", () => {
	it("should handle delete future with rest flag", () => {
		const entry = {
			id: "1",
			date: createDate("2024-01-01"),
			config: {
				start: createDate("2024-01-01"),
				period: PERIOD.MONTH,
				interval: 3,
				options: {
					every: 1,
					each: [1, 15],
				},
			},
		};

		const modifications = [
			{
				itemId: "1",
				index: 2,
				payload: { deleted: true },
				restPayload: { deleted: true },
			},
		];

		const result = generator({
			data: [entry],
			modifications,
		});

		// Should only include occurrences before the deletion point
		expect(result).toHaveLength(1);
	});
});

describe("Generator yearly period cases", () => {
	it("should handle yearly payments with ordinal dates", () => {
		const entry = {
			id: "1",
			date: createDate("2024-01-01"),
			config: {
				start: createDate("2024-01-01"),
				period: PERIOD.YEAR,
				interval: 2,
				options: {
					every: 1,
					each: [6], // June
					on: "third-wednesday", // Third Wednesday
				},
			} satisfies YearlyPayment,
		};

		const result = generator({
			data: [entry],
			modifications: [],
		});

		expect(result).toHaveLength(2);
		expect(result[0].actualDate.toString()).toBe("2024-06-19"); // Third Wednesday of June 2024
		expect(result[1].actualDate.toString()).toBe("2025-06-18"); // Third Wednesday of June 2025
	});

	it("should handle invalid ordinal dates in yearly payments", () => {
		const entry = {
			id: "1",
			date: createDate("2024-01-01"),
			config: {
				start: createDate("2024-01-01"),
				period: PERIOD.YEAR,
				interval: 1,
				options: {
					every: 1,
					each: [2], // February
					on: "fifth-wednesday", // Fifth Wednesday (not exist)
				},
			} satisfies YearlyPayment,
		};

		const result = generator({
			data: [entry],
			modifications: [],
		});

		expect(result).toHaveLength(0); // No valid dates found
	});

	it("should handle yearly payments with only ordinal dates (no each)", () => {
		const entry = {
			id: "1",
			date: createDate("2024-01-01"),
			config: {
				start: createDate("2024-01-01"),
				period: PERIOD.YEAR,
				interval: 2,
				options: {
					every: 1,
					on: "first-monday", // First Monday of the year
				},
			} satisfies YearlyPayment,
		};

		const result = generator({
			data: [entry],
			modifications: [],
		});

		expect(result).toHaveLength(2);
		expect(result[0].actualDate.toString()).toBe("2024-01-01"); // First Monday of 2024
		expect(result[1].actualDate.toString()).toBe("2025-01-06"); // First Monday of 2025
	});

	it("should handle non-existent ordinal dates without each option", () => {
		const entry = {
			id: "1",
			date: createDate("2024-01-01"),
			config: {
				start: createDate("2024-01-01"),
				period: PERIOD.YEAR,
				interval: 1,
				options: {
					every: 1,
					on: "fifth-sunday", // Fifth Sunday (may not exist in some months)
				},
			} satisfies YearlyPayment,
		};

		const result = generator({
			data: [entry],
			modifications: [],
		});

		expect(result).toHaveLength(0); // No valid dates found
	});

	it("should handle yearly payments with both each and ordinal dates", () => {
		const entry = {
			id: "1",
			date: createDate("2024-01-01"),
			config: {
				start: createDate("2024-01-01"),
				period: PERIOD.YEAR,
				interval: 1,
				options: {
					every: 1,
					each: [3, 9], // March and September
					on: "first-monday", // First Monday of selected months
				},
			} satisfies YearlyPayment,
		};

		const result = generator({
			data: [entry],
			modifications: [],
		});

		expect(result).toHaveLength(2);
		expect(result[0].actualDate.toString()).toBe("2024-03-04"); // First Monday of March 2024
		expect(result[1].actualDate.toString()).toBe("2024-09-02"); // First Monday of September 2024
	});

	it("should handle yearly payments with invalid ordinal dates in specific months", () => {
		const entry = {
			id: "1",
			date: createDate("2024-01-01"),
			config: {
				start: createDate("2024-01-01"),
				period: PERIOD.YEAR,
				interval: 1,
				options: {
					every: 1,
					each: [2, 6], // February and June
					on: "fifth-thursday", // Fifth Thursday (may not exist in some months)
				},
			} satisfies YearlyPayment,
		};

		const result = generator({
			data: [entry],
			modifications: [],
		});

		expect(result).toHaveLength(1); // Only February 2024 has a fifth Thursday
		expect(result[0].actualDate.toString()).toBe("2024-02-29");
	});

	it("should handle yearly payments where ordinal date becomes invalid after month adjustment", () => {
		const entry = {
			id: "1",
			date: createDate("2024-01-01"),
			config: {
				start: createDate("2024-01-01"),
				period: PERIOD.YEAR,
				interval: 2,
				options: {
					every: 1,
					each: [2, 4], // February and April
					on: "fifth-monday", // Fifth Monday (targeting impossible dates)
				},
			} satisfies YearlyPayment,
		};

		const result = generator({
			data: [entry],
			modifications: [],
			weekendDays: [6, 7], // Saturday and Sunday as weekend days
		});

		// April 2024 has a fifth Monday
		expect(result).toHaveLength(1);
	});
});

describe("Generator modification cases", () => {
	it("should apply future modifications correctly", () => {
		const entry = {
			id: "1",
			date: createDate("2024-01-01"),
			amount: 100,
			config: {
				start: createDate("2024-01-01"),
				period: PERIOD.MONTH,
				interval: 3,
				options: {
					every: 1,
					each: [1],
				},
			},
		};

		const modifications = [
			{
				itemId: "1",
				index: 2,
				payload: { amount: 200 },
				restPayload: { amount: 200 },
			},
		];

		const result = generator({
			data: [entry],
			modifications,
		});

		expect(result).toHaveLength(3);
		expect(result[0].$.amount).toBe(100); // First occurrence unchanged
		expect(result[1].$.amount).toBe(200); // Second occurrence modified
		expect(result[2].$.amount).toBe(200); // Third occurrence also modified due to applyToFuture
	});

	it("should handle multiple deletions with continue and break scenarios", () => {
		const entry = {
			id: "1",
			date: createDate("2024-01-01"),
			config: {
				start: createDate("2024-01-01"),
				period: PERIOD.MONTH,
				interval: 4,
				options: {
					every: 1,
					each: [1, 15], // 1st and 15th of each month
				},
			},
		};

		// this will generate
		// 2024-01-01
		// 2024-01-15 - delete this
		// 2024-02-01
		// 2024-02-15 - delete this and future
		// 2024-03-01 - deleted by future
		// 2024-03-15 - deleted by future
		// 2024-04-01 - deleted by future
		// 2024-04-15 - deleted by future

		const modifications = [
			{
				itemId: "1",
				index: 2,
				payload: { deleted: true },
			},
			{
				itemId: "1",
				index: 4,
				payload: { deleted: true },
				restPayload: { deleted: true },
			},
		];

		const result = generator({
			data: [entry],
			modifications,
		});

		expect(result).toHaveLength(2);
		expect(result.map((r) => r.index)).toEqual([1, 3]); // Verify specific indices
	});
});

describe("calculateMaxInterval", () => {
	it("should return 1 for period 'none'", () => {
		expect(calculateMaxInterval(5, "none", MAX_INTERVALS)).toBe(1);
		expect(calculateMaxInterval(0, "none", MAX_INTERVALS)).toBe(1);
	});

	it("should return the default max interval when interval is 0", () => {
		expect(calculateMaxInterval(0, "week", MAX_INTERVALS)).toBe(
			MAX_INTERVALS.week,
		);
		expect(calculateMaxInterval(0, "month", MAX_INTERVALS)).toBe(
			MAX_INTERVALS.month,
		);
		expect(calculateMaxInterval(0, "year", MAX_INTERVALS)).toBe(
			MAX_INTERVALS.year,
		);
	});

	it("should return the provided interval if it's less than the default max", () => {
		// Assuming MAX_INTERVALS.week > 10, .month > 5, .year > 2 for these assertions to be meaningful
		expect(calculateMaxInterval(10, "week", MAX_INTERVALS)).toBe(10);
		expect(calculateMaxInterval(5, "month", MAX_INTERVALS)).toBe(5);
		expect(calculateMaxInterval(2, "year", MAX_INTERVALS)).toBe(2);
	});

	it("should return the default max interval if the provided interval is greater", () => {
		const highIntervalWeek = MAX_INTERVALS.week + 100;
		const highIntervalMonth = MAX_INTERVALS.month + 100;
		const highIntervalYear = MAX_INTERVALS.year + 100;

		expect(calculateMaxInterval(highIntervalWeek, "week", MAX_INTERVALS)).toBe(
			MAX_INTERVALS.week,
		);
		expect(
			calculateMaxInterval(highIntervalMonth, "month", MAX_INTERVALS),
		).toBe(MAX_INTERVALS.month);
		expect(calculateMaxInterval(highIntervalYear, "year", MAX_INTERVALS)).toBe(
			MAX_INTERVALS.year,
		);
	});

	it("should handle different MAX_INTERVALS configurations", () => {
		const customMaxIntervals = {
			week: 5,
			month: 3,
			year: 1,
		};
		// Interval = 0
		expect(calculateMaxInterval(0, "week", customMaxIntervals)).toBe(
			customMaxIntervals.week,
		);
		expect(calculateMaxInterval(0, "month", customMaxIntervals)).toBe(
			customMaxIntervals.month,
		);
		expect(calculateMaxInterval(0, "year", customMaxIntervals)).toBe(
			customMaxIntervals.year,
		);

		// Interval < default
		expect(calculateMaxInterval(2, "week", customMaxIntervals)).toBe(2);
		expect(calculateMaxInterval(1, "month", customMaxIntervals)).toBe(1);

		// Interval > default
		expect(calculateMaxInterval(10, "week", customMaxIntervals)).toBe(
			customMaxIntervals.week,
		);
		expect(calculateMaxInterval(5, "month", customMaxIntervals)).toBe(
			customMaxIntervals.month,
		);
		expect(calculateMaxInterval(2, "year", customMaxIntervals)).toBe(
			customMaxIntervals.year,
		);
	});
});

describe("Generator weekly period specific cases", () => {
	it("should apply date adjustments correctly for weekly entries without 'each'", () => {
		const entry = {
			id: "weekly-no-each",
			date: createDate("2024-07-01"), // Monday
			amount: 100,
			config: {
				start: createDate("2024-07-01"), // Starts on a Monday
				period: PERIOD.WEEK,
				interval: 4, // Generate 4 weeks
				options: {
					every: 1, // Every week
					// No 'each' specified
				},
			},
		};

		const modifications = [
			{
				itemId: "weekly-no-each",
				index: 2, // Modify the second occurrence
				payload: {
					date: createDate("2024-07-10"), // Change date from Mon July 8 to Wed July 10
				},
				restPayload: {
					// Apply this change to future occurrences as well
					amount: 200, // Include some restPayload to trigger adjustment logic
				},
			},
		];

		const result = generator({
			data: [entry],
			modifications,
		});

		// Expected dates:
		// 1. 2024-07-01 (Original Monday)
		// 2. 2024-07-10 (Modified to Wednesday) -> dateAdjustment = +2 days
		// 3. 2024-07-15 (Original Monday) + 2 days = 2024-07-17 (Wednesday)
		// 4. 2024-07-22 (Original Monday) + 2 days = 2024-07-24 (Wednesday)

		expect(result).toHaveLength(4);
		expect(result[0].actualDate.toString()).toBe("2024-07-01");
		expect(result[0].$.amount).toBe(100);

		expect(result[1].actualDate.toString()).toBe("2024-07-10"); // Modified date
		expect(result[1].$.amount).toBe(200); // Rest payload applied

		// Check subsequent dates reflect the adjustment
		expect(result[2].actualDate.toString()).toBe("2024-07-17"); // Adjusted date (Original Mon + 2 days)
		expect(result[2].$.amount).toBe(200); // Rest payload applied

		expect(result[3].actualDate.toString()).toBe("2024-07-24"); // Adjusted date (Original Mon + 2 days)
		expect(result[3].$.amount).toBe(200); // Rest payload applied
	});
});
