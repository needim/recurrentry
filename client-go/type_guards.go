package recurrentry

import (
	"strings"
)

// IsPeriod checks if the given string is a valid Period
func IsPeriod(p string) bool {
	period := Period(p)
	return period == PeriodNone ||
		period == PeriodWeek ||
		period == PeriodMonth ||
		period == PeriodYear
}

// IsDayOfWeek checks if the given string is a valid DayOfWeek
func IsDayOfWeek(d string) bool {
	day := DayOfWeek(strings.ToLower(d))
	return day == DayMonday ||
		day == DayTuesday ||
		day == DayWednesday ||
		day == DayThursday ||
		day == DayFriday ||
		day == DaySaturday ||
		day == DaySunday
}

// IsDayCategory checks if the given string is a valid DayCategory
func IsDayCategory(c string) bool {
	category := DayCategory(c)
	return category == CategoryDay ||
		category == CategoryWeekday ||
		category == CategoryWeekend
}

// IsOrdinalPosition checks if the given string is a valid OrdinalPosition
func IsOrdinalPosition(p string) bool {
	position := OrdinalPosition(p)
	return position == OrdinalFirst ||
		position == OrdinalSecond ||
		position == OrdinalThird ||
		position == OrdinalFourth ||
		position == OrdinalFifth ||
		position == OrdinalNextToLast ||
		position == OrdinalLast
}

// IsOrdinal checks if the given string is a valid Ordinal format
func IsOrdinal(o string) bool {
	parts := strings.Split(o, "-")
	if len(parts) != 2 {
		return false
	}

	position := parts[0]
	dayType := parts[1]

	return IsOrdinalPosition(position) && (IsDayOfWeek(dayType) || IsDayCategory(dayType))
}

// IsValidRecurrenceConfig checks if a RecurrenceConfig is valid
func IsValidRecurrenceConfig(config RecurrenceConfig) bool {
	// Check Period
	if !IsPeriod(string(config.Period)) {
		return false
	}

	// Check Start date
	if config.Start.IsZero() {
		return false
	}

	// Check Interval
	if config.Interval <= 0 {
		return false
	}

	// Check specific period validations
	switch config.Period {
	case PeriodNone:
		// For single payments, interval must be 1
		return config.Interval == 1

	case PeriodWeek:
		// For weekly payments, validate each if specified
		if config.Options.Each != nil {
			for _, day := range config.Options.Each {
				if day < 1 || day > 7 {
					return false
				}
			}
		}

		// Weekly payments can't have an 'on' specification
		if config.Options.On != "" {
			return false
		}

		return true

	case PeriodMonth:
		// For monthly payments, validate each if specified
		if config.Options.Each != nil {
			for _, day := range config.Options.Each {
				if day < 1 || day > 31 {
					return false
				}
			}
		}

		// Validate the 'on' specification if provided
		if config.Options.On != "" && !IsOrdinal(string(config.Options.On)) {
			return false
		}

		return true

	case PeriodYear:
		// For yearly payments, validate each if specified
		if config.Options.Each != nil {
			for _, month := range config.Options.Each {
				if month < 1 || month > 12 {
					return false
				}
			}
		}

		// Validate the 'on' specification if provided
		if config.Options.On != "" && !IsOrdinal(string(config.Options.On)) {
			return false
		}

		return true
	}

	return false
}

// IsValidBaseEntry checks if a BaseEntry is valid
func IsValidBaseEntry(entry BaseEntry) bool {
	// Entry must have an ID
	if entry.ID == nil {
		return false
	}

	// Entry must have a valid date
	if entry.Date.IsZero() {
		return false
	}

	// If config is provided, it must be valid
	if entry.Config != nil {
		return IsValidRecurrenceConfig(*entry.Config)
	}

	return true
}
