import { describe, expect, it } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT } from "../content/initial";
import { groupExperienceByCompany } from "./experience";
import { CONTENT_SCHEMA_VERSION } from "../types/content";
import {
	MAX_COLLECTION_ITEMS,
	parseStoredContent,
	upgradeStoredContent,
	validatePortfolioContent,
} from "./validation";

function createLegacyV2Fixture() {
	const legacy = structuredClone(INITIAL_PORTFOLIO_CONTENT) as unknown as Record<string, unknown>;
	Reflect.set(legacy, "schemaVersion", 2);
	Reflect.deleteProperty(legacy, "testimonials");
	Reflect.deleteProperty(legacy, "credentials");
	for (const project of legacy.projects as Array<Record<string, unknown>>) {
		Reflect.deleteProperty(project, "category");
		Reflect.set(project, "focuses", ["identity"]);
	}
	return legacy;
}

describe("portfolio content validation", () => {
	it("accepts the published seed and round-trips it through storage JSON", () => {
		const result = validatePortfolioContent(INITIAL_PORTFOLIO_CONTENT);

		expect(result.ok).toBe(true);
		expect(parseStoredContent(JSON.stringify(INITIAL_PORTFOLIO_CONTENT)).schemaVersion).toBe(
			CONTENT_SCHEMA_VERSION,
		);
	});

	it("upgrades only exact legacy schema versions 1 and 2", () => {
		for (const version of [1, 2]) {
			const legacy = createLegacyV2Fixture();
			legacy.schemaVersion = version;
			if (version === 1) Reflect.deleteProperty(legacy, "profileLinks");
			expect(upgradeStoredContent(legacy).schemaVersion).toBe(CONTENT_SCHEMA_VERSION);
		}

		for (const version of [-1, 0, 1.5, 2.5, 3, 4]) {
			const legacy = createLegacyV2Fixture();
			legacy.schemaVersion = version;
			expect(() => upgradeStoredContent(legacy)).toThrowError(
				expect.objectContaining({
					issues: [
						{
							path: "schemaVersion",
							message: "must equal 1 or 2 to upgrade legacy content",
						},
					],
				}),
			);
		}
	});

	it("backfills missing public v2 fields from the maintained seed", () => {
		const legacy = createLegacyV2Fixture();
		legacy.site = { title: " " };
		legacy.identity = { name: "" };
		legacy.hero = { title: "" };
		legacy.contact = { email: "" };
		legacy.story = { title: "" };
		legacy.travel = { title: "" };

		const upgraded = upgradeStoredContent(legacy);

		expect(upgraded.schemaVersion).toBe(CONTENT_SCHEMA_VERSION);
		expect(upgraded.site.title).toBe(INITIAL_PORTFOLIO_CONTENT.site.title);
		expect(upgraded.site.locale).toBe(INITIAL_PORTFOLIO_CONTENT.site.locale);
		expect(upgraded.site.theme).toBe(INITIAL_PORTFOLIO_CONTENT.site.theme);
		expect(upgraded.identity.name).toBe(INITIAL_PORTFOLIO_CONTENT.identity.name);
		expect(upgraded.identity.handle).toBe(INITIAL_PORTFOLIO_CONTENT.identity.handle);
		expect(upgraded.identity.email).toBe(INITIAL_PORTFOLIO_CONTENT.identity.email);
		expect(upgraded.hero.title).toBe(INITIAL_PORTFOLIO_CONTENT.hero.title);
		expect(upgraded.contact.email).toBe(INITIAL_PORTFOLIO_CONTENT.contact.email);
		expect(upgraded.story.title).toBe(INITIAL_PORTFOLIO_CONTENT.story.title);
		expect(upgraded.travel.title).toBe(INITIAL_PORTFOLIO_CONTENT.travel.title);
	});

	it("backfills blank required href fields so a legacy document stays readable", () => {
		// A blank required href used to make the whole document unupgradable, which
		// took every SSR route down with a 500.
		for (const [section, key] of [
			["story", "sourceHref"],
			["resume", "href"],
			["resume", "label"],
		] as const) {
			const legacy = createLegacyV2Fixture();
			Reflect.set(legacy[section] as Record<string, unknown>, key, "");
			expect(upgradeStoredContent(legacy).schemaVersion).toBe(CONTENT_SCHEMA_VERSION);
		}
	});

	it("reports travel overflow instead of silently dropping entries", () => {
		const document = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		const entry = structuredClone(document.travel.entries[0]);
		document.travel.entries = Array.from({ length: MAX_COLLECTION_ITEMS + 20 }, (_, i) => ({
			...entry,
			id: `entry-${i}`,
		}));

		const result = validatePortfolioContent(document);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(
				result.issues.some(
					(issue) => issue.path === "travel.entries" && issue.message.includes("no more than"),
				),
			).toBe(true);
		}
	});

	it("preserves valid v2 values and quarantizes unusable legacy records", () => {
		const legacy = createLegacyV2Fixture();
		legacy.site = { ...INITIAL_PORTFOLIO_CONTENT.site, title: "Legacy site title" };
		legacy.identity = {
			...INITIAL_PORTFOLIO_CONTENT.identity,
			name: "Legacy Name",
			handle: "legacy-handle",
			email: "legacy@example.com",
		};
		legacy.hero = { ...INITIAL_PORTFOLIO_CONTENT.hero, title: "Legacy hero title" };
		legacy.contact = {
			...INITIAL_PORTFOLIO_CONTENT.contact,
			email: "legacy@example.com",
		};
		legacy.story = { ...INITIAL_PORTFOLIO_CONTENT.story, title: "Legacy story title" };
		legacy.travel = { ...INITIAL_PORTFOLIO_CONTENT.travel, title: "Legacy travel title" };
		legacy.profileLinks = [
			{
				id: "github",
				platform: "GitHub",
				label: "GitHub",
				href: "https://github.com/SohelIslamImran",
			},
			{ id: "fragment", platform: "Section", label: "Section", href: "#work" },
		];
		legacy.media = [
			{ id: "bad-ratio", key: "bad.webp", alt: "", width: 400, height: 2 },
			{ id: "partial", key: "partial.webp", alt: "", width: 800 },
			{ id: "good", key: "good.webp", alt: "", width: 800, height: 600 },
		];

		const upgraded = upgradeStoredContent(legacy);

		expect(upgraded.site.title).toBe("Legacy site title");
		expect(upgraded.identity).toMatchObject({
			name: "Legacy Name",
			handle: "legacy-handle",
			email: "legacy@example.com",
		});
		expect(upgraded.hero.title).toBe("Legacy hero title");
		expect(upgraded.contact.email).toBe("legacy@example.com");
		expect(upgraded.story.title).toBe("Legacy story title");
		expect(upgraded.travel.title).toBe("Legacy travel title");
		expect(upgraded.profileLinks.map((link) => link.id)).toEqual(["github"]);
		expect(upgraded.media).toHaveLength(3);
		expect(upgraded.media[0]).not.toHaveProperty("width");
		expect(upgraded.media[0]).not.toHaveProperty("height");
		expect(upgraded.media[1]).not.toHaveProperty("width");
		expect(upgraded.media[1]).not.toHaveProperty("height");
		expect(upgraded.media[2]).toMatchObject({ width: 800, height: 600 });
	});

	it("rejects unsafe redirect targets", () => {
		const invalid = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		invalid.profileLinks[0].href = "javascript:alert(1)";

		const result = validatePortfolioContent(invalid);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.issues.some((issue) => issue.path.includes("profileLinks[0].href"))).toBe(true);
		}
	});

	it("accepts only safe link schemes and root-relative paths", () => {
		const unsafeLinks = [
			"/\\evil.example",
			"https://example.com\\evil",
			"/safe\r\n//evil.example",
			"//evil.example",
		];
		for (const href of unsafeLinks) {
			const invalid = structuredClone(INITIAL_PORTFOLIO_CONTENT);
			invalid.hero.actions[0].href = href;
			expect(validatePortfolioContent(invalid).ok, href).toBe(false);
		}

		const safeLinks = [
			"/",
			"/work",
			"#contact",
			"mailto:hello@example.com",
			"tel:+15551212",
			"https://example.com/work",
		];
		for (const href of safeLinks) {
			const valid = structuredClone(INITIAL_PORTFOLIO_CONTENT);
			valid.hero.actions[0].href = href;
			expect(validatePortfolioContent(valid).ok, href).toBe(true);
		}
	});

	it("requires every project to declare a known category", () => {
		const content = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		content.projects[0].category = "experiment";

		expect(validatePortfolioContent(content).ok).toBe(true);

		for (const invalidCategory of ["side-project", undefined]) {
			Reflect.set(content.projects[0], "category", invalidCategory);
			const result = validatePortfolioContent(content);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.issues.some((issue) => issue.path === "projects[0].category")).toBe(true);
			}
		}
	});

	it("keeps every project category represented so the work page never renders an empty group", () => {
		const categories = new Set(INITIAL_PORTFOLIO_CONTENT.projects.map((p) => p.category));

		expect([...categories].sort()).toEqual(["experiment", "open-source", "product"]);
	});

	it("keeps the published-code category stable for the Expo package and this site", () => {
		const openSource = INITIAL_PORTFOLIO_CONTENT.projects
			.filter((project) => project.category === "open-source")
			.map((project) => project.id);

		expect(openSource).toEqual(["expo-in-app-updates", "portfolio"]);
	});

	it("features professional work and the Expo package, not practice repositories", () => {
		const featured = INITIAL_PORTFOLIO_CONTENT.projects
			.filter((project) => project.featured)
			.map((project) => project.id);

		expect(featured).toEqual(["kuno", "expo-in-app-updates", "tilleli"]);
	});

	it("collapses consecutive roles at the same employer into one timeline group", () => {
		const groups = groupExperienceByCompany(INITIAL_PORTFOLIO_CONTENT.experience);

		expect(groups.map((group) => group.company)).toEqual(["Kuno", "Tilleli", "Bugfixers"]);
		expect(groups[0].roles.map((role) => role.id)).toEqual([
			"kuno-lead",
			"kuno-full-stack",
			"kuno-mobile",
		]);
		expect(groups[0].period).toBe("Dec 2023 — present");
	});
});
