# 🌀 recurrentry

![TypeScript Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/needim/ccae711fb07ccaed86d73f03c1922557/raw/badge.json)

> [!CAUTION]
> This is a work in progress and the API is not stable yet. Don't use it in production.

A highly opinionated TypeScript library for handling recurring payments with precision and flexibility.

I built this library to help me manage my personal finances and automate recurring payments for my income & expense trackking app [gider.im](https://gider.im?utm_source=recurrentry&utm_medium=github&utm_campaign=library).

## 🚀 Key Features

### Payment Scheduling

- ✨ Single and recurring payments (single, weekly, monthly, yearly)
- 🔄 Support for payment modifications (edit, delete)
- 💼 Business day adjustments (weekends/holidays)
- ⏰ Grace period support for payment due dates
- 📆 Day-level precision using Temporal API
- 🛡️ Type-safe configuration with TypeScript

### Advanced Payment Rules

- 🔢 Flexible payment intervals (every X weeks/months/years)
- 📅 Ordinal day specifications:
  - `first-monday`, `last-friday`, `first-weekday`, `last-weekend`
  - Supports all combinations of:
    - Position: first, second, third, fourth, fifth, last, nextToLast
    - Type: day, weekday, weekend, or specific day (monday-sunday)
- 📅 Weekly payment features:
  - Specify days of the week (1-7, where 1 is Monday)
  - Skip weeks with the "every" parameter (e.g., bi-weekly payments)
  - Set specific payment days within each week

### Modifications for Recurring Payments

- ✏️ Edit amount, date for recurring payments
- 🗑️ Delete single or future occurrences
- 📝 Apply changes to future payments
- Single payments are not modified, they are as is (you need to modify them manually)

## 🗓️ Date Handling

The library operates with day-level precision using the Temporal API:

- Uses `Temporal.PlainDate` for all date operations
- Helper function `createDate()` provided for easy date creation

## 📦 Installation

```bash
pnpm install recurrentry
# or
bun install recurrentry
# or
npm install recurrentry
# or
yarn add recurrentry
```

## 🎯 Quick Example

```typescript
const data = [
  {
    id: 1,
    name: "Single Payment",
    amount: "100.00",
    type: "income",
    date: createDate("2024-01-01"),
    config: {
      period: PERIOD.NONE,
      start: createDate("2024-01-01"),
      interval: 1,
    } satisfies SinglePayment,
  },
  {
    id: 3,
    name: "Weekly Income",
    amount: "255.00",
    type: "income",
    date: createDate("2024-01-01"),
    config: {
      period: PERIOD.WEEK,
      start: createDate("2024-01-01"),
      interval: 5,
      options: {
        every: 1,
        workdaysOnly: "next",
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
      interval: 5,
      options: {
        every: 1,
        workdaysOnly: "next",
        gracePeriod: 10,
      },
    } satisfies MonthlyPayment,
  },
];

// Let's generate the payments
const result = generator({
  data,
  modifications: [
    {
      itemId: 3,
      index: 2,
      payload: {
        amount: "411.00",
      },
      restPayload: {
        amount: "300.00",
      },
    },
    {
      itemId: 3,
      index: 4,
      payload: {
        amount: "555.12",
      },
    },
    {
      itemId: 4,
      index: 3,
      payload: {
        date: createDate("2024-03-15"),
        amount: "6087.22",
      },
    },
  ],
  weekendDays: [6, 7], // Saturday and Sunday
  holidays: [createDate("2024-01-01")], // New Year's Day
});
```

## 🟰 Example Generator Result

| #   | index | name           |  amount | period  | occurrence date | payment date |
| --- | ----- | -------------- | ------: | :-----: | --------------- | ------------ |
| 1   |       | Single Payment |  100.00 | `none`  | 2024-01-01      | 2024-01-01   |
|     |       |                |         |         |                 |              |
| 3   | 1     | Weekly Income  |  255.00 | `week`  | 2024-01-01      | 2024-01-02   |
| 3   | 2     | Weekly Income  |  411.00 | `week`  | 2024-01-08      | 2024-01-08   |
| 3   | 3     | Weekly Income  |  300.00 | `week`  | 2024-01-15      | 2024-01-15   |
| 3   | 4     | Weekly Income  |  555.12 | `week`  | 2024-01-22      | 2024-01-22   |
| 3   | 5     | Weekly Income  |  300.00 | `week`  | 2024-01-29      | 2024-01-29   |
|     |       |                |         |         |                 |              |
| 4   | 1     | Credit Card    | 1000.00 | `month` | 2024-01-01      | 2024-01-11   |
| 4   | 2     | Credit Card    | 1000.00 | `month` | 2024-02-01      | 2024-02-12   |
| 4   | 3     | Credit Card    | 6087.22 | `month` | 2024-03-15      | 2024-03-15   |
| 4   | 4     | Credit Card    | 1000.00 | `month` | 2024-04-01      | 2024-04-11   |
| 4   | 5     | Credit Card    | 1000.00 | `month` | 2024-05-01      | 2024-05-13   |

## 🤝 Contributing

1. Fork the repository
2. Create a new branch for your changes
3. Make your changes and write tests if applicable
4. Submit a pull request

## 📄 License

Licensed under the [MIT License](LICENSE).
