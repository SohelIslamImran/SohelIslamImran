import { INITIAL_PORTFOLIO_CONTENT } from "../content/initial";
import { and, desc, eq, exists, inArray, like, lt, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { CONTENT_SCHEMA_VERSION, type MediaAsset, type PortfolioContent } from "../types/content";
import {
	MAX_CONTENT_BYTES,
	parseStoredContent,
	serializePortfolioContent,
	upgradeStoredContent,
} from "../lib/validation";
import { mediaAssets, portfolioDocuments, portfolioRevisions } from "./schema.server";

export const auditEvents = sqliteTable("audit_events", {
	id: text("id").primaryKey(),
	eventType: text("event_type").notNull(),
	actorEmail: text("actor_email").notNull(),
	actorSubject: text("actor_subject"),
	documentId: text("document_id"),
	revision: integer("revision"),
	detailsJson: text("details_json"),
	createdAt: text("created_at").notNull(),
});

export const PORTFOLIO_DOCUMENT_ID = "primary" as const;

export interface CmsEnvironment {
	DB?: D1Database;
}

export interface CmsActor {
	email: string;
	subject?: string;
}

export interface CmsDocumentSnapshot {
	id: string;
	schemaVersion: number;
	draftRevision: number;
	publishedRevision: number;
	draftUpdatedAt: string;
	publishedAt: string | null;
	updatedBy: string;
	publishedBy: string | null;
	draft: PortfolioContent;
	published: PortfolioContent;
}

export interface SaveDraftInput {
	content: unknown;
	expectedRevision: number;
	actor: CmsActor;
}

export type SaveDraftResult =
	| {
			ok: true;
			revision: number;
			updatedAt: string;
	  }
	| {
			ok: false;
			kind: "conflict";
			current: CmsDocumentSnapshot;
	  };

export interface PublishDraftInput {
	expectedDraftRevision: number;
	actor: CmsActor;
}

export type PublishDraftResult =
	| {
			ok: true;
			status: "published" | "already-published";
			revision: number;
			publishedAt: string | null;
	  }
	| {
			ok: false;
			kind: "conflict";
			current: CmsDocumentSnapshot;
	  };

export class CmsStorageUnavailableError extends Error {
	readonly code = "CMS_STORAGE_UNAVAILABLE";

	constructor() {
		super("Portfolio storage is not configured.");
		this.name = "CmsStorageUnavailableError";
	}
}

export class CmsDataError extends Error {
	readonly code = "CMS_DATA_INVALID";

	constructor(options?: { cause: unknown }) {
		super("Portfolio content could not be read.", options);
		this.name = "CmsDataError";
	}
}

export class CmsInputError extends Error {
	readonly code = "CMS_INPUT_INVALID";

	constructor(message: string) {
		super(message);
		this.name = "CmsInputError";
	}
}

interface PublishedDocumentRow {
	publishedJson: string;
	publishedRevision: number;
}

function requireDatabase(env: CmsEnvironment): D1Database {
	if (!env.DB) {
		throw new CmsStorageUnavailableError();
	}

	return env.DB;
}

function database(db: D1Database) {
	return drizzle(db, {
		schema: { auditEvents, mediaAssets, portfolioDocuments, portfolioRevisions },
		logger: false,
	});
}

function requireRevision(value: number, name: string): number {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new CmsInputError(`${name} must be a non-negative integer.`);
	}

	return value;
}

function requireActor(actor: CmsActor): CmsActor {
	const email = actor.email.trim().toLowerCase();
	if (email.length === 0 || email.length > 320) {
		throw new CmsInputError("The owner identity is required.");
	}

	const subject = actor.subject?.trim();
	return subject && subject.length > 0 ? { email, subject: subject.slice(0, 256) } : { email };
}

function integerColumn(value: unknown): number {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
		throw new CmsDataError();
	}

	return value;
}

function stringColumn(value: unknown): string {
	if (typeof value !== "string") {
		throw new CmsDataError();
	}

	return value;
}

function nullableStringColumn(value: unknown): string | null {
	if (value !== null && typeof value !== "string") {
		throw new CmsDataError();
	}

	return value;
}

const LEGACY_SCHEMA_VERSIONS: readonly unknown[] = [1, 2];

