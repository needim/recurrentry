package main

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	recurrentry "github.com/needim/recurrentry/client-go"
)

func main() {
	// Create a start date - the first of January 2023 (a Sunday)
	startDate := time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)

	// Set up a bi-weekly payment (every two weeks on Friday) for 6 months
	// This could represent a paycheck that comes every two weeks
	biweeklyPayment := recurrentry.BaseEntry{
		ID:   1,
		Date: startDate,
		Config: &recurrentry.RecurrenceConfig{
			BaseRecurrenceConfig: recurrentry.BaseRecurrenceConfig{
				Start:    startDate,
				Interval: 12, // Generate 12 occurrences
			},
			Period: recurrentry.PeriodWeek,
			Options: recurrentry.RecurrenceOptions{
				Every: 2,        // Every 2 weeks
				Each:  []int{5}, // On Friday (day 5)
			},
		},
	}

	// Alternative: Bi-weekly salary that occurs on the same day of the week as the start date
	biweeklySameDayPayment := recurrentry.BaseEntry{
		ID:   2,
		Date: startDate,
		Config: &recurrentry.RecurrenceConfig{
			BaseRecurrenceConfig: recurrentry.BaseRecurrenceConfig{
				Start:    startDate,
				Interval: 12, // Generate 12 occurrences
			},
			Period: recurrentry.PeriodWeek,
			Options: recurrentry.RecurrenceOptions{
				Every: 2, // Every 2 weeks
				// No "each" specified, so it will use the same day of week as start date
			},
		},
	}

	// Generate the recurring entries
	entries, err := recurrentry.Generator(recurrentry.GeneratorOptions{
		Data: []recurrentry.BaseEntry{
			biweeklyPayment,
			biweeklySameDayPayment,
		},
		Range: &recurrentry.DateRange{
			Start: startDate,
			End:   startDate.AddDate(0, 6, 0), // Six months from start
		},
	})

	if err != nil {
		fmt.Printf("Error generating entries: %v\n", err)
		os.Exit(1)
	}

	// Print the results grouped by payment type
	fmt.Printf("Generated %d entries:\n\n", len(entries))

	// Group entries by their ID
	groupedEntries := make(map[interface{}][]recurrentry.GeneratedEntry)
	for _, entry := range entries {
		id := entry.Entry.ID
		groupedEntries[id] = append(groupedEntries[id], entry)
	}

	// Print bi-weekly Friday payments
	fmt.Println("Bi-Weekly Payments (Every 2 weeks on Friday):")
	for i, entry := range groupedEntries[1] {
		fmt.Printf("  %d: %s (%s)\n",
			i+1,
			entry.ActualDate.Format("2006-01-02"),
			entry.ActualDate.Weekday(),
		)
	}

	// Print bi-weekly same day payments
	fmt.Println("\nBi-Weekly Payments (Every 2 weeks on same day as start):")
	for i, entry := range groupedEntries[2] {
		fmt.Printf("  %d: %s (%s)\n",
			i+1,
			entry.ActualDate.Format("2006-01-02"),
			entry.ActualDate.Weekday(),
		)
	}

	// Print a detailed view of the first occurrence of each type
	fmt.Println("\nDetailed View of First Entries:")
	for id := 1; id <= 2; id++ {
		if len(groupedEntries[id]) > 0 {
			entryJSON, _ := json.MarshalIndent(groupedEntries[id][0], "", "  ")
			fmt.Printf("\nEntry ID %d (First Occurrence):\n%s\n", id, string(entryJSON))
		}
	}
}
