import { insertItem } from "../draft/paths";
import { MAX_COLLECTION_ITEMS } from "../../../lib/validation";

/**
 * A removed row waiting for Undo. Each removal is undone on its own: later
 * edits to the list stay, and the row goes back beside the neighbours it had.
 */
export interface PendingRemoval<T> {
	id: number;
	row: T;
	label: string;
	/**
	 * The list just before the removal, with rows from earlier pending
	 * removals put back, so successive removals restore in their old order.
	 */
	context: readonly T[];
	/** The row's position in `context`. */
	slot: number;
}

export interface RemovalRules<T> {
	max: number;
	/** The row is already in the list, so Undo has nothing to do. */
	same: (a: T, b: T) => boolean;
	/** Finds a neighbour from `context` in the current list. */
	match: (a: T, b: T) => boolean;
}

/** Same object, or rows that share an `id`. */
export function sameRow(a: unknown, b: unknown): boolean {
	return Object.is(a, b) || sameRowId(a, b);
}

const DEFAULT_RULES: RemovalRules<unknown> = {
	max: MAX_COLLECTION_ITEMS,
	same: sameRow,
	match: sameRow,
};

export function removalRules<T>(rules: Partial<RemovalRules<T>> = {}): RemovalRules<T> {
	return { ...(DEFAULT_RULES as RemovalRules<T>), ...rules };
}

/** The match for `item` in `rows` nearest to `near`. */
function locate<T>(rows: readonly T[], item: T, near: number, match: RemovalRules<T>["match"]) {
	let found = -1;
	rows.forEach((row, index) => {
		if (match(row, item) && (found < 0 || Math.abs(index - near) < Math.abs(found - near)))
			found = index;
	});
	return found;
}

/**
 * Where a removed row goes back: after the nearest earlier neighbour still
 * in the list, else before the nearest later one, else at the end.
 */
export function restoreIndex<T>(
	rows: readonly T[],
	removal: Pick<PendingRemoval<T>, "context" | "slot">,
	match: RemovalRules<T>["match"],
): number {
	const { context, slot } = removal;
	for (let index = slot - 1; index >= 0; index--) {
		const found = locate(rows, context[index]!, index, match);
		if (found >= 0) return found + 1;
	}
	for (let index = slot + 1; index < context.length; index++) {
		const found = locate(rows, context[index]!, index, match);
		if (found >= 0) return found;
	}
	return rows.length;
}

/** Record the removal of `before[index]`, given the removals still pending. */
export function createRemoval<T>(
	before: readonly T[],
	index: number,
	label: string,
	pending: readonly PendingRemoval<T>[],
	match: RemovalRules<T>["match"],
	id: number,
): PendingRemoval<T> {
	const context = before.slice();
	let slot = index;
	for (const earlier of pending) {
		if (locate(context, earlier.row, earlier.slot, match) >= 0) continue;
		const at = restoreIndex(context, earlier, match);
		context.splice(at, 0, earlier.row);
		if (at <= slot) slot++;
	}
	return { id, row: before[index]!, label, context, slot };
}

/**
 * Put a removed row back without touching the rest of the list. Null when
 * the list is full or already holds the row.
 */
export function restoreRemoval<T>(
	rows: readonly T[],
	removal: PendingRemoval<T>,
	rules: RemovalRules<T>,
): { rows: T[]; index: number } | null {
	if (rows.length >= rules.max || rows.some((row) => rules.same(row, removal.row))) return null;
	const index = restoreIndex(rows, removal, rules.match);
	return { rows: insertItem(rows, index, removal.row), index };
}

/** The list with every pending removal undone, newest first; null if one cannot be. */
export function restoreAll<T>(
	rows: readonly T[],
	removals: readonly PendingRemoval<T>[],
	rules: RemovalRules<T>,
): T[] | null {
	let current = rows.slice();
	for (const removal of removals.slice().reverse()) {
		const restored = restoreRemoval(current, removal, rules);
		if (!restored) return null;
		current = restored.rows;
	}
	return current;
}

/**
 * A history restore, discard, or conflict resolution replaced the whole
 * draft: it arrives as a new draft that is also the saved one. Edits only
 * change the draft, so their saved copy is always an older object.
 */
export function replacedDraft(
	previous: { draft: unknown },
	next: { draft: unknown; saved: unknown },
): boolean {
	return next.draft !== previous.draft && next.draft === next.saved;
}

function sameRowId(a: unknown, b: unknown): boolean {
	const id = rowId(a);
	return id !== undefined && rowId(b) === id;
}

/** Tags are unique regardless of case. */
export const sameTag = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
/** Attached media IDs are unique. */
export const sameValue = (a: unknown, b: unknown) => a === b;
/** Paragraphs and highlights may repeat. */
export const neverSame = () => false;

export function reorderOffset(event: {
	target: EventTarget | null;
	currentTarget: Element;
	defaultPrevented: boolean;
	altKey: boolean;
	key: string;
}): -1 | 1 | undefined {
	const { target, currentTarget, defaultPrevented, altKey, key } = event;
	if (defaultPrevented || !altKey || (key !== "ArrowUp" && key !== "ArrowDown")) return;
	if (!(target instanceof Element) || target.closest("input, textarea, select, [contenteditable]"))
		return;
	const control = target.closest("[data-row-handle], [data-row-reorder]");
	if (control?.closest(".cms-sortable-row") !== currentTarget) return;
	return key === "ArrowUp" ? -1 : 1;
}

export function rowId(row: unknown): string | undefined {
	if (row && typeof row === "object" && "id" in row && typeof row.id === "string") return row.id;
	return undefined;
}

export function newRowId(): string {
	return crypto.randomUUID();
}

export function duplicateRow<T extends object>(row: T): T {
	return rowId(row) ? { ...structuredClone(row), id: newRowId() } : structuredClone(row);
}
