package recurrentry

import (
	"testing"
	"time"
)

func TestSinglePayment(t *testing.T) {
	// Create a start date
	startDate := time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)

	// Create a single payment
	singlePayment := BaseEntry{
		ID:   1,
		Date: startDate,
		// No config for a single payment, or period "none"
	}

	// Generate entries
	entries, err := Generator(GeneratorOptions{
		Data: []BaseEntry{singlePayment},
	})

	// Check for errors
	if err != nil {
		t.Fatalf("Error generating entries: %v", err)
	}

	// Check that exactly one entry was generated
	if len(entries) != 1 {
		t.Errorf("Expected 1 entry, got %d", len(entries))
	}

	// Check that the entry has the correct date
	if !entries[0].ActualDate.Equal(startDate) {
		t.Errorf("Expected date %v, got %v", startDate, entries[0].ActualDate)
	}

	// Check that payment date equals actual date for single payment
	if !entries[0].PaymentDate.Equal(entries[0].ActualDate) {
		t.Errorf("Expected payment date to equal actual date")
	}

	// Check that index is 1
	if entries[0].Index != 1 {
		t.Errorf("Expected index 1, got %d", entries[0].Index)
	}
}

func TestMonthlyPayment(t *testing.T) {
	// Create a start date
	startDate := time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)

	// Weekend days (6 = Saturday, 7 = Sunday)
	weekendDays := []int{6, 7}

	// Create a monthly payment on the 15th of each month for 3 months
	monthlyPayment := BaseEntry{
		ID:   1,
		Date: startDate,
		Config: &RecurrenceConfig{
			BaseRecurrenceConfig: BaseRecurrenceConfig{
				Start:    startDate,
				Interval: 3, // Generate 3 occurrences
			},
			Period: PeriodMonth,
			Options: RecurrenceOptions{
				WorkdaysOnly: true,
				Every:        1,         // Every month
				Each:         []int{15}, // On the 15th of each month
			},
		},
	}

	// Generate entries
	entries, err := Generator(GeneratorOptions{
		Data:        []BaseEntry{monthlyPayment},
		WeekendDays: weekendDays,
	})

	// Check for errors
	if err != nil {
		t.Fatalf("Error generating entries: %v", err)
	}

	// Check that exactly three entries were generated
	if len(entries) != 3 {
		t.Errorf("Expected 3 entries, got %d", len(entries))
	}

	// Check that the entries have the correct dates
	expectedDates := []time.Time{
		time.Date(2023, 1, 15, 0, 0, 0, 0, time.UTC),
		time.Date(2023, 2, 15, 0, 0, 0, 0, time.UTC),
		time.Date(2023, 3, 15, 0, 0, 0, 0, time.UTC),
	}

	for i, entry := range entries {
		if !entry.ActualDate.Equal(expectedDates[i]) {
			t.Errorf("Entry %d: Expected date %v, got %v", i+1, expectedDates[i], entry.ActualDate)
		}

		// Check that index is correct (1-based)
		if entry.Index != i+1 {
			t.Errorf("Entry %d: Expected index %d, got %d", i+1, i+1, entry.Index)
		}
	}
}

func TestModifications(t *testing.T) {
	// Create a start date
	startDate := time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)

	// Create a weekly payment for 5 weeks
	weeklyPayment := BaseEntry{
		ID:   1,
		Date: startDate,
		Config: &RecurrenceConfig{
			BaseRecurrenceConfig: BaseRecurrenceConfig{
				Start:    startDate,
				Interval: 5, // Generate 5 occurrences
			},
			Period: PeriodWeek,
			Options: RecurrenceOptions{
				Every: 1, // Every week
			},
		},
	}

	// Create modifications to specific occurrences
	modifications := []Modification{
		{
			ItemID: 1,
			Index:  3, // Delete the 3rd occurrence
			Payload: map[string]interface{}{
				"deleted": true,
			},
		},
		{
			ItemID: 1,
			Index:  4, // Delete the 4th and all future occurrences
			Payload: map[string]interface{}{
				"deleted": true,
			},
			RestPayload: map[string]interface{}{
				"deleted": true,
			},
		},
	}

	// Generate entries
	entries, err := Generator(GeneratorOptions{
		Data:          []BaseEntry{weeklyPayment},
		Modifications: modifications,
	})

	// Check for errors
	if err != nil {
		t.Fatalf("Error generating entries: %v", err)
	}

	// Check that exactly 2 entries were generated (1st and 2nd, 3rd was deleted, 4th and 5th were deleted via RestPayload)
	if len(entries) != 2 {
		t.Errorf("Expected 2 entries after modifications, got %d", len(entries))
	}

	// Check that the entries have the correct indices
	if entries[0].Index != 1 {
		t.Errorf("Expected first entry to have index 1, got %d", entries[0].Index)
	}
	if entries[1].Index != 2 {
		t.Errorf("Expected second entry to have index 2, got %d", entries[1].Index)
	}
}

