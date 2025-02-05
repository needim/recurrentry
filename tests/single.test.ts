import { generator } from "../lib/generator";
import { PERIOD, type SinglePayment } from "../lib/types";
import { createDate } from "../lib/utils";

describe("Single", () => {
	const baseDate = createDate("2024-01-01");
	const sampleEntry = {
		id: "1",
		date: baseDate,
	};
	const weekendDays = [6, 7];

	test("without options", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.NONE,
					start: baseDate,
					interval: 1,
					options: {},
				} satisfies SinglePayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(1);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-01");
		expect(result[0].index).toBe(1);
	});

	test("with workdaysOnly", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.NONE,
					start: baseDate,
					interval: 1,
					options: {
						workdaysOnly: true,
					},
				} satisfies SinglePayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(1);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-01");
	});

	test("with grace period", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.NONE,
					start: baseDate,
					interval: 1,
					options: {
						gracePeriod: 5,
					},
				} satisfies SinglePayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(1);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-06");
	});

	test("with workdaysOnly and grace period", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.NONE,
					start: baseDate,
					interval: 1,
					options: {
						workdaysOnly: true,
						gracePeriod: 5,
					},
				} satisfies SinglePayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(1);
		// January 6 is Saturday, moves to Monday January 8
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-08");
	});

	test("on weekend with workdaysOnly", () => {
		const weekendDate = createDate("2024-01-06"); // Saturday
		const data = [
			{
				...sampleEntry,
				date: weekendDate,
				config: {
					period: PERIOD.NONE,
					start: weekendDate,
					interval: 1,
					options: {
						workdaysOnly: true,
					},
				} satisfies SinglePayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(1);
		// Should move to next Monday
		expect(result[0].actualDate.toString()).toBe("2024-01-06");
		expect(result[0].paymentDate.toString()).toBe("2024-01-08");
	});

	test("on holiday", () => {
		const holidayDate = createDate("2024-01-01");
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.NONE,
					start: holidayDate,
					interval: 1,
					options: {
						workdaysOnly: true,
					},
				} satisfies SinglePayment,
			},
		];

		const result = generator({
			data,
			modifications: [],
			weekendDays,
			holidays: [holidayDate],
		});

		expect(result).toHaveLength(1);
		// Should move to next non-holiday day
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-02");
	});

	test("on holiday with workdaysOnly", () => {
		const holidayDate = createDate("2024-01-01"); // New Year's Day
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.NONE,
					start: holidayDate,
					interval: 1,
					options: {
						workdaysOnly: true,
					},
				} satisfies SinglePayment,
			},
		];

		const result = generator({
			data,
			modifications: [],
			weekendDays,
			holidays: [holidayDate],
		});

		expect(result).toHaveLength(1);
		// Should move to next workday that isn't a holiday (January 2, 2024)
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-02");
	});

	test("with grace period landing on holiday", () => {
		const startDate = createDate("2024-01-01");
		const holidayDate = createDate("2024-01-06"); // Saturday
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.NONE,
					start: startDate,
					interval: 1,
					options: {
						workdaysOnly: true,
						gracePeriod: 5,
					},
				} satisfies SinglePayment,
			},
		];

		const result = generator({
			data,
			modifications: [],
			weekendDays,
			holidays: [holidayDate],
		});

		expect(result).toHaveLength(1);
		// Should move to next non-holiday, non-weekend day (January 8, 2024 - Monday)
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-08");
	});

	test("with gracePeriod and workdaysOnly landing on holiday", () => {
		const startDate = createDate("2024-01-01");
		const holidayDate = createDate("2024-01-06"); // Saturday
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.NONE,
					start: startDate,
					interval: 1,
					options: {
						workdaysOnly: true,
						gracePeriod: 5,
					},
				} satisfies SinglePayment,
			},
		];

		const result = generator({
			data,
			modifications: [],
			weekendDays,
			holidays: [holidayDate],
		});

		expect(result).toHaveLength(1);
		// Should move to next workday that isn't a holiday (January 8, 2024 - Monday)
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-08");
	});
});
