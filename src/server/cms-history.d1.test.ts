import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT } from "../content/initial";
import { serializePortfolioContent } from "../lib/validation";
import { createTestD1, type TestD1 } from "../test-support/d1";
import {
	discardDraft,
	getAdminSnapshot,
	getRevision,
	listAuditEvents,
	listRevisions,
	publishDraft,
	restoreRevision,
	saveDraft,
} from "./cms-storage.server";
import { findMediaReferences, listMediaAssets, updateMediaAlt } from "./media.server";

let fixture: TestD1 | undefined;

beforeEach(async () => {
	fixture = await createTestD1();
});

afterEach(async () => {
	await fixture?.dispose();
	fixture = undefined;
});

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
		draft2.hero.title = "Second draft edit";
		await saveDraft(
			{ DB: db },
			{ content: draft2, expectedRevision: 2, actor: { email: "owner@example.com" } },
		);

		const page1 = await listRevisions({ DB: db }, { limit: 2 });
		expect(page1.items).toHaveLength(2);
		expect(page1.items[0]).toMatchObject({ kind: "draft", revision: 3 });
		expect(page1.items[0]!.bytes).toBeGreaterThan(100);
		expect(page1.nextBefore).toBe(page1.items[1]!.id);

		const page2 = await listRevisions({ DB: db }, { limit: 2, before: page1.nextBefore! });
		expect(page2.items.length).toBeGreaterThan(0);
		expect(page2.items[0]!.id).toBeLessThan(page1.nextBefore!);

		const onlyPublished = await listRevisions({ DB: db }, { kind: "published" });
		expect(onlyPublished.items.every((item) => item.kind === "published")).toBe(true);
		expect(onlyPublished.items[0]).toMatchObject({ kind: "published", revision: 2 });
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

	it("returns conflict on stale restoreRevision and writes no audit row", async () => {
		const db = fixture!.db;
		const draft = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		draft.hero.title = "Fresh edit";
		await saveDraft(
			{ DB: db },
			{ content: draft, expectedRevision: 1, actor: { email: "owner@example.com" } },
		);

		const revisions = await listRevisions({ DB: db }, { limit: 5 });
		const target = revisions.items[0]!;
		const stale = await restoreRevision(
			{ DB: db },
			{ id: target.id, expectedRevision: 1, actor: { email: "owner@example.com" } },
		);
		expect(stale).toMatchObject({ ok: false, kind: "conflict" });

		const events = await listAuditEvents({ DB: db }, { limit: 10 });
		expect(events.items.filter((item) => item.eventType === "revision.restore")).toHaveLength(0);
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
			{ expectedRevision: 3, actor: { email: "owner@example.com" } },
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

		const events = await listAuditEvents({ DB: db }, { limit: 5 });
		expect(events.items[0]).toMatchObject({
			eventType: "media.update_alt",
			actorEmail: "owner@example.com",
			details: { assetId: "asset-portrait" },
		});
		expect(JSON.stringify(events.items[0])).not.toContain("Updated default alt");
	});
});