const CONTENT_COLLECTION_PATHS: readonly (readonly string[])[] = [
	["hero", "actions"],
	["hero", "metrics"],
	["about", "paragraphs"],
	["about", "facts"],
	["contact", "links"],
	["story", "chapters"],
	["travel", "entries"],
	["experience"],
	["projects"],
	["capabilities"],
	["writing"],
	["testimonials"],
	["credentials"],
	["social"],
	["profileLinks"],
	["media"],
];

function asRecord(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function readPath(value: unknown, path: readonly string[]): unknown {
	let current = value;
	for (const key of path) {
		const object = asRecord(current);
		if (!object) return undefined;
		current = object[key];
	}
	return current;
}

function isEmptyCollection(value: unknown): boolean {
	return value === undefined || value === null || (Array.isArray(value) && value.length === 0);
}

function isBlankBootstrapDocument(value: unknown): boolean {
	const document = asRecord(value);
	if (!document) return false;
	const hero = asRecord(document.hero);
	if (!hero || typeof hero.title !== "string" || hero.title.trim() !== "") return false;
	return CONTENT_COLLECTION_PATHS.every((path) => isEmptyCollection(readPath(document, path)));
}

export function parseStoredOrBootstrap(json: string, revision: number): PortfolioContent {
	if (new TextEncoder().encode(json).byteLength > MAX_CONTENT_BYTES) {
		return parseStoredContent(json);
	}

	let value: { schemaVersion?: unknown; hero?: { title?: unknown } };
	try {
		value = JSON.parse(json) as typeof value;
	} catch {
		// Delegate so the caller gets the standard validation error.
		return parseStoredContent(json);
	}

	const blankBootstrap = isBlankBootstrapDocument(value);
	if (blankBootstrap && revision <= 1 && LEGACY_SCHEMA_VERSIONS.includes(value.schemaVersion)) {
		return INITIAL_PORTFOLIO_CONTENT;
	}

	if (value.schemaVersion !== undefined && value.schemaVersion !== CONTENT_SCHEMA_VERSION) {
		return upgradeStoredContent(value);
	}

	if (revision <= 1 && blankBootstrap) {
		return INITIAL_PORTFOLIO_CONTENT;
	}

	return parseStoredContent(json);
}

function referencedMediaIds(content: PortfolioContent): string[] {
	const ids = new Set<string>();
	if (content.identity.avatar?.id) ids.add(content.identity.avatar.id);
	for (const project of content.projects) if (project.cover?.id) ids.add(project.cover.id);
	for (const entry of content.travel.entries) {
		if (entry.visibility !== "public") continue;
		for (const id of entry.mediaIds) ids.add(id);
	}
	return [...ids].filter((id) => id.length > 0);
}

function withoutPrivateKey(asset: MediaAsset | null | undefined): MediaAsset | null {
	return asset ? { ...asset, key: "" } : null;
}

/** Strip private entries and storage keys before content crosses the public SSR boundary. */
export function toPublicPortfolioContent(content: PortfolioContent): PortfolioContent {
	const mediaIds = new Set(referencedMediaIds(content));
	return {
		...content,
		identity: {
			...content.identity,
			avatar: withoutPrivateKey(content.identity.avatar),
		},
		projects: content.projects.map((project) => ({
			...project,
			cover: withoutPrivateKey(project.cover),
		})),
		travel: {
			...content.travel,
			entries: content.travel.entries.filter((entry) => entry.visibility === "public"),
		},
		media: content.media
			.filter((asset) => mediaIds.has(asset.id))
			.map((asset) => ({ ...asset, key: "" })),
	};
}

function parseContentColumn(json: unknown, revision: unknown): PortfolioContent {
	try {
		return parseStoredOrBootstrap(stringColumn(json), integerColumn(revision));
	} catch (error) {
		if (error instanceof CmsDataError) {
			throw error;
		}

		// Keep the cause so the original failure is not lost, without letting an
		// internal message reach the client.
		throw new CmsDataError({ cause: error });
	}
}

function snapshotFromRow(
	row: typeof portfolioDocuments.$inferSelect | undefined,
): CmsDocumentSnapshot {
	if (!row) throw new CmsDataError();
	try {
		const draftRevision = integerColumn(row.draftRevision);
		const publishedRevision = integerColumn(row.publishedRevision);
		return {
			id: stringColumn(row.id),
			schemaVersion: integerColumn(row.schemaVersion),
			draftRevision,
			publishedRevision,
			draftUpdatedAt: stringColumn(row.draftUpdatedAt),
			publishedAt: nullableStringColumn(row.publishedAt),
			updatedBy: stringColumn(row.updatedBy),
			publishedBy: nullableStringColumn(row.publishedBy),
			draft: parseContentColumn(row.draftJson, draftRevision),
			published: parseContentColumn(row.publishedJson, publishedRevision),
		};
	} catch (error) {
		if (error instanceof CmsDataError) {
			throw error;
		}

		// Keep the cause so the original failure is not lost, without letting an
		// internal message reach the client.
		throw new CmsDataError({ cause: error });
	}
}

function selectSnapshot(query: ReturnType<typeof database>) {
	return query
		.select()
		.from(portfolioDocuments)
		.where(eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID))
		.limit(1);
}

