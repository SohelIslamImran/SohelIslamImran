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

/**
 * Machine-readable year-month for the *start* of a human period, or undefined
 * when the period has no parseable start date.
 *
 * Ranges are written start-first ("Mar 2019 — Aug 2021"), so the first year-like
 * token is the start. A leading open-ended marker ("Present — 2021") has no start
 * and yields undefined rather than the trailing year.
 */
export function dateTimeFromPeriod(period: string): string | undefined {
	const match = period.trim().match(/(?:^|\s)(?:([A-Za-z]{3,9})\s+)?(\d{4})\b/);
	if (!match) return undefined;
	// "Present", "Current", "Ongoing" and friends mark an open start, so a year
	// after the separator is the end of the range, not the beginning.
	const lead = period.slice(0, match.index).trim().toLowerCase();
	if (lead && /^(present|current|ongoing|now|today)\b/u.test(lead)) return undefined;
	const month = match[1] ? MONTHS[match[1].slice(0, 3).toLowerCase()] : undefined;
	return month ? `${match[2]}-${month}` : match[2];
}
