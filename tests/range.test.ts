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

	test("early exit optimization - monthly with large interval", () => {
		// This test ensures we don't generate all 100 intervals when range ends early
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.MONTH,
					start: baseDate,
					interval: 100, // Large interval to test early exit
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
				end: createDate("2024-03-15"), // Should stop after 3 occurrences
			},
		});

		expect(result).toHaveLength(3);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[1].actualDate.toString()).toBe("2024-02-01");
		expect(result[2].actualDate.toString()).toBe("2024-03-01");
	});

	test("early exit optimization - weekly with large interval", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.WEEK,
					start: baseDate,
					interval: 100, // Large interval to test early exit
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
				end: createDate("2024-01-22"), // Should stop after 4 occurrences
			},
		});

		expect(result).toHaveLength(4);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[1].actualDate.toString()).toBe("2024-01-08");
		expect(result[2].actualDate.toString()).toBe("2024-01-15");
		expect(result[3].actualDate.toString()).toBe("2024-01-22");
	});

	test("early exit optimization - yearly with large interval", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.YEAR,
					start: baseDate,
					interval: 50, // Large interval to test early exit
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
				end: createDate("2026-06-01"), // Should stop after 3 occurrences
			},
		});

		expect(result).toHaveLength(3);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[1].actualDate.toString()).toBe("2025-01-01");
		expect(result[2].actualDate.toString()).toBe("2026-01-01");
	});

	test("early exit optimization - with 'each' arrays", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.MONTH,
					start: baseDate,
					interval: 50, // Large interval to test early exit
					options: {
						every: 1,
						each: [1, 10, 20], // Multiple dates per month
					},
				},
			},
		];

		const result = generator({
			data,
			modifications: [],
			weekendDays,
			range: {
				end: createDate("2024-02-05"), // Should stop early in February
			},
		});

		expect(result).toHaveLength(4);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[1].actualDate.toString()).toBe("2024-01-10");
		expect(result[2].actualDate.toString()).toBe("2024-01-20");
		expect(result[3].actualDate.toString()).toBe("2024-02-01");
		// Should not include 2024-02-10 and 2024-02-20 as they exceed the range
	});

	test("early exit optimization - weekly with 'each' arrays", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.WEEK,
					start: baseDate, // Monday 2024-01-01
					interval: 10, // Large interval to test early exit
					options: {
						every: 1,
						each: [1, 3, 5], // Monday, Wednesday, Friday
					},
				},
			},
		];

		const result = generator({
			data,
			modifications: [],
			weekendDays,
			range: {
				end: createDate("2024-01-10"), // Should stop after first week + some of second
			},
		});

		expect(result).toHaveLength(5);
		expect(result[0].actualDate.toString()).toBe("2024-01-01"); // Monday
		expect(result[1].actualDate.toString()).toBe("2024-01-03"); // Wednesday
		expect(result[2].actualDate.toString()).toBe("2024-01-05"); // Friday
		expect(result[3].actualDate.toString()).toBe("2024-01-08"); // Next Monday
		expect(result[4].actualDate.toString()).toBe("2024-01-10"); // Next Wednesday
		// Should not include 2024-01-12 (Friday) as it would exceed the range
	});

	test("early exit with no range should generate all intervals", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.MONTH,
					start: baseDate,
					interval: 5, // Small interval for predictable test
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
			// No range specified - should generate all 5 intervals
		});

		expect(result).toHaveLength(5);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[1].actualDate.toString()).toBe("2024-02-01");
		expect(result[2].actualDate.toString()).toBe("2024-03-01");
		expect(result[3].actualDate.toString()).toBe("2024-04-01");
		expect(result[4].actualDate.toString()).toBe("2024-05-01");
	});

	test("early exit with range start after all occurrences", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.MONTH,
					start: baseDate,
					interval: 3,
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
				start: createDate("2024-06-01"), // After all occurrences
			},
		});

		expect(result).toHaveLength(0);
	});
});
