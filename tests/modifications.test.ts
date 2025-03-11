import { generator } from "../lib/generator";
import { createDate } from "../lib/utils";

describe("Modifications", () => {
	test("should modify future amounts", () => {
		const result = generator({
			data: [
				{
					id: "1",
					date: createDate("2024-01-01"),
					amount: 100,
					config: {
						start: createDate("2024-01-01"),
						period: "month",
						interval: 4,
						options: { every: 1 },
					},
				},
			],
			modifications: [
				{
					itemId: "1",
					index: 2,
					payload: { amount: 200 },
					restPayload: { amount: 200 },
				},
			],
		});

		expect(result).toHaveLength(4);
		expect(result[0].$.amount).toBe(100);
		expect(result[1].$.amount).toBe(200);
		expect(result[2].$.amount).toBe(200);
		expect(result[3].$.amount).toBe(200);
	});

	test("should delete single occurrence", () => {
		const result = generator({
			data: [
				{
					id: "1",
					date: createDate("2024-01-01"),
					amount: 100,
					config: {
						start: createDate("2024-01-01"),
						period: "month",
						interval: 4,
						options: { every: 1 },
					},
				},
			],
			modifications: [
				{
					itemId: "1",
					index: 2,
					payload: { deleted: true },
				},
			],
		});

		expect(result).toHaveLength(3);
		expect(result[0].$.amount).toBe(100);
		expect(result[1].$.amount).toBe(100);
		expect(result[2].$.amount).toBe(100);
	});

	test("should handle date change for monthly recurring entries", () => {
		const result = generator({
			data: [
				{
					id: "1",
					date: createDate("2024-01-01"),
					amount: 100,
					config: {
						start: createDate("2024-01-01"),
						period: "month",
						interval: 4,
						options: { every: 1 },
					},
				},
			],
			modifications: [
				{
					itemId: "1",
					index: 2,
					payload: { date: createDate("2024-02-10") },
					restPayload: { date: createDate("2024-02-10") },
				},
			],
		});

		expect(result).toHaveLength(4);
		expect(result[0].actualDate.toString()).toBe(
			createDate("2024-01-01").toString(),
		);
		expect(result[0].paymentDate.toString()).toBe(
			createDate("2024-01-01").toString(),
		);

		expect(result[1].actualDate.toString()).toBe(
			createDate("2024-02-10").toString(),
		);
		expect(result[1].paymentDate.toString()).toBe(
			createDate("2024-02-10").toString(),
		);

		expect(result[2].actualDate.toString()).toBe(
			createDate("2024-03-10").toString(),
		);
		expect(result[2].paymentDate.toString()).toBe(
			createDate("2024-03-10").toString(),
		);

		expect(result[3].actualDate.toString()).toBe(
			createDate("2024-04-10").toString(),
		);
		expect(result[3].paymentDate.toString()).toBe(
			createDate("2024-04-10").toString(),
		);
	});

	test("should handle date change for monthly recurring entries without rest payload", () => {
		const result = generator({
			data: [
				{
					id: "1",
					date: createDate("2024-01-01"),
					amount: 100,
					config: {
						start: createDate("2024-01-01"),
						period: "month",
						interval: 4,
						options: { every: 1 },
					},
				},
			],
			modifications: [
				{
					itemId: "1",
					index: 2,
					payload: { date: createDate("2024-02-10") },
				},
			],
		});

		expect(result).toHaveLength(4);
		expect(result[0].actualDate.toString()).toBe(
			createDate("2024-01-01").toString(),
		);
		expect(result[0].paymentDate.toString()).toBe(
			createDate("2024-01-01").toString(),
		);

		expect(result[1].actualDate.toString()).toBe(
			createDate("2024-02-10").toString(),
		);
		expect(result[1].paymentDate.toString()).toBe(
			createDate("2024-02-10").toString(),
		);

		expect(result[2].actualDate.toString()).toBe(
			createDate("2024-03-01").toString(),
		);
		expect(result[2].paymentDate.toString()).toBe(
			createDate("2024-03-01").toString(),
		);

		expect(result[3].actualDate.toString()).toBe(
			createDate("2024-04-01").toString(),
		);
		expect(result[3].paymentDate.toString()).toBe(
			createDate("2024-04-01").toString(),
		);
	});

	test("should delete all future occurrences", () => {
		const result = generator({
			data: [
				{
					id: "1",
					date: createDate("2024-01-01"),
					amount: 100,
					config: {
						start: createDate("2024-01-01"),
						period: "month",
						interval: 4,
						options: { every: 1 },
					},
				},
			],
			modifications: [
				{
					itemId: "1",
					index: 2,
					payload: { deleted: true },
					restPayload: { deleted: true },
				},
			],
		});

		expect(result).toHaveLength(1);
		expect(result[0].$.amount).toBe(100);
	});

	test("should ignore modifications for wrong itemId", () => {
		const result = generator({
			data: [
				{
					id: "1",
					date: createDate("2024-01-01"),
					amount: 100,
					config: {
						start: createDate("2024-01-01"),
						period: "month",
						interval: 4,
						options: { every: 1 },
					},
				},
			],
			modifications: [
				{
					itemId: "wrong-id",
					index: 2,
					payload: { amount: 200 },
				},
			],
		});

		expect(result).toHaveLength(4);
		expect(result.every((r) => r.$.amount === 100)).toBe(true);
	});

	test("should handle modifications with all data types", () => {
		const result = generator({
			data: [
				{
					id: "1",
					date: createDate("2024-01-01"),
					amount: 100,
					description: "test",
					meta: { key: "value" },
					config: {
						start: createDate("2024-01-01"),
						period: "month",
						interval: 2,
						options: { every: 1 },
					},
				},
			],
			modifications: [
				{
					itemId: "1",
					index: 1,
					payload: {
						amount: 200,
						description: "modified",
						meta: { key: "new value" },
						date: createDate("2024-01-15"),
					},
				},
			],
		});

		expect(result).toHaveLength(2);
		expect(result[0].$.amount).toBe(200);
		expect(result[0].$.description).toBe("modified");
		expect(result[0].$.meta.key).toBe("new value");
	});

	test("should handle date change for weekly recurring entries", () => {
		const result = generator({
			data: [
				{
					id: "1",
					date: createDate("2024-01-01"),
					amount: 100,
					config: {
						start: createDate("2024-01-01"),
						period: "week",
						interval: 4,
						options: {
							every: 1,
							// Monday is day 1, so this entry starts on Monday (2024-01-01)
							each: [1], // Mondays
						},
					},
				},
			],
			modifications: [
				{
					itemId: "1",
					index: 2,
					payload: { date: createDate("2024-01-11") }, // Change to Thursday
					restPayload: { date: createDate("2024-01-11") }, // Apply to future occurrences
				},
			],
		});

		expect(result).toHaveLength(4);

		expect(result[0].actualDate.toString()).toBe(
			createDate("2024-01-01").toString(),
		);
		expect(result[0].paymentDate.toString()).toBe(
			createDate("2024-01-01").toString(),
		);

		expect(result[1].actualDate.toString()).toBe(
			createDate("2024-01-11").toString(),
		);
		expect(result[1].paymentDate.toString()).toBe(
			createDate("2024-01-11").toString(),
		);

		expect(result[2].actualDate.toString()).toBe(
			createDate("2024-01-18").toString(),
		);
		expect(result[2].paymentDate.toString()).toBe(
			createDate("2024-01-18").toString(),
		);

		expect(result[3].actualDate.toString()).toBe(
			createDate("2024-01-25").toString(),
		);
		expect(result[3].paymentDate.toString()).toBe(
			createDate("2024-01-25").toString(),
		);
	});

	test("should handle date change for weekly recurring entries without rest payload", () => {
		const result = generator({
			data: [
				{
					id: "1",
					date: createDate("2024-01-01"),
					amount: 100,
					config: {
						start: createDate("2024-01-01"),
						period: "week",
						interval: 4,
						options: {
							every: 1,
							// Monday is day 1, so this entry starts on Monday (2024-01-01)
							each: [1], // Mondays
						},
					},
				},
			],
			modifications: [
				{
					itemId: "1",
					index: 2,
					payload: { date: createDate("2024-01-11") },
				},
			],
		});

		expect(result).toHaveLength(4);

		expect(result[0].actualDate.toString()).toBe(
			createDate("2024-01-01").toString(),
		);
		expect(result[0].paymentDate.toString()).toBe(
			createDate("2024-01-01").toString(),
		);

		expect(result[1].actualDate.toString()).toBe(
			createDate("2024-01-11").toString(),
		);
		expect(result[1].paymentDate.toString()).toBe(
			createDate("2024-01-11").toString(),
		);

		expect(result[2].actualDate.toString()).toBe(
			createDate("2024-01-15").toString(),
		);
		expect(result[2].paymentDate.toString()).toBe(
			createDate("2024-01-15").toString(),
		);

		expect(result[3].actualDate.toString()).toBe(
			createDate("2024-01-22").toString(),
		);
		expect(result[3].paymentDate.toString()).toBe(
			createDate("2024-01-22").toString(),
		);
	});
});
