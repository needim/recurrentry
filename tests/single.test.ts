import { generator } from "../lib/generator";
import { PERIOD, type SinglePayment } from "../lib/types";
import { createDate } from "../lib/utils";

describe("Single", () => {
  const baseDate = createDate("2024-01-01");
  const sampleEntry = {
    id: "1",
    date: baseDate,
    amount: "100.00",
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
        } satisfies SinglePayment,
      },
    ];

    const result = generator({ data, modifications: [], weekendDays });

    expect(result).toHaveLength(1);
    expect(result[0].actualDate.toString()).toBe("2024-01-01");
    expect(result[0].paymentDate.toString()).toBe("2024-01-01");
    expect(result[0].index).toBe(1);
  });
});
