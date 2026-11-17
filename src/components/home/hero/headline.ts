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
