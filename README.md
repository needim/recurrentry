<h1>
🌀 recurrentry
<div style="display: flex; gap: 10px;">
 <img src="https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/needim/ccae711fb07ccaed86d73f03c1922557/raw/badge.json" />
</div>
</h1>

An opinionated library for handling recurring payments.

## Features

- Supports single and recurring payments (single, weekly, monthly, yearly)
- Day-level precision (time components are ignored)
- Type-safe configuration with TypeScript
- Built-in type guards for payment configurations

## Date Handling

The library operates with day-level precision using the Temporal API:

- Uses `Temporal.PlainDate` for all date operations
- All time components are ignored by design
- Helper function `createDate()` provided for easy date creation
- Dates should be provided as Temporal.PlainDate

## Installation

```bash
pnpm install recurrentry
bun install recurrentry
npm install recurrentry
yarn add recurrentry
```

## Usage

```typescript
const data = [
  {
    id: 1,
    amount: "100.00",
    type: "income",
    date: createDate("2024-01-01"),
    config: {
      period: PERIOD.NONE,
      start: createDate("2024-01-01"),
      interval: 1,
      options: {
        workdaysOnly: false,
      },
    } satisfies SinglePayment,
  },
  {
    id: 2,
    amount: "100.00",
    type: "income",
    date: createDate("2024-01-01"),
    config: {
      period: PERIOD.NONE,
      start: createDate("2024-01-01"),
      interval: 1,
      options: {
        workdaysOnly: true,
      },
    } satisfies SinglePayment,
  },
  {
    id: 3,
    amount: "255.00",
    type: "income",
    date: createDate("2024-01-01"),
    config: {
      period: PERIOD.WEEK,
      start: createDate("2024-01-01"),
      interval: 5,
      options: {
        every: 1,
        workdaysOnly: true,
      },
    } satisfies WeeklyPayment,
  },
  {
    id: 4,
    name: "Credit Card",
    amount: "1000.00",
    type: "expense",
    date: createDate("2024-01-01"),
    config: {
      period: PERIOD.MONTH,
      start: createDate("2024-01-01"),
      interval: 3,
      options: {
        every: 1,
        workdaysOnly: true,
        gracePeriod: 10,
      },
    } satisfies MonthlyPayment,
  },
];

const result = generator({
  data,
  modifications: [
    {
      itemId: 3,
      index: 2,
      type: "edit",
      applyToFuture: true,
      data: {
        amount: "300.00",
      },
    },
    {
      itemId: 3,
      index: 4,
      type: "edit",
      applyToFuture: true,
      data: {
        amount: "555.12",
      },
    },
  ],
  weekendDays: [6, 7], // Saturday and Sunday
  holidays: [createDate("2024-01-01")], // New Year's Day
});
```

## Output

| #-index | amount   | period   | occurrence date | payment date |
| ------- | -------- | -------- | --------------- | ------------ |
| 1/1     | 100.00   | none     | 2024-01-01      | 2024-01-01   |
| ---     | -------- | -------- | -------------   | ------       |
| 2/1     | 100.00   | none     | 2024-01-01      | 2024-01-02   |
| ---     | -------- | -------- | -------------   | ------       |
| 3/1     | 255.00   | week     | 2024-01-01      | 2024-01-02   |
| 3/2     | 300.00   | week     | 2024-01-08      | 2024-01-08   |
| 3/3     | 300.00   | week     | 2024-01-15      | 2024-01-15   |
| 3/4     | 555.12   | week     | 2024-01-22      | 2024-01-22   |
| 3/5     | 555.12   | week     | 2024-01-29      | 2024-01-29   |
| ---     | -------- | -------- | -------------   | ------       |
| 4/1     | 1000.00  | month    | 2024-01-01      | 2024-01-11   |
| 4/2     | 1000.00  | month    | 2024-02-01      | 2024-02-12   |
| 4/3     | 1000.00  | month    | 2024-03-01      | 2024-03-11   |

## Contributing

1. Fork the repository
2. Create a new branch for your changes
3. Make your changes and write tests if applicable
4. Submit a pull request

## License

Licensed under the [MIT License](LICENSE).
