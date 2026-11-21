import { insertItem } from "../draft/paths";
import { MAX_COLLECTION_ITEMS } from "../../../lib/validation";

export interface RemovedRow<T> {
	row: T;
	index: number;
	label: string;
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
