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

	// Set up a weekly payment on Monday and Friday for 10 weeks
	// If the payment date falls on a holiday, it will be moved to the next workday
	weeklyPayment := recurrentry.BaseEntry{
		ID:   1,
		Date: startDate,
		Config: &recurrentry.RecurrenceConfig{
			BaseRecurrenceConfig: recurrentry.BaseRecurrenceConfig{
				Start:    startDate,
				Interval: 10, // Generate 10 occurrences
			},
			Period: recurrentry.PeriodWeek,
			Options: recurrentry.RecurrenceOptions{
				WorkdaysOnly: true,
				Every:        1,           // Every week
				Each:         []int{1, 5}, // Monday (1) and Friday (5)
			},
		},
	}

	// Define some holidays
	holidays := []time.Time{
		time.Date(2023, 1, 2, 0, 0, 0, 0, time.UTC),  // New Year's Day (observed)
		time.Date(2023, 1, 16, 0, 0, 0, 0, time.UTC), // Martin Luther King Jr. Day
	}

	// Generate the recurring entries
	entries, err := recurrentry.Generator(recurrentry.GeneratorOptions{
		Data:        []recurrentry.BaseEntry{weeklyPayment},
		Holidays:    holidays,
		WeekendDays: weekendDays,
		Range: &recurrentry.DateRange{
			Start: startDate,
			End:   startDate.AddDate(0, 3, 0), // Three months from start
		},
	})

	if err != nil {
		fmt.Printf("Error generating entries: %v\n", err)
		os.Exit(1)
	}

	// Print the results
	fmt.Printf("Generated %d entries:\n\n", len(entries))

	for i, entry := range entries {
		fmt.Printf("Entry %d: ActualDate=%s, PaymentDate=%s (Index: %d)\n",
			i+1,
			entry.ActualDate.Format("2006-01-02"),
			entry.PaymentDate.Format("2006-01-02"),
			entry.Index,
		)
	}

	// Print a detailed view of the first few entries
	fmt.Println("\nDetailed View of First 3 Entries:")
	for i := 0; i < min(3, len(entries)); i++ {
		// Convert to JSON for pretty printing
		entryJSON, _ := json.MarshalIndent(entries[i], "", "  ")
		fmt.Printf("\nEntry %d:\n%s\n", i+1, string(entryJSON))
	}
}

// min returns the smaller of x or y
func min(x, y int) int {
	if x < y {
		return x
	}
	return y
}