async function readSnapshot(db: D1Database): Promise<CmsDocumentSnapshot> {
	const [stored] = await selectSnapshot(database(db));
	return snapshotFromRow(stored);
}

/**
 * Publish only needs the draft revision and the exact stored draft bytes.
 * Reading the full snapshot would also parse the published column, so an
 * unreadable published document would block publishing a perfectly valid draft.
 */
async function readDraftForPublish(
	db: D1Database,
): Promise<{ draftJson: string; draftRevision: number }> {
	const [stored] = await database(db)
		.select({
			draftJson: portfolioDocuments.draftJson,
			draftRevision: portfolioDocuments.draftRevision,
		})
		.from(portfolioDocuments)
		.where(eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID))
		.limit(1);

	if (!stored) {
		throw new CmsDataError();
	}

	return {
		draftJson: stringColumn(stored.draftJson),
		draftRevision: integerColumn(stored.draftRevision),
	};
}

async function readPublishedDocument(db: D1Database): Promise<PublishedDocumentRow> {
	const [stored] = await database(db)
		.select({
			publishedJson: portfolioDocuments.publishedJson,
			publishedRevision: portfolioDocuments.publishedRevision,
		})
		.from(portfolioDocuments)
		.where(eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID))
		.limit(1);

	if (!stored) {
		throw new CmsDataError();
	}

	return stored;
}

/**
 * Public reads may use the empty seed when no D1 binding exists. A configured
 * database that is empty or malformed is an error, never a silent fallback.
 */
export async function getPublicContent(env: CmsEnvironment): Promise<PortfolioContent> {
	if (!env.DB) {
		return toPublicPortfolioContent(INITIAL_PORTFOLIO_CONTENT);
	}

	const stored = await readPublishedDocument(env.DB);
	const published = parseContentColumn(stored.publishedJson, stored.publishedRevision);
	const content =
		stored.publishedRevision <= 1 && published.hero.title.trim() === ""
			? INITIAL_PORTFOLIO_CONTENT
			: published;
	return toPublicPortfolioContent(content);
}

export async function getPublishedContent(env: CmsEnvironment): Promise<PortfolioContent> {
	return getPublicContent(env);
}

export async function getAdminSnapshot(env: CmsEnvironment): Promise<CmsDocumentSnapshot> {
	const snapshot = await readSnapshot(requireDatabase(env));
	if (snapshot.draftRevision <= 1 && snapshot.draft.hero.title.trim() === "") {
		return { ...snapshot, draft: INITIAL_PORTFOLIO_CONTENT, published: INITIAL_PORTFOLIO_CONTENT };
	}
	return snapshot;
}

export async function getDraftContent(env: CmsEnvironment): Promise<PortfolioContent> {
	return (await getAdminSnapshot(env)).draft;
}