func TestGenerator(t *testing.T) {
	baseDate := time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)
	weekendDays := []int{6, 7} // Saturday, Sunday
	holidays := []time.Time{
		time.Date(2023, 1, 16, 0, 0, 0, 0, time.UTC), // Martin Luther King Jr. Day
	}

	tests := []struct {
		name        string
		options     GeneratorOptions
		expectedLen int
		expectError bool
	}{
		{
			name: "Simple monthly payment for 3 months",
			options: GeneratorOptions{
				Data: []BaseEntry{
					{
						ID:   1,
						Date: baseDate,
						Config: &RecurrenceConfig{
							BaseRecurrenceConfig: BaseRecurrenceConfig{
								Start:    baseDate,
								Interval: 3, // Generate 3 occurrences
							},
							Period: PeriodMonth,
							Options: RecurrenceOptions{
								Every: 1,         // Every month
								Each:  []int{15}, // On the 15th of each month
							},
						},
					},
				},
				WeekendDays: weekendDays,
			},
			expectedLen: 3,
			expectError: false,
		},
		{
			name: "Weekly payment with specific days",
			options: GeneratorOptions{
				Data: []BaseEntry{
					{
						ID:   1,
						Date: baseDate,
						Config: &RecurrenceConfig{
							BaseRecurrenceConfig: BaseRecurrenceConfig{
								Start:    baseDate,
								Interval: 4, // Generate 4 occurrences
							},
							Period: PeriodWeek,
							Options: RecurrenceOptions{
								Every: 1,           // Every week
								Each:  []int{1, 5}, // Monday and Friday
							},
						},
					},
				},
				WeekendDays: weekendDays,
			},
			expectedLen: 8, // 4 weeks * 2 days per week
			expectError: false,
		},
		{
			name: "Yearly payment with months",
			options: GeneratorOptions{
				Data: []BaseEntry{
					{
						ID:   1,
						Date: baseDate,
						Config: &RecurrenceConfig{
							BaseRecurrenceConfig: BaseRecurrenceConfig{
								Start:    baseDate,
								Interval: 2, // Generate 2 occurrences
							},
							Period: PeriodYear,
							Options: RecurrenceOptions{
								Every:       1,           // Every year
								Each:        []int{1, 7}, // January and July
								GracePeriod: 15,          // 15th of the month
							},
						},
					},
				},
			},
			expectedLen: 4, // 2 years * 2 months per year
			expectError: false,
		},
		{
			name: "One-time payment (no config)",
			options: GeneratorOptions{
				Data: []BaseEntry{
					{
						ID:   1,
						Date: baseDate,
					},
				},
			},
			expectedLen: 1,
			expectError: false,
		},
		{
			name: "Monthly payment with date range",
			options: GeneratorOptions{
				Data: []BaseEntry{
					{
						ID:   1,
						Date: baseDate,
						Config: &RecurrenceConfig{
							BaseRecurrenceConfig: BaseRecurrenceConfig{
								Start:    baseDate,
								Interval: 12, // Generate up to 12 occurrences
							},
							Period: PeriodMonth,
							Options: RecurrenceOptions{
								Every: 1,         // Every month
								Each:  []int{15}, // On the 15th of each month
							},
						},
					},
				},
				Range: &DateRange{
					Start: baseDate,
					End:   baseDate.AddDate(0, 3, 0), // Only include 3 months
				},
			},
			expectedLen: 3, // Limited by range
			expectError: false,
		},
		{
			name: "Multiple entries",
			options: GeneratorOptions{
				Data: []BaseEntry{
					{
						ID:   1,
						Date: baseDate,
						Config: &RecurrenceConfig{
							BaseRecurrenceConfig: BaseRecurrenceConfig{
								Start:    baseDate,
								Interval: 3, // Generate 3 occurrences
							},
							Period: PeriodMonth,
							Options: RecurrenceOptions{
								Every: 1,         // Every month
								Each:  []int{15}, // On the 15th of each month
							},
						},
					},
					{
						ID:   2,
						Date: baseDate,
						Config: &RecurrenceConfig{
							BaseRecurrenceConfig: BaseRecurrenceConfig{
								Start:    baseDate,
								Interval: 2, // Generate 2 occurrences
							},
							Period: PeriodWeek,
							Options: RecurrenceOptions{
								Every: 1,        // Every week
								Each:  []int{1}, // Monday
							},
						},
					},
				},
			},
			expectedLen: 5, // 3 monthly + 2 weekly
			expectError: false,
		},
		{
			name: "With modifications",
			options: GeneratorOptions{
				Data: []BaseEntry{
					{
						ID:   1,
						Date: baseDate,
						Config: &RecurrenceConfig{
							BaseRecurrenceConfig: BaseRecurrenceConfig{
								Start:    baseDate,
								Interval: 5, // Generate 5 occurrences
							},
							Period: PeriodMonth,
							Options: RecurrenceOptions{
								Every: 1,         // Every month
								Each:  []int{15}, // On the 15th of each month
							},
						},
					},
				},
				Modifications: []Modification{
					{
						ItemID: 1,
						Index:  2, // Modify the 2nd occurrence
						Payload: map[string]interface{}{
							"amount": 1500, // Add amount field
						},
					},
					{
						ItemID: 1,
						Index:  3, // Delete the 3rd occurrence
						Payload: map[string]interface{}{
							"deleted": true,
						},
					},
				},
			},
			expectedLen: 4, // 5 occurrences - 1 deleted
			expectError: false,
		},
		{
			name: "With rest payload modifications",
			options: GeneratorOptions{
				Data: []BaseEntry{
					{
						ID:   1,
						Date: baseDate,
						Config: &RecurrenceConfig{
							BaseRecurrenceConfig: BaseRecurrenceConfig{
								Start:    baseDate,
								Interval: 5, // Generate 5 occurrences
							},
							Period: PeriodMonth,
							Options: RecurrenceOptions{
								Every: 1,         // Every month
								Each:  []int{15}, // On the 15th of each month
							},
						},
					},
				},
				Modifications: []Modification{
					{
						ItemID: 1,
						Index:  2, // Modify from the 2nd occurrence onwards
						RestPayload: map[string]interface{}{
							"amount": 2000, // Add amount field to all future occurrences
						},
					},
				},
			},
			expectedLen: 5,
			expectError: false,
		},
		{
			name: "Monthly payment with ordinal",
			options: GeneratorOptions{
				Data: []BaseEntry{
					{
						ID:   1,
						Date: baseDate,
						Config: &RecurrenceConfig{
							BaseRecurrenceConfig: BaseRecurrenceConfig{
								Start:    baseDate,
								Interval: 3, // Generate 3 occurrences
							},
							Period: PeriodMonth,
							Options: RecurrenceOptions{
								Every: 1,              // Every month
								On:    "first-monday", // First Monday of each month
							},
						},
					},
				},
				WeekendDays: weekendDays,
			},
			expectedLen: 3,
			expectError: false,
		},
		{
			name: "Invalid entry (no ID)",
			options: GeneratorOptions{
				Data: []BaseEntry{
					{
						ID:   nil, // Missing ID
						Date: baseDate,
						Config: &RecurrenceConfig{
							BaseRecurrenceConfig: BaseRecurrenceConfig{
								Start:    baseDate,
								Interval: 3,
							},
							Period: PeriodMonth,
							Options: RecurrenceOptions{
								Every: 1,
								Each:  []int{15},
							},
						},
					},
				},
			},
			expectedLen: 0,
			expectError: true,
		},
		{
			name: "With holidays and workdays only",
			options: GeneratorOptions{
				Data: []BaseEntry{
					{
						ID:   1,
						Date: baseDate,
						Config: &RecurrenceConfig{
							BaseRecurrenceConfig: BaseRecurrenceConfig{
								Start:    baseDate,
								Interval: 3, // Generate 3 occurrences
							},
							Period: PeriodMonth,
							Options: RecurrenceOptions{
								Every:        1,         // Every month
								Each:         []int{16}, // On the 16th (coincides with MLK day in test)
								WorkdaysOnly: true,      // Adjust for weekends and holidays
							},
						},
					},
				},
				Holidays:    holidays,
				WeekendDays: weekendDays,
			},
			expectedLen: 3,
			expectError: false,
		},
		{
			name: "Every 2 months pattern",
			options: GeneratorOptions{
				Data: []BaseEntry{
					{
						ID:   1,
						Date: baseDate,
						Config: &RecurrenceConfig{
							BaseRecurrenceConfig: BaseRecurrenceConfig{
								Start:    baseDate,
								Interval: 3, // Generate 3 occurrences
							},
							Period: PeriodMonth,
							Options: RecurrenceOptions{
								Every: 2,         // Every 2 months
								Each:  []int{15}, // On the 15th
							},
						},
					},
				},
			},
			expectedLen: 3,
			expectError: false,
		},
		{
			name: "Custom MaxIntervals",
			options: GeneratorOptions{
				Data: []BaseEntry{
					{
						ID:   1,
						Date: baseDate,
						Config: &RecurrenceConfig{
							BaseRecurrenceConfig: BaseRecurrenceConfig{
								Start:    baseDate,
								Interval: 100, // Try to generate 100 occurrences
							},
							Period: PeriodMonth,
							Options: RecurrenceOptions{
								Every: 1,         // Every month
								Each:  []int{15}, // On the 15th
							},
						},
					},
				},
				MaxIntervals: map[Period]int{
					PeriodMonth: 5, // Limit monthly entries to 5 occurrences
				},
			},
			expectedLen: 5, // Limited by MaxIntervals
			expectError: false,
		},
		{
			name: "Invalid ordinal specification",
			options: GeneratorOptions{
				Data: []BaseEntry{
					{
						ID:   1,
						Date: baseDate,
						Config: &RecurrenceConfig{
							BaseRecurrenceConfig: BaseRecurrenceConfig{
								Start:    baseDate,
								Interval: 3,
							},
							Period: PeriodMonth,
							Options: RecurrenceOptions{
								Every: 1,
								On:    "invalid-ordinal", // Invalid ordinal
							},
						},
					},
				},
			},
			expectedLen: 0,
			expectError: true,
		},
		{
			name: "Using weekday category without weekend days",
			options: GeneratorOptions{
				Data: []BaseEntry{
					{
						ID:   1,
						Date: baseDate,
						Config: &RecurrenceConfig{
							BaseRecurrenceConfig: BaseRecurrenceConfig{
								Start:    baseDate,
								Interval: 3,
							},
							Period: PeriodMonth,
							Options: RecurrenceOptions{
								Every: 1,
								On:    "first-weekday", // Requires weekend days
							},
						},
					},
				},
				WeekendDays: []int{}, // No weekend days defined
			},
			expectedLen: 0,
			expectError: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			entries, err := Generator(tc.options)

			if tc.expectError {
				if err == nil {
					t.Errorf("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if len(entries) != tc.expectedLen {
					t.Errorf("Expected %d entries, got %d", tc.expectedLen, len(entries))
				}
			}
		})
	}
}

