const MONTHS: Record<string, string> = {
	jan: "01",
	feb: "02",
	mar: "03",
	apr: "04",
	may: "05",
	jun: "06",
	jul: "07",
	aug: "08",
	sep: "09",
	oct: "10",
	nov: "11",
	dec: "12",
};

/** Returns a machine-readable year-month for the first date in a human period. */
export function dateTimeFromPeriod(period: string): string | undefined {
	const match = period.trim().match(/\b([A-Za-z]{3,9})\s+(\d{4})\b/);
	if (!match) return undefined;
	const month = MONTHS[match[1].slice(0, 3).toLowerCase()];
	return month ? `${match[2]}-${month}` : match[2];
}
