package recurrentry

import (
	"testing"
	"time"
)

func TestIsPeriod(t *testing.T) {
	tests := []struct {
		name     string
		value    string
		expected bool
	}{
		{
			name:     "Valid PeriodNone string",
			value:    "none",
			expected: true,
		},
		{
			name:     "Valid PeriodWeek string",
			value:    "week",
			expected: true,
		},
		{
			name:     "Valid PeriodMonth string",
			value:    "month",
			expected: true,
		},
		{
			name:     "Valid PeriodYear string",
			value:    "year",
			expected: true,
		},
		{
			name:     "Invalid string",
			value:    "invalid",
			expected: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := IsPeriod(tc.value)
			if result != tc.expected {
				t.Errorf("IsPeriod(%v) = %v, expected %v", tc.value, result, tc.expected)
			}
		})
	}
}

func TestIsDayOfWeek(t *testing.T) {
	tests := []struct {
		name     string
		value    string
		expected bool
	}{
		{
			name:     "Valid monday",
			value:    "monday",
			expected: true,
		},
		{
			name:     "Valid tuesday",
			value:    "tuesday",
			expected: true,
		},
		{
			name:     "Valid wednesday",
			value:    "wednesday",
			expected: true,
		},
		{
			name:     "Valid thursday",
			value:    "thursday",
			expected: true,
		},
		{
			name:     "Valid friday",
			value:    "friday",
			expected: true,
		},
		{
			name:     "Valid saturday",
			value:    "saturday",
			expected: true,
		},
		{
			name:     "Valid sunday",
			value:    "sunday",
			expected: true,
		},
		{
			name:     "Invalid day name",
			value:    "invalid",
			expected: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := IsDayOfWeek(tc.value)
			if result != tc.expected {
				t.Errorf("IsDayOfWeek(%v) = %v, expected %v", tc.value, result, tc.expected)
			}
		})
	}
}

func TestIsDayCategory(t *testing.T) {
	tests := []struct {
		name     string
		value    string
		expected bool
	}{
		{
			name:     "Valid day category",
			value:    "day",
			expected: true,
		},
		{
			name:     "Valid weekday category",
			value:    "weekday",
			expected: true,
		},
		{
			name:     "Valid weekend category",
			value:    "weekend",
			expected: true,
		},
		{
			name:     "Invalid category",
			value:    "invalid",
			expected: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := IsDayCategory(tc.value)
			if result != tc.expected {
				t.Errorf("IsDayCategory(%v) = %v, expected %v", tc.value, result, tc.expected)
			}
		})
	}
}

func TestIsOrdinalPosition(t *testing.T) {
	tests := []struct {
		name     string
		value    string
		expected bool
	}{
		{
			name:     "Valid first position",
			value:    "first",
			expected: true,
		},
		{
			name:     "Valid second position",
			value:    "second",
			expected: true,
		},
		{
			name:     "Valid third position",
			value:    "third",
			expected: true,
		},
		{
			name:     "Valid fourth position",
			value:    "fourth",
			expected: true,
		},
		{
			name:     "Valid fifth position",
			value:    "fifth",
			expected: true,
		},
		{
			name:     "Valid last position",
			value:    "last",
			expected: true,
		},
		{
			name:     "Valid nextToLast position",
			value:    "nextToLast",
			expected: true,
		},
		{
			name:     "Invalid position",
			value:    "sixth",
			expected: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := IsOrdinalPosition(tc.value)
			if result != tc.expected {
				t.Errorf("IsOrdinalPosition(%v) = %v, expected %v", tc.value, result, tc.expected)
			}
		})
	}
}

func TestIsOrdinal(t *testing.T) {
	tests := []struct {
		name     string
		value    string
		expected bool
	}{
		{
			name:     "Valid ordinal - first-monday",
			value:    "first-monday",
			expected: true,
		},
		{
			name:     "Valid ordinal - last-weekend",
			value:    "last-weekend",
			expected: true,
		},
		{
			name:     "Invalid ordinal - wrong format (no dash)",
			value:    "firstmonday",
			expected: false,
		},
		{
			name:     "Invalid ordinal - wrong position",
			value:    "sixth-monday",
			expected: false,
		},
		{
			name:     "Invalid ordinal - wrong category",
			value:    "first-invalid",
			expected: false,
		},
		{
			name:     "Invalid ordinal - too many parts",
			value:    "first-monday-extra",
			expected: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := IsOrdinal(tc.value)
			if result != tc.expected {
				t.Errorf("IsOrdinal(%v) = %v, expected %v", tc.value, result, tc.expected)
			}
		})
	}
}

