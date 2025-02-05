import {
	type MonthlyPayment,
	PERIOD,
	type SinglePayment,
	type WeeklyPayment,
	createDate,
	generator,
} from ".";

const data = [
	{
		id: 1,
		amount: "100.00",
		type: "income",
		date: createDate("2024-01-01"),
		config: {
			period: PERIOD.NONE,
			start: createDate("2024-01-01"),
			interval: 1,
			options: {
				workdaysOnly: false, // allows on non-working days
			},
		} satisfies SinglePayment,
	},
	{
		id: 2,
		amount: "100.00",
		type: "income",
		date: createDate("2024-01-01"),
		config: {
			period: PERIOD.NONE,
			start: createDate("2024-01-01"),
			interval: 1,
			options: {
				workdaysOnly: true,
			},
		} satisfies SinglePayment,
	},
	{
		id: 3,
		amount: "255.00",
		type: "income",
		date: createDate("2024-01-01"),
		config: {
			period: PERIOD.WEEK,
			start: createDate("2024-01-01"),
			interval: 5,
			options: {
				every: 1,
				workdaysOnly: true,
			},
		} satisfies WeeklyPayment,
	},
	{
		id: 4,
		name: "Credit Card",
		amount: "1000.00",
		type: "expense",
		date: createDate("2024-01-01"),
		config: {
			period: PERIOD.MONTH,
			start: createDate("2024-01-01"),
			interval: 3,
			options: {
				every: 1,
				workdaysOnly: true,
				gracePeriod: 10,
			},
		} satisfies MonthlyPayment,
	},
];

const result = generator({
	data,
	modifications: [
		{
			itemId: 3,
			index: 2,
			type: "edit",
			applyToFuture: true,
			data: {
				amount: "300.00",
			},
		},
		{
			itemId: 3,
			index: 4,
			type: "edit",
			applyToFuture: true,
			data: {
				amount: "555.12",
			},
		},
	],
	weekendDays: [6, 7], // Saturday and Sunday
	holidays: [createDate("2024-01-01")], // New Year's Day
});

console.log(JSON.stringify(result, null, 2));

// instead of stringifying the result, let's log a line for each entry in a table format

console.log("| #-index | amount | period | occurrence date | payment date |");
console.log("|---|--------|--------|-------------|------|");
let currentId = null;
for (const entry of result) {
	if (currentId !== null && currentId !== entry.$.id) {
		console.log("|---|--------|--------|-------------|------|");
	}
	console.log(
		`| ${entry.$.id}/${entry.index} | ${entry.$.amount} | ${entry.$.config.period} | ${entry.actualDate?.toString() ?? "-"} | ${entry.paymentDate.toString()} |`,
	);
	currentId = entry.$.id;
}
