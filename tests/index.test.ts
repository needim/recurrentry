import * as index from "../lib";
import {
	addByPeriod,
	createDate,
	generator,
	isMonthlyPayment,
	isSinglePayment,
	isWeeklyPayment,
	isYearlyPayment,
	PERIOD,
	paymentDate,
	recurrentry,
} from "../lib";

const allowedExports = {
	isSinglePayment,
	isWeeklyPayment,
	isMonthlyPayment,
	isYearlyPayment,
	addByPeriod,
	createDate,
	generator,
	paymentDate,
	PERIOD,
	recurrentry,
};

describe("Index tests", () => {
	it("should only export allowed entities", () => {
		const indexExports = Object.keys(index).reduce(
			(acc, key) => {
				if (key !== "__esModule") {
					acc[key] = (index as Record<string, unknown>)[key];
				}
				return acc;
			},
			{} as Record<string, unknown>,
		);

		expect(indexExports, "Index should contain all allowed exports").toEqual(
			allowedExports,
		);
	});
});
