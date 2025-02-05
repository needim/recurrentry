import { generator } from "../lib/generator";
import { type MonthlyPayment, type Ordinal, PERIOD } from "../lib/types";
import { createDate } from "../lib/utils";

describe("Monthly", () => {
	const baseDate = createDate("2024-01-01");
	const sampleEntry = {
		id: "1",
		date: baseDate,
	};
	const weekendDays = [6, 7];

	test("every month", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.MONTH,
					start: baseDate,
					interval: 4,
					options: {
						every: 1,
					},
				} satisfies MonthlyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(4);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-01");

		expect(result[1].actualDate.toString()).toBe("2024-02-01");
		expect(result[1].paymentDate.toString()).toBe("2024-02-01");

		expect(result[2].actualDate.toString()).toBe("2024-03-01");
		expect(result[2].paymentDate.toString()).toBe("2024-03-01");

		expect(result[3].actualDate.toString()).toBe("2024-04-01");
		expect(result[3].paymentDate.toString()).toBe("2024-04-01");
	});

	test("every N months", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.MONTH,
					start: baseDate,
					interval: 3,
					options: {
						every: 2, // Every 2 months
					},
				} satisfies MonthlyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(3);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-01");

		expect(result[1].actualDate.toString()).toBe("2024-03-01");
		expect(result[1].paymentDate.toString()).toBe("2024-03-01");

		expect(result[2].actualDate.toString()).toBe("2024-05-01");
		expect(result[2].paymentDate.toString()).toBe("2024-05-01");
	});

	test("on specific day", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.MONTH,
					start: baseDate,
					interval: 2,
					options: {
						every: 1,
						each: [15], // 15th of each month
					},
				} satisfies MonthlyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(2);
		expect(result[0].actualDate.toString()).toBe("2024-01-15");
		expect(result[0].paymentDate.toString()).toBe("2024-01-15");

		expect(result[1].actualDate.toString()).toBe("2024-02-15");
		expect(result[1].paymentDate.toString()).toBe("2024-02-15");
	});

	test("on first Monday", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.MONTH,
					start: baseDate,
					interval: 2,
					options: {
						every: 1,
						on: "first-monday",
					},
				} satisfies MonthlyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(2);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-01");

		expect(result[1].actualDate.toString()).toBe("2024-02-05");
		expect(result[1].paymentDate.toString()).toBe("2024-02-05");
	});

	test("on last weekday", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.MONTH,
					start: baseDate,
					interval: 2,
					options: {
						every: 1,
						on: "last-weekday",
					},
				} satisfies MonthlyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(2);
		expect(result[0].actualDate.toString()).toBe("2024-01-31");
		expect(result[0].paymentDate.toString()).toBe("2024-01-31");

		expect(result[1].actualDate.toString()).toBe("2024-02-29");
		expect(result[1].paymentDate.toString()).toBe("2024-02-29");
	});

	test("with all possible ordinal positions", () => {
		const ordinalPositions = [
			"second",
			"third",
			"fourth",
			"fifth",
			"nextToLast",
		];

		for (const position of ordinalPositions) {
			const data = [
				{
					...sampleEntry,
					config: {
						period: PERIOD.MONTH,
						start: baseDate,
						interval: 1,
						options: {
							every: 1,
							on: `${position}-weekday` as Ordinal,
						},
					} satisfies MonthlyPayment,
				},
			];

			const result = generator({
				data,
				modifications: [],
				weekendDays,
			});
			expect(result).toHaveLength(1);
		}
	});

	test("with weekend category without weekendDays", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.MONTH,
					start: baseDate,
					interval: 1,
					options: {
						every: 1,
						on: "first-weekend",
					},
				} satisfies MonthlyPayment,
			},
		];

		expect(() => {
			generator({ data, modifications: [], weekendDays: [] });
		}).toThrow("weekendDays must be provided when using weekend day category");
	});

	test("with fifth ordinal", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.MONTH,
					start: baseDate,
					interval: 1,
					options: {
						every: 1,
						on: "fifth-weekday",
					},
				} satisfies MonthlyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(1);
		// In January 2024, the fifth weekday should be January 5
		expect(result[0].actualDate.toString()).toBe("2024-01-05");
		expect(result[0].paymentDate.toString()).toBe("2024-01-05");
	});

	test("with nextToLast ordinal", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.MONTH,
					start: baseDate,
					interval: 2,
					options: {
						every: 1,
						on: "nextToLast-weekday",
					},
				} satisfies MonthlyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(2);
		// In January 2024, the nextToLast weekday should be January 30 (Tuesday)
		// since the last weekday is January 31 (Wednesday)
		expect(result[0].actualDate.toString()).toBe("2024-01-30");
		expect(result[0].paymentDate.toString()).toBe("2024-01-30");

		// In February 2024, the nextToLast weekday should be February 28 (Wednesday)
		// since the last weekday is February 29 (Thursday)
		expect(result[1].actualDate.toString()).toBe("2024-02-28");
		expect(result[1].paymentDate.toString()).toBe("2024-02-28");
	});
});
