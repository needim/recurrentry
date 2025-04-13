import type { Temporal } from "temporal-polyfill";

/**
 * Available payment period types
 * @readonly
 */
export const PERIOD = {
	NONE: "none",
	WEEK: "week",
	MONTH: "month",
	YEAR: "year",
} as const;

export type Period = (typeof PERIOD)[keyof typeof PERIOD];

/**
 * Days of the week
 */
export type DayOfWeek =
	| "monday"
	| "tuesday"
	| "wednesday"
	| "thursday"
	| "friday"
	| "saturday"
	| "sunday";

/**
 * Categories of days (weekday, weekend, or any day)
 */
export type DayCategory = "day" | "weekday" | "weekend";

/**
 * Ordinal positions within a month
 */
export type OrdinalPosition =
	| "first"
	| "second"
	| "third"
	| "fourth"
	| "fifth"
	| "nextToLast"
	| "last";

/**
 * Represents an ordinal specification for payment dates
 * Can be either a specific day position (e.g., "first-monday") or a week (e.g., "first-week")
 */
export type Ordinal = `${OrdinalPosition}-${DayCategory | DayOfWeek}`;

/**
 * Base payment configuration that all payment types extend from
 */
export type BasePayment = {
	/** Start date of the payment schedule */
	start: Temporal.PlainDate;
	/** Number of occurrences */
	interval: number;
};

/**
 * Configuration for one-time payments
 */
export type SinglePayment = BasePayment & {
	period: typeof PERIOD.NONE;
	interval: 1;
	options?: never;
};

/**
 * Configuration for weekly recurring payments
 */
export type WeeklyPayment = BasePayment & {
	period: typeof PERIOD.WEEK;
	options?: Readonly<{
		/** Whether payment should only occur on working days
		 *it counts holidays and weekendDays as non-working days */
		workdaysOnly?: boolean;
		/** How many weeks between payments */
		every: number;
		/** Specific days of the week for payment (1-7) */
		each?: number[];
		/** Ordinal specification for payment date within specified days (e.g., "first-monday") */
		on?: never;
		/** Number of days after billing cycle for payment due date */
		gracePeriod?: number;
	}>;
};

/**
 * Configuration for monthly recurring payments
 */
export type MonthlyPayment = BasePayment & {
	period: typeof PERIOD.MONTH;
	options?: Readonly<{
		/** Whether payment should only occur on working days
		 *it counts holidays and weekendDays as non-working days */
		workdaysOnly?: boolean;
		/** How many months between payments */
		every: number;
		/** Specific days of the month for payment (1-31) */
		each?: number[];
		/** Ordinal specification for payment date (e.g., "first-monday") */
		on?: Ordinal;
		/** Number of days after billing cycle for payment due date */
		gracePeriod?: number;
	}>;
};

/**
 * Configuration for yearly recurring payments
 */
export type YearlyPayment = BasePayment & {
	period: typeof PERIOD.YEAR;
	options?: Readonly<{
		/** Whether payment should only occur on working days
		 *it counts holidays and weekendDays as non-working days */
		workdaysOnly?: boolean;
		/** How many years between payments */
		every: number;
		/** Specific months for payment (1-12) */
		each?: number[];
		/** Ordinal specification for payment date within specified months */
		on?: Ordinal;
		/** Number of days after billing cycle for payment due date */
		gracePeriod?: number;
	}>;
};

/**
 * Union type of all possible payment configurations
 */
export type RecurrenceConfig =
	| SinglePayment
	| WeeklyPayment
	| MonthlyPayment
	| YearlyPayment;

export type Modification<Data extends BaseEntry> = {
	itemId: number | string;
	index: number;
	payload: Partial<Data> & { deleted?: boolean };
	restPayload?: Partial<Data> & { deleted?: boolean };
};

export interface BaseEntry {
	id: string | number;
	date: Temporal.PlainDate;
	config?: RecurrenceConfig;
}

export type GeneratedEntry<Data extends BaseEntry> = {
	$: Data;
	index: number;
	actualDate: Temporal.PlainDate;
	paymentDate: Temporal.PlainDate;
};
