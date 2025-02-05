import { generator } from "../lib/generator";
import { PERIOD, type WeeklyPayment } from "../lib/types";
import { createDate } from "../lib/utils";

describe("Weekly", () => {
	// Monday, January 1, 2024
	const baseDate = createDate("2024-01-01");
	const sampleEntry = {
		id: "1",
		date: baseDate,
	};
	const weekendDays = [6, 7]; // Saturday and Sunday

	test("every week", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.WEEK,
					start: baseDate,
					interval: 4, // Generate 4 occurrences
					options: {
						every: 1,
					},
				} satisfies WeeklyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(4);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-01");

		expect(result[1].actualDate.toString()).toBe("2024-01-08");
		expect(result[1].paymentDate.toString()).toBe("2024-01-08");

		expect(result[2].actualDate.toString()).toBe("2024-01-15");
		expect(result[2].paymentDate.toString()).toBe("2024-01-15");

		expect(result[3].actualDate.toString()).toBe("2024-01-22");
		expect(result[3].paymentDate.toString()).toBe("2024-01-22");
	});

	test("every N weeks", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.WEEK,
					start: baseDate,
					interval: 3, // Generate 3 occurrences
					options: {
						every: 2, // Every 2 weeks
					},
				} satisfies WeeklyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(3);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-01");

		expect(result[1].actualDate.toString()).toBe("2024-01-15");
		expect(result[1].paymentDate.toString()).toBe("2024-01-15");

		expect(result[2].actualDate.toString()).toBe("2024-01-29");
		expect(result[2].paymentDate.toString()).toBe("2024-01-29");
	});

	test("on workdays only", () => {
		// Start on Sunday (January 7, 2024)
		const sundayDate = baseDate.add({ days: 6 });
		const data = [
			{
				...sampleEntry,
				date: sundayDate,
				config: {
					period: PERIOD.WEEK,
					start: sundayDate,
					interval: 2,
					options: {
						every: 1,
						workdaysOnly: true,
					},
				} satisfies WeeklyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(2);
		// Should move from Sunday to Monday
		expect(result[0].actualDate.toString()).toBe("2024-01-07");
		expect(result[0].paymentDate.toString()).toBe("2024-01-08");

		expect(result[1].actualDate.toString()).toBe("2024-01-14");
		expect(result[1].paymentDate.toString()).toBe("2024-01-15");
	});

	test("with grace period", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.WEEK,
					start: baseDate,
					interval: 2,
					options: {
						every: 1,
						gracePeriod: 2,
					},
				} satisfies WeeklyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(2);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-03");
		expect(result[1].actualDate.toString()).toBe("2024-01-08");
		expect(result[1].paymentDate.toString()).toBe("2024-01-10");
	});

	test("on specific day", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.WEEK,
					start: baseDate,
					interval: 2,
					options: {
						every: 1,
						each: [3], // Wednesday
					},
				} satisfies WeeklyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(2);
		// First Wednesday (January 3, 2024)
		expect(result[0].actualDate.toString()).toBe("2024-01-03");
		expect(result[0].paymentDate.toString()).toBe("2024-01-03");
		// Second Wednesday (January 10, 2024)
		expect(result[1].actualDate.toString()).toBe("2024-01-10");
		expect(result[1].paymentDate.toString()).toBe("2024-01-10");
	});

	test("on multiple specific days", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.WEEK,
					start: baseDate,
					interval: 1,
					options: {
						every: 1,
						each: [2, 4], // Tuesday and Thursday
					},
				} satisfies WeeklyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(2);
		// Tuesday (January 2, 2024)
		expect(result[0].actualDate.toString()).toBe("2024-01-02");
		expect(result[0].paymentDate.toString()).toBe("2024-01-02");
		// Thursday (January 4, 2024)
		expect(result[1].actualDate.toString()).toBe("2024-01-04");
		expect(result[1].paymentDate.toString()).toBe("2024-01-04");
	});

	test("on specific days with grace period and workdays only", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.WEEK,
					start: baseDate,
					interval: 1,
					options: {
						every: 1,
						each: [5, 6], // Friday and Saturday
						workdaysOnly: true,
						gracePeriod: 1,
					},
				} satisfies WeeklyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(2);
		// Friday + 1 day grace (January 6, 2024) -> Monday (January 8, 2024)
		expect(result[0].actualDate.toString()).toBe("2024-01-05");
		expect(result[0].paymentDate.toString()).toBe("2024-01-08");
		// Saturday + 1 day grace (January 7, 2024) -> Monday (January 8, 2024)
		expect(result[1].actualDate.toString()).toBe("2024-01-06");
		expect(result[1].paymentDate.toString()).toBe("2024-01-08");
	});

	test("on holiday", () => {
		// January 1, 2024 is a holiday
		const holidayDate = createDate("2024-01-01");
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.WEEK,
					start: holidayDate,
					interval: 2,
					options: {
						every: 1,
					},
				} satisfies WeeklyPayment,
			},
		];

		const result = generator({
			data,
			modifications: [],
			weekendDays,
			holidays: [holidayDate],
		});

		expect(result).toHaveLength(2);
		// Should move from holiday to next day
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-02");
		// Next week should be normal
		expect(result[1].actualDate.toString()).toBe("2024-01-08");
		expect(result[1].paymentDate.toString()).toBe("2024-01-08");
	});

	test("every N weeks with holidays", () => {
		const holidayDate = createDate("2024-01-15"); // Second occurrence
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.WEEK,
					start: baseDate,
					interval: 3,
					options: {
						every: 2, // Every 2 weeks
					},
				} satisfies WeeklyPayment,
			},
		];

		const result = generator({
			data,
			modifications: [],
			weekendDays,
			holidays: [holidayDate],
		});

		expect(result).toHaveLength(3);
		expect(result[0].actualDate.toString()).toBe("2024-01-01");
		expect(result[0].paymentDate.toString()).toBe("2024-01-01");
		// Second occurrence falls on holiday, should move to next day
		expect(result[1].actualDate.toString()).toBe("2024-01-15");
		expect(result[1].paymentDate.toString()).toBe("2024-01-16");
		expect(result[2].actualDate.toString()).toBe("2024-01-29");
		expect(result[2].paymentDate.toString()).toBe("2024-01-29");
	});

	test("with multiple days crossing week boundary", () => {
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.WEEK,
					start: baseDate,
					interval: 1,
					options: {
						every: 1,
						each: [5, 7], // Friday and Sunday
					},
				} satisfies WeeklyPayment,
			},
		];

		const result = generator({ data, modifications: [], weekendDays });

		expect(result).toHaveLength(1); // Only Friday should be included
		// Should be Friday (January 5, 2024)
		expect(result[0].actualDate.toString()).toBe("2024-01-05");
		expect(result[0].paymentDate.toString()).toBe("2024-01-05");
	});

	test("with multiple days and holidays", () => {
		const holidayDate = createDate("2024-01-03"); // Wednesday
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.WEEK,
					start: baseDate,
					interval: 1,
					options: {
						every: 1,
						each: [3, 4], // Wednesday and Thursday
					},
				} satisfies WeeklyPayment,
			},
		];

		const result = generator({
			data,
			modifications: [],
			weekendDays,
			holidays: [holidayDate],
		});

		expect(result).toHaveLength(2);
		// Wednesday is holiday, should move to next day
		expect(result[0].actualDate.toString()).toBe("2024-01-03");
		expect(result[0].paymentDate.toString()).toBe("2024-01-04");
		// Thursday should remain as is
		expect(result[1].actualDate.toString()).toBe("2024-01-04");
		expect(result[1].paymentDate.toString()).toBe("2024-01-04");
	});

	test("with all options combined", () => {
		const holidayDate = createDate("2024-01-04"); // Thursday
		const data = [
			{
				...sampleEntry,
				config: {
					period: PERIOD.WEEK,
					start: baseDate,
					interval: 2,
					options: {
						every: 2,
						each: [4, 6], // Thursday and Saturday
						workdaysOnly: true,
						gracePeriod: 1,
					},
				} satisfies WeeklyPayment,
			},
		];

		const result = generator({
			data,
			modifications: [],
			weekendDays,
			holidays: [holidayDate],
		});

		expect(result).toHaveLength(4);
		// Week 1:
		// Thursday Jan 4 ->  Friday Jan 5 (grace)
		expect(result[0].actualDate.toString()).toBe("2024-01-04");
		expect(result[0].paymentDate.toString()).toBe("2024-01-05");
		// Saturday Jan 6 -> Sunday Jan 7 (grace) -> Monday Jan 8
		expect(result[1].actualDate.toString()).toBe("2024-01-06");
		expect(result[1].paymentDate.toString()).toBe("2024-01-08");

		// Week 3 (2 weeks later):
		// Thursday Jan 18 -> Friday Jan 19 (grace)
		expect(result[2].actualDate.toString()).toBe("2024-01-18");
		expect(result[2].paymentDate.toString()).toBe("2024-01-19");
		// Saturday Jan 20 -> Sunday Jan 21 (grace) -> Monday Jan 22
		expect(result[3].actualDate.toString()).toBe("2024-01-20");
		expect(result[3].paymentDate.toString()).toBe("2024-01-22");
	});
});
