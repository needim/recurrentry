package main

import (
	"encoding/json"
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

	// Example 1: Monthly payment on the first Monday of each month for 6 months
	firstMondayPayment := recurrentry.BaseEntry{
		ID:   1,
		Date: startDate,
		Config: &recurrentry.RecurrenceConfig{
			BaseRecurrenceConfig: recurrentry.BaseRecurrenceConfig{
				Start:    startDate,
				Interval: 6, // Generate 6 occurrences
			},
			Period: recurrentry.PeriodMonth,
			Options: recurrentry.RecurrenceOptions{
				Every: 1,              // Every month
				On:    "first-monday", // First Monday of each month
			},
		},
	}

	// Example 2: Monthly payment on the last working day of each month for 6 months
	lastWorkdayPayment := recurrentry.BaseEntry{
		ID:   2,
		Date: startDate,
		Config: &recurrentry.RecurrenceConfig{
			BaseRecurrenceConfig: recurrentry.BaseRecurrenceConfig{
				Start:    startDate,
				Interval: 6, // Generate 6 occurrences
			},
			Period: recurrentry.PeriodMonth,
			Options: recurrentry.RecurrenceOptions{
				Every: 1,              // Every month
				On:    "last-weekday", // Last weekday of each month
			},
		},
	}

	// Example 3: Monthly payment on the third Friday of each month for 6 months
	thirdFridayPayment := recurrentry.BaseEntry{
		ID:   3,
		Date: startDate,
		Config: &recurrentry.RecurrenceConfig{
			BaseRecurrenceConfig: recurrentry.BaseRecurrenceConfig{
				Start:    startDate,
				Interval: 6, // Generate 6 occurrences
			},
			Period: recurrentry.PeriodMonth,
			Options: recurrentry.RecurrenceOptions{
				Every: 1,              // Every month
				On:    "third-friday", // Third Friday of each month
			},
		},
	}

	// Generate the recurring entries
	entries, err := recurrentry.Generator(recurrentry.GeneratorOptions{
		Data: []recurrentry.BaseEntry{
			firstMondayPayment,
			lastWorkdayPayment,
			thirdFridayPayment,
		},
		WeekendDays: weekendDays,
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

	// Print first Monday payments
	fmt.Println("First Monday of Each Month:")
	for i, entry := range groupedEntries[1] {
		fmt.Printf("  %d: %s\n", i+1, entry.ActualDate.Format("2006-01-02"))
	}

	// Print last workday payments
	fmt.Println("\nLast Working Day of Each Month:")
	for i, entry := range groupedEntries[2] {
		fmt.Printf("  %d: %s\n", i+1, entry.ActualDate.Format("2006-01-02"))
	}

	// Print third Friday payments
	fmt.Println("\nThird Friday of Each Month:")
	for i, entry := range groupedEntries[3] {
		fmt.Printf("  %d: %s\n", i+1, entry.ActualDate.Format("2006-01-02"))
	}

	// Print a detailed view of one entry from each type
	fmt.Println("\nDetailed View of First Entries:")
	for id := 1; id <= 3; id++ {
		if len(groupedEntries[id]) > 0 {
			entryJSON, _ := json.MarshalIndent(groupedEntries[id][0], "", "  ")
			fmt.Printf("\nEntry ID %d (First Occurrence):\n%s\n", id, string(entryJSON))
		}
	}
}
