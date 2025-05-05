import { describe, expect, it } from "vitest";
import { createDate, generator } from "../lib";
import { PERIOD } from "../lib/types";

describe("Weekly payments", () => {
	it("should generate weekly payments correctly", () => {
		const data = [
			{
				id: 1,
				amount: "100.00",
				type: "income",
				date: createDate("2024-01-01"),
				config: {
					period: PERIOD.WEEK,
					start: createDate("2024-01-01"),
					interval: 5,
					options: {
						every: 1,
						workdaysOnly: undefined,
					},
				},
			},
		];

		const result = generator({
			data,
			modifications: [],
		});

		expect(result.length).toBe(5);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[1].actualDate.toString()).toBe("2024-01-08");
		expect(result[2].actualDate.toString()).toBe("2024-01-15");
		expect(result[3].actualDate.toString()).toBe("2024-01-22");
		expect(result[4].actualDate.toString()).toBe("2024-01-29");
	});

	it("should handle weekly payments with specific days", () => {
		const data = [
			{
				id: 2,
				amount: "250.00",
				type: "expense",
				date: createDate("2024-01-01"), // Monday
				config: {
					period: PERIOD.WEEK,
					start: createDate("2024-01-01"),
					interval: 4,
					options: {
						every: 2, // Every 2 weeks
						each: [1, 5], // Monday and Friday
						workdaysOnly: undefined,
					},
				},
			},
		];

		const result = generator({
			data,
			modifications: [],
		});

		expect(result.length).toBe(8);
		// First week: Monday (1st) and Friday (5th)
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[1].actualDate.toString()).toBe("2024-01-05");
		// Second week: skipped (every: 2)
		// Third week: Monday (15th) and Friday (19th)
		expect(result[2].actualDate.toString()).toBe("2024-01-15");
		expect(result[3].actualDate.toString()).toBe("2024-01-19");
		// Fourth week: skipped (every: 2)
		// Fifth week: Monday (29th) and Friday (2nd Feb)
		expect(result[4].actualDate.toString()).toBe("2024-01-29");
		expect(result[5].actualDate.toString()).toBe("2024-02-02");
		// Sixth week: skipped (every: 2)
		// Seventh week: Monday (12th Feb) and Friday (16th Feb)
		expect(result[6].actualDate.toString()).toBe("2024-02-12");
		expect(result[7].actualDate.toString()).toBe("2024-02-16");
	});

	it("should handle workdays-only option for weekly payments", () => {
		const data = [
			{
				id: 3,
				amount: "300.00",
				type: "expense",
				date: createDate("2024-01-01"),
				config: {
					period: PERIOD.WEEK,
					start: createDate("2024-01-01"),
					interval: 3,
					options: {
						every: 1,
						workdaysOnly: "next" as const,
					},
				},
			},
		];

		const result = generator({
			data,
			modifications: [],
			weekendDays: [6, 7], // Saturday and Sunday
			holidays: [createDate("2024-01-15")], // Make Jan 15 a holiday
		});

		expect(result.length).toBe(3);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-01");
		expect(result[1].actualDate.toString()).toBe("2024-01-08");
		expect(result[1].paymentDate.toString()).toBe("2024-01-08");
		expect(result[2].actualDate.toString()).toBe("2024-01-15");
		expect(result[2].paymentDate.toString()).toBe("2024-01-16"); // Jan 15 is a holiday, so payment date is the next working day
	});

	it("should handle grace period for weekly payments", () => {
		const data = [
			{
				id: 4,
				amount: "400.00",
				type: "expense",
				date: createDate("2024-01-01"),
				config: {
					period: PERIOD.WEEK,
					start: createDate("2024-01-01"),
					interval: 3,
					options: {
						every: 1,
						gracePeriod: 2, // 2 days grace period
						workdaysOnly: undefined,
					},
				},
			},
		];

		const result = generator({
			data,
			modifications: [],
		});

		expect(result.length).toBe(3);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-03"); // 2 days grace period
		expect(result[1].actualDate.toString()).toBe("2024-01-08");
		expect(result[1].paymentDate.toString()).toBe("2024-01-10"); // 2 days grace period
		expect(result[2].actualDate.toString()).toBe("2024-01-15");
		expect(result[2].paymentDate.toString()).toBe("2024-01-17"); // 2 days grace period
	});

	it("should handle grace period and workdays-only together", () => {
		const data = [
			{
				id: 5,
				amount: "500.00",
				type: "expense",
				date: createDate("2024-01-01"),
				config: {
					period: PERIOD.WEEK,
					start: createDate("2024-01-01"),
					interval: 4,
					options: {
						every: 1,
						gracePeriod: 3, // 3 days grace period
						workdaysOnly: "next" as const, // Skip weekends and holidays
					},
				},
			},
		];

		// Set up a scenario where grace period would put payment on weekend/holidays
		// Jan 1 + 3 days grace = Jan 4 (Thursday)
		// Jan 8 + 3 days grace = Jan 11 (Thursday)
		// Jan 15 + 3 days grace = Jan 18 (Thursday)
		// Jan 22 + 3 days grace = Jan 25 (Thursday), but we'll make it a holiday
		const result = generator({
			data,
			modifications: [],
			weekendDays: [6, 7], // Saturday and Sunday
			holidays: [
				createDate("2024-01-18"), // Make Jan 18 a holiday
				createDate("2024-01-25"), // Make Jan 25 a holiday
			],
		});

		expect(result.length).toBe(4);

		// First payment: Jan 1 + 3 days grace = Jan 4 (Thursday) - regular workday
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-04");

		// Second payment: Jan 8 + 3 days grace = Jan 11 (Thursday) - regular workday
		expect(result[1].actualDate.toString()).toBe("2024-01-08");
		expect(result[1].paymentDate.toString()).toBe("2024-01-11");

		// Third payment: Jan 15 + 3 days grace = Jan 18 (Thursday) - holiday
		// Should be moved to next workday (Jan 19 is Friday but that's a workday)
		expect(result[2].actualDate.toString()).toBe("2024-01-15");
		expect(result[2].paymentDate.toString()).toBe("2024-01-19");

		// Fourth payment: Jan 22 + 3 days grace = Jan 25 (Thursday) - holiday
		// Should be moved to next workday (Jan 26 is Friday but that's a workday)
		expect(result[3].actualDate.toString()).toBe("2024-01-22");
		expect(result[3].paymentDate.toString()).toBe("2024-01-26");
	});
});
