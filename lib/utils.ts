import { Temporal } from "temporal-polyfill";
import type {
	DayCategory,
	DayOfWeek,
	Ordinal,
	OrdinalPosition,
	Period,
} from "./types";

export const addByPeriod = (
	date: Temporal.PlainDate,
	amount: number,
	period: Period,
): Temporal.PlainDate => {
	switch (period) {
		case "year":
			return date.add({ years: amount });
		case "month":
			return date.add({ months: amount });
		default:
			return date.add({ days: amount });
	}
};

export function isValidDate(date: Temporal.PlainDate): boolean {
	return date instanceof Temporal.PlainDate;
}

const WEEKDAY_NAMES = [
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
	"sunday",
] as const;

export function getActualDayName(temporalDate: Temporal.PlainDate): string {
	if (!(temporalDate instanceof Temporal.PlainDate)) {
		throw new TypeError("Expected a Temporal.PlainDate instance");
	}

	return WEEKDAY_NAMES[temporalDate.dayOfWeek - 1];
}

export function isWeekdayByWeekendDays(
	dayOfWeek: number,
	weekendDays: number[],
): boolean {
	return !weekendDays.includes(dayOfWeek);
}

const DAY_OF_WEEK_VALUES: ReadonlyArray<DayOfWeek> = [
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
	"sunday",
];

const POSITION_COUNT_MAP = {
	first: 1,
	second: 2,
	third: 3,
	fourth: 4,
	fifth: 5,
} as const;

const isSpecificDayOfWeek = (dt: string): dt is DayOfWeek => {
	return DAY_OF_WEEK_VALUES.includes(dt as DayOfWeek);
};

const getDayNumberFromName = (name: DayOfWeek): number => {
	// Temporal: 1 (Mon) to 7 (Sun)
	return DAY_OF_WEEK_VALUES.indexOf(name) + 1;
};

export function getOrdinalDate(
	date: Temporal.PlainDate,
	on: Ordinal,
	weekendDays: number[],
): Temporal.PlainDate | null {
	const firstDayOfMonth = date.with({ day: 1 });
	const targetMonth = firstDayOfMonth.month;
	const daysInMonth = date.daysInMonth;

	const [position, dayType] = on.split("-") as [
		OrdinalPosition,
		DayCategory | DayOfWeek,
	];

	// Pre-compute weekend set for better performance
	const weekendSet = weekendDays.length > 0 ? new Set(weekendDays) : null;

	const isMatch = (currentEvalDate: Temporal.PlainDate): boolean => {
		const dayOfWeekVal = currentEvalDate.dayOfWeek;
		const isWeekday = !weekendSet?.has(dayOfWeekVal);
		return (
			dayType === "day" ||
			(dayType === "weekday" && isWeekday) ||
			(dayType === "weekend" && !isWeekday) ||
			dayType === getActualDayName(currentEvalDate)
		);
	};

	if (position in POSITION_COUNT_MAP) {
		const targetCount =
			POSITION_COUNT_MAP[position as keyof typeof POSITION_COUNT_MAP];
		let count = 0;

		if (isSpecificDayOfWeek(dayType)) {
			const targetDoW = getDayNumberFromName(dayType);
			let currentDate = firstDayOfMonth;
			// Adjust to the first occurrence of targetDoW in or after firstDayOfMonth
			const daysToAdd = (targetDoW - currentDate.dayOfWeek + 7) % 7;
			currentDate = currentDate.add({ days: daysToAdd });

			while (currentDate.month === targetMonth) {
				count++;
				if (count === targetCount) {
					return currentDate;
				}
				currentDate = currentDate.add({ days: 7 });
			}
			return null; // Nth item was not found
		}
		// Original logic for "day", "weekday", "weekend"
		let currentDate = firstDayOfMonth;
		for (let day = 1; day <= daysInMonth; day++) {
			if (isMatch(currentDate)) {
				count++;
				if (count === targetCount) {
					return currentDate;
				}
			}
			if (day < daysInMonth) {
				currentDate = currentDate.add({ days: 1 });
			}
		}
		return null;
	}

	// Optimized path for "last"
	if (position === "last") {
		if (isSpecificDayOfWeek(dayType)) {
			const targetDoW = getDayNumberFromName(dayType);
			let currentDate = date.with({ day: daysInMonth });
			// Calculate the last occurrence directly
			const daysToSubtract = (currentDate.dayOfWeek - targetDoW + 7) % 7;
			currentDate = currentDate.subtract({ days: daysToSubtract });

			return currentDate.month === targetMonth ? currentDate : null;
		}

		// Reverse iteration for better performance
		let currentDate = date.with({ day: daysInMonth });
		for (let day = daysInMonth; day >= 1; day--) {
			if (isMatch(currentDate)) {
				return currentDate;
			}
			if (day > 1) {
				currentDate = currentDate.subtract({ days: 1 });
			}
		}
		return null;
	}

	// Optimized path for "nextToLast"
	if (position === "nextToLast") {
		if (isSpecificDayOfWeek(dayType)) {
			const targetDoW = getDayNumberFromName(dayType);
			let currentDate = date.with({ day: daysInMonth });

			const daysToSubtract = (currentDate.dayOfWeek - targetDoW + 7) % 7;
			currentDate = currentDate.subtract({ days: daysToSubtract });

			if (currentDate.month !== targetMonth) {
				return null;
			}

			const lastOccurrence = currentDate;
			const nextToLastOccurrence = lastOccurrence.subtract({ days: 7 });

			return nextToLastOccurrence.month === targetMonth
				? nextToLastOccurrence
				: lastOccurrence;
		}

		// Collect matches efficiently
		let lastMatch: Temporal.PlainDate | null = null;
		let nextToLastMatch: Temporal.PlainDate | null = null;
		let currentDate = date.with({ day: daysInMonth });

		for (let day = daysInMonth; day >= 1; day--) {
			if (isMatch(currentDate)) {
				if (lastMatch === null) {
					lastMatch = currentDate;
				} else {
					nextToLastMatch = currentDate;
					return nextToLastMatch;
				}
			}
			if (day > 1) {
				currentDate = currentDate.subtract({ days: 1 });
			}
		}

		return lastMatch;
	}

	return null;
}

export const createDate = (dateString: string): Temporal.PlainDate => {
	return Temporal.PlainDate.from(dateString);
};

export function paymentDate(
	current: Temporal.PlainDate,
	holidaySet: Set<string>,
	gracePeriod = 0,
	weekendDays: number[] = [],
	workdaysOnly?: "previous" | "next",
): Temporal.PlainDate {
	if (!isValidDate(current)) {
		throw new Error("Invalid current date provided");
	}

	let plainDate = current;

	if (gracePeriod > 0) {
		plainDate = plainDate.add({ days: gracePeriod });
	}

	if (workdaysOnly && (weekendDays.length > 0 || holidaySet.size > 0)) {
		const weekendSet = weekendDays.length > 0 ? new Set(weekendDays) : null;
		const increment = workdaysOnly === "next" ? 1 : -1;

		while (
			weekendSet?.has(plainDate.dayOfWeek) ||
			holidaySet.has(plainDate.toString())
		) {
			plainDate = plainDate.add({ days: increment });
		}
	}

	return plainDate;
}
