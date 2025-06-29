import { calculateDateAdjustment } from "../lib/generator";
import { createDate, paymentDate } from "../lib/utils";

describe("paymentDate()", () => {
	const holidays = [
		createDate("2025-01-01"), // New Year's Day
		createDate("2025-12-25"), // Christmas
	];
	const holidaySet = new Set(holidays.map((h) => h.toString()));
	const emptyHolidaySet = new Set<string>();

	describe("basic date handling", () => {
		it("should return the same date when no adjustments needed", () => {
			const result = paymentDate(
				createDate("2025-01-15"),
				emptyHolidaySet,
				0,
				[6, 7],
				undefined,
			);
			expect(result.toString()).toBe("2025-01-15");
		});

		it("calculateDateAdjustment should return empty object for single payment", () => {
			const result = calculateDateAdjustment(
				createDate("2025-01-15"),
				createDate("2025-01-15"),
				"none",
			);
			expect(result).toEqual({});
		});

		it("should add grace period correctly", () => {
			const result = paymentDate(
				createDate("2025-01-15"),
				emptyHolidaySet,
				5,
				[6, 7],
				undefined,
			);
			expect(result.toString()).toBe("2025-01-20");
		});
	});

	describe("overflow", () => {
		it("should handle overflow to next month", () => {
			const result = paymentDate(
				createDate("2025-01-30"),
				emptyHolidaySet,
				2,
				[6, 7],
				undefined,
			);
			expect(result.toString()).toBe("2025-02-01");
		});

		it("should handle overflow to next year", () => {
			const result = paymentDate(
				createDate("2025-12-30"),
				emptyHolidaySet,
				2,
				[6, 7],
				undefined,
			);
			expect(result.toString()).toBe("2026-01-01");
		});
	});

	describe("workdays only handling", () => {
		it("should move Saturday to next Monday", () => {
			const result = paymentDate(
				createDate("2025-01-25"),
				emptyHolidaySet,
				0,
				[6, 7],
				"next",
			);
			expect(result.toString()).toBe("2025-01-27"); // Monday
		});

		it("should move Sunday to next Monday", () => {
			const result = paymentDate(
				createDate("2025-01-26"),
				emptyHolidaySet,
				0,
				[6, 7],
				"next",
			);
			expect(result.toString()).toBe("2025-01-27"); // Monday
		});

		it("should pick previous business day if workdaysOnly is previous", () => {
			const result = paymentDate(
				createDate("2025-05-31"),
				emptyHolidaySet,
				0,
				[6, 7],
				"previous",
			);
			expect(result.toString()).toBe("2025-05-30");
		});
	});

	describe("holiday handling", () => {
		it("should skip holidays when workdaysOnly is next", () => {
			const result = paymentDate(
				createDate("2025-01-01"),
				holidaySet,
				0,
				[6, 7],
				"next",
			);
			expect(result.toString()).toBe("2025-01-02");
		});
	});

	describe("combined scenarios", () => {
		it("should handle grace period ending on weekend", () => {
			const result = paymentDate(
				createDate("2025-01-07"),
				emptyHolidaySet,
				4,
				[6, 7],
				"next",
			); // Grace period ends on Saturday
			expect(result.toString()).toBe("2025-01-13"); // Next Monday
		});

		it("should handle grace period ending on holiday", () => {
			const result = paymentDate(
				createDate("2025-12-20"),
				holidaySet,
				5,
				[6, 7],
				"next",
			); // Grace period ends on Christmas
			expect(result.toString()).toBe("2025-12-26");
		});

		it("should handle multiple consecutive holidays and weekends", () => {
			const christmasHolidays = [
				createDate("2025-12-25"),
				createDate("2025-12-26"),
				createDate("2025-12-27"),
			];
			const christmasHolidaySet = new Set(
				christmasHolidays.map((h) => h.toString()),
			);
			// December 24 (Tuesday) -> December 25 (Holiday) -> December 28-29 (Weekend)
			const result = paymentDate(
				createDate("2025-12-24"),
				christmasHolidaySet,
				1,
				[6, 7],
				"next",
			);
			expect(result.toString()).toBe("2025-12-29"); // Next available Monday
		});
	});

	describe("edge cases", () => {
		it("should handle negative grace periods", () => {
			const result = paymentDate(
				createDate("2025-01-15"),
				emptyHolidaySet,
				-5,
				[6, 7],
				"next",
			);
			expect(result.toString()).toBe("2025-01-15"); // Negative grace periods are ignored, date unchanged
		});

		it("should handle empty holiday set", () => {
			const result = paymentDate(
				createDate("2025-01-15"),
				emptyHolidaySet,
				0,
				[6, 7],
				"next",
			);
			expect(result.toString()).toBe("2025-01-15");
		});

		it("should return the same date when workdaysOnly is next but no weekend days or holidays are defined", () => {
			const result = paymentDate(
				createDate("2025-01-15"),
				emptyHolidaySet,
				0,
				[],
				"next",
			);
			expect(result.toString()).toBe("2025-01-15");
		});

		it("should throw on invalid date", () => {
			expect(() => {
				// @ts-expect-error Testing invalid input
				paymentDate("invalid", emptyHolidaySet, 0, [6, 7], "next");
			}).toThrow("Invalid current date provided");
		});

		it("should handle invalid holiday set gracefully", () => {
			// With Set-based approach, invalid holidays would be caught at Set creation time
			// This test verifies the function works with a proper Set
			const validSet = new Set(["2025-01-01", "invalid-date-string"]);
			const result = paymentDate(
				createDate("2025-01-15"),
				validSet,
				0,
				[6, 7],
				"next",
			);
			expect(result.toString()).toBe("2025-01-15");
		});
	});
});
