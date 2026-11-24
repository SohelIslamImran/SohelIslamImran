import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT } from "../content/initial";
import { serializePortfolioContent } from "../lib/validation";
import { createTestD1, type TestD1 } from "../test-support/d1";
import {
	discardDraft,
	findRevision,
	getAdminSnapshot,
	getRevision,
	listAuditEvents,
	listRevisions,
	publishDraft,
	restoreRevision,
	saveDraft,
} from "./cms-storage.server";
import { findMediaReferences, listMediaAssets, updateMediaAlt, uploadMedia } from "./media.server";

let fixture: TestD1 | undefined;

beforeEach(async () => {
	fixture = await createTestD1({ media: true });
});

afterEach(async () => {
	vi.useRealTimers();
	await fixture?.dispose();
	fixture = undefined;
});

// Delay the losing batch until the other session has committed against real D1.
function afterCompetingWrite(db: D1Database, write: () => Promise<unknown>): D1Database {
	return {
		prepare: db.prepare.bind(db),
		batch: async (statements) => {
			await write();
			return db.batch(statements);
		},
	} as D1Database;
}

const actor = { email: "owner@example.com" };

describe("CMS history, audit events, and media storage", () => {
	it("lists revisions with byte sizes, filters by kind, and paginates with before", async () => {
		const db = fixture!.db;
		const draft1 = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		draft1.hero.title = "First draft edit";
		const saved1 = await saveDraft(
			{ DB: db },
			{ content: draft1, expectedRevision: 1, actor: { email: "owner@example.com" } },
		);
		expect(saved1).toMatchObject({ ok: true, revision: 2 });

		const published = await publishDraft(
			{ DB: db },
			{ expectedDraftRevision: 2, actor: { email: "owner@example.com" } },
		);
		expect(published).toMatchObject({ ok: true, status: "published", revision: 2 });

		const draft2 = structuredClone(draft1);
		draft2.hero.title = "Second draft edit 🐱";
		await saveDraft(
			{ DB: db },
			{ content: draft2, expectedRevision: 2, actor: { email: "owner@example.com" } },
		);

		const page1 = await listRevisions({ DB: db }, { limit: 2 });
		expect(page1.items).toHaveLength(2);
		expect(page1.items[0]).toMatchObject({ kind: "draft", revision: 3 });
		const expectedBytes = new TextEncoder().encode(serializePortfolioContent(draft2)).byteLength;
		expect(page1.items[0]!.bytes).toBe(expectedBytes);
		expect((await getRevision({ DB: db }, page1.items[0]!.id))?.bytes).toBe(expectedBytes);
		expect(page1.nextBefore).toBe(page1.items[1]!.id);

		const page2 = await listRevisions({ DB: db }, { limit: 2, before: page1.nextBefore! });
		expect(page2.items.length).toBeGreaterThan(0);
		expect(page2.items[0]!.id).toBeLessThan(page1.nextBefore!);

		const onlyPublished = await listRevisions({ DB: db }, { kind: "published" });
		expect(onlyPublished.items.every((item) => item.kind === "published")).toBe(true);
		expect(onlyPublished.items[0]).toMatchObject({ kind: "published", revision: 2 });
	});

	it("resolves exact revision summaries past the first page and handles ambiguous legacy links", async () => {
		const env = { DB: fixture!.db };
		await saveDraft(env, { content: INITIAL_PORTFOLIO_CONTENT, expectedRevision: 1, actor });
		await publishDraft(env, { expectedDraftRevision: 2, actor });
		await saveDraft(env, { content: INITIAL_PORTFOLIO_CONTENT, expectedRevision: 2, actor });
		const first = await listRevisions(env, { limit: 1 });
		const draft = await findRevision(env, { kind: "draft", revision: 2 });
		const live = await findRevision(env, { kind: "published", revision: 2 });
		expect(draft).toMatchObject({ kind: "draft", revision: 2 });
		expect(live).toMatchObject({ kind: "published", revision: 2 });
		expect(draft?.id).not.toBe(live?.id);
		expect(first.items.map(({ id }) => id)).not.toContain(draft?.id);
		expect(await findRevision(env, { id: draft!.id })).toEqual(draft);
		expect(draft).not.toHaveProperty("content");
		expect(await findRevision(env, { revision: 2 })).toEqual(live);
		expect(await findRevision(env, { revision: 3 })).toEqual(first.items[0]);
		expect(await findRevision(env, { kind: "published", revision: 3 })).toBeNull();
		expect(await findRevision(env, { revision: 9_999_999 })).toBeNull();
	});

	it("restores a legacy v2 revision as an upgraded v3 draft and writes an audit event", async () => {
		const db = fixture!.db;
		const legacy = structuredClone(INITIAL_PORTFOLIO_CONTENT) as unknown as Record<string, unknown>;
		Reflect.set(legacy, "schemaVersion", 2);
		Reflect.deleteProperty(legacy, "testimonials");
		Reflect.deleteProperty(legacy, "credentials");
		for (const project of legacy.projects as Array<Record<string, unknown>>) {
			Reflect.deleteProperty(project, "category");
			Reflect.set(project, "focuses", ["identity"]);
		}
		(legacy.hero as Record<string, unknown>).title = "Restored legacy hero";
		const inserted = await db
			.prepare(
				`INSERT INTO portfolio_revisions
				 (document_id, kind, revision, content_json, changed_by, changed_at)
				 VALUES ('primary', 'draft', 99, ?, 'owner@example.com', '2026-09-01T00:00:00.000Z')
				 RETURNING id`,
			)
			.bind(JSON.stringify(legacy))
			.first<{ id: number }>();

		const detail = await getRevision({ DB: db }, inserted!.id);
		expect(detail?.content.schemaVersion).toBe(3);
		expect(detail?.content.hero.title).toBe("Restored legacy hero");

		const restored = await restoreRevision(
			{ DB: db },
			{
				id: inserted!.id,
				expectedRevision: 1,
				actor: { email: "owner@example.com", subject: "sub-1" },
			},
		);
		expect(restored.ok).toBe(true);
		if (!restored.ok) return;
		expect(restored.snapshot.draftRevision).toBe(2);
		expect(restored.snapshot.draft.hero.title).toBe("Restored legacy hero");
		expect(restored.snapshot.draft.schemaVersion).toBe(3);

		const events = await listAuditEvents({ DB: db }, { limit: 10 });
		expect(events.items[0]).toMatchObject({
			eventType: "revision.restore",
			actorEmail: "owner@example.com",
			revision: 2,
			details: { sourceId: inserted!.id, sourceKind: "draft", sourceRevision: 99 },
		});
		expect(JSON.stringify(events.items[0])).not.toContain("Restored legacy hero");
	});

	it("rejects identical stale saves and restores without duplicate audits", async () => {
		vi.setSystemTime(new Date("2026-11-01T00:00:00.000Z"));
		const db = fixture!.db;
		const draft = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		draft.hero.title = "Fresh edit";
		await saveDraft(
			{ DB: db },
			{ content: draft, expectedRevision: 1, actor: { email: "owner@example.com" } },
		);

		const retry = await saveDraft({ DB: db }, { content: draft, expectedRevision: 1, actor });
		expect(retry).toMatchObject({ ok: false, kind: "conflict" });
		const revisions = await listRevisions({ DB: db }, { limit: 5 });
		const target = revisions.items[0]!;
		const stale = await restoreRevision(
			{ DB: db },
			{ id: target.id, expectedRevision: 1, actor: { email: "owner@example.com" } },
		);
		expect(stale).toMatchObject({ ok: false, kind: "conflict" });

		const events = await listAuditEvents({ DB: db }, { limit: 10 });
		expect(events.items.map(({ eventType }) => eventType)).toEqual(["draft.save"]);
		expect(await listRevisions({ DB: db }, { limit: 5 })).toEqual(revisions);
	});

	it("writes only one publication and audit when two sessions publish the same revision", async () => {
		vi.setSystemTime(new Date("2026-11-01T00:00:00.000Z"));
		const db = fixture!.db;
		await saveDraft({ DB: db }, { expectedRevision: 1, content: INITIAL_PORTFOLIO_CONTENT, actor });
		const input = { expectedDraftRevision: 2, actor };
		const delayed = afterCompetingWrite(db, () => publishDraft({ DB: db }, input));
		expect(await publishDraft({ DB: delayed }, input)).toMatchObject({
			ok: true,
			status: "already-published",
		});
		const events = await listAuditEvents({ DB: db });
		expect(events.items.filter(({ eventType }) => eventType === "draft.publish")).toHaveLength(1);
		const history = await listRevisions({ DB: db }, { kind: "published" });
		expect(history.items.filter(({ revision }) => revision === 2)).toHaveLength(1);
	});

	it("rejects a discard if its confirmed publication was superseded after reading it", async () => {
		const db = fixture!.db;
		const edited = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		edited.hero.title = "New live title";
		await saveDraft({ DB: db }, { expectedRevision: 1, content: edited, actor });
		const delayed = afterCompetingWrite(db, () =>
			publishDraft({ DB: db }, { expectedDraftRevision: 2, actor }),
		);
		const result = await discardDraft(
			{ DB: delayed },
			{ expectedRevision: 2, expectedPublishedRevision: 1, actor },
		);
		expect(result).toMatchObject({
			ok: false,
			kind: "conflict",
			current: { draftRevision: 2, publishedRevision: 2 },
		});
		expect((await getAdminSnapshot({ DB: db })).draft.hero.title).toBe("New live title");
		const events = await listAuditEvents({ DB: db });
		expect(events.items.some(({ eventType }) => eventType === "draft.discard")).toBe(false);
	});

	it("writes only one discard and audit when competing discards copy identical content", async () => {
		vi.setSystemTime(new Date("2026-11-01T00:00:00.000Z"));
		const db = fixture!.db;
		const input = { expectedRevision: 1, expectedPublishedRevision: 1, actor };
		const delayed = afterCompetingWrite(db, () => discardDraft({ DB: db }, input));
		expect(await discardDraft({ DB: delayed }, input)).toMatchObject({
			ok: false,
			kind: "conflict",
		});
		const events = await listAuditEvents({ DB: db });
		expect(events.items.filter(({ eventType }) => eventType === "draft.discard")).toHaveLength(1);
		const history = await listRevisions({ DB: db }, { kind: "draft" });
		expect(history.items.filter(({ revision }) => revision === 2)).toHaveLength(1);
	});

	it("discards draft back to published and records audit events for save, publish, and discard", async () => {
		const db = fixture!.db;
		const published = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		published.hero.title = "Live headline";
		await saveDraft(
			{ DB: db },
			{ content: published, expectedRevision: 1, actor: { email: "owner@example.com" } },
		);
		await publishDraft(
			{ DB: db },
			{ expectedDraftRevision: 2, actor: { email: "owner@example.com" } },
		);

		const edited = structuredClone(published);
		edited.hero.title = "Unpublished experiment";
		await saveDraft(
			{ DB: db },
			{ content: edited, expectedRevision: 2, actor: { email: "owner@example.com" } },
		);

		const discarded = await discardDraft(
			{ DB: db },
			{ expectedRevision: 3, expectedPublishedRevision: 2, actor },
		);
		expect(discarded.ok).toBe(true);
		if (!discarded.ok) return;
		expect(discarded.snapshot.draftRevision).toBe(4);
		expect(discarded.snapshot.draft.hero.title).toBe("Live headline");

		const events = await listAuditEvents({ DB: db }, { limit: 10 });
		const types = events.items.map((event) => event.eventType);
		expect(types).toContain("draft.save");
		expect(types).toContain("draft.publish");
		expect(types).toContain("draft.discard");
		expect(JSON.stringify(events.items)).not.toContain("Unpublished experiment");

		const saves = await listAuditEvents({ DB: db }, { limit: 1, kind: "save" });
		expect(saves.items.map((event) => event.eventType)).toEqual(["draft.save"]);
		expect(saves.nextBefore).not.toBeNull();
		const olderSaves = await listAuditEvents(
			{ DB: db },
			{ limit: 10, kind: "save", before: saves.nextBefore! },
		);
		expect(olderSaves.items.map((event) => event.eventType)).toEqual(["draft.save"]);
		const discards = await listAuditEvents({ DB: db }, { kind: "discard" });
		expect(discards.items.map((event) => event.eventType)).toEqual(["draft.discard"]);
		const restores = await listAuditEvents({ DB: db }, { kind: "restore" });
		expect(restores.items).toEqual([]);
	});

	it("offers a newly uploaded asset to attachment pickers before the draft references it", async () => {
		const env = { DB: fixture!.db, MEDIA: fixture!.media };
		const draft = (await getAdminSnapshot(env)).draft;
		const file = new File(["image"], "test.webp", { type: "image/webp" });
		const uploaded = await uploadMedia(env, file, "Default alternative text", actor.email);
		expect(draft.media.some(({ id }) => id === uploaded.id)).toBe(false);
		const picker = await listMediaAssets(env, draft, true);
		expect(picker.items[0]).toMatchObject({ attachment: uploaded, usages: [], status: "draft" });
		const library = await listMediaAssets(env, draft);
		expect(library.items[0]).not.toHaveProperty("attachment");

		draft.identity.avatar = picker.items[0]!.attachment!;
		await saveDraft(env, { content: draft, expectedRevision: 1, actor });
		await publishDraft(env, { expectedDraftRevision: 2, actor });
		const published = await listMediaAssets(env, draft);
		expect(published.items[0]).toMatchObject({ id: uploaded.id, status: "published" });
	});

	it("can restore a historical slug for editing while save and publish still enforce slug rules", async () => {
		const db = fixture!.db;
		const draft = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		draft.projects[0]!.slug = "Legacy_Slug";
		const row = await db
			.prepare(
				`INSERT INTO portfolio_revisions
			 (document_id, kind, revision, content_json, changed_by, changed_at)
			 VALUES ('primary', 'draft', 99, ?, ?, '2026-09-01T00:00:00.000Z')
			 RETURNING id`,
			)
			.bind(JSON.stringify(draft), actor.email)
			.first<{ id: number }>();
		await expect(
			saveDraft({ DB: db }, { content: draft, expectedRevision: 1, actor }),
		).rejects.toMatchObject({
			issues: expect.arrayContaining([expect.objectContaining({ path: "projects[0].slug" })]),
		});
		const restored = await restoreRevision({ DB: db }, { id: row!.id, expectedRevision: 1, actor });
		expect(restored).toMatchObject({ ok: true, snapshot: { draftRevision: 2 } });
		await expect(
			publishDraft({ DB: db }, { expectedDraftRevision: 2, actor }),
		).rejects.toMatchObject({
			issues: expect.arrayContaining([expect.objectContaining({ path: "projects[0].slug" })]),
		});
	});

	it("lists D1 media assets with draft references and updates alt with audit logging", async () => {
		const db = fixture!.db;
		const draft = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		draft.identity.avatar = {
			id: "asset-portrait",
			key: "portfolio/media/asset-portrait.webp",
			alt: "Portrait",
			mimeType: "image/webp",
		};
		draft.projects[0]!.cover = {
			id: "asset-portrait",
			key: "portfolio/media/asset-portrait.webp",
			alt: "Cover",
			mimeType: "image/webp",
		};
		await saveDraft(
			{ DB: db },
			{
				content: JSON.parse(serializePortfolioContent(draft)),
				expectedRevision: 1,
				actor: { email: "owner@example.com" },
			},
		);

		await db
			.prepare(
				`INSERT INTO media_assets
				 (id, object_key, alt, mime_type, width, height, bytes, status, created_at, updated_at, created_by)
				 VALUES ('asset-portrait', 'portfolio/media/asset-portrait.webp', 'Old alt', 'image/webp', 800, 800, 42000, 'draft', '2026-09-02T00:00:00.000Z', '2026-09-02T00:00:00.000Z', 'owner@example.com')`,
			)
			.run();

		const snapshot = await getAdminSnapshot({ DB: db });
		const listed = await listMediaAssets({ DB: db }, snapshot.draft);
		expect(listed.mediaEnabled).toBe(false);
		expect(listed.items).toHaveLength(1);
		expect(listed.items[0]).toMatchObject({
			id: "asset-portrait",
			alt: "Old alt",
			url: "/media/asset-portrait",
		});
		expect(listed.items[0]).not.toHaveProperty("objectKey");
		expect(listed.items[0]!.usages).toHaveLength(2);
		expect(
			findMediaReferences(snapshot.draft)
				.get("asset-portrait")
				?.map((r) => r.sectionId),
		).toEqual(["identity", "projects"]);

		const updated = await updateMediaAlt(
			{ DB: db },
			{ id: "asset-portrait", alt: "Updated default alt", actor: { email: "owner@example.com" } },
		);
		expect(updated).toMatchObject({ ok: true, id: "asset-portrait", alt: "Updated default alt" });

		expect(listed.items[0]).not.toHaveProperty("attachment");
		expect((await listMediaAssets({ DB: db }, snapshot.draft, true)).items[0]).not.toHaveProperty(
			"attachment",
		);
		const bindings = { DB: db, MEDIA: fixture!.media };
		const picker = await listMediaAssets(bindings, snapshot.draft, true);
		expect(picker.items[0]?.attachment).toMatchObject({
			id: "asset-portrait",
			key: "portfolio/media/asset-portrait.webp",
			alt: "Updated default alt",
			width: 800,
			height: 800,
		});
		expect(snapshot.draft.identity.avatar?.alt).toBe("Portrait");
		expect(snapshot.draft.projects[0]?.cover?.alt).toBe("Cover");

		const events = await listAuditEvents({ DB: db }, { limit: 5 });
		expect(events.items[0]).toMatchObject({
			eventType: "media.update_alt",
			actorEmail: "owner@example.com",
			details: { assetId: "asset-portrait" },
		});
		expect(JSON.stringify(events.items[0])).not.toContain("Updated default alt");
	});
});
