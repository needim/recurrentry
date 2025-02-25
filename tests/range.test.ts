import { generator } from "../lib/generator";
import { PERIOD, type SinglePayment } from "../lib/types";
import { createDate } from "../lib/utils";

describe("Range", () => {
	const baseDate = createDate("2024-01-01");
	const sampleEntry = {
		id: "1",
		date: baseDate,
	};
	const weekendDays = [6, 7];

	test("without range", () => {
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
				},
			},
		];

		const result = generator({ data, modifications: [], weekendDays });
		expect(result).toHaveLength(4);
	});

	test("with start range only", () => {
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
				},
			},
		];

		const result = generator({
			data,
			modifications: [],
			weekendDays,
			range: {
				start: createDate("2024-02-01"),
			},
		});

		expect(result).toHaveLength(3);
		expect(result[0].actualDate.toString()).toBe("2024-02-01");
		expect(result[1].actualDate.toString()).toBe("2024-03-01");
		expect(result[2].actualDate.toString()).toBe("2024-04-01");
	});

	test("with end range only", () => {
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
				},
			},
		];

		const result = generator({
			data,
			modifications: [],
			weekendDays,
			range: {
				end: createDate("2024-03-15"),
			},
		});

		expect(result).toHaveLength(3);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[1].actualDate.toString()).toBe("2024-02-01");
		expect(result[2].actualDate.toString()).toBe("2024-03-01");
	});

	test("with both start and end range", () => {
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
				},
			},
		];

		const result = generator({
			data,
			modifications: [],
			weekendDays,
			range: {
				start: createDate("2024-02-01"),
				end: createDate("2024-03-15"),
			},
		});

		expect(result).toHaveLength(2);
		expect(result[0].actualDate.toString()).toBe("2024-02-01");
		expect(result[1].actualDate.toString()).toBe("2024-03-01");
	});

	test("range with single payment", () => {
		const data = [
			{
				...sampleEntry,
				date: createDate("2024-02-15"),
				config: {
					period: PERIOD.NONE,
					start: createDate("2024-02-15"),
					interval: 1,
				} satisfies SinglePayment,
			},
		];

		const outOfRangeResult = generator({
			data,
			modifications: [],
			weekendDays,
			range: {
				start: createDate("2024-03-01"),
				end: createDate("2024-04-01"),
			},
		});
		expect(outOfRangeResult).toHaveLength(0);

		const inRangeResult = generator({
			data,
			modifications: [],
			weekendDays,
			range: {
				start: createDate("2024-02-01"),
				end: createDate("2024-03-01"),
			},
		});
		expect(inRangeResult).toHaveLength(1);
		expect(inRangeResult[0].actualDate.toString()).toBe("2024-02-15");
	});

	test("range with multiple dates in period", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.MONTH,
					start: baseDate,
					interval: 2,
					options: {
						every: 1,
						each: [5, 15, 25], // Multiple dates per month
					},
				},
			},
		];

		const result = generator({
			data,
			modifications: [],
			weekendDays,
			range: {
				start: createDate("2024-01-10"),
				end: createDate("2024-02-20"),
			},
		});

		expect(result).toHaveLength(4);
		expect(result[0].actualDate.toString()).toBe("2024-01-15");
		expect(result[1].actualDate.toString()).toBe("2024-01-25");
		expect(result[2].actualDate.toString()).toBe("2024-02-05");
		expect(result[3].actualDate.toString()).toBe("2024-02-15");
	});
});
