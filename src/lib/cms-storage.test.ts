import { describe, expect, it } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT } from "../content/initial";
import { CONTENT_SCHEMA_VERSION } from "../types/content";
import { parseStoredOrBootstrap } from "../server/cms-storage.server";

const postMigrationBootstrap =
	'{"schemaVersion":2,"site":{"title":"Sohel Islam Imran","description":"","locale":"en","theme":"ink"},"identity":{"name":"Sohel Islam Imran","handle":"sohelislamimran","role":"","location":"Dhaka, Bangladesh","timezone":"Asia/Dhaka","availability":"","email":"sohelislamimran@gmail.com","avatar":null},"hero":{"eyebrow":"","title":"","intro":"","actions":[],"metrics":[]},"about":{"title":"","paragraphs":[],"facts":[]},"experience":[],"projects":[],"capabilities":[],"writing":[],"contact":{"title":"","intro":"","email":"sohelislamimran@gmail.com","links":[]},"social":[],"resume":{"label":"Résumé","href":"/resume","updatedAt":null},"story":{"eyebrow":"","title":"","intro":"","quote":"","chapters":[],"sourceLabel":"","sourceHref":"/story"},"travel":{"eyebrow":"","title":"","intro":"","origin":"Dhaka, Bangladesh","entries":[]},"media":[],"profileLinks":[]}';

describe("legacy CMS bootstrap content", () => {
	it("hydrates the original blank revision with the public-safe initial content", () => {
		const legacy = JSON.stringify({ hero: { title: "" } });
		expect(parseStoredOrBootstrap(legacy, 1)).toEqual(INITIAL_PORTFOLIO_CONTENT);
	});

	it("hydrates the blank revision left by the applied migrations", () => {
		expect(parseStoredOrBootstrap(postMigrationBootstrap, 1)).toEqual(INITIAL_PORTFOLIO_CONTENT);
		expect(parseStoredOrBootstrap(postMigrationBootstrap, 0)).toEqual(INITIAL_PORTFOLIO_CONTENT);
	});

	it("does not forgive blank content after the original bootstrap revision", () => {
		const legacy = JSON.stringify({ hero: { title: "" } });
		expect(() => parseStoredOrBootstrap(legacy, 2)).toThrow();
	});

	it.each([1.5, 2.5, 4, -1])(
		"rejects the blank bootstrap row at schema version %s",
		(schemaVersion) => {
			const unsupported = JSON.stringify({
				...JSON.parse(postMigrationBootstrap),
				schemaVersion,
			});
			expect(() => parseStoredOrBootstrap(unsupported, 1)).toThrow();
		},
	);

	it("keeps rejecting a blank hero that still carries owner collections", () => {
		const owned = JSON.stringify({
			...JSON.parse(postMigrationBootstrap),
			projects: [{ id: "kuno-platform" }],
		});

		expect(() => parseStoredOrBootstrap(owned, 1)).toThrow();
	});

	it("upgrades a published document written against the previous schema", () => {
		const outdated = JSON.stringify({
			...INITIAL_PORTFOLIO_CONTENT,
			schemaVersion: CONTENT_SCHEMA_VERSION - 1,
			hero: { ...INITIAL_PORTFOLIO_CONTENT.hero, title: "Written against an older schema" },
		});

		expect(parseStoredOrBootstrap(outdated, 9)).toMatchObject({
			schemaVersion: CONTENT_SCHEMA_VERSION,
			hero: { title: "Written against an older schema" },
		});
	});

	it("normalizes legacy project focus and missing collections", () => {
		const legacy = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		Reflect.set(legacy, "schemaVersion", 2);
		Reflect.deleteProperty(legacy.projects[0], "category");
		Reflect.set(legacy.projects[0], "focuses", ["identity"]);
		Reflect.deleteProperty(legacy, "testimonials");
		Reflect.deleteProperty(legacy, "credentials");

		const upgraded = parseStoredOrBootstrap(JSON.stringify(legacy), 4);

		expect(upgraded.schemaVersion).toBe(CONTENT_SCHEMA_VERSION);
		expect(upgraded.projects[0].category).toBe("product");
		expect(upgraded.testimonials).toEqual([]);
		expect(upgraded.credentials).toEqual([]);
	});

	it("keeps serving a document written against the current schema", () => {
		const current = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		current.hero.title = "Published from the CMS";

		expect(parseStoredOrBootstrap(JSON.stringify(current), 9).hero.title).toBe(
			"Published from the CMS",
		);
	});
});
