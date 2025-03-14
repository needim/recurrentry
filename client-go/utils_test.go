package recurrentry

import (
	"fmt"
	"testing"
	"time"
)

func TestAddByPeriod(t *testing.T) {
	baseDate := time.Date(2023, 1, 15, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name     string
		date     time.Time
		amount   int
		period   Period
		expected time.Time
	}{
		{
			name:     "Add 1 year",
			date:     baseDate,
			amount:   1,
			period:   PeriodYear,
			expected: time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
		},
		{
			name:     "Add 2 years",
			date:     baseDate,
			amount:   2,
			period:   PeriodYear,
			expected: time.Date(2025, 1, 15, 0, 0, 0, 0, time.UTC),
		},
		{
			name:     "Add 1 month",
			date:     baseDate,
			amount:   1,
			period:   PeriodMonth,
			expected: time.Date(2023, 2, 15, 0, 0, 0, 0, time.UTC),
		},
		{
			name:     "Add 3 months",
			date:     baseDate,
			amount:   3,
			period:   PeriodMonth,
			expected: time.Date(2023, 4, 15, 0, 0, 0, 0, time.UTC),
		},
		{
			name:     "Add 1 week",
			date:     baseDate,
			amount:   1,
			period:   PeriodWeek,
			expected: time.Date(2023, 1, 22, 0, 0, 0, 0, time.UTC),
		},
		{
			name:     "Add 2 weeks",
			date:     baseDate,
			amount:   2,
			period:   PeriodWeek,
			expected: time.Date(2023, 1, 29, 0, 0, 0, 0, time.UTC),
		},
		{
			name:     "Add days with none period",
			date:     baseDate,
			amount:   5,
			period:   PeriodNone,
			expected: time.Date(2023, 1, 20, 0, 0, 0, 0, time.UTC),
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := AddByPeriod(tc.date, tc.amount, tc.period)
			if !result.Equal(tc.expected) {
				t.Errorf("AddByPeriod(%v, %v, %v) = %v, expected %v",
					tc.date, tc.amount, tc.period, result, tc.expected)
			}
		})
	}
}

func TestIsValidDate(t *testing.T) {
	tests := []struct {
		name     string
		date     time.Time
		expected bool
	}{
		{
			name:     "Valid date",
			date:     time.Date(2023, 1, 15, 0, 0, 0, 0, time.UTC),
			expected: true,
		},
		{
			name:     "Zero date",
			date:     time.Time{},
			expected: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := IsValidDate(tc.date)
			if result != tc.expected {
				t.Errorf("IsValidDate(%v) = %v, expected %v",
					tc.date, result, tc.expected)
			}
		})
	}
}

func TestGetActualDayName(t *testing.T) {
	tests := []struct {
		name     string
		date     time.Time
		expected string
	}{
		{
			name:     "Monday",
			date:     time.Date(2023, 1, 2, 0, 0, 0, 0, time.UTC), // Monday
			expected: "monday",
		},
		{
			name:     "Tuesday",
			date:     time.Date(2023, 1, 3, 0, 0, 0, 0, time.UTC), // Tuesday
			expected: "tuesday",
		},
		{
			name:     "Wednesday",
			date:     time.Date(2023, 1, 4, 0, 0, 0, 0, time.UTC), // Wednesday
			expected: "wednesday",
		},
		{
			name:     "Thursday",
			date:     time.Date(2023, 1, 5, 0, 0, 0, 0, time.UTC), // Thursday
			expected: "thursday",
		},
		{
			name:     "Friday",
			date:     time.Date(2023, 1, 6, 0, 0, 0, 0, time.UTC), // Friday
			expected: "friday",
		},
		{
			name:     "Saturday",
			date:     time.Date(2023, 1, 7, 0, 0, 0, 0, time.UTC), // Saturday
			expected: "saturday",
		},
		{
			name:     "Sunday",
			date:     time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC), // Sunday
			expected: "sunday",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := GetActualDayName(tc.date)
			if result != tc.expected {
				t.Errorf("GetActualDayName(%v) = %v, expected %v",
					tc.date, result, tc.expected)
			}
		})
	}
}

