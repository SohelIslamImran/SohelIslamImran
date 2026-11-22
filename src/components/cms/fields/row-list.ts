import { insertItem } from "../draft/paths";
import { MAX_COLLECTION_ITEMS } from "../../../lib/validation";

export interface RemovedRow<T> {
	row: T;
	index: number;
	label: string;
}

export interface PendingRowRemoval<T> extends RemovedRow<T> {
	remaining: readonly T[];
}

/** Undo belongs to the snapshot produced by removing the row. */
export function pendingRowRemoval<T>(
	rows: readonly T[],
	removal: PendingRowRemoval<T> | null,
): PendingRowRemoval<T> | null {
	return removal?.remaining === rows ? removal : null;
}

/**
 * Put a removed row back at its old index. Returns null when the list is
 * full or already holds an equal row (by `same`; by `id` by default).
 */
export function restoreRow<T>(
	rows: readonly T[],
	removed: RemovedRow<T>,
	max = MAX_COLLECTION_ITEMS,
	same: (a: T, b: T) => boolean = sameRowId,
): T[] | null {
	if (rows.length >= max || rows.some((row) => same(row, removed.row))) return null;
	return insertItem(rows, removed.index, removed.row);
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
