import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MediaFrame } from "./MediaFrame";
import { ownerMediaPreviewSrc } from "./owner-media";

describe("ownerMediaPreviewSrc", () => {
	it("returns owner-only /draft-media URLs for valid IDs and null otherwise", () => {
		expect(ownerMediaPreviewSrc("asset-12345678")).toBe("/draft-media/asset-12345678");
		expect(ownerMediaPreviewSrc("")).toBeNull();
		expect(ownerMediaPreviewSrc(null)).toBeNull();
		expect(ownerMediaPreviewSrc(undefined)).toBeNull();
		expect(ownerMediaPreviewSrc("short")).toBeNull();
		expect(ownerMediaPreviewSrc("../escape-attempt")).toBeNull();
	});
});

describe("MediaFrame SSR", () => {
	it("renders a reserved frame with skeleton and /draft-media image for valid assets", () => {
		const html = renderToStaticMarkup(
			createElement(MediaFrame, {
				assetId: "asset-draft-1234",
				mimeType: "image/webp",
				width: 1200,
				height: 800,
				alt: "Project preview",
				chip: "draft",
			}),
		);
		expect(html).toContain('data-state="loading"');
		expect(html).toContain("aspect-ratio:1200 / 800");
		expect(html).toContain("cms-skeleton");
		expect(html).toContain('src="/draft-media/asset-draft-1234"');
		expect(html).toContain('loading="lazy"');
		expect(html).toContain('decoding="async"');
		expect(html).not.toContain("/media/asset-draft-1234");
		expect(html).toContain("Draft");
		expect(html).toContain("Δ");
	});

	it("still attempts the owner preview when mimeType is omitted (Travel IDs and legacy assets)", () => {
		const html = renderToStaticMarkup(
			createElement(MediaFrame, {
				assetId: "travel-photo-01",
			}),
		);
		expect(html).toContain('src="/draft-media/travel-photo-01"');
		expect(html).toContain('data-state="loading"');
	});

	it("renders an icon and PDF label for PDF assets without an img tag", () => {
		const html = renderToStaticMarkup(
			createElement(MediaFrame, {
				assetId: "resume-pdf-12345",
				mimeType: "application/pdf",
				chip: "published",
			}),
		);
		expect(html).not.toContain("<img");
		expect(html).toContain("PDF");
		expect(html).toContain("Published");
	});

	it("shows the fallback for invalid asset IDs without requesting an image", () => {
		const html = renderToStaticMarkup(
			createElement(MediaFrame, {
				assetId: "bad",
			}),
		);
		expect(html).not.toContain("<img");
		expect(html).toContain("Preview unavailable");
		expect(html).toContain('data-state="error"');
	});

	it("renders a quiet icon placeholder when no asset is selected", () => {
		const html = renderToStaticMarkup(
			createElement(MediaFrame, {
				assetId: null,
			}),
		);
		expect(html).not.toContain("<img");
		expect(html).not.toContain("Preview unavailable");
		expect(html).toContain('data-state="fallback"');
	});
});
