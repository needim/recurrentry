package main

import (
	"fmt"
	"os"
	"time"

	recurrentry "github.com/needim/recurrentry/client-go"
)

func main() {
	// Create a start date - the first of January 2023
	startDate := time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)

	// Weekend days (6 = Saturday, 7 = Sunday in our numbering)
	weekendDays := []int{6, 7}

	// Define some holidays
	holidays := []time.Time{
		time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),  // New Year's Day
		time.Date(2023, 5, 29, 0, 0, 0, 0, time.UTC), // Memorial Day
		time.Date(2023, 7, 4, 0, 0, 0, 0, time.UTC),  // Independence Day
	}

	// Example entries:
	entries := []recurrentry.BaseEntry{
		// 1. Monthly rent payment on the 1st day of each month
		{
			ID:   "rent",
			Date: startDate,
			Config: &recurrentry.RecurrenceConfig{
				BaseRecurrenceConfig: recurrentry.BaseRecurrenceConfig{
					Start:    startDate,
					Interval: 12, // 12 months
				},
				Period: recurrentry.PeriodMonth,
				Options: recurrentry.RecurrenceOptions{
					Every:        1,        // Every month
					Each:         []int{1}, // On the 1st
					WorkdaysOnly: true,     // If 1st is weekend/holiday, move to next workday
					GracePeriod:  0,
				},
			},
		},
		// 2. Bi-weekly paycheck on Fridays
		{
			ID:   "salary",
			Date: startDate,
			Config: &recurrentry.RecurrenceConfig{
				BaseRecurrenceConfig: recurrentry.BaseRecurrenceConfig{
					Start:    startDate,
					Interval: 26, // 26 payments per year
				},
				Period: recurrentry.PeriodWeek,
				Options: recurrentry.RecurrenceOptions{
					Every:        2,        // Every two weeks
					Each:         []int{5}, // On Fridays
					WorkdaysOnly: false,
				},
			},
		},
		// 3. Quarterly tax payments (on the 15th of January, April, July, October)
		{
			ID:   "taxes",
			Date: startDate,
			Config: &recurrentry.RecurrenceConfig{
				BaseRecurrenceConfig: recurrentry.BaseRecurrenceConfig{
					Start:    startDate,
					Interval: 4, // 4 occurrences per year
				},
				Period: recurrentry.PeriodYear,
				Options: recurrentry.RecurrenceOptions{
					Every:       1,                  // Every year
					Each:        []int{1, 4, 7, 10}, // Jan, Apr, Jul, Oct
					GracePeriod: 15,                 // Due on the 15th day
				},
			},
		},
		// 4. Annual insurance payment
		{
			ID:   "insurance",
			Date: startDate,
			Config: &recurrentry.RecurrenceConfig{
				BaseRecurrenceConfig: recurrentry.BaseRecurrenceConfig{
					Start:    startDate,
					Interval: 5, // 5 years
				},
				Period: recurrentry.PeriodYear,
				Options: recurrentry.RecurrenceOptions{
					Every:       1,        // Every year
					Each:        []int{6}, // June
					GracePeriod: 15,       // Due on the 15th
				},
			},
		},
		// 5. One-time payment
		{
			ID:   "one-time",
			Date: time.Date(2023, 3, 15, 0, 0, 0, 0, time.UTC),
			// No config for one-time payment
		},
	}

	// Generate the recurring entries
	generatedEntries, err := recurrentry.Generator(recurrentry.GeneratorOptions{
		Data:        entries,
		Holidays:    holidays,
		WeekendDays: weekendDays,
		Range: &recurrentry.DateRange{
			Start: startDate,
			End:   startDate.AddDate(1, 0, 0), // One year from start
		},
	})

	if err != nil {
		fmt.Printf("Error generating entries: %v\n", err)
		os.Exit(1)
	}

	// Print the results grouped by payment type
	fmt.Printf("Generated %d entries for a one-year period:\n\n", len(generatedEntries))

	// Group entries by their ID
	groupedEntries := make(map[interface{}][]recurrentry.GeneratedEntry)
	for _, entry := range generatedEntries {
		id := entry.Entry.ID
		groupedEntries[id] = append(groupedEntries[id], entry)
	}

	// Print details for each type
	printGroupSummary(groupedEntries, "rent", "Monthly Rent Payments")
	printGroupSummary(groupedEntries, "salary", "Bi-Weekly Salary Payments")
	printGroupSummary(groupedEntries, "taxes", "Quarterly Tax Payments")
	printGroupSummary(groupedEntries, "insurance", "Annual Insurance Payments")
	printGroupSummary(groupedEntries, "one-time", "One-Time Payments")

	// Print a calendar view of all payments for each month
	printMonthlyCalendar(generatedEntries)
}

// printGroupSummary prints a summary of entries for a specific group
func printGroupSummary(groupedEntries map[interface{}][]recurrentry.GeneratedEntry, id interface{}, title string) {
	entries, exists := groupedEntries[id]
	if !exists || len(entries) == 0 {
		return
	}

	fmt.Printf("\n%s (%d entries):\n", title, len(entries))
	for i, entry := range entries {
		fmt.Printf("  %d: ActualDate=%s, PaymentDate=%s (%s)\n",
			i+1,
			entry.ActualDate.Format("2006-01-02"),
			entry.PaymentDate.Format("2006-01-02"),
			entry.ActualDate.Weekday(),
		)
	}
}

// printMonthlyCalendar prints a calendar view of all payments by month
func printMonthlyCalendar(entries []recurrentry.GeneratedEntry) {
	// Group entries by month
	entriesByMonth := make(map[string][]recurrentry.GeneratedEntry)
	for _, entry := range entries {
		month := entry.ActualDate.Format("2006-01")
		entriesByMonth[month] = append(entriesByMonth[month], entry)
	}

	fmt.Println("\nMonthly Calendar View:")

	// Sort months (they're already in YYYY-MM format so string sorting works)
	var months []string
	for month := range entriesByMonth {
		months = append(months, month)
	}

	// We don't need to sort explicitly since we're going through a full year in order

	// Print entries for each month
	for _, month := range months {
		monthEntries := entriesByMonth[month]
		parsedMonth, _ := time.Parse("2006-01", month)
		fmt.Printf("\n%s:\n", parsedMonth.Format("January 2006"))

		for _, entry := range monthEntries {
			fmt.Printf("  %s: %v (Payment due: %s)\n",
				entry.ActualDate.Format("Mon 02"),
				entry.Entry.ID,
				entry.PaymentDate.Format("2006-01-02"),
			)
		}
	}
}
