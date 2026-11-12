import { fuzzyScore } from "./fuzzy";
import { TERMINAL_PAGES } from "./terminal";

export interface Destination {
	label: string;
	path: string;
}

/**
 * Where a lost request probably meant to go: pages and published projects
 * whose name is closest to the missing path ("/wrok" → Work, "/work/kno" →
 * Kuno). Always returns at least Home and Work, at most `limit` entries.
 */
export function suggestDestinations(
	pathname: string,
	projects: readonly { slug: string; title: string }[],
	limit = 3,
): Destination[] {
	const segments = decodeSafe(pathname)
		.toLowerCase()
		.split("/")
		.map((segment) => segment.trim())
		.filter(Boolean);
	const last = segments.at(-1) ?? "";
	const candidates: (Destination & { keys: string[]; boost: number })[] = [
		...TERMINAL_PAGES.map((page) => ({
			label: page.label,
			path: page.path,
			keys: [page.name, ...page.aliases],
			boost: 0,
		})),
		...projects
			.filter((project) => project.slug.trim() && project.title.trim())
			.map((project) => ({
				label: project.title.trim(),
				path: `/work/${project.slug.trim()}`,
				keys: [project.slug.trim().toLowerCase(), project.title.trim().toLowerCase()],
				boost: segments[0] === "work" || segments[0] === "projects" ? 60 : 0,
			})),
	];
	const scored = last
		? candidates
				.map((candidate) => {
					let best: number | null = null;
					for (const key of candidate.keys) {
						const score = similarity(last, key);
						if (score !== null && (best === null || score > best)) best = score;
					}
					return { candidate, score: best === null ? null : best + candidate.boost };
				})
				.filter(
					(entry): entry is { candidate: (typeof candidates)[number]; score: number } =>
						entry.score !== null,
				)
				.sort((a, b) => b.score - a.score)
				.map((entry) => entry.candidate)
		: [];
	const result: Destination[] = [];
	for (const item of [...scored, ...candidates.slice(0, 2)]) {
		if (result.length >= limit) break;
		if (item.path === pathname || result.some((existing) => existing.path === item.path)) continue;
		result.push({ label: item.label, path: item.path });
	}
	return result;
}

function decodeSafe(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

/** Best of a fuzzy subsequence match and a typo-tolerant edit distance. */
function similarity(input: string, key: string): number | null {
	const fuzzy = fuzzyScore(input, key) ?? fuzzyScore(key, input);
	const distance = editDistance(input, key);
	const allowed = Math.max(1, Math.floor(Math.max(input.length, key.length) / 3));
	const typo = distance <= allowed ? 900 - distance * 120 : null;
	if (fuzzy === null) return typo;
	return typo === null ? fuzzy : Math.max(fuzzy, typo);
}

/** Optimal string alignment distance (Levenshtein plus adjacent swaps). */
export function editDistance(a: string, b: string): number {
	const rows = a.length + 1;
	const cols = b.length + 1;
	const table: number[][] = Array.from({ length: rows }, (_, i) =>
		Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
	);
	for (let i = 1; i < rows; i += 1) {
		for (let j = 1; j < cols; j += 1) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			const row = table[i] as number[];
			const above = table[i - 1] as number[];
			let value = Math.min((above[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (above[j - 1] ?? 0) + cost);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
				value = Math.min(value, ((table[i - 2] as number[])[j - 2] ?? 0) + 1);
			}
			row[j] = value;
		}
	}
	return (table[rows - 1] as number[])[cols - 1] ?? 0;
}