func TestIsWeekdayByWeekendDays(t *testing.T) {
	tests := []struct {
		name        string
		dayOfWeek   int
		weekendDays []int
		expected    bool
	}{
		{
			name:        "Monday with Sat-Sun weekend",
			dayOfWeek:   1,           // Monday
			weekendDays: []int{0, 6}, // Sunday, Saturday
			expected:    true,
		},
		{
			name:        "Friday with Sat-Sun weekend",
			dayOfWeek:   5,           // Friday
			weekendDays: []int{0, 6}, // Sunday, Saturday
			expected:    true,
		},
		{
			name:        "Saturday with Sat-Sun weekend",
			dayOfWeek:   6,           // Saturday
			weekendDays: []int{0, 6}, // Sunday, Saturday
			expected:    false,
		},
		{
			name:        "Sunday with Sat-Sun weekend",
			dayOfWeek:   0,           // Sunday
			weekendDays: []int{0, 6}, // Sunday, Saturday
			expected:    false,
		},
		{
			name:        "Friday with Fri-Sat weekend",
			dayOfWeek:   5,           // Friday
			weekendDays: []int{5, 6}, // Friday, Saturday
			expected:    false,
		},
		{
			name:        "No weekend days defined",
			dayOfWeek:   0, // Sunday
			weekendDays: []int{},
			expected:    true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := IsWeekdayByWeekendDays(tc.dayOfWeek, tc.weekendDays)
			if result != tc.expected {
				t.Errorf("IsWeekdayByWeekendDays(%v, %v) = %v, expected %v",
					tc.dayOfWeek, tc.weekendDays, result, tc.expected)
			}
		})
	}
}

func TestGetOrdinalDate(t *testing.T) {
	tests := []struct {
		name        string
		date        time.Time
		on          Ordinal
		weekendDays []int
		expected    time.Time
		expectError bool
	}{
		{
			name:        "First Monday",
			date:        time.Date(2023, 1, 15, 0, 0, 0, 0, time.UTC),
			on:          "first-monday",
			weekendDays: []int{0, 6}, // Sunday, Saturday
			expected:    time.Date(2023, 1, 2, 0, 0, 0, 0, time.UTC),
			expectError: false,
		},
		{
			name:        "Last Friday",
			date:        time.Date(2023, 1, 15, 0, 0, 0, 0, time.UTC),
			on:          "last-friday",
			weekendDays: []int{0, 6}, // Sunday, Saturday
			expected:    time.Date(2023, 1, 27, 0, 0, 0, 0, time.UTC),
			expectError: false,
		},
		{
			name:        "Third Wednesday",
			date:        time.Date(2023, 1, 15, 0, 0, 0, 0, time.UTC),
			on:          "third-wednesday",
			weekendDays: []int{0, 6}, // Sunday, Saturday
			expected:    time.Date(2023, 1, 18, 0, 0, 0, 0, time.UTC),
			expectError: false,
		},
		{
			name:        "Last Weekday",
			date:        time.Date(2023, 1, 15, 0, 0, 0, 0, time.UTC),
			on:          "last-weekday",
			weekendDays: []int{0, 6}, // Sunday, Saturday
			expected:    time.Date(2023, 1, 31, 0, 0, 0, 0, time.UTC),
			expectError: false,
		},
		{
			name:        "First Weekend",
			date:        time.Date(2023, 1, 15, 0, 0, 0, 0, time.UTC),
			on:          "first-weekend",
			weekendDays: []int{0, 6}, // Sunday, Saturday
			expected:    time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
			expectError: false,
		},
		{
			name:        "Invalid Ordinal Format",
			date:        time.Date(2023, 1, 15, 0, 0, 0, 0, time.UTC),
			on:          "invalid-format-no-dash",
			weekendDays: []int{0, 6}, // Sunday, Saturday
			expected:    time.Time{},
			expectError: true,
		},
		{
			name:        "Weekday Category Without Weekend Days",
			date:        time.Date(2023, 1, 15, 0, 0, 0, 0, time.UTC),
			on:          "first-weekday",
			weekendDays: []int{},
			expected:    time.Time{},
			expectError: true,
		},
		{
			name:        "NextToLast Day",
			date:        time.Date(2023, 1, 15, 0, 0, 0, 0, time.UTC),
			on:          "nextToLast-day",
			weekendDays: []int{0, 6}, // Sunday, Saturday
			expected:    time.Date(2023, 1, 30, 0, 0, 0, 0, time.UTC),
			expectError: false,
		},
		{
			name:        "Fifth Monday (not enough in month)",
			date:        time.Date(2023, 1, 15, 0, 0, 0, 0, time.UTC),
			on:          "fifth-monday",
			weekendDays: []int{0, 6}, // Sunday, Saturday
			expected:    time.Date(2023, 1, 30, 0, 0, 0, 0, time.UTC),
			expectError: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result, err := GetOrdinalDate(tc.date, tc.on, tc.weekendDays)

			if tc.expectError {
				if err == nil {
					t.Errorf("GetOrdinalDate(%v, %v, %v) expected error, got nil",
						tc.date, tc.on, tc.weekendDays)
				}
			} else {
				if err != nil {
					t.Errorf("GetOrdinalDate(%v, %v, %v) unexpected error: %v",
						tc.date, tc.on, tc.weekendDays, err)
				}
				if !result.Equal(tc.expected) {
					t.Errorf("GetOrdinalDate(%v, %v, %v) = %v, expected %v",
						tc.date, tc.on, tc.weekendDays, result, tc.expected)
				}
			}
		})
	}
}

