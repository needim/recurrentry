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

export function getActualDayName(temporalDate: Temporal.PlainDate): string {
	if (!(temporalDate instanceof Temporal.PlainDate)) {
		throw new TypeError("Expected a Temporal.PlainDate instance");
	}

	return temporalDate
		.toLocaleString("en-US", { weekday: "long" })
		.toLocaleLowerCase();
}

export function isWeekdayByWeekendDays(
	dayOfWeek: number,
	weekendDays: number[],
): boolean {
	return !weekendDays.includes(dayOfWeek);
}

export function getOrdinalDate(
	date: Temporal.PlainDate,
	on: Ordinal,
	weekendDays: number[],
): Temporal.PlainDate | null {
	const firstDayOfMonth = date.with({ day: 1 });
	const targetMonth = firstDayOfMonth.month;

	const [position, dayType] = on.split("-") as [
		OrdinalPosition,
		DayCategory | DayOfWeek,
	];

	// Validate required weekendDays for day categories
	if ((dayType === "weekday" || dayType === "weekend") && !weekendDays.length) {
		throw new Error(
			`weekendDays must be provided when using ${dayType} day category`,
		);
	}

	const dayOfWeekValues: ReadonlyArray<DayOfWeek> = [
		"monday",
		"tuesday",
		"wednesday",
		"thursday",
		"friday",
		"saturday",
		"sunday",
	];
	const isSpecificDayOfWeek = (dt: string): dt is DayOfWeek => {
		return dayOfWeekValues.includes(dt as DayOfWeek);
	};

	const getDayNumberFromName = (name: DayOfWeek): number => {
		// Temporal: 1 (Mon) to 7 (Sun)
		return dayOfWeekValues.indexOf(name) + 1;
	};

	const isMatch = (currentEvalDate: Temporal.PlainDate): boolean => {
		const dayOfWeekVal = currentEvalDate.dayOfWeek;
		const isWeekday = isWeekdayByWeekendDays(dayOfWeekVal, weekendDays);
		return (
			dayType === "day" ||
			(dayType === "weekday" && isWeekday) ||
			(dayType === "weekend" && !isWeekday) ||
			dayType === getActualDayName(currentEvalDate)
		);
	};

	// Optimized path for "first" through "fifth"
	if (
		position === "first" ||
		position === "second" ||
		position === "third" ||
		position === "fourth" ||
		position === "fifth"
	) {
		const targetCount = {
			first: 1,
			second: 2,
			third: 3,
			fourth: 4,
			fifth: 5,
		}[position];
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
		while (currentDate.month === targetMonth) {
			if (isMatch(currentDate)) {
				count++;
				if (count === targetCount) {
					return currentDate;
				}
			}
			if (currentDate.day === currentDate.daysInMonth) break;
			currentDate = currentDate.add({ days: 1 });
		}
		return null;
	}

	// Optimized path for "last"
	if (position === "last") {
		if (isSpecificDayOfWeek(dayType)) {
			const targetDoW = getDayNumberFromName(dayType);
			let currentDate = date.with({ day: date.daysInMonth });
			// Adjust to the last occurrence of targetDoW in or before last day of month
			const daysToSubtract = (currentDate.dayOfWeek - targetDoW + 7) % 7;
			currentDate = currentDate.subtract({ days: daysToSubtract });

			if (currentDate.month === targetMonth) {
				return currentDate;
			}
			return null;
		}
		// Original logic for "day", "weekday", "weekend"
		let currentDate = date.with({ day: date.daysInMonth });
		while (currentDate.month === targetMonth) {
			if (isMatch(currentDate)) {
				return currentDate;
			}
			if (currentDate.day === 1) break;
			currentDate = currentDate.subtract({ days: 1 });
		}
		return null;
	}

	// Optimized path for "nextToLast"
	if (position === "nextToLast") {
		if (isSpecificDayOfWeek(dayType)) {
			const targetDoW = getDayNumberFromName(dayType);
			let currentDate = date.with({ day: date.daysInMonth });

			const daysToSubtract = (currentDate.dayOfWeek - targetDoW + 7) % 7;
			currentDate = currentDate.subtract({ days: daysToSubtract });

			if (currentDate.month !== targetMonth) {
				return null; // No such day in the month
			}

			const lastOccurrence = currentDate;
			const nextToLastOccurrence = lastOccurrence.subtract({ days: 7 });

			if (nextToLastOccurrence.month === targetMonth) {
				return nextToLastOccurrence;
			}
			// Only one occurrence, return it as per original logic's side effect for nextToLast
			return lastOccurrence;
		}
		// Original logic for "day", "weekday", "weekend"
		let lastMatch: Temporal.PlainDate | null = null;
		let nextToLastMatch: Temporal.PlainDate | null = null;
		let currentDate = date.with({ day: date.daysInMonth });

		while (currentDate.month === targetMonth) {
			if (isMatch(currentDate)) {
				if (lastMatch === null) {
					lastMatch = currentDate;
				} else {
					nextToLastMatch = currentDate;
					return nextToLastMatch;
				}
			}
			if (currentDate.day === 1) break;
			currentDate = currentDate.subtract({ days: 1 });
		}

		if (lastMatch !== null) {
			return lastMatch;
		}
		return null;
	}

	return null;
}

export const createDate = (dateString: string): Temporal.PlainDate => {
	return Temporal.PlainDate.from(dateString);
};

export function paymentDate(
	current: Temporal.PlainDate,
	gracePeriod = 0,
	holidays: Temporal.PlainDate[] = [],
	weekendDays: number[] = [],
	workdaysOnly?: "previous" | "next",
): Temporal.PlainDate {
	if (!isValidDate(current)) {
		throw new Error("Invalid current date provided");
	}

	if (holidays.some((date) => !isValidDate(date))) {
		throw new Error("Invalid holiday date found in holidays array");
	}

	let plainDate = current;

	if (gracePeriod > 0) {
		plainDate = plainDate.add({ days: gracePeriod });
	}

	if (workdaysOnly && (weekendDays.length > 0 || holidays.length > 0)) {
		const holidaySet = new Set(holidays.map((h) => h.toString()));
		while (
			weekendDays.includes(plainDate.dayOfWeek) ||
			holidaySet.has(plainDate.toString())
		) {
			plainDate = plainDate.add({ days: workdaysOnly === "next" ? 1 : -1 });
		}
	}

	return plainDate;
}
