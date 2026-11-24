/**
 * Shared media upload policy used by both the CMS library client (before
 * allocating object URLs or posting) and `src/server/media.server.ts`.
 */
export const MEDIA_MAX_BYTES = 20 * 1024 * 1024;

export const MEDIA_ALLOWED_TYPES = new Map<string, string>([
	["image/jpeg", "jpg"],
	["image/png", "png"],
	["image/webp", "webp"],
	["image/avif", "avif"],
	["application/pdf", "pdf"],
]);

const MEDIA_SHORT_LABELS: Record<string, string> = {
	"image/jpeg": "JPEG",
	"image/png": "PNG",
	"image/webp": "WebP",
	"image/avif": "AVIF",
	"application/pdf": "PDF",
};

export function mediaTypeShortLabel(mimeType: string): string {
	return MEDIA_SHORT_LABELS[mimeType] ?? (mimeType || "file");
}

export type UploadFileCheck =
	| { ok: true }
	| { ok: false; reason: "empty" | "size" | "type"; message: string };

export function checkUploadFile(file: { size: number; type: string }): UploadFileCheck {
	if (file.size <= 0) {
		return {
			ok: false,
			reason: "empty",
			message: "This file is empty. Choose a file with content.",
		};
	}
	if (!MEDIA_ALLOWED_TYPES.has(file.type)) {
		return {
			ok: false,
			reason: "type",
			message: "Use JPEG, PNG, WebP, AVIF, or PDF files.",
		};
	}
	if (file.size > MEDIA_MAX_BYTES) {
		return {
			ok: false,
			reason: "size",
			message: "This file is larger than 20 MB. Choose a smaller file.",
		};
	}
	return { ok: true };
}
