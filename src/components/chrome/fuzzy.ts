/**
 * Tiny fuzzy matcher for the command palette. Characters of the query must
 * appear in order; contiguous runs, word starts, and prefix matches score
 * higher. Returns null when the query does not match.
 */
export function fuzzyScore(query: string, text: string): number | null {
	const needle = normalize(query);
	if (!needle) return 0;
	const haystack = normalize(text);
	if (!haystack) return null;

	const direct = haystack.indexOf(needle);
	if (direct !== -1) {
		const atWordStart = direct === 0 || isBoundary(haystack[direct - 1]);
		return (
			1000 - direct * 2 + (atWordStart ? 200 : 0) + (direct === 0 ? 150 : 0) - haystack.length * 0.1
		);
	}

	let score = 0;
	let position = 0;
	let previousMatch = -2;
	let firstMatch = -1;
	for (const character of needle) {
		if (character === " ") continue;
		const index = haystack.indexOf(character, position);
		if (index === -1) return null;
		if (firstMatch === -1) firstMatch = index;
		if (index === previousMatch + 1) score += 12;
		if (index === 0 || isBoundary(haystack[index - 1])) score += 18;
		score -= Math.min(index - position, 12);
		previousMatch = index;
		position = index + 1;
	}
	// Letters scattered across a long string are noise, not a match.
	const span = previousMatch - firstMatch + 1;
	if (span > needle.replaceAll(" ", "").length * 3 + 2) return null;
	return score - haystack.length * 0.1;
}

function normalize(value: string): string {
	return value.normalize("NFD").replace(/[̀-ͯ]/gu, "").toLowerCase().trim().replace(/\s+/gu, " ");
}

function isBoundary(character: string | undefined): boolean {
	return character === undefined || /[\s\-_/.@]/u.test(character);
}

/**
 * Scores `label` fuzzily (weighted higher) and `keywords` by substring only,
 * returning the best match or null.
 */
export function scoreItem(query: string, label: string, keywords = ""): number | null {
	const labelScore = fuzzyScore(query, label);
	const keywordScore =
		keywords && normalize(keywords).includes(normalize(query)) ? fuzzyScore(query, keywords) : null;
	if (labelScore === null && keywordScore === null) return null;
	return Math.max(labelScore === null ? -Infinity : labelScore + 40, keywordScore ?? -Infinity);
}
