import { describe, expect, it } from "vitest";
import { cloudflareLinks } from "../../../lib/cloudflare-dashboard";
import { SECTIONS } from "../sections/registry";
import { pageKeywords, searchCommands } from "./command-search";

const pages = [
	["page-overview", "Overview"],
	["page-analytics", "Analytics"],
	["page-infrastructure", "Infrastructure"],
	["page-release", "Changes & Release"],
	["page-history", "Revision history"],
	["page-activity", "Activity log"],
	["page-library", "Media library"],
] as const;

const entries = [
	...pages.map(([id, label]) => ({ id, label, keywords: pageKeywords[id], group: "Pages" })),
	...SECTIONS.map((section) => ({
		id: section.id,
		label: section.label,
		detail: section.summary,
		group: "Sections",
	})),
	...cloudflareLinks("http://localhost:5431").map((link) => ({
		...link,
		group: "Cloudflare",
	})),
];

describe("CMS command search", () => {
	it.each([
		["hosting", "page-infrastructure"],
		["infra", "page-infrastructure"],
		["build", "page-infrastructure"],
		["visitors", "page-analytics"],
		["changes", "page-release"],
		["versions", "page-history"],
	])("ranks the expected page first for %s", (query, expected) => {
		expect(searchCommands(entries, query)[0]?.id).toBe(expected);
	});
});