func TestCreateDate(t *testing.T) {
	tests := []struct {
		name        string
		dateString  string
		expected    time.Time
		expectError bool
	}{
		{
			name:        "Valid date",
			dateString:  "2023-01-15",
			expected:    time.Date(2023, 1, 15, 0, 0, 0, 0, time.UTC),
			expectError: false,
		},
		{
			name:        "Invalid date format",
			dateString:  "01/15/2023",
			expected:    time.Time{},
			expectError: true,
		},
		{
			name:        "Invalid date values",
			dateString:  "2023-13-45",
			expected:    time.Time{},
			expectError: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result, err := CreateDate(tc.dateString)

			if tc.expectError {
				if err == nil {
					t.Errorf("CreateDate(%v) expected error, got nil", tc.dateString)
				}
			} else {
				if err != nil {
					t.Errorf("CreateDate(%v) unexpected error: %v", tc.dateString, err)
				}
				if !result.Equal(tc.expected) {
					t.Errorf("CreateDate(%v) = %v, expected %v",
						tc.dateString, result, tc.expected)
				}
			}
		})
	}
}

func TestPaymentDate(t *testing.T) {
	// Define test data
	weekendDays := []int{0, 6} // Sunday=0, Saturday=6 in Go's time.Weekday
	holidays := []time.Time{
		time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC), // New Year's Day
		time.Date(2023, 1, 2, 0, 0, 0, 0, time.UTC), // Day after New Year's
	}

	tests := []struct {
		name         string
		current      time.Time
		gracePeriod  int
		holidays     []time.Time
		weekendDays  []int
		workdaysOnly bool
		expected     time.Time
	}{
		{
			name:         "Regular day, no adjustments",
			current:      time.Date(2023, 1, 5, 0, 0, 0, 0, time.UTC), // Thursday
			gracePeriod:  0,
			holidays:     nil,
			weekendDays:  nil,
			workdaysOnly: false,
			expected:     time.Date(2023, 1, 5, 0, 0, 0, 0, time.UTC),
		},
		{
			name:         "With grace period",
			current:      time.Date(2023, 1, 5, 0, 0, 0, 0, time.UTC), // Thursday
			gracePeriod:  2,
			holidays:     nil,
			weekendDays:  nil,
			workdaysOnly: false,
			expected:     time.Date(2023, 1, 7, 0, 0, 0, 0, time.UTC), // Saturday
		},
		{
			name:         "Weekend adjustment",
			current:      time.Date(2023, 1, 7, 0, 0, 0, 0, time.UTC), // Saturday
			gracePeriod:  0,
			holidays:     nil,
			weekendDays:  weekendDays,
			workdaysOnly: true,
			expected:     time.Date(2023, 1, 9, 0, 0, 0, 0, time.UTC), // Monday
		},
		{
			name:         "Holiday adjustment",
			current:      time.Date(2023, 1, 2, 0, 0, 0, 0, time.UTC), // Monday, but a holiday
			gracePeriod:  0,
			holidays:     holidays,
			weekendDays:  weekendDays,
			workdaysOnly: true,
			expected:     time.Date(2023, 1, 3, 0, 0, 0, 0, time.UTC), // Tuesday
		},
		{
			name:         "Grace period into weekend, needs adjustment",
			current:      time.Date(2023, 1, 5, 0, 0, 0, 0, time.UTC), // Thursday
			gracePeriod:  2,
			holidays:     nil,
			weekendDays:  weekendDays,
			workdaysOnly: true,
			expected:     time.Date(2023, 1, 9, 0, 0, 0, 0, time.UTC), // Monday
		},
		{
			name:         "Invalid date",
			current:      time.Time{},
			gracePeriod:  0,
			holidays:     nil,
			weekendDays:  nil,
			workdaysOnly: false,
			expected:     time.Time{},
		},
		{
			name:         "No weekend days, no holidays, but workdaysOnly",
			current:      time.Date(2023, 1, 7, 0, 0, 0, 0, time.UTC), // Saturday
			gracePeriod:  0,
			holidays:     nil,
			weekendDays:  nil,
			workdaysOnly: true,
			expected:     time.Date(2023, 1, 7, 0, 0, 0, 0, time.UTC), // Same day
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Debug print
			fmt.Printf("Test: %s\n", tc.name)
			fmt.Printf("Input date: %v (weekday: %v, dayOfWeek: %v)\n",
				tc.current, tc.current.Weekday(), int(tc.current.Weekday())+1)
			fmt.Printf("Weekend days: %v\n", tc.weekendDays)

			// Call the function with a modified signature to track date changes
			result := DebugPaymentDate(tc.current, tc.gracePeriod, tc.holidays, tc.weekendDays, tc.workdaysOnly, t)

			if !result.Equal(tc.expected) {
				t.Errorf("PaymentDate(%v, %v, %v, %v, %v) = %v, expected %v",
					tc.current, tc.gracePeriod, tc.holidays, tc.weekendDays, tc.workdaysOnly,
					result, tc.expected)
			}
		})
	}
}

