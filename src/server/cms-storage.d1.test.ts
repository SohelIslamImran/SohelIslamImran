import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT } from "../content/initial";
import { createTestD1, type TestD1 } from "../test-support/d1";
import { CONTENT_SCHEMA_VERSION } from "../types/content";
import { serializePortfolioContent } from "../lib/validation";
import {
	getAdminSnapshot,
	getPublishedContent,
	parseStoredOrBootstrap,
	publishDraft,
	saveDraft,
	toPublicPortfolioContent,
} from "./cms-storage.server";

let fixture: TestD1 | undefined;

beforeEach(async () => {
	fixture = await createTestD1();
});

afterEach(async () => {
	await fixture?.dispose();
	fixture = undefined;
});

async function seedCurrentDocument(
	db: D1Database,
	draft: string,
	published: string,
	draftRevision = 5,
	schemaVersion: number = CONTENT_SCHEMA_VERSION,
) {
	await db
		.prepare(
			`UPDATE portfolio_documents
			 SET schema_version = ?,
			     draft_json = ?,
			     published_json = ?,
			     draft_revision = ?,
			     published_revision = 4,
			     draft_updated_at = '2026-09-03T00:00:00.000Z',
			     published_at = '2026-09-03T00:00:00.000Z',
			     updated_by = 'owner@example.com',
			     published_by = 'owner@example.com'
			 WHERE id = 'primary'`,
		)
		.bind(schemaVersion, draft, published, draftRevision)
		.run();
}

function createLegacyD1Fixture() {
	const legacy = structuredClone(INITIAL_PORTFOLIO_CONTENT) as unknown as Record<string, unknown>;
	Reflect.set(legacy, "schemaVersion", 2);
	Reflect.deleteProperty(legacy, "testimonials");
	Reflect.deleteProperty(legacy, "credentials");
	for (const project of legacy.projects as Array<Record<string, unknown>>) {
		Reflect.deleteProperty(project, "category");
		Reflect.set(project, "focuses", ["identity"]);
	}

	const badAvatar = { id: "bad-ratio", key: "bad.webp", alt: "", width: 400, height: 2 };
	legacy.site = { title: " " };
	legacy.identity = { name: "", avatar: badAvatar };
	legacy.hero = { title: "" };
	legacy.contact = { email: "" };
	legacy.story = { title: "" };
	legacy.travel = { title: "" };
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
		badAvatar,
		{ id: "partial", key: "partial.webp", alt: "", width: 800 },
		{ id: "good", key: "good.webp", alt: "", width: 800, height: 600 },
	];
	return legacy;
}