func TestIsValidRecurrenceConfig(t *testing.T) {
	baseDate := time.Date(2023, 1, 15, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name     string
		config   RecurrenceConfig
		expected bool
	}{
		{
			name: "Valid single payment config",
			config: RecurrenceConfig{
				BaseRecurrenceConfig: BaseRecurrenceConfig{
					Start:    baseDate,
					Interval: 1,
				},
				Period: PeriodNone,
			},
			expected: true,
		},
		{
			name: "Invalid single payment config - interval != 1",
			config: RecurrenceConfig{
				BaseRecurrenceConfig: BaseRecurrenceConfig{
					Start:    baseDate,
					Interval: 2,
				},
				Period: PeriodNone,
			},
			expected: false,
		},
		{
			name: "Valid weekly payment config",
			config: RecurrenceConfig{
				BaseRecurrenceConfig: BaseRecurrenceConfig{
					Start:    baseDate,
					Interval: 2,
				},
				Period: PeriodWeek,
				Options: RecurrenceOptions{
					Each: []int{1, 3, 5}, // Monday, Wednesday, Friday
				},
			},
			expected: true,
		},
		{
			name: "Invalid weekly payment config - invalid day",
			config: RecurrenceConfig{
				BaseRecurrenceConfig: BaseRecurrenceConfig{
					Start:    baseDate,
					Interval: 2,
				},
				Period: PeriodWeek,
				Options: RecurrenceOptions{
					Each: []int{0, 8}, // Invalid days
				},
			},
			expected: false,
		},
		{
			name: "Invalid weekly payment config - has On value",
			config: RecurrenceConfig{
				BaseRecurrenceConfig: BaseRecurrenceConfig{
					Start:    baseDate,
					Interval: 2,
				},
				Period: PeriodWeek,
				Options: RecurrenceOptions{
					On: "first-monday",
				},
			},
			expected: false,
		},
		{
			name: "Valid monthly payment config with Each",
			config: RecurrenceConfig{
				BaseRecurrenceConfig: BaseRecurrenceConfig{
					Start:    baseDate,
					Interval: 1,
				},
				Period: PeriodMonth,
				Options: RecurrenceOptions{
					Each: []int{1, 15, 30},
				},
			},
			expected: true,
		},
		{
			name: "Valid monthly payment config with On",
			config: RecurrenceConfig{
				BaseRecurrenceConfig: BaseRecurrenceConfig{
					Start:    baseDate,
					Interval: 1,
				},
				Period: PeriodMonth,
				Options: RecurrenceOptions{
					On: "first-monday",
				},
			},
			expected: true,
		},
		{
			name: "Invalid monthly payment config - invalid day",
			config: RecurrenceConfig{
				BaseRecurrenceConfig: BaseRecurrenceConfig{
					Start:    baseDate,
					Interval: 1,
				},
				Period: PeriodMonth,
				Options: RecurrenceOptions{
					Each: []int{0, 32},
				},
			},
			expected: false,
		},
		{
			name: "Invalid monthly payment config - invalid On",
			config: RecurrenceConfig{
				BaseRecurrenceConfig: BaseRecurrenceConfig{
					Start:    baseDate,
					Interval: 1,
				},
				Period: PeriodMonth,
				Options: RecurrenceOptions{
					On: "invalid-ordinal",
				},
			},
			expected: false,
		},
		{
			name: "Valid yearly payment config with Each",
			config: RecurrenceConfig{
				BaseRecurrenceConfig: BaseRecurrenceConfig{
					Start:    baseDate,
					Interval: 1,
				},
				Period: PeriodYear,
				Options: RecurrenceOptions{
					Each: []int{1, 6, 12}, // Jan, Jun, Dec
				},
			},
			expected: true,
		},
		{
			name: "Invalid yearly payment config - invalid month",
			config: RecurrenceConfig{
				BaseRecurrenceConfig: BaseRecurrenceConfig{
					Start:    baseDate,
					Interval: 1,
				},
				Period: PeriodYear,
				Options: RecurrenceOptions{
					Each: []int{0, 13},
				},
			},
			expected: false,
		},
		{
			name: "Invalid period",
			config: RecurrenceConfig{
				BaseRecurrenceConfig: BaseRecurrenceConfig{
					Start:    baseDate,
					Interval: 1,
				},
				Period: "invalid",
			},
			expected: false,
		},
		{
			name: "Invalid - zero start date",
			config: RecurrenceConfig{
				BaseRecurrenceConfig: BaseRecurrenceConfig{
					Start:    time.Time{},
					Interval: 1,
				},
				Period: PeriodMonth,
			},
			expected: false,
		},
		{
			name: "Invalid - zero interval",
			config: RecurrenceConfig{
				BaseRecurrenceConfig: BaseRecurrenceConfig{
					Start:    baseDate,
					Interval: 0,
				},
				Period: PeriodMonth,
			},
			expected: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := IsValidRecurrenceConfig(tc.config)
			if result != tc.expected {
				t.Errorf("IsValidRecurrenceConfig(%v) = %v, expected %v", tc.config, result, tc.expected)
			}
		})
	}
}

func TestIsValidBaseEntry(t *testing.T) {
	baseDate := time.Date(2023, 1, 15, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name     string
		entry    BaseEntry
		expected bool
	}{
		{
			name: "Valid base entry with ID and date only (no config)",
			entry: BaseEntry{
				ID:   1,
				Date: baseDate,
			},
			expected: true,
		},
		{
			name: "Valid base entry with config",
			entry: BaseEntry{
				ID:   "test-id",
				Date: baseDate,
				Config: &RecurrenceConfig{
					BaseRecurrenceConfig: BaseRecurrenceConfig{
						Start:    baseDate,
						Interval: 1,
					},
					Period: PeriodMonth,
				},
			},
			expected: true,
		},
		{
			name: "Invalid - nil ID",
			entry: BaseEntry{
				ID:   nil,
				Date: baseDate,
			},
			expected: false,
		},
		{
			name: "Invalid - zero date",
			entry: BaseEntry{
				ID:   1,
				Date: time.Time{},
			},
			expected: false,
		},
		{
			name: "Invalid - invalid config",
			entry: BaseEntry{
				ID:   1,
				Date: baseDate,
				Config: &RecurrenceConfig{
					BaseRecurrenceConfig: BaseRecurrenceConfig{
						Start:    time.Time{}, // invalid zero date
						Interval: 1,
					},
					Period: PeriodMonth,
				},
			},
			expected: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := IsValidBaseEntry(tc.entry)
			if result != tc.expected {
				t.Errorf("IsValidBaseEntry(%v) = %v, expected %v", tc.entry, result, tc.expected)
			}
		})
	}
}
