# Recurrentry - Go SDK

A Go library for generating recurring entries based on customizable configurations. This is a Go implementation of the original TypeScript/JavaScript library.

## Features

- Generate recurring entries with different period types: weekly, monthly, yearly
- Support for single (one-time) entries
- Customizable configurations for each recurrence type
- Handle modifications to specific occurrences or all future occurrences
- Support for workdays-only option and grace periods
- Date adjustment for holidays and weekends
- Ordinal date targeting (e.g., "first Monday of the month")

## Installation

```bash
go get github.com/needim/recurrentry/client-go
```

## Basic Usage

```go
package main

import (
 "fmt"
 "time"

 recurrentry "github.com/needim/recurrentry/client-go"
)

func main() {
 // Create a start date
 startDate := time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)

 // Set up a monthly payment on the 15th of each month
 monthlyPayment := recurrentry.BaseEntry{
  ID:   1,
  Date: startDate,
  Config: &recurrentry.RecurrenceConfig{
   BaseRecurrenceConfig: recurrentry.BaseRecurrenceConfig{
    Start:    startDate,
    Interval: 12, // Generate 12 occurrences
   },
   Period: recurrentry.PeriodMonth,
   Options: recurrentry.RecurrenceOptions{
    WorkdaysOnly: true,
    Every:        1, // Every month
    Each:         []int{15}, // On the 15th of each month
   },
  },
 }

 // Generate the recurring entries
 entries, err := recurrentry.Generator(recurrentry.GeneratorOptions{
  Data:        []recurrentry.BaseEntry{monthlyPayment},
  WeekendDays: []int{6, 7}, // 6=Saturday, 7=Sunday
 })

 if err != nil {
  fmt.Printf("Error: %v\n", err)
  return
 }

 // Print the results
 for i, entry := range entries {
  fmt.Printf("Entry %d: Date=%s, PaymentDate=%s\n", 
   i+1, 
   entry.ActualDate.Format("2006-01-02"), 
   entry.PaymentDate.Format("2006-01-02"),
  )
 }
}
```

## Configuration Options

### Period Types

- `PeriodNone`: One-time entry
- `PeriodWeek`: Weekly recurring entries
- `PeriodMonth`: Monthly recurring entries
- `PeriodYear`: Yearly recurring entries

### RecurrenceOptions

- `WorkdaysOnly`: If true, payments only occur on working days
- `Every`: Frequency of recurrence (e.g., every 2 weeks)
- `Each`: Specific days/months for payment
- `On`: Ordinal specification for payment date (e.g., "first-monday")
- `GracePeriod`: Number of days after billing cycle for payment due date

### Modifications

You can modify specific occurrences or all future occurrences using the `Modification` struct:

```go
modifications := []recurrentry.Modification{
 {
  ItemID: 1,
  Index:  3, // Modify the 3rd occurrence
  Payload: map[string]interface{}{
   "amount": 1500, // Change amount for this occurrence
  },
 },
 {
  ItemID: 1,
  Index:  5, // Delete the 5th occurrence
  Payload: map[string]interface{}{
   "deleted": true,
  },
 },
}
```

### Date Range Filtering

You can filter the generated entries by date range:

```go
range := &recurrentry.DateRange{
 Start: time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
 End:   time.Date(2023, 12, 31, 0, 0, 0, 0, time.UTC),
}
```

## Examples

See the [`examples`](./examples/) directory for more usage examples.

## License

MIT
