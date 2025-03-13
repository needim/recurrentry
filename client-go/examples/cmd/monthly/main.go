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

	// Set up a monthly payment on the 15th of each month for a year
	// If the 15th falls on a weekend, payment will be moved to the next workday
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
				Every:        1,         // Every month
				Each:         []int{15}, // On the 15th of each month
			},
		},
	}

	// Create some modifications to specific occurrences
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
			Index:  5, // Delete the 5th occurrence and all future occurrences
			Payload: map[string]interface{}{
				"deleted": true,
			},
			RestPayload: map[string]interface{}{
				"deleted": true,
			},
		},
	}

	// Generate the recurring entries
	entries, err := recurrentry.Generator(recurrentry.GeneratorOptions{
		Data:          []recurrentry.BaseEntry{monthlyPayment},
		Modifications: modifications,
		WeekendDays:   weekendDays,
		Range: &recurrentry.DateRange{
			Start: startDate,
			End:   startDate.AddDate(1, 0, 0), // One year from start
		},
	})

	if err != nil {
		fmt.Printf("Error generating entries: %v\n", err)
		os.Exit(1)
	}

	// Print the results
	fmt.Printf("Generated %d entries:\n\n", len(entries))

	for i, entry := range entries {
		// Convert to JSON for pretty printing
		entryJSON, _ := json.MarshalIndent(entry, "", "  ")
		fmt.Printf("Entry %d:\n%s\n\n", i+1, string(entryJSON))
	}
}
