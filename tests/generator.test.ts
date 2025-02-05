import { generator } from "../lib/generator";
import { PERIOD, type YearlyPayment } from "../lib/types";
import { createDate } from "../lib/utils";

describe("Generator weekly period edge cases", () => {
	it("should handle weekly payments with dates outside current week", () => {
		const entry = {
			id: "1",
			date: createDate("2024-01-01"),
			config: {
				start: createDate("2024-01-01"),
				period: PERIOD.WEEK,
				interval: 2,
				options: {
					every: 1,
					each: [1, 7], // Monday (1) and Sunday (7)
				},
			},
		};

		const result = generator({
			data: [entry],
			modifications: [],
		});

		// This should only include dates within their respective weeks
		expect(result).toHaveLength(2); // Only valid dates within the weeks
	});
});

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
				type: "delete" as const,
				itemId: "1",
				index: 2,
				applyToFuture: true,
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
				type: "edit" as const,
				itemId: "1",
				index: 2,
				data: { amount: 200 },
				applyToFuture: true,
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
				type: "delete" as const,
				itemId: "1",
				index: 2,
				applyToFuture: false, // This will trigger the continue case
			},
			{
				type: "delete" as const,
				itemId: "1",
				index: 4,
				applyToFuture: true, // This will trigger the break case
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