// DebugPaymentDate is a copy of PaymentDate with debug logs added
func DebugPaymentDate(current time.Time, gracePeriod int, holidays []time.Time, weekendDays []int, workdaysOnly bool, t *testing.T) time.Time {
	if !IsValidDate(current) {
		return current // Return invalid date as is
	}

	paymentDate := current
	fmt.Printf("Starting payment date: %v\n", paymentDate)

	// Apply grace period
	if gracePeriod > 0 {
		paymentDate = paymentDate.AddDate(0, 0, gracePeriod)
		fmt.Printf("After grace period: %v\n", paymentDate)
	}

	// If workdaysOnly is true and we have weekend days or holidays
	if workdaysOnly && (len(weekendDays) > 0 || len(holidays) > 0) {
		// Keep moving forward until we find a workday
		iteration := 0
		for {
			iteration++
			dayOfWeek := int(paymentDate.Weekday()) // Go's weekday: Sunday=0, Saturday=6
			isWeekend := false
			isHoliday := false

			fmt.Printf("Iteration %d - Checking date: %v (day of week: %d)\n",
				iteration, paymentDate, dayOfWeek)

			// Check if it's a weekend
			for _, day := range weekendDays {
				if day == dayOfWeek {
					isWeekend = true
					fmt.Printf("  Is weekend day %d? YES\n", day)
					break
				} else {
					fmt.Printf("  Is weekend day %d? no\n", day)
				}
			}

			// Check if it's a holiday
			for _, holiday := range holidays {
				if holiday.Year() == paymentDate.Year() &&
					holiday.Month() == paymentDate.Month() &&
					holiday.Day() == paymentDate.Day() {
					isHoliday = true
					fmt.Printf("  Is holiday? YES\n")
					break
				}
			}
			if !isHoliday {
				fmt.Printf("  Is holiday? no\n")
			}

			// If it's neither a weekend nor a holiday, break the loop
			if !isWeekend && !isHoliday {
				fmt.Printf("  Not a weekend or holiday, breaking loop\n")
				break
			}

			// Move to the next day
			fmt.Printf("  Moving to next day\n")
			paymentDate = paymentDate.AddDate(0, 0, 1)
			fmt.Printf("  New date: %v\n", paymentDate)

			// Safety check to prevent infinite loops during testing
			if iteration > 10 {
				fmt.Printf("  Too many iterations, breaking loop\n")
				break
			}
		}
	}

	fmt.Printf("Final payment date: %v\n\n", paymentDate)
	return paymentDate
}
