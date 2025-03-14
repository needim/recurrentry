# RecurrenTry Examples

This directory contains example applications demonstrating different features of the RecurrenTry library.

## Examples

### Basic Examples

- **Monthly Payment** - `./cmd/monthly/main.go`
  - Demonstrates monthly payments on a specific day of the month
  - Shows how to use modifications to change or delete specific occurrences

- **Weekly Payment** - `./cmd/weekly/main.go`
  - Demonstrates weekly payments on specific days of the week
  - Shows how to handle holidays

- **Yearly Payment** - `./cmd/yearly/main.go`
  - Demonstrates yearly payments on specific months of the year
  - Useful for annual or semi-annual billing cycles

- **Bi-Weekly Payment** - `./cmd/biweekly/main.go`
  - Demonstrates payments every two weeks
  - Shows two different approaches for bi-weekly payments

### Advanced Examples

- **Ordinal Date Specifications** - `./cmd/ordinal/main.go`
  - Demonstrates payments on specific ordinal days (e.g., "first Monday", "last weekday")
  - Shows three different ordinal specifications

- **Combined Payment Types** - `./cmd/combined/main.go`
  - Demonstrates multiple payment types together in a real-world scenario
  - Includes a calendar view to visualize all payments

## Running the Examples

To run an example, navigate to the example directory and use `go run`:

```bash
cd examples/cmd/monthly
go run main.go
```

Each example is self-contained and demonstrates different features of the RecurrenTry library.

## Key Concepts Demonstrated

1. **Different Period Types**
   - One-time payments
   - Weekly recurring payments
   - Monthly recurring payments
   - Yearly recurring payments

2. **Payment Scheduling Options**
   - Specific days of the week/month
   - Ordinal specifications (e.g., "first Monday")
   - Every X weeks/months/years
   - WorkdaysOnly option

3. **Modifications**
   - Editing specific occurrences
   - Deleting specific occurrences
   - Modifying future occurrences

4. **Date Handling**
   - Holiday adjustments
   - Weekend adjustments
   - Grace periods
