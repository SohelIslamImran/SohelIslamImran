import { describe, expect, it } from "vitest";
import {
	checkUploadFile,
	MEDIA_ALLOWED_TYPES,
	MEDIA_MAX_BYTES,
	mediaTypeShortLabel,
} from "./media-policy";

describe("media upload policy", () => {
	it("rejects empty files at 0 bytes", () => {
		expect(checkUploadFile({ size: 0, type: "image/jpeg" })).toMatchObject({
			ok: false,
			reason: "empty",
		});
		expect(checkUploadFile({ size: 0, type: "" })).toMatchObject({
			ok: false,
			reason: "empty",
		});
	});

	it("accepts allowed types from 1 byte up to exactly 20 MiB", () => {
		for (const type of MEDIA_ALLOWED_TYPES.keys()) {
			expect(checkUploadFile({ size: 1, type })).toEqual({ ok: true });
			expect(checkUploadFile({ size: MEDIA_MAX_BYTES, type })).toEqual({ ok: true });
		}
	});

	it("rejects files over 20 MiB by even 1 byte", () => {
		expect(checkUploadFile({ size: MEDIA_MAX_BYTES + 1, type: "image/png" })).toMatchObject({
			ok: false,
			reason: "size",
		});
	});

	it("rejects unsupported MIME types", () => {
		for (const type of ["image/gif", "image/svg+xml", "text/plain", ""]) {
			expect(checkUploadFile({ size: 1024, type })).toMatchObject({
				ok: false,
				reason: "type",
			});
		}
	});

	it("formats short labels for staged uploads", () => {
		expect(mediaTypeShortLabel("image/jpeg")).toBe("JPEG");
		expect(mediaTypeShortLabel("application/pdf")).toBe("PDF");
		expect(mediaTypeShortLabel("image/webp")).toBe("WebP");
	});
});