export async function saveDraft(
	env: CmsEnvironment,
	input: SaveDraftInput,
): Promise<SaveDraftResult> {
	const db = requireDatabase(env);
	const expectedRevision = requireRevision(input.expectedRevision, "expectedRevision");
	const actor = requireActor(input.actor);
	const contentJson = serializePortfolioContent(input.content);
	const now = new Date().toISOString();
	const query = database(db);
	const draftRevisionSelect = query
		.select({
			id: sql<number | null>`NULL`.as("id"),
			documentId: portfolioDocuments.id,
			kind: sql<string>`'draft'`.as("kind"),
			revision: sql<number>`${expectedRevision + 1}`.as("revision"),
			contentJson: sql<string>`${contentJson}`.as("content_json"),
			changedBy: sql<string>`${actor.email}`.as("changed_by"),
			changedAt: sql<string>`${now}`.as("changed_at"),
		})
		.from(portfolioDocuments)
		.where(and(eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID), sql`changes() = 1`));
	const auditId = crypto.randomUUID();
	const draftAuditSelect = query
		.select({
			id: sql<string>`${auditId}`.as("id"),
			eventType: sql<string>`'draft.save'`.as("event_type"),
			actorEmail: sql<string>`${actor.email}`.as("actor_email"),
			actorSubject: sql<string | null>`${actor.subject ?? null}`.as("actor_subject"),
			documentId: portfolioDocuments.id,
			revision: sql<number>`${expectedRevision + 1}`.as("revision"),
			detailsJson: sql<string | null>`NULL`.as("details_json"),
			createdAt: sql<string>`${now}`.as("created_at"),
		})
		.from(portfolioDocuments)
		.where(and(eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID), sql`changes() = 1`));
	// Keep the UPDATE, history insert, and audit insert adjacent. Each insert
	// uses SQLite changes() to check that the preceding statement wrote one row.
	const results = await query.batch([
		query
			.update(portfolioDocuments)
			.set({
				draftJson: contentJson,
				draftRevision: sql`${portfolioDocuments.draftRevision} + 1`,
				draftUpdatedAt: now,
				updatedBy: actor.email,
			})
			.where(
				and(
					eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID),
					eq(portfolioDocuments.draftRevision, expectedRevision),
				),
			),
		query.insert(portfolioRevisions).select(draftRevisionSelect),
		query.insert(auditEvents).select(draftAuditSelect),
	]);

	if (results[0]?.meta.changes !== 1) {
		return {
			ok: false,
			kind: "conflict",
			current: await readSnapshot(db),
		};
	}

	return {
		ok: true,
		revision: expectedRevision + 1,
		updatedAt: now,
	};
}

export async function publishDraft(
	env: CmsEnvironment,
	input: PublishDraftInput,
): Promise<PublishDraftResult> {
	const db = requireDatabase(env);
	const expectedDraftRevision = requireRevision(
		input.expectedDraftRevision,
		"expectedDraftRevision",
	);
	const actor = requireActor(input.actor);
	const now = new Date().toISOString();
	const before = await readDraftForPublish(db);
	if (before.draftRevision !== expectedDraftRevision) {
		// A conflict has to show the caller the current state, so the published
		// column is read here — but only on this path, never on a successful publish.
		return { ok: false, kind: "conflict", current: await readSnapshot(db) };
	}
	// The draft may still be on an older schema; parseStoredOrBootstrap upgrades it
	// and backfills blank legacy sections from the seed, so the stored document and
	// its schema_version column agree after publishing.
	const draft = parseStoredOrBootstrap(before.draftJson, before.draftRevision);
	const mediaIds = referencedMediaIds(draft);
	const publishedJson = serializePortfolioContent(draft);
	const query = database(db);
	const publishAuditId = crypto.randomUUID();
	const publishedByThisMutation = query
		.select({ id: auditEvents.id })
		.from(auditEvents)
		.where(eq(auditEvents.id, publishAuditId));
	const publishedRevisionSelect = query
		.select({
			id: sql<number | null>`NULL`.as("id"),
			documentId: portfolioDocuments.id,
			kind: sql<string>`'published'`.as("kind"),
			revision: sql<number>`${expectedDraftRevision}`.as("revision"),
			contentJson: sql<string>`${publishedJson}`.as("content_json"),
			changedBy: sql<string>`${actor.email}`.as("changed_by"),
			changedAt: sql<string>`${now}`.as("changed_at"),
		})
		.from(portfolioDocuments)
		.where(and(eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID), sql`changes() = 1`));
	const mediaIdBatches: string[][] = [];
	for (let index = 0; index < mediaIds.length; index += 50) {
		mediaIdBatches.push(mediaIds.slice(index, index + 50));
	}
	const publishMediaStatements = mediaIdBatches.map((ids) =>
		query
			.update(mediaAssets)
			.set({ status: "published", updatedAt: now })
			.where(and(inArray(mediaAssets.id, ids), exists(publishedByThisMutation))),
	);
	const publishAuditSelect = query
		.select({
			id: sql<string>`${publishAuditId}`.as("id"),
			eventType: sql<string>`'draft.publish'`.as("event_type"),
			actorEmail: sql<string>`${actor.email}`.as("actor_email"),
			actorSubject: sql<string | null>`${actor.subject ?? null}`.as("actor_subject"),
			documentId: portfolioDocuments.id,
			revision: sql<number>`${expectedDraftRevision}`.as("revision"),
			detailsJson: sql<string | null>`NULL`.as("details_json"),
			createdAt: sql<string>`${now}`.as("created_at"),
		})
		.from(portfolioDocuments)
		.where(and(eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID), sql`changes() = 1`));
	const results = await query.batch([
		query
			.update(portfolioDocuments)
			.set({
				publishedJson,
				publishedRevision: portfolioDocuments.draftRevision,
				publishedAt: now,
				publishedBy: actor.email,
			})
			.where(
				and(
					eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID),
					eq(portfolioDocuments.draftRevision, expectedDraftRevision),
					// Keep publishing idempotent: an already-published revision is not
					// written to the history a second time.
					lt(portfolioDocuments.publishedRevision, expectedDraftRevision),
				),
			),
		query.insert(portfolioRevisions).select(publishedRevisionSelect),
		query.insert(auditEvents).select(publishAuditSelect),
		query
			.update(mediaAssets)
			.set({ status: "draft", updatedAt: now })
			.where(and(eq(mediaAssets.status, "published"), exists(publishedByThisMutation))),
		...publishMediaStatements,
	]);

	if (results[0]?.meta.changes === 1) {
		return {
			ok: true,
			status: "published",
			revision: expectedDraftRevision,
			publishedAt: now,
		};
	}

	const current = await readSnapshot(db);
	if (
		current.draftRevision === expectedDraftRevision &&
		current.publishedRevision === expectedDraftRevision
	) {
		return {
			ok: true,
			status: "already-published",
			revision: expectedDraftRevision,
			publishedAt: current.publishedAt,
		};
	}

	return { ok: false, kind: "conflict", current };
}

