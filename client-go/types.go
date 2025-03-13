package recurrentry

import (
	"time"
)

// Period represents available payment period types
type Period string

const (
	// PeriodNone represents a one-time payment
	PeriodNone Period = "none"
	// PeriodWeek represents a weekly recurring payment
	PeriodWeek Period = "week"
	// PeriodMonth represents a monthly recurring payment
	PeriodMonth Period = "month"
	// PeriodYear represents a yearly recurring payment
	PeriodYear Period = "year"
)

// DayOfWeek represents days of the week
type DayOfWeek string

const (
	// DayMonday represents Monday
	DayMonday DayOfWeek = "monday"
	// DayTuesday represents Tuesday
	DayTuesday DayOfWeek = "tuesday"
	// DayWednesday represents Wednesday
	DayWednesday DayOfWeek = "wednesday"
	// DayThursday represents Thursday
	DayThursday DayOfWeek = "thursday"
	// DayFriday represents Friday
	DayFriday DayOfWeek = "friday"
	// DaySaturday represents Saturday
	DaySaturday DayOfWeek = "saturday"
	// DaySunday represents Sunday
	DaySunday DayOfWeek = "sunday"
)

// DayCategory represents categories of days
type DayCategory string

const (
	// CategoryDay represents any day
	CategoryDay DayCategory = "day"
	// CategoryWeekday represents a weekday
	CategoryWeekday DayCategory = "weekday"
	// CategoryWeekend represents a weekend day
	CategoryWeekend DayCategory = "weekend"
)

// OrdinalPosition represents ordinal positions within a month
type OrdinalPosition string

const (
	// OrdinalFirst represents the first occurrence
	OrdinalFirst OrdinalPosition = "first"
	// OrdinalSecond represents the second occurrence
	OrdinalSecond OrdinalPosition = "second"
	// OrdinalThird represents the third occurrence
	OrdinalThird OrdinalPosition = "third"
	// OrdinalFourth represents the fourth occurrence
	OrdinalFourth OrdinalPosition = "fourth"
	// OrdinalFifth represents the fifth occurrence
	OrdinalFifth OrdinalPosition = "fifth"
	// OrdinalNextToLast represents the next to last occurrence
	OrdinalNextToLast OrdinalPosition = "nextToLast"
	// OrdinalLast represents the last occurrence
	OrdinalLast OrdinalPosition = "last"
)

// Ordinal represents an ordinal specification for payment dates
// Format: "{position}-{dayType}" e.g. "first-monday"
type Ordinal string

// BaseRecurrenceConfig is the base configuration for all recurrence types
type BaseRecurrenceConfig struct {
	// Start is the start date of the payment schedule
	Start time.Time `json:"start"`
	// Interval is the number of occurrences
	Interval int `json:"interval"`
}

// RecurrenceOptions contains common options for recurring payments
type RecurrenceOptions struct {
	// WorkdaysOnly indicates if payments should only occur on working days
	WorkdaysOnly bool `json:"workdaysOnly,omitempty"`
	// Every indicates the frequency of the recurrence (every X weeks/months/years)
	Every int `json:"every"`
	// Each contains specific days/months for the payment
	Each []int `json:"each,omitempty"`
	// On contains an ordinal specification for the payment date
	On Ordinal `json:"on,omitempty"`
	// GracePeriod is the number of days after the billing cycle for payment due date
	GracePeriod int `json:"gracePeriod,omitempty"`
}

// RecurrenceConfig represents the configuration for recurring entries
type RecurrenceConfig struct {
	// BaseRecurrenceConfig contains the base configuration
	BaseRecurrenceConfig
	// Period is the type of recurrence
	Period Period `json:"period"`
	// Options contains additional configuration options
	Options RecurrenceOptions `json:"options,omitempty"`
}

// BaseEntry represents the base information for an entry
type BaseEntry struct {
	// ID is the unique identifier for the entry
	ID interface{} `json:"id"`
	// Date is the date of the entry
	Date time.Time `json:"date"`
	// Config contains the recurrence configuration, if any
	Config *RecurrenceConfig `json:"config,omitempty"`
}

// Modification represents a modification to an entry
type Modification struct {
	// ItemID is the ID of the entry to modify
	ItemID interface{} `json:"itemId"`
	// Index is the occurrence index of the entry to modify
	Index int `json:"index"`
	// Payload contains the modifications to apply to this specific occurrence
	Payload map[string]interface{} `json:"payload"`
	// RestPayload contains the modifications to apply to all future occurrences
	RestPayload map[string]interface{} `json:"restPayload,omitempty"`
}

// GeneratedEntry represents a generated occurrence of a recurring entry
type GeneratedEntry struct {
	// Entry is the base entry data
	Entry *BaseEntry `json:"$"`
	// Index is the occurrence number
	Index int `json:"index"`
	// ActualDate is the actual date of the occurrence
	ActualDate time.Time `json:"actualDate"`
	// PaymentDate is the payment due date after applying grace period, workdays, etc.
	PaymentDate time.Time `json:"paymentDate"`
}

// MaxIntervals defines the maximum number of intervals to generate for each period type
var MaxIntervals = map[Period]int{
	PeriodYear:  20,
	PeriodMonth: 240,
	PeriodWeek:  1248,
}
