export interface HeadlineParts {
	/** Words before the accent, punctuation attached ("screen,"). */
	lead: string[];
	/** Words that carry the accent ink. Empty when nothing should be accented. */
	accent: string[];
}

/**
 * Splits a CMS headline into a plain lead and an accented tail. The tail is
 * the clause after the last comma ("from interface to release."); without a
 * usable comma it is the last word, and only for headlines of four or more
 * words, so short titles stay plain.
 */
export function splitHeadline(title: string): HeadlineParts {
	const text = title.replace(/\s+/gu, " ").trim();
	if (!text) return { lead: [], accent: [] };

	const comma = text.lastIndexOf(",");
	if (comma > 0) {
		const head = text.slice(0, comma + 1).trim();
		const tail = text.slice(comma + 1).trim();
		// Ignore commas that only leave punctuation behind ("Hello, .").
		if (head && /[\p{L}\p{N}]/u.test(tail)) {
			return { lead: head.split(" "), accent: tail.split(" ") };
		}
	}

	const words = text.split(" ");
	if (words.length < 4) return { lead: words, accent: [] };
	return { lead: words.slice(0, -1), accent: words.slice(-1) };
}

export interface WordGroup {
	/** Index of the group's first word in the original list. */
	start: number;
	words: string[];
}

const MAX_GROUP_WORDS = 3;

/** A word of one or two letters, ignoring punctuation ("a", "of", "to", "I"). */
function isShortWord(word: string): boolean {
	return word.replace(/[^\p{L}\p{N}]/gu, "").length <= 2;
}

/**
 * Groups words so a short word stays on the same line as the word after it.
 * Each group is rendered unbreakable, so a headline never ends a line on "a"
 * or "of". A short final word stays in its own group.
 */
export function groupShortWords(words: string[]): WordGroup[] {
	const groups: WordGroup[] = [];
	let current: WordGroup | undefined;
	words.forEach((word, index) => {
		current ??= { start: index, words: [] };
		current.words.push(word);
		// Capped at three words, so a run of short words ("I do it in an") can't
		// become one unbreakable group wider than a phone.
		if (
			!isShortWord(word) ||
			current.words.length === MAX_GROUP_WORDS ||
			index === words.length - 1
		) {
			groups.push(current);
			current = undefined;
		}
	});
	return groups;
}
