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

	// Set up a yearly payment on April 15 and October 15 for 5 years
	// This could represent tax payments or bi-annual insurance premiums
	yearlyPayment := recurrentry.BaseEntry{
		ID:   1,
		Date: startDate,
		Config: &recurrentry.RecurrenceConfig{
			BaseRecurrenceConfig: recurrentry.BaseRecurrenceConfig{
				Start:    startDate,
				Interval: 5, // Generate 5 years of occurrences
			},
			Period: recurrentry.PeriodYear,
			Options: recurrentry.RecurrenceOptions{
				Every:       1,            // Every year
				Each:        []int{4, 10}, // April (4) and October (10)
				GracePeriod: 0,
			},
		},
	}

	// Create modifications to specific occurrences
	modifications := []recurrentry.Modification{
		{
			ItemID: 1,
			Index:  3, // Modify the 3rd occurrence (second year, April)
			Payload: map[string]interface{}{
				"amount": 2500, // Change amount for this occurrence
			},
		},
	}

	// Generate the recurring entries
	entries, err := recurrentry.Generator(recurrentry.GeneratorOptions{
		Data:          []recurrentry.BaseEntry{yearlyPayment},
		Modifications: modifications,
		Range: &recurrentry.DateRange{
			Start: startDate,
			End:   startDate.AddDate(5, 0, 0), // Five years from start
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

	// Print detailed JSON for one of the modified entries
	fmt.Println("\nDetailed View of Modified Entry (3rd occurrence):")
	for _, entry := range entries {
		if entry.Index == 3 {
			// Convert to JSON for pretty printing
			entryJSON, _ := json.MarshalIndent(entry, "", "  ")
			fmt.Printf("%s\n", string(entryJSON))
			break
		}
	}
}
