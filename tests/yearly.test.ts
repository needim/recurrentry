import { generator } from "../lib/generator";
import { PERIOD, type YearlyPayment } from "../lib/types";
import { createDate } from "../lib/utils";

describe("Yearly", () => {
	const baseDate = createDate("2024-01-01");
	const sampleEntry = {
		id: "1",
		date: baseDate,
	};
	const weekendDays = [6, 7];

	test("every year", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.YEAR,
					start: baseDate,
					interval: 3,
					options: {
						every: 1,
					},
				} satisfies YearlyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(3);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[1].actualDate.toString()).toBe("2025-01-01");
		expect(result[2].actualDate.toString()).toBe("2026-01-01");
	});

	test("every N years", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.YEAR,
					start: baseDate,
					interval: 3,
					options: {
						every: 2,
					},
				} satisfies YearlyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(3);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[1].actualDate.toString()).toBe("2026-01-01");
		expect(result[2].actualDate.toString()).toBe("2028-01-01");
	});

	test("on specific month", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.YEAR,
					start: baseDate,
					interval: 2,
					options: {
						every: 1,
						each: [3],
					},
				} satisfies YearlyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(2);
		expect(result[0].actualDate.toString()).toBe("2024-03-01");
		expect(result[1].actualDate.toString()).toBe("2025-03-01");
	});

	test("on multiple specific months", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.YEAR,
					start: baseDate,
					interval: 1,
					options: {
						every: 1,
						each: [3, 9],
					},
				} satisfies YearlyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(2);
		expect(result[0].actualDate.toString()).toBe("2024-03-01");
		expect(result[1].actualDate.toString()).toBe("2024-09-01");
	});

	test("on first day of specific month", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.YEAR,
					start: baseDate,
					interval: 2,
					options: {
						every: 1,
						each: [3], // March
						on: "first-day",
					},
				} satisfies YearlyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(2);
		expect(result[0].actualDate.toString()).toBe("2024-03-01");
		expect(result[1].actualDate.toString()).toBe("2025-03-01");
	});

	test("on last weekday of specific month", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.YEAR,
					start: baseDate,
					interval: 2,
					options: {
						every: 1,
						each: [3], // March
						on: "last-weekday",
					},
				} satisfies YearlyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(2);
		expect(result[0].actualDate.toString()).toBe("2024-03-29");
		expect(result[1].actualDate.toString()).toBe("2025-03-31");
	});

	test("on multiple specific months with ordinal", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.YEAR,
					start: baseDate,
					interval: 1,
					options: {
						every: 1,
						each: [3, 9], // March and September
						on: "last-day",
					},
				} satisfies YearlyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(2);
		expect(result[0].actualDate.toString()).toBe("2024-03-31");
		expect(result[1].actualDate.toString()).toBe("2024-09-30");
	});

	test("on first day of year", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.YEAR,
					start: baseDate,
					interval: 2,
					options: {
						every: 1,
						on: "first-day",
					},
				} as YearlyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(2);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[1].actualDate.toString()).toBe("2025-01-01");
	});

	test("with workdays only", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.YEAR,
					start: baseDate,
					interval: 2,
					options: {
						every: 1,
						workdaysOnly: true,
					},
				} satisfies YearlyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		// Assuming 2024-01-01 is a workday
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-01");
	});

	test("with grace period", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.YEAR,
					start: baseDate,
					interval: 2,
					options: {
						every: 1,
						gracePeriod: 5,
					},
				} satisfies YearlyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-06");
	});
});
