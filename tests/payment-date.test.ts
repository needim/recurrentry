import { calculateDateAdjustment } from "../lib/generator";
import { createDate, paymentDate } from "../lib/utils";

describe("paymentDate()", () => {
	const holidays = [
		createDate("2025-01-01"), // New Year's Day
		createDate("2025-12-25"), // Christmas
	];

	describe("basic date handling", () => {
		it("should return the same date when no adjustments needed", () => {
			const result = paymentDate(
				createDate("2025-01-15"),
				0,
				[],
				[6, 7],
				false,
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
				5,
				[],
				[6, 7],
				false,
			);
			expect(result.toString()).toBe("2025-01-20");
		});
	});

	describe("overflow", () => {
		it("should handle overflow to next month", () => {
			const result = paymentDate(
				createDate("2025-01-30"),
				2,
				[],
				[6, 7],
				false,
			);
			expect(result.toString()).toBe("2025-02-01");
		});

		it("should handle overflow to next year", () => {
			const result = paymentDate(
				createDate("2025-12-30"),
				2,
				[],
				[6, 7],
				false,
			);
			expect(result.toString()).toBe("2026-01-01");
		});
	});

	describe("workdays only handling", () => {
		it("should move Saturday to next Monday", () => {
			const result = paymentDate(createDate("2025-01-25"), 0, [], [6, 7], true);
			expect(result.toString()).toBe("2025-01-27"); // Monday
		});

		it("should move Sunday to next Monday", () => {
			const result = paymentDate(createDate("2025-01-26"), 0, [], [6, 7], true);
			expect(result.toString()).toBe("2025-01-27"); // Monday
		});
	});

	describe("holiday handling", () => {
		it("should skip holidays when workdaysOnly is true", () => {
			const result = paymentDate(
				createDate("2025-01-01"),
				0,
				holidays,
				[6, 7],
				true,
			);
			expect(result.toString()).toBe("2025-01-02");
		});
	});

	describe("combined scenarios", () => {
		it("should handle grace period ending on weekend", () => {
			const result = paymentDate(createDate("2025-01-07"), 4, [], [6, 7], true); // Grace period ends on Saturday
			expect(result.toString()).toBe("2025-01-13"); // Next Monday
		});

		it("should handle grace period ending on holiday", () => {
			const result = paymentDate(
				createDate("2025-12-20"),
				5,
				holidays,
				[6, 7],
				true,
			); // Grace period ends on Christmas
			expect(result.toString()).toBe("2025-12-26");
		});

		it("should handle multiple consecutive holidays and weekends", () => {
			const christmasHolidays = [
				createDate("2025-12-25"),
				createDate("2025-12-26"),
				createDate("2025-12-27"),
			];
			// December 24 (Tuesday) -> December 25 (Holiday) -> December 28-29 (Weekend)
			const result = paymentDate(
				createDate("2025-12-24"),
				1,
				christmasHolidays,
				[6, 7],
				true,
			);
			expect(result.toString()).toBe("2025-12-29"); // Next available Monday
		});
	});

	describe("edge cases", () => {
		it("should handle negative grace periods", () => {
			const result = paymentDate(
				createDate("2025-01-15"),
				-5,
				[],
				[6, 7],
				false,
			);
			expect(result.toString()).toBe("2025-01-15"); // Should not modify date for negative grace periods
		});

		it("should handle undefined holidays array", () => {
			const result = paymentDate(
				createDate("2025-01-15"),
				0,
				undefined,
				[6, 7],
				true,
			);
			expect(result.toString()).toBe("2025-01-15");
		});

		it("should return the same date when workdaysOnly is true but no weekend days or holidays are defined", () => {
			const result = paymentDate(createDate("2025-01-15"), 0, [], [], true);
			expect(result.toString()).toBe("2025-01-15");
		});

		it("should throw on invalid date", () => {
			expect(() => {
				// @ts-expect-error Testing invalid input
				paymentDate("invalid", 0, [], [6, 7], true);
			}).toThrow("Invalid current date provided");
		});

		it("should throw on invalid dates in holidays array", () => {
			expect(() => {
				// @ts-expect-error Testing invalid input
				paymentDate(createDate("2025-01-15"), 0, ["invalid"], [6, 7], true);
			}).toThrow("Invalid holiday date found in holidays array");
		});
	});
});
