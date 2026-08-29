import { describe, expect, it } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT } from "../content/initial";
import { toPublicPortfolioContent } from "../server/cms-storage.server";

describe("public portfolio content", () => {
	it("removes private travel entries and storage keys", () => {
		const content = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		content.identity.avatar = {
			id: "avatar-public",
			key: "portfolio/private/avatar.webp",
			alt: "Portrait",
		};
		content.travel.entries = [
			{
				id: "public-entry",
				place: "Paris",
				region: "France",
				season: "Spring 2026",
				summary: "Public note",
				reflection: "Public reflection",
				visibility: "public",
				mediaIds: ["public-photo"],
			},
			{
				id: "private-entry",
				place: "Private place",
				region: "Private region",
				season: "Private date",
				summary: "Private note",
				reflection: "Private reflection",
				visibility: "private",
				mediaIds: ["private-photo"],
			},
		];
		content.media = [
			{ id: "public-photo", key: "portfolio/private/public.webp", alt: "Public photo" },
			{ id: "private-photo", key: "portfolio/private/private.webp", alt: "Private photo" },
		];

		const result = toPublicPortfolioContent(content);

		expect(result.identity.avatar?.key).toBe("");
		expect(result.travel.entries.map((entry) => entry.id)).toEqual(["public-entry"]);
		expect(result.media).toEqual([{ id: "public-photo", key: "", alt: "Public photo" }]);
	});
});
