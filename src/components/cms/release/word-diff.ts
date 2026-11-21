/**
 * Word-level LCS diff for prose fields in the release and history views.
 * Pure, dependency-free, and bounded in time/memory so long essays stay fast.
 */

export interface WordDiffPart {
	kind: "same" | "add" | "del";
	text: string;
}

const MAX_LCS_TOKENS = 420;

/** Split text into alternating word/punctuation and whitespace tokens so joining reproduces the exact input. */
function tokenize(text: string): string[] {
	if (!text) return [];
	return text.match(/\S+|\s+/gu) ?? [];
}

function mergeAdjacent(parts: WordDiffPart[]): WordDiffPart[] {
	const merged: WordDiffPart[] = [];
	for (const part of parts) {
		if (!part.text) continue;
		const previous = merged[merged.length - 1];
		if (previous && previous.kind === part.kind) {
			previous.text += part.text;
		} else {
			merged.push({ ...part });
		}
	}
	return merged;
}

/**
 * Compute a readable word-level diff between `before` (live) and `after` (draft).
 * Trims common prefixes/suffixes first, then runs an exact LCS on the middle
 * window (falling back to coarse replace when an edit spans >420 tokens).
 */
export function diffWords(before: string, after: string): WordDiffPart[] {
	if (before === after) {
		return before ? [{ kind: "same", text: before }] : [];
	}
	if (!before) return [{ kind: "add", text: after }];
	if (!after) return [{ kind: "del", text: before }];

	const left = tokenize(before);
	const right = tokenize(after);

	let prefix = 0;
	while (prefix < left.length && prefix < right.length && left[prefix] === right[prefix]) {
		prefix += 1;
	}

	let suffix = 0;
	while (
		suffix < left.length - prefix &&
		suffix < right.length - prefix &&
		left[left.length - 1 - suffix] === right[right.length - 1 - suffix]
	) {
		suffix += 1;
	}

	const a = left.slice(prefix, left.length - suffix);
	const b = right.slice(prefix, right.length - suffix);

	const parts: WordDiffPart[] = [];
	if (prefix > 0) {
		parts.push({ kind: "same", text: left.slice(0, prefix).join("") });
	}

	if (a.length === 0) {
		if (b.length > 0) parts.push({ kind: "add", text: b.join("") });
	} else if (b.length === 0) {
		parts.push({ kind: "del", text: a.join("") });
	} else if (a.length > MAX_LCS_TOKENS || b.length > MAX_LCS_TOKENS) {
		parts.push({ kind: "del", text: a.join("") });
		parts.push({ kind: "add", text: b.join("") });
	} else {
		const m = a.length;
		const n = b.length;
		const stride = n + 1;
		const dp = new Uint16Array((m + 1) * stride);

		for (let i = m - 1; i >= 0; i -= 1) {
			for (let j = n - 1; j >= 0; j -= 1) {
				if (a[i] === b[j]) {
					dp[i * stride + j] = (dp[(i + 1) * stride + (j + 1)] ?? 0) + 1;
				} else {
					const down = dp[(i + 1) * stride + j] ?? 0;
					const rightVal = dp[i * stride + (j + 1)] ?? 0;
					dp[i * stride + j] = down >= rightVal ? down : rightVal;
				}
			}
		}

		let i = 0;
		let j = 0;
		while (i < m && j < n) {
			if (a[i] === b[j]) {
				parts.push({ kind: "same", text: a[i] ?? "" });
				i += 1;
				j += 1;
			} else if ((dp[(i + 1) * stride + j] ?? 0) >= (dp[i * stride + (j + 1)] ?? 0)) {
				parts.push({ kind: "del", text: a[i] ?? "" });
				i += 1;
			} else {
				parts.push({ kind: "add", text: b[j] ?? "" });
				j += 1;
			}
		}
		while (i < m) {
			parts.push({ kind: "del", text: a[i] ?? "" });
			i += 1;
		}
		while (j < n) {
			parts.push({ kind: "add", text: b[j] ?? "" });
			j += 1;
		}
	}

	if (suffix > 0) {
		parts.push({ kind: "same", text: left.slice(left.length - suffix).join("") });
	}

	return mergeAdjacent(parts);
}
