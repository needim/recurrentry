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
		case "week":
			return date.add({ weeks: amount });
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
): Temporal.PlainDate {
	const plainDate = date.with({ day: 1 });

	const [position, dayType] = on.split("-") as [
		OrdinalPosition,
		DayCategory | DayOfWeek,
	];
	const firstDayOfMonth = plainDate;

	// Validate required weekendDays for day categories
	if ((dayType === "weekday" || dayType === "weekend") && !weekendDays.length) {
		throw new Error(
			`weekendDays must be provided when using ${dayType} day category`,
		);
	}

	// Find matching days
	const matchingDays: Temporal.PlainDate[] = [];
	let currentDate = firstDayOfMonth;

	while (currentDate.month === plainDate.month) {
		const dayOfWeek = currentDate.dayOfWeek;
		const isWeekday = isWeekdayByWeekendDays(dayOfWeek, weekendDays);

		const matches =
			dayType === "day" ||
			(dayType === "weekday" && isWeekday) ||
			(dayType === "weekend" && !isWeekday) ||
			dayType === getActualDayName(currentDate);

		if (matches) {
			matchingDays.push(currentDate);
		}

		currentDate = currentDate.add({ days: 1 });
	}

	// Get the target day based on position
	let index = 0;
	switch (position) {
		case "first":
			index = 0;
			break;
		case "second":
			index = 1;
			break;
		case "third":
			index = 2;
			break;
		case "fourth":
			index = 3;
			break;
		case "fifth":
			index = 4;
			break;
		case "nextToLast":
			index = Math.max(0, matchingDays.length - 2);
			break;
		case "last":
			index = matchingDays.length - 1;
			break;
	}

	return matchingDays[index];
}

export const createDate = (dateString: string): Temporal.PlainDate => {
	return Temporal.PlainDate.from(dateString);
};

export function paymentDate(
	current: Temporal.PlainDate,
	gracePeriod = 0,
	holidays: Temporal.PlainDate[] = [],
	weekendDays: number[] = [],
	workdaysOnly = false,
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

	if (
		(workdaysOnly && weekendDays.length > 0) ||
		(workdaysOnly && holidays.length > 0)
	) {
		while (
			weekendDays.includes(plainDate.dayOfWeek) ||
			holidays.some((holiday) => holiday.equals(plainDate))
		) {
			plainDate = plainDate.add({ days: 1 });
		}
	}

	return plainDate;
}
