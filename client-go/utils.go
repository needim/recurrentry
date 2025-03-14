package recurrentry

import (
	"fmt"
	"strings"
	"time"
)

// AddByPeriod adds a specific amount to a date based on the period type
func AddByPeriod(date time.Time, amount int, period Period) time.Time {
	switch period {
	case PeriodYear:
		return date.AddDate(amount, 0, 0)
	case PeriodMonth:
		return date.AddDate(0, amount, 0)
	case PeriodWeek:
		return date.AddDate(0, 0, amount*7)
	default:
		return date.AddDate(0, 0, amount)
	}
}

// IsValidDate checks if a date is valid
func IsValidDate(date time.Time) bool {
	return !date.IsZero()
}

// GetActualDayName returns the lowercase name of the day of the week
func GetActualDayName(date time.Time) string {
	return strings.ToLower(date.Weekday().String())
}

// IsWeekdayByWeekendDays checks if a day is a weekday based on the provided weekend days
func IsWeekdayByWeekendDays(dayOfWeek int, weekendDays []int) bool {
	for _, day := range weekendDays {
		if day == dayOfWeek {
			return false
		}
	}
	return true
}

// GetOrdinalDate calculates a date based on an ordinal specification
func GetOrdinalDate(date time.Time, on Ordinal, weekendDays []int) (time.Time, error) {
	// Set to first day of month
	firstDayOfMonth := time.Date(date.Year(), date.Month(), 1, 0, 0, 0, 0, date.Location())

	// Parse the ordinal string
	parts := strings.Split(string(on), "-")
	if len(parts) != 2 {
		return time.Time{}, fmt.Errorf("invalid ordinal format: %s", on)
	}

	position := OrdinalPosition(parts[0])
	dayType := parts[1]

	// Validate required weekendDays for day categories
	if (dayType == string(CategoryWeekday) || dayType == string(CategoryWeekend)) && len(weekendDays) == 0 {
		return time.Time{}, fmt.Errorf("weekendDays must be provided when using %s day category", dayType)
	}

	// Find matching days
	var matchingDays []time.Time
	currentDate := firstDayOfMonth

	// Loop through all days in the month
	for currentDate.Month() == firstDayOfMonth.Month() {
		dayOfWeek := int(currentDate.Weekday()) // Go uses 0-6
		isWeekday := IsWeekdayByWeekendDays(dayOfWeek, weekendDays)

		// Check if the current day matches the criteria
		matches := false
		switch {
		case dayType == string(CategoryDay):
			matches = true
		case dayType == string(CategoryWeekday) && isWeekday:
			matches = true
		case dayType == string(CategoryWeekend) && !isWeekday:
			matches = true
		case dayType == GetActualDayName(currentDate):
			matches = true
		}

		if matches {
			matchingDays = append(matchingDays, currentDate)
		}

		currentDate = currentDate.AddDate(0, 0, 1)
	}

	if len(matchingDays) == 0 {
		return time.Time{}, fmt.Errorf("no matching days found for ordinal: %s", on)
	}

	// Get the target day based on position
	var index int
	switch position {
	case OrdinalFirst:
		index = 0
	case OrdinalSecond:
		index = 1
	case OrdinalThird:
		index = 2
	case OrdinalFourth:
		index = 3
	case OrdinalFifth:
		index = 4
	case OrdinalNextToLast:
		index = len(matchingDays) - 2
		if index < 0 {
			index = 0
		}
	case OrdinalLast:
		index = len(matchingDays) - 1
	default:
		return time.Time{}, fmt.Errorf("invalid ordinal position: %s", position)
	}

	if index >= len(matchingDays) {
		return time.Time{}, fmt.Errorf("not enough matching days for position %s", position)
	}

	return matchingDays[index], nil
}

// CreateDate creates a time.Time from a date string in YYYY-MM-DD format
func CreateDate(dateString string) (time.Time, error) {
	return time.Parse("2006-01-02", dateString)
}

// PaymentDate calculates the payment date based on various options
func PaymentDate(current time.Time, gracePeriod int, holidays []time.Time, weekendDays []int, workdaysOnly bool) time.Time {
	if !IsValidDate(current) {
		return current // Return invalid date as is
	}

	paymentDate := current

	// Apply grace period
	if gracePeriod > 0 {
		paymentDate = paymentDate.AddDate(0, 0, gracePeriod)
	}

	// If workdaysOnly is true and we have weekend days or holidays
	if workdaysOnly && (len(weekendDays) > 0 || len(holidays) > 0) {
		// Keep moving forward until we find a workday
		for {
			dayOfWeek := int(paymentDate.Weekday()) // Go's weekday: Sunday=0, Saturday=6
			isWeekend := false
			isHoliday := false

			// Check if it's a weekend
			for _, day := range weekendDays {
				if day == dayOfWeek {
					isWeekend = true
					break
				}
			}

			// Check if it's a holiday
			for _, holiday := range holidays {
				if holiday.Year() == paymentDate.Year() &&
					holiday.Month() == paymentDate.Month() &&
					holiday.Day() == paymentDate.Day() {
					isHoliday = true
					break
				}
			}

			// If it's neither a weekend nor a holiday, break the loop
			if !isWeekend && !isHoliday {
				break
			}

			// Move to the next day
			paymentDate = paymentDate.AddDate(0, 0, 1)
		}
	}

	return paymentDate
}