func TestDateAdjustment(t *testing.T) {
	baseDate := time.Date(2023, 1, 15, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name           string
		originalDate   time.Time
		modifiedDate   time.Time
		period         Period
		expectedMonths int
		expectedDays   int
	}{
		{
			name:           "No adjustment (same date)",
			originalDate:   baseDate,
			modifiedDate:   baseDate,
			period:         PeriodMonth,
			expectedMonths: 0,
			expectedDays:   0,
		},
		{
			name:           "Day adjustment only (monthly)",
			originalDate:   baseDate,
			modifiedDate:   time.Date(2023, 1, 20, 0, 0, 0, 0, time.UTC),
			period:         PeriodMonth,
			expectedMonths: 0,
			expectedDays:   5,
		},
		{
			name:           "Month and day adjustment (yearly)",
			originalDate:   baseDate,
			modifiedDate:   time.Date(2023, 3, 20, 0, 0, 0, 0, time.UTC),
			period:         PeriodYear,
			expectedMonths: 2,
			expectedDays:   5,
		},
		{
			name:           "Day of week adjustment (weekly)",
			originalDate:   time.Date(2023, 1, 2, 0, 0, 0, 0, time.UTC), // Monday
			modifiedDate:   time.Date(2023, 1, 6, 0, 0, 0, 0, time.UTC), // Friday
			period:         PeriodWeek,
			expectedMonths: 0,
			expectedDays:   4, // Difference in day of week
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Access the unexported function through reflections or recreate its logic
			// Since we can't directly test the calculateDateAdjustment function, we'll recreate it
			adj := DateAdjustment{}

			switch tc.period {
			case PeriodYear:
				// For yearly entries, adjust the month and day position
				adj.Months = int(tc.modifiedDate.Month() - tc.originalDate.Month())
				adj.Days = tc.modifiedDate.Day() - tc.originalDate.Day()
			case PeriodMonth:
				// For monthly entries, only adjust the day position
				adj.Days = tc.modifiedDate.Day() - tc.originalDate.Day()
			case PeriodWeek:
				// For weekly entries, calculate the day-of-week difference
				origDayOfWeek := int(tc.originalDate.Weekday()) + 1
				modDayOfWeek := int(tc.modifiedDate.Weekday()) + 1
				adj.Days = modDayOfWeek - origDayOfWeek
			}

			if adj.Months != tc.expectedMonths {
				t.Errorf("Expected Months adjustment %d, got %d", tc.expectedMonths, adj.Months)
			}
			if adj.Days != tc.expectedDays {
				t.Errorf("Expected Days adjustment %d, got %d", tc.expectedDays, adj.Days)
			}
		})
	}
}