export type RevisionKind = "draft" | "published";

export interface RevisionSummary {
	id: number;
	kind: RevisionKind;
	revision: number;
	changedBy: string;
	changedAt: string;
	bytes: number;
}

export interface RevisionListResult {
	items: RevisionSummary[];
	nextBefore: number | null;
}

export interface RevisionDetail extends RevisionSummary {
	content: PortfolioContent;
}

export type RestoreRevisionResult =
	| { ok: true; snapshot: CmsDocumentSnapshot }
	| { ok: false; kind: "conflict"; current: CmsDocumentSnapshot }
	| { ok: false; kind: "not-found" };

export type DiscardDraftResult =
	| { ok: true; snapshot: CmsDocumentSnapshot }
	| { ok: false; kind: "conflict"; current: CmsDocumentSnapshot };

export type AuditEventDetails = Record<string, string | number | boolean | null>;

export interface AuditEventItem {
	id: string;
	eventType: string;
	actorEmail: string;
	revision: number | null;
	details: AuditEventDetails | null;
	createdAt: string;
}

export interface AuditEventListResult {
	items: AuditEventItem[];
	nextBefore: string | null;
}

function clampLimit(value: number | undefined, fallback: number): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
	return Math.max(1, Math.min(100, Math.trunc(value)));
}

function parseAuditDetails(raw: string | null): AuditEventDetails | null {
	if (!raw) return null;
	try {
		const record = asRecord(JSON.parse(raw));
		if (!record) return null;
		const out: AuditEventDetails = {};
		for (const [key, value] of Object.entries(record)) {
			if (
				value === null ||
				typeof value === "string" ||
				typeof value === "number" ||
				typeof value === "boolean"
			) {
				out[key] = value;
			}
		}
		return out;
	} catch {
		return null;
	}
}

const revisionSummaryColumns = {
	id: portfolioRevisions.id,
	kind: portfolioRevisions.kind,
	revision: portfolioRevisions.revision,
	changedBy: portfolioRevisions.changedBy,
	changedAt: portfolioRevisions.changedAt,
	bytes: sql<number>`octet_length(${portfolioRevisions.contentJson})`,
};

