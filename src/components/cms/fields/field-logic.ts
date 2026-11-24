const LINE_BREAKS = /[^\S\r\n\u2028\u2029]*[\r\n\u2028\u2029]+[^\S\r\n\u2028\u2029]*/gu;

/**
 * Replace line breaks (typed, pasted, or dropped) with a single space, for
 * fields that wrap on screen but must store one line.
 */
export function toSingleLine(value: string): string {
	return value.replace(LINE_BREAKS, " ");
}

/**
 * Backspace in an empty tag input. The first press selects the last tag;
 * a second press removes it. Typing or any other key clears the selection.
 */
export function tagBackspace(
	draft: string,
	count: number,
	armed: boolean,
	repeat = false,
): { armed: boolean; remove: boolean } {
	if (draft !== "" || count === 0) return { armed: false, remove: false };
	if (repeat) return { armed, remove: false };
	return armed ? { armed: false, remove: true } : { armed: true, remove: false };
}

export interface TagBatchResult {
	next: string[];
	remaining: string[];
	added: number;
	/** Indexes into `existing` of tags that already existed and were skipped. */
	duplicateIndexes: number[];
	/** Duplicate values skipped from `raw`, in input order. */
	duplicates: string[];
	/** Polite status message for duplicate or batch feedback, or `null` when none were skipped. */
	message: string | null;
}

/**
 * Parse a comma-separated tag entry against `existing` tags (case-insensitive)
 * and `max` capacity. Returns the next list, overflow items, existing duplicate
 * indexes to highlight, and a polite announcement.
 */
export function mergeTagBatch(
	existing: readonly string[],
	raw: string,
	max: number,
	fieldLabel = "Tags",
): TagBatchResult {
	const parts = raw
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
	if (parts.length === 0) {
		return {
			next: [...existing],
			remaining: [],
			added: 0,
			duplicateIndexes: [],
			duplicates: [],
			message: null,
		};
	}

	const next = [...existing];
	const remaining: string[] = [];
	const duplicateIndexes: number[] = [];
	const duplicates: string[] = [];
	let added = 0;

	for (const part of parts) {
		const lower = part.toLowerCase();
		const foundIndex = next.findIndex((tag) => tag.toLowerCase() === lower);
		if (foundIndex >= 0) {
			duplicates.push(part);
			if (foundIndex < existing.length && !duplicateIndexes.includes(foundIndex)) {
				duplicateIndexes.push(foundIndex);
			}
			continue;
		}
		if (next.length >= max) {
			remaining.push(part);
		} else {
			next.push(part);
			added++;
		}
	}

	let message: string | null = null;
	if (duplicates.length > 0) {
		if (added > 0) {
			message = `Added ${added}, skipped ${duplicates.length} ${duplicates.length === 1 ? "duplicate" : "duplicates"}.`;
		} else if (duplicates.length === 1 && remaining.length === 0) {
			const target = fieldLabel.trim() || "Tags";
			message = `“${duplicates[0]}” is already in ${target}.`;
		} else {
			message = `Skipped ${duplicates.length} ${duplicates.length === 1 ? "duplicate" : "duplicates"}.`;
		}
	}

	return { next, remaining, added, duplicateIndexes, duplicates, message };
}

export function hrefKind(value: string): "web" | "mail" | "tel" | "empty" | "path" {
	const href = value.trim().toLowerCase();
	if (/^https?:\/\//u.test(href)) return "web";
	if (href.startsWith("mailto:")) return "mail";
	if (href.startsWith("tel:")) return "tel";
	return href ? "path" : "empty";
}
