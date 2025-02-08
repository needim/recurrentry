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
          type: "edit",
          itemId: "1",
          index: 2,
          data: { amount: 200 },
          applyToFuture: true,
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
          type: "delete",
          itemId: "1",
          index: 2,
        },
      ],
    });

    expect(result).toHaveLength(3);
    expect(result[0].$.amount).toBe(100);
    expect(result[1].$.amount).toBe(100);
    expect(result[2].$.amount).toBe(100);
  });

  test("should edit single occurrence with diffrent date", () => {
    const result = generator({
      data: [
        {
          id: "1",
          date: createDate("2024-01-01"),
          amount: 100,
          config: {
            start: createDate("2024-01-01"),
            period: "none",
            interval: 1,
            options: {},
          },
        },
      ],
      modifications: [
        {
          type: "edit",
          itemId: "1",
          index: 1,
          data: {
            date: createDate("2024-01-15"),
          },
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].$.date.toString()).toBe("2024-01-15");
  });

  test.skip("should edit weekly occurrence with diffrent date", () => {
    const result = generator({
      data: [
        {
          id: "1",
          date: createDate("2024-01-01"),
          amount: 100,
          config: {
            start: createDate("2024-01-01"),
            period: "week",
            interval: 6,
            options: {
              every: 1,
            },
          },
        },
      ],
      modifications: [
        {
          type: "edit",
          itemId: "1",
          index: 3,
          data: {
            date: createDate("2024-08-15"),
          },
        },
      ],
    });

    console.log(result.map((r) => r.$.date.toString()));
    expect(result).toHaveLength(1);
    expect(result[0].$.date.toString()).toBe("2024-01-15");
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
          type: "delete",
          itemId: "1",
          index: 2,
          applyToFuture: true,
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
          type: "edit",
          itemId: "wrong-id",
          index: 2,
          data: { amount: 200 },
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
          type: "edit",
          itemId: "1",
          index: 1,
          data: {
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
});
