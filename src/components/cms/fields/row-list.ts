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

export function restoreRow<T>(
	rows: readonly T[],
	removed: RemovedRow<T>,
	max = MAX_COLLECTION_ITEMS,
): T[] | null {
	const id = rowId(removed.row);
	if (rows.length >= max || (id && rows.some((row) => rowId(row) === id))) return null;
	return insertItem(rows, removed.index, removed.row);
}

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