function toRevisionSummary(row: {
	id: number;
	kind: string;
	revision: number;
	changedBy: string;
	changedAt: string;
	bytes: number;
}): RevisionSummary {
	return {
		id: integerColumn(row.id),
		kind: row.kind === "published" ? "published" : "draft",
		revision: integerColumn(row.revision),
		changedBy: stringColumn(row.changedBy),
		changedAt: stringColumn(row.changedAt),
		bytes: integerColumn(row.bytes),
	};
}

/** List revision metadata and byte sizes without fetching stored JSON bodies. */
export async function listRevisions(
	env: CmsEnvironment,
	options: { kind?: RevisionKind; limit?: number; before?: number } = {},
): Promise<RevisionListResult> {
	const db = requireDatabase(env);
	const limit = clampLimit(options.limit, 30);
	const conditions = [eq(portfolioRevisions.documentId, PORTFOLIO_DOCUMENT_ID)];
	if (options.kind) {
		conditions.push(eq(portfolioRevisions.kind, options.kind));
	}
	if (typeof options.before === "number" && Number.isSafeInteger(options.before)) {
		conditions.push(lt(portfolioRevisions.id, options.before));
	}
	const rows = await database(db)
		.select(revisionSummaryColumns)
		.from(portfolioRevisions)
		.where(and(...conditions))
		.orderBy(desc(portfolioRevisions.id))
		.limit(limit + 1);

	const hasMore = rows.length > limit;
	const page = hasMore ? rows.slice(0, limit) : rows;
	const items: RevisionSummary[] = page.map(toRevisionSummary);
	const last = items[items.length - 1];
	return {
		items,
		nextBefore: hasMore && last ? last.id : null,
	};
}

/** Resolve metadata only, using the primary key or the document's unique revision key. */
export async function findRevision(
	env: CmsEnvironment,
	target: { id: number } | { kind?: RevisionKind; revision: number },
): Promise<RevisionSummary | null> {
	const query = database(requireDatabase(env))
		.select(revisionSummaryColumns)
		.from(portfolioRevisions);

	if ("id" in target) {
		const [row] = await query
			.where(
				and(
					eq(portfolioRevisions.documentId, PORTFOLIO_DOCUMENT_ID),
					eq(portfolioRevisions.id, target.id),
				),
			)
			.limit(1);
		return row ? toRevisionSummary(row) : null;
	}

	const lookup = async (kind: RevisionKind) => {
		const [row] = await query
			.where(
				and(
					eq(portfolioRevisions.documentId, PORTFOLIO_DOCUMENT_ID),
					eq(portfolioRevisions.kind, kind),
					eq(portfolioRevisions.revision, target.revision),
				),
			)
			.limit(1);
		return row ? toRevisionSummary(row) : null;
	};

	// Old number-only URLs prefer the published revision, then the draft.
	return target.kind ? lookup(target.kind) : ((await lookup("published")) ?? lookup("draft"));
}

/** Read one historical revision, upgrading legacy schema versions to the current shape. */
export async function getRevision(env: CmsEnvironment, id: number): Promise<RevisionDetail | null> {
	const db = requireDatabase(env);
	const revisionId = requireRevision(id, "id");
	const [row] = await database(db)
		.select({
			...revisionSummaryColumns,
			contentJson: portfolioRevisions.contentJson,
		})
		.from(portfolioRevisions)
		.where(
			and(
				eq(portfolioRevisions.documentId, PORTFOLIO_DOCUMENT_ID),
				eq(portfolioRevisions.id, revisionId),
			),
		)
		.limit(1);

	if (!row) return null;
	const summary = toRevisionSummary(row);
	return { ...summary, content: parseContentColumn(row.contentJson, summary.revision) };
}

/**
 * Restore a historical revision into the current draft as a new draft revision.
 * Upgrades legacy schema versions via `parseStoredOrBootstrap` + `serializePortfolioContent`.
 */
