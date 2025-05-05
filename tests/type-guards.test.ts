import { Temporal } from "temporal-polyfill";
import {
	isMonthlyPayment,
	isSinglePayment,
	isYearlyPayment,
} from "../lib/type-guards";
import { PERIOD, type SinglePayment } from "../lib/types";

describe("TypeGuards", () => {
	const baseConfig = {
		start: Temporal.PlainDate.from("2024-01-01"),
		interval: 2,
	};

	describe("isSinglePayment", () => {
		it("should return true for valid single payment config", () => {
			const config = {
				...baseConfig,
				period: PERIOD.NONE,
				interval: 1,
			} satisfies SinglePayment;
			expect(isSinglePayment(config)).toBe(true);
		});

		it("should return false for non-single payment configs", () => {
			const config = {
				...baseConfig,
				period: PERIOD.MONTH,
				options: {
					workdaysOnly: undefined,
					every: 1,
				},
			};
			expect(isSinglePayment(config)).toBe(false);
		});
	});

	describe("isMonthlyPayment", () => {
		it("should return true for valid monthly payment config", () => {
			const config = {
				...baseConfig,
				period: PERIOD.MONTH,
				options: {
					workdaysOnly: undefined,
					every: 1,
					each: [1, 15],
				},
			};
			expect(isMonthlyPayment(config)).toBe(true);
		});

		it("should return false for non-monthly payment configs", () => {
			const config = {
				...baseConfig,
				period: PERIOD.YEAR,
				options: {
					workdaysOnly: undefined,
					every: 1,
				},
			};
			expect(isMonthlyPayment(config)).toBe(false);
		});
	});

	describe("isYearlyPayment", () => {
		it("should return true for valid yearly payment config", () => {
			const config = {
				...baseConfig,
				period: PERIOD.YEAR,
				options: {
					workdaysOnly: "next" as const,
					every: 1,
					each: [1, 6],
				},
			};
			expect(isYearlyPayment(config)).toBe(true);
		});

		it("should return false for non-yearly payment configs", () => {
			const config = {
				...baseConfig,
				period: PERIOD.MONTH,
				options: {
					workdaysOnly: undefined,
					every: 1,
				},
			};
			expect(isYearlyPayment(config)).toBe(false);
		});
	});
});