describe("D1-backed CMS storage", () => {
	it("hydrates the blank revision-one row left by the applied migrations", async () => {
		const db = fixture!.db;
		const row = await db
			.prepare(
				"SELECT schema_version, draft_json, draft_revision, published_revision FROM portfolio_documents WHERE id = 'primary'",
			)
			.first<{
				schema_version: number;
				draft_json: string;
				draft_revision: number;
				published_revision: number;
			}>();

		expect(row).toMatchObject({ schema_version: 3, draft_revision: 1, published_revision: 1 });
		expect(JSON.parse(row!.draft_json)).toMatchObject({ schemaVersion: 2, hero: { title: "" } });

		await expect(getPublishedContent({ DB: db })).resolves.toEqual(
			toPublicPortfolioContent(INITIAL_PORTFOLIO_CONTENT),
		);

		const snapshot = await getAdminSnapshot({ DB: db });
		expect(snapshot.draft).toEqual(INITIAL_PORTFOLIO_CONTENT);
		expect(snapshot.published).toEqual(INITIAL_PORTFOLIO_CONTENT);
	});

	it("reads published content without parsing a private draft", async () => {
		const published = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		published.hero.title = "Published content survives a broken draft";
		await seedCurrentDocument(fixture!.db, "{not-json", JSON.stringify(published));

		await expect(getPublishedContent({ DB: fixture!.db })).resolves.toMatchObject({
			hero: { title: "Published content survives a broken draft" },
		});
	});

	it("keeps legacy public and CMS reads online after v2 normalization", async () => {
		const legacy = createLegacyD1Fixture();
		const db = fixture!.db;
		const legacyJson = JSON.stringify(legacy);
		await seedCurrentDocument(db, legacyJson, legacyJson, 5, 2);

		const published = await getPublishedContent({ DB: db });
		expect(published.hero.title).toBe(INITIAL_PORTFOLIO_CONTENT.hero.title);
		expect(published.identity.avatar).toMatchObject({ id: "bad-ratio", key: "" });
		expect(published.identity.avatar).not.toHaveProperty("width");
		expect(published.identity.avatar).not.toHaveProperty("height");
		expect(published.profileLinks.map((link) => link.id)).toEqual(["github"]);

		const snapshot = await getAdminSnapshot({ DB: db });
		expect(snapshot.draft.hero.title).toBe(INITIAL_PORTFOLIO_CONTENT.hero.title);
		expect(snapshot.published.profileLinks.map((link) => link.id)).toEqual(["github"]);
		expect(snapshot.draft.media).toEqual([
			expect.objectContaining({ id: "bad-ratio" }),
			expect.objectContaining({ id: "partial" }),
			expect.objectContaining({ id: "good", width: 800, height: 600 }),
		]);
		expect(snapshot.draft.media[0]).not.toHaveProperty("width");
		expect(snapshot.draft.media[0]).not.toHaveProperty("height");
		expect(snapshot.draft.media[1]).not.toHaveProperty("width");
		expect(snapshot.draft.media[1]).not.toHaveProperty("height");
	});

	it.each([-1, 1.5, 2.5, 4])(
		"rejects unsupported stored schema version %s without a public fallback",
		async (schemaVersion) => {
			const legacy = createLegacyD1Fixture();
			legacy.schemaVersion = schemaVersion;
			const legacyJson = JSON.stringify(legacy);
			const db = fixture!.db;
			await seedCurrentDocument(db, legacyJson, legacyJson);

			await expect(getPublishedContent({ DB: db })).rejects.toMatchObject({
				code: "CMS_DATA_INVALID",
			});
		},
	);

	it("records successful draft and publish transitions", async () => {
		const current = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		current.hero.title = "A saved draft";
		const published = structuredClone(current);
		published.hero.title = "The previous published revision";
		const currentJson = serializePortfolioContent(current);
		const publishedJson = serializePortfolioContent(published);
		const db = fixture!.db;
		await seedCurrentDocument(db, currentJson, publishedJson, 4);
		await db.prepare("DELETE FROM portfolio_revisions").run();

		const saved = await saveDraft(
			{ DB: db },
			{
				content: current,
				expectedRevision: 4,
				actor: { email: "owner@example.com" },
			},
		);

		expect(saved).toMatchObject({ ok: true, revision: 5 });
		const draftHistory = await db
			.prepare("SELECT revision, content_json FROM portfolio_revisions WHERE kind = 'draft'")
			.all<{ revision: number; content_json: string }>();
		expect(draftHistory.results).toEqual([{ revision: 5, content_json: currentJson }]);

		const publishedResult = await publishDraft(
			{ DB: db },
			{ expectedDraftRevision: 5, actor: { email: "owner@example.com" } },
		);
		expect(publishedResult).toMatchObject({ ok: true, status: "published", revision: 5 });
		const publishedHistory = await db
			.prepare("SELECT revision, content_json FROM portfolio_revisions WHERE kind = 'published'")
			.all<{ revision: number; content_json: string }>();
		expect(publishedHistory.results).toEqual([{ revision: 5, content_json: currentJson }]);
	});

	it("publishes normalized upgraded content and matching history", async () => {
		const legacy = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		Reflect.set(legacy, "schemaVersion", 2);
		Reflect.deleteProperty(legacy.projects[0], "category");
		Reflect.set(legacy.projects[0], "focuses", ["identity"]);
		Reflect.deleteProperty(legacy, "testimonials");
		Reflect.deleteProperty(legacy, "credentials");
		const legacyJson = JSON.stringify(legacy);
		const normalizedJson = serializePortfolioContent(parseStoredOrBootstrap(legacyJson, 5));
		const db = fixture!.db;
		await seedCurrentDocument(db, legacyJson, JSON.stringify(INITIAL_PORTFOLIO_CONTENT), 5);
		await db.prepare("DELETE FROM portfolio_revisions").run();

		const result = await publishDraft(
			{ DB: db },
			{ expectedDraftRevision: 5, actor: { email: "owner@example.com" } },
		);

		expect(result).toMatchObject({ ok: true, status: "published", revision: 5 });
		const published = await db
			.prepare("SELECT published_json FROM portfolio_documents WHERE id = 'primary'")
			.first<{ published_json: string }>();
		expect(published?.published_json).toBe(normalizedJson);
		const history = await db
			.prepare("SELECT revision, content_json FROM portfolio_revisions WHERE kind = 'published'")
			.all<{ revision: number; content_json: string }>();
		expect(history.results).toEqual([{ revision: 5, content_json: normalizedJson }]);
	});

	it("returns a conflict for a stale save without duplicating history", async () => {
		const current = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		current.hero.title = "The winning draft";
		const stale = structuredClone(current);
		stale.hero.title = "The stale draft";
		const db = fixture!.db;
		await seedCurrentDocument(db, JSON.stringify(current), JSON.stringify(current));
		await db.prepare("DELETE FROM portfolio_revisions").run();
		await db
			.prepare(
				`INSERT INTO portfolio_revisions
				 (document_id, kind, revision, content_json, changed_by, changed_at)
				 VALUES ('primary', 'draft', 5, ?, 'winner@example.com', '2026-09-03T00:00:00.000Z')`,
			)
			.bind(JSON.stringify(current))
			.run();

		const result = await saveDraft(
			{ DB: db },
			{
				content: stale,
				expectedRevision: 4,
				actor: { email: "owner@example.com" },
			},
		);

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.kind).toBe("conflict");
		expect(result.current.draftRevision).toBe(5);
		expect(result.current.draft.hero.title).toBe("The winning draft");

		const row = await db
			.prepare(
				"SELECT draft_json, draft_revision, draft_updated_at, updated_by FROM portfolio_documents WHERE id = 'primary'",
			)
			.first<{
				draft_json: string;
				draft_revision: number;
				draft_updated_at: string;
				updated_by: string;
			}>();
		expect(row).toEqual({
			draft_json: JSON.stringify(current),
			draft_revision: 5,
			draft_updated_at: "2026-09-03T00:00:00.000Z",
			updated_by: "owner@example.com",
		});

		const history = await db
			.prepare(
				"SELECT revision, content_json, changed_by FROM portfolio_revisions WHERE kind = 'draft'",
			)
			.all<{ revision: number; content_json: string; changed_by: string }>();
		expect(history.results).toEqual([
			{
				revision: 5,
				content_json: JSON.stringify(current),
				changed_by: "winner@example.com",
			},
		]);
	});
});