export async function restoreRevision(
	env: CmsEnvironment,
	input: { id: number; expectedRevision: number; actor: CmsActor },
): Promise<RestoreRevisionResult> {
	const db = requireDatabase(env);
	const revisionId = requireRevision(input.id, "id");
	const expectedRevision = requireRevision(input.expectedRevision, "expectedRevision");
	const actor = requireActor(input.actor);
	const source = await getRevision(env, revisionId);
	if (!source) return { ok: false, kind: "not-found" };

	const contentJson = serializePortfolioContent(source.content, { fromStorage: true });
	const now = new Date().toISOString();
	const query = database(db);
	const nextRevision = expectedRevision + 1;
	const detailsJson = JSON.stringify({
		sourceId: source.id,
		sourceKind: source.kind,
		sourceRevision: source.revision,
	});
	const draftRevisionSelect = query
		.select({
			id: sql<number | null>`NULL`.as("id"),
			documentId: portfolioDocuments.id,
			kind: sql<string>`'draft'`.as("kind"),
			revision: sql<number>`${nextRevision}`.as("revision"),
			contentJson: sql<string>`${contentJson}`.as("content_json"),
			changedBy: sql<string>`${actor.email}`.as("changed_by"),
			changedAt: sql<string>`${now}`.as("changed_at"),
		})
		.from(portfolioDocuments)
		.where(and(eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID), sql`changes() = 1`));
	const auditId = crypto.randomUUID();
	const auditSelect = query
		.select({
			id: sql<string>`${auditId}`.as("id"),
			eventType: sql<string>`'revision.restore'`.as("event_type"),
			actorEmail: sql<string>`${actor.email}`.as("actor_email"),
			actorSubject: sql<string | null>`${actor.subject ?? null}`.as("actor_subject"),
			documentId: portfolioDocuments.id,
			revision: sql<number>`${nextRevision}`.as("revision"),
			detailsJson: sql<string>`${detailsJson}`.as("details_json"),
			createdAt: sql<string>`${now}`.as("created_at"),
		})
		.from(portfolioDocuments)
		.where(and(eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID), sql`changes() = 1`));
	const results = await query.batch([
		query
			.update(portfolioDocuments)
			.set({
				schemaVersion: CONTENT_SCHEMA_VERSION,
				draftJson: contentJson,
				draftRevision: sql`${portfolioDocuments.draftRevision} + 1`,
				draftUpdatedAt: now,
				updatedBy: actor.email,
			})
			.where(
				and(
					eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID),
					eq(portfolioDocuments.draftRevision, expectedRevision),
				),
			),
		query.insert(portfolioRevisions).select(draftRevisionSelect),
		query.insert(auditEvents).select(auditSelect),
		selectSnapshot(query),
	]);

	if (results[0]?.meta.changes !== 1) {
		return { ok: false, kind: "conflict", current: snapshotFromRow(results[3][0]) };
	}

	return { ok: true, snapshot: snapshotFromRow(results[3][0]) };
}

/** Discard draft changes by copying the published document into a new draft revision. */
export async function discardDraft(
	env: CmsEnvironment,
	input: { expectedRevision: number; expectedPublishedRevision: number; actor: CmsActor },
): Promise<DiscardDraftResult> {
	const db = requireDatabase(env);
	const expectedRevision = requireRevision(input.expectedRevision, "expectedRevision");
	const expectedPublishedRevision = requireRevision(
		input.expectedPublishedRevision,
		"expectedPublishedRevision",
	);
	const actor = requireActor(input.actor);
	const before = await getAdminSnapshot(env);
	if (
		before.draftRevision !== expectedRevision ||
		before.publishedRevision !== expectedPublishedRevision
	) {
		return { ok: false, kind: "conflict", current: before };
	}

	const contentJson = serializePortfolioContent(before.published, { fromStorage: true });
	const now = new Date().toISOString();
	const query = database(db);
	const nextRevision = expectedRevision + 1;
	const detailsJson = JSON.stringify({ publishedRevision: before.publishedRevision });
	const draftRevisionSelect = query
		.select({
			id: sql<number | null>`NULL`.as("id"),
			documentId: portfolioDocuments.id,
			kind: sql<string>`'draft'`.as("kind"),
			revision: sql<number>`${nextRevision}`.as("revision"),
			contentJson: sql<string>`${contentJson}`.as("content_json"),
			changedBy: sql<string>`${actor.email}`.as("changed_by"),
			changedAt: sql<string>`${now}`.as("changed_at"),
		})
		.from(portfolioDocuments)
		.where(and(eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID), sql`changes() = 1`));
	const auditId = crypto.randomUUID();
	const auditSelect = query
		.select({
			id: sql<string>`${auditId}`.as("id"),
			eventType: sql<string>`'draft.discard'`.as("event_type"),
			actorEmail: sql<string>`${actor.email}`.as("actor_email"),
			actorSubject: sql<string | null>`${actor.subject ?? null}`.as("actor_subject"),
			documentId: portfolioDocuments.id,
			revision: sql<number>`${nextRevision}`.as("revision"),
			detailsJson: sql<string>`${detailsJson}`.as("details_json"),
			createdAt: sql<string>`${now}`.as("created_at"),
		})
		.from(portfolioDocuments)
		.where(and(eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID), sql`changes() = 1`));
	const results = await query.batch([
		query
			.update(portfolioDocuments)
			.set({
				schemaVersion: CONTENT_SCHEMA_VERSION,
				draftJson: contentJson,
				draftRevision: sql`${portfolioDocuments.draftRevision} + 1`,
				draftUpdatedAt: now,
				updatedBy: actor.email,
			})
			.where(
				and(
					eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID),
					eq(portfolioDocuments.draftRevision, expectedRevision),
					eq(portfolioDocuments.publishedRevision, expectedPublishedRevision),
				),
			),
		query.insert(portfolioRevisions).select(draftRevisionSelect),
		query.insert(auditEvents).select(auditSelect),
		selectSnapshot(query),
	]);

	if (results[0]?.meta.changes !== 1) {
		return { ok: false, kind: "conflict", current: snapshotFromRow(results[3][0]) };
	}

	return { ok: true, snapshot: snapshotFromRow(results[3][0]) };
}

