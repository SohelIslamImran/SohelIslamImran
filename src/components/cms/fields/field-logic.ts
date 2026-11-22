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
): { armed: boolean; remove: boolean } {
	if (draft !== "" || count === 0) return { armed: false, remove: false };
	return armed ? { armed: false, remove: true } : { armed: true, remove: false };
}
