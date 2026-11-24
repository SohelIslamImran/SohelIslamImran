import { MAX_CONTENT_BYTES } from "../../../lib/validation";
import { formatBytes } from "../shell/time";

export const MAX_IMPORT_FILE_BYTES = 3 * MAX_CONTENT_BYTES;

export function compactByteLength(value: unknown): number {
	return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export function checkImportFile(size: number): string | null {
	return size > MAX_IMPORT_FILE_BYTES
		? `File is ${formatBytes(size)}, which exceeds the ${formatBytes(MAX_IMPORT_FILE_BYTES)} import limit.`
		: null;
}

export function exportFileName(revision: number, dirty: boolean): string {
	return `portfolio-draft-r${revision}${dirty ? "-unsaved" : ""}.json`;
}