/** List owner audit events newest first, paginated with an opaque `before` cursor. */
/** Activity filters, applied in the query so pagination and empty states cover every event. */
export const AUDIT_EVENT_KINDS = ["publish", "save", "restore", "discard", "media"] as const;
export type AuditEventKind = (typeof AUDIT_EVENT_KINDS)[number];

function auditKindFilter(kind: AuditEventKind | undefined) {
	switch (kind) {
		case "publish":
			return eq(auditEvents.eventType, "draft.publish");
		case "save":
			return eq(auditEvents.eventType, "draft.save");
		case "restore":
			return eq(auditEvents.eventType, "revision.restore");
		case "discard":
			return eq(auditEvents.eventType, "draft.discard");
		case "media":
			return like(auditEvents.eventType, "media.%");
		default:
			return undefined;
	}
}

export async function listAuditEvents(
	env: CmsEnvironment,
	options: { limit?: number; before?: string; kind?: AuditEventKind } = {},
): Promise<AuditEventListResult> {
	const db = requireDatabase(env);
	const limit = clampLimit(options.limit, 40);
	const query = database(db);

	let cursorFilter = undefined;
	if (options.before) {
		const splitAt = options.before.lastIndexOf("|");
		if (splitAt > 0) {
			const beforeAt = options.before.slice(0, splitAt);
			const beforeId = options.before.slice(splitAt + 1);
			cursorFilter = or(
				lt(auditEvents.createdAt, beforeAt),
				and(eq(auditEvents.createdAt, beforeAt), lt(auditEvents.id, beforeId)),
			);
		} else {
			cursorFilter = lt(auditEvents.createdAt, options.before);
		}
	}

	const rows = await query
		.select({
			id: auditEvents.id,
			eventType: auditEvents.eventType,
			actorEmail: auditEvents.actorEmail,
			revision: auditEvents.revision,
			detailsJson: auditEvents.detailsJson,
			createdAt: auditEvents.createdAt,
		})
		.from(auditEvents)
		.where(and(cursorFilter, auditKindFilter(options.kind)))
		.orderBy(desc(auditEvents.createdAt), desc(auditEvents.id))
		.limit(limit + 1);

	const hasMore = rows.length > limit;
	const page = hasMore ? rows.slice(0, limit) : rows;
	const items: AuditEventItem[] = page.map((row) => ({
		id: stringColumn(row.id),
		eventType: stringColumn(row.eventType),
		actorEmail: stringColumn(row.actorEmail),
		revision: row.revision === null ? null : integerColumn(row.revision),
		details: parseAuditDetails(row.detailsJson),
		createdAt: stringColumn(row.createdAt),
	}));
	const last = items[items.length - 1];
	return {
		items,
		nextBefore: hasMore && last ? `${last.createdAt}|${last.id}` : null,
	};
}
