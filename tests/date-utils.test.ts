import { Temporal } from "temporal-polyfill";
import {
	addByPeriod,
	createDate,
	getActualDayName,
	getOrdinalDate,
} from "../lib/utils";

describe("Date Utils Tests", () => {
	test("addByPeriod with invalid period", () => {
		const baseDate = createDate("2024-01-01");
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const result = addByPeriod(baseDate, 1, "invalid-period" as any);
		expect(result.equals(createDate("2024-01-02"))).toBe(true);
	});

	test("should throw TypeError for invalid input", () => {
		expect(() => {
			// @ts-expect-error testing invalid input
			getActualDayName({});
		}).toThrow("Expected a Temporal.PlainDate instance");
	});
});

describe("getOrdinalDate", () => {
	const date = Temporal.PlainDate.from({ year: 2024, month: 3, day: 1 });

	test("should handle weekend dayType", () => {
		const result = getOrdinalDate(date, "first-weekend", [0, 6]);
		expect(result).toBeDefined();
	});
});
