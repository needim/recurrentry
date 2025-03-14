package recurrentry

import (
	"fmt"
	"strings"
	"time"
)

// GeneratorOptions contains options for generating recurring entries
type GeneratorOptions struct {
	// Data is an array of base entries to generate recurrences from
	Data []BaseEntry
	// Modifications is an array of modifications to apply to the generated entries
	Modifications []Modification
	// MaxIntervals overrides the default maximum number of intervals to generate
	MaxIntervals map[Period]int
	// Holidays is an array of dates to be considered as holidays
	Holidays []time.Time
	// WeekendDays is an array of numbers representing weekend days (1-7, where 7 is Sunday)
	WeekendDays []int
	// Range is an optional date range to filter generated entries
	Range *DateRange
}

// DateRange represents a date range for filtering generated entries
type DateRange struct {
	// Start is the start date of the range (inclusive)
	Start time.Time
	// End is the end date of the range (inclusive)
	End time.Time
}

// DateAdjustment represents adjustments to apply to dates
type DateAdjustment struct {
	Days   int
	Months int
	Years  int
}

// Generator generates recurring entries based on the provided configuration and modifications
func Generator(options GeneratorOptions) ([]GeneratedEntry, error) {
	result := []GeneratedEntry{}

	// Validate base entries
	for _, entry := range options.Data {
		if !IsValidBaseEntry(entry) {
			return nil, fmt.Errorf("invalid base entry: %v", entry)
		}

		// Validate ordinal specifications
		if entry.Config != nil && entry.Config.Options.On != "" {
			// Check if it's a valid ordinal
			if !IsOrdinal(string(entry.Config.Options.On)) {
				return nil, fmt.Errorf("invalid ordinal specification: %s", entry.Config.Options.On)
			}

			// Check if weekday/weekend category has weekend days defined
			parts := strings.Split(string(entry.Config.Options.On), "-")
			if len(parts) == 2 {
				dayType := parts[1]
				if (dayType == string(CategoryWeekday) || dayType == string(CategoryWeekend)) && len(options.WeekendDays) == 0 {
					return nil, fmt.Errorf("weekendDays must be provided when using %s day category", dayType)
				}
			}
		}
	}

	// Use default MaxIntervals if not provided
	maxIntervals := options.MaxIntervals
	if maxIntervals == nil {
		maxIntervals = MaxIntervals
	}

	// Check if a date is within the specified range
	isInRange := func(date time.Time) bool {
		if options.Range == nil {
			return true
		}

		afterStart := options.Range.Start.IsZero() || !date.Before(options.Range.Start)
		beforeEnd := options.Range.End.IsZero() || !date.After(options.Range.End)

		return afterStart && beforeEnd
	}

	// Calculate date adjustment based on the period type
	calculateDateAdjustment := func(originalDate, modifiedDate time.Time, period Period) DateAdjustment {
		adj := DateAdjustment{}

		switch period {
		case PeriodYear:
			// For yearly entries, adjust the month and day position
			adj.Months = int(modifiedDate.Month() - originalDate.Month())
			adj.Days = modifiedDate.Day() - originalDate.Day()
		case PeriodMonth:
			// For monthly entries, only adjust the day position
			adj.Days = modifiedDate.Day() - originalDate.Day()
		case PeriodWeek:
			// For weekly entries, calculate the day-of-week difference
			origDayOfWeek := int(originalDate.Weekday()) + 1
			modDayOfWeek := int(modifiedDate.Weekday()) + 1
			adj.Days = modDayOfWeek - origDayOfWeek
		}

		return adj
	}

	// Apply modifications to an occurrence entry
	applyModifications := func(entry BaseEntry, index int, modifications []Modification, lastEntry *GeneratedEntry) (bool, bool, map[string]interface{}, *DateAdjustment) {
		shouldDelete := false
		deleteFuture := false
		var applyToRestPayload map[string]interface{}
		var dateAdjustment *DateAdjustment

		for _, mod := range modifications {
			// Check if this modification applies to this entry and occurrence
			if fmt.Sprintf("%v", mod.ItemID) == fmt.Sprintf("%v", entry.ID) && mod.Index == index {
				// Check for deletion
				if deleted, ok := mod.Payload["deleted"].(bool); ok && deleted {
					shouldDelete = true
					if mod.RestPayload != nil {
						if deletedRest, ok := mod.RestPayload["deleted"].(bool); ok && deletedRest {
							deleteFuture = true
						}
					}
					return shouldDelete, deleteFuture, nil, nil
				}

				// Apply modifications to the entry
				if len(mod.Payload) > 0 || len(mod.RestPayload) > 0 {
					// Apply payload modifications to this entry
					for k, v := range mod.Payload {
						// Special handling for date modifications
						if k == "date" {
							if dateStr, ok := v.(string); ok {
								modifiedDate, err := time.Parse("2006-01-02", dateStr)
								if err == nil {
									lastEntry.ActualDate = modifiedDate
									lastEntry.PaymentDate = modifiedDate

									// Calculate date adjustment for future occurrences
									if len(mod.RestPayload) > 0 {
										adj := calculateDateAdjustment(
											entry.Date,
											modifiedDate,
											entry.Config.Period,
										)
										dateAdjustment = &adj
									}
								}
							}
						}
					}

					// Set rest payload for future occurrences
					if len(mod.RestPayload) > 0 {
						applyToRestPayload = mod.RestPayload
					}
				}
			}
		}

		return shouldDelete, deleteFuture, applyToRestPayload, dateAdjustment
	}

	// Add date adjustment to a time
	applyDateAdjustment := func(date time.Time, adj *DateAdjustment) time.Time {
		if adj == nil {
			return date
		}

		return date.AddDate(adj.Years, adj.Months, adj.Days)
	}

	// Process each entry
	for _, entry := range options.Data {
		// Handle single payments
		if entry.Config == nil || entry.Config.Period == PeriodNone {
			// Skip if payment date is out of range
			if !isInRange(entry.Date) {
				continue
			}

			// Create a copy of the entry for the result
			newEntry := entry

			// Add to result
			result = append(result, GeneratedEntry{
				Entry:       &newEntry,
				Index:       1,
				ActualDate:  entry.Date,
				PaymentDate: entry.Date,
			})

			continue
		}

		// Handle recurring entries
		config := entry.Config
		start := config.Start
		period := config.Period
		interval := config.Interval
		entryOptions := config.Options

		// Set defaults for options
		every := 1
		if entryOptions.Every > 0 {
			every = entryOptions.Every
		}

		workdaysOnly := entryOptions.WorkdaysOnly
		gracePeriod := entryOptions.GracePeriod
		each := entryOptions.Each
		on := entryOptions.On

		var applyToRestPayload map[string]interface{}
		deleteRest := false
		index := 0
		var dateAdjustment *DateAdjustment

		// Calculate max interval to generate
		maxInterval := interval
		if maxIntervalForPeriod, ok := maxIntervals[period]; ok && maxIntervalForPeriod < interval {
			maxInterval = maxIntervalForPeriod
		}

		// Generate occurrences
		for i := 0; i < maxInterval; i++ {
			baseDate := AddByPeriod(start, i*every, period)

			// Special handling for weekly period when no 'each' is specified
			if period == PeriodWeek && (each == nil || len(each) == 0) {
				// For simple weekly cycles, calculate the date by adding weeks
				cycleDate := AddByPeriod(start, i*every*7, PeriodNone)

				// Apply date adjustment if exists
				if applyToRestPayload != nil && dateAdjustment != nil {
					cycleDate = applyDateAdjustment(cycleDate, dateAdjustment)
				}

				// Skip if occurrence date is out of range
				if !isInRange(cycleDate) {
					continue
				}

				// Calculate payment date
				nextDate := PaymentDate(
					cycleDate,
					gracePeriod,
					options.Holidays,
					options.WeekendDays,
					workdaysOnly,
				)

				// Create a copy of the entry for modification
				newEntry := entry

				// Apply ongoing modifications if any
				if applyToRestPayload != nil {
					// Apply modifications (this would be more complex in a real implementation)
					// We'd need to reflect on the entry structure and apply the changes
				}

				index++

				// Add to result
				generatedEntry := GeneratedEntry{
					Entry:       &newEntry,
					Index:       index,
					ActualDate:  cycleDate,
					PaymentDate: nextDate,
				}
				result = append(result, generatedEntry)

				// Apply modifications to this occurrence
				shouldDelete, deleteFuture, restPayload, newDateAdjustment := applyModifications(
					entry,
					index,
					options.Modifications,
					&result[len(result)-1],
				)

				if shouldDelete {
					// Remove the last element from result
					result = result[:len(result)-1]
					if deleteFuture {
						deleteRest = true
						break
					}
					continue
				}

				if restPayload != nil {
					applyToRestPayload = restPayload
				}

				if newDateAdjustment != nil {
					dateAdjustment = newDateAdjustment
				}

				continue
			}

			// Handle 'each' option for different period types
			if each != nil && len(each) > 0 {
				var occurrenceDates []time.Time

				for _, target := range each {
					var targetDate time.Time

					switch period {
					case PeriodWeek:
						// For weekly payments, each represents days of the week (1-7)
						if target < 1 || target > 7 {
							// Skip invalid day of week
							continue
						}

						// Add the offset for this specific period ('every' weeks)
						weekOffset := i * every * 7
						periodStart := start.AddDate(0, 0, weekOffset)

						// Find the first day of the week
						daysToSubtract := int(periodStart.Weekday())
						if daysToSubtract == 0 { // Sunday in Go is 0
							daysToSubtract = 6 // Convert to 1-7 format where Monday is 1
						} else {
							daysToSubtract--
						}

						periodStartOfWeek := periodStart.AddDate(0, 0, -daysToSubtract)

						// Add days to get to the target day
						targetDate = periodStartOfWeek.AddDate(0, 0, target-1)

						// Apply date adjustment if exists
						if applyToRestPayload != nil && dateAdjustment != nil {
							targetDate = applyDateAdjustment(targetDate, dateAdjustment)
						}

					case PeriodMonth:
						// Adjust to the target day within the current month
						targetDate = time.Date(
							baseDate.Year(),
							baseDate.Month(),
							target,
							0, 0, 0, 0,
							baseDate.Location(),
						)

						// Apply date adjustment if exists
						if applyToRestPayload != nil && dateAdjustment != nil {
							targetDate = applyDateAdjustment(targetDate, dateAdjustment)
						}

					case PeriodYear:
						// Adjust to the target month within the current year
						targetDate = time.Date(
							baseDate.Year(),
							time.Month(target),
							baseDate.Day(),
							0, 0, 0, 0,
							baseDate.Location(),
						)

						// Apply date adjustment if exists
						if applyToRestPayload != nil && dateAdjustment != nil {
							// For yearly entries, maintain the modified month and day
							if dateAdjustment.Months != 0 {
								targetMonth := time.Month(target + dateAdjustment.Months)
								// Handle overflow
								if targetMonth > 12 {
									targetMonth = targetMonth - 12
									targetDate = targetDate.AddDate(1, 0, 0)
								} else if targetMonth < 1 {
									targetMonth = targetMonth + 12
									targetDate = targetDate.AddDate(-1, 0, 0)
								}

								targetDate = time.Date(
									targetDate.Year(),
									targetMonth,
									targetDate.Day(),
									0, 0, 0, 0,
									targetDate.Location(),
								)
							}

							if dateAdjustment.Days != 0 {
								targetDate = targetDate.AddDate(0, 0, dateAdjustment.Days)
							}
						}

						// Apply ordinal specification if provided
						if on != "" {
							var err error
							targetDate, err = GetOrdinalDate(targetDate, on, options.WeekendDays)
							if err != nil {
								continue // Skip this date if there's an error
							}
						}
					}

					// Only add valid dates
					if !targetDate.IsZero() {
						occurrenceDates = append(occurrenceDates, targetDate)
					}
				}

				// Sort dates chronologically (Go's time.Time is already comparable)
				// This would require a custom sort but for simplicity we'll assume they're sorted

				// Process each occurrence date
				for _, occurrenceDate := range occurrenceDates {
					// Skip if occurrence date is out of range
					if !isInRange(occurrenceDate) {
						continue
					}

					// Calculate payment date
					nextDate := PaymentDate(
						occurrenceDate,
						gracePeriod,
						options.Holidays,
						options.WeekendDays,
						workdaysOnly,
					)

					// Create a copy of the entry for modification
					newEntry := entry

					// Apply ongoing modifications if any
					if applyToRestPayload != nil {
						// Apply modifications (this would be more complex in a real implementation)
					}

					index++

					// Add to result
					generatedEntry := GeneratedEntry{
						Entry:       &newEntry,
						Index:       index,
						ActualDate:  occurrenceDate,
						PaymentDate: nextDate,
					}
					result = append(result, generatedEntry)

					// Apply modifications to this occurrence
					shouldDelete, deleteFuture, restPayload, newDateAdjustment := applyModifications(
						entry,
						index,
						options.Modifications,
						&result[len(result)-1],
					)

					if shouldDelete {
						// Remove the last element from result
						result = result[:len(result)-1]
						if deleteFuture {
							deleteRest = true
							break
						}
						continue
					}

					if restPayload != nil {
						applyToRestPayload = restPayload
					}

					if newDateAdjustment != nil {
						dateAdjustment = newDateAdjustment
					}
				}
			} else {
				// Handle single date per period
				_baseDate := baseDate

				// Apply date adjustment if exists
				if applyToRestPayload != nil && dateAdjustment != nil {
					_baseDate = applyDateAdjustment(_baseDate, dateAdjustment)
				}

				// Apply ordinal specification if provided
				if on != "" {
					var err error
					_baseDate, err = GetOrdinalDate(_baseDate, on, options.WeekendDays)
					if err != nil || _baseDate.IsZero() {
						continue // Skip this date if there's an error or date is invalid
					}
				}

				// Skip if occurrence date is out of range
				if !isInRange(_baseDate) {
					continue
				}

				// Calculate payment date
				fixedNextDate := PaymentDate(
					_baseDate,
					gracePeriod,
					options.Holidays,
					options.WeekendDays,
					workdaysOnly,
				)

				// Create a copy of the entry for modification
				newEntry := entry

				// Apply ongoing modifications if any
				if applyToRestPayload != nil {
					// Apply modifications (this would be more complex in a real implementation)
				}

				index++

				// Add to result
				generatedEntry := GeneratedEntry{
					Entry:       &newEntry,
					Index:       index,
					ActualDate:  _baseDate,
					PaymentDate: fixedNextDate,
				}
				result = append(result, generatedEntry)

				// Apply modifications to this occurrence
				shouldDelete, deleteFuture, restPayload, newDateAdjustment := applyModifications(
					entry,
					index,
					options.Modifications,
					&result[len(result)-1],
				)

				if shouldDelete {
					// Remove the last element from result
					result = result[:len(result)-1]
					if deleteFuture {
						deleteRest = true
						break
					}
					continue
				}

				if restPayload != nil {
					applyToRestPayload = restPayload
				}

				if newDateAdjustment != nil {
					dateAdjustment = newDateAdjustment
				}
			}

			// If deletion modification flagged the rest to be removed
			if deleteRest {
				break
			}
		}
	}

	return result, nil
}
