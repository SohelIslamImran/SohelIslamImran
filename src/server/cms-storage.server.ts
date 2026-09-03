import { INITIAL_PORTFOLIO_CONTENT } from "../content/initial";
import { and, eq, exists, inArray, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { MediaAsset, PortfolioContent } from "../types/content";
import {
	parsePortfolioContent,
	parseStoredContent,
	serializePortfolioContent,
} from "../lib/validation";
import { mediaAssets, portfolioDocuments, portfolioRevisions } from "./schema.server";

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

	constructor() {
		super("Portfolio content could not be read.");
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

interface StoredDocumentRow {
	id: string;
	schema_version: number;
	draft_json: string;
	published_json: string;
	draft_revision: number;
	published_revision: number;
	draft_updated_at: string;
	published_at: string | null;
	updated_by: string;
	published_by: string | null;
}

function requireDatabase(env: CmsEnvironment): D1Database {
	if (!env.DB) {
		throw new CmsStorageUnavailableError();
	}

	return env.DB;
}

function database(db: D1Database) {
	return drizzle(db, {
		schema: { mediaAssets, portfolioDocuments, portfolioRevisions },
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

export function parseStoredOrBootstrap(json: string, revision: number): PortfolioContent {
	if (revision > 1) return parseStoredContent(json);

	try {
		const value = JSON.parse(json) as { hero?: { title?: unknown } };
		if (typeof value.hero?.title === "string" && value.hero.title.trim() === "") {
			return INITIAL_PORTFOLIO_CONTENT;
		}
		return parsePortfolioContent(value);
	} catch {
		return parseStoredContent(json);
	}
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

function snapshotFromRow(row: StoredDocumentRow): CmsDocumentSnapshot {
	try {
		const draftRevision = integerColumn(row.draft_revision);
		const publishedRevision = integerColumn(row.published_revision);
		return {
			id: stringColumn(row.id),
			schemaVersion: integerColumn(row.schema_version),
			draftRevision,
			publishedRevision,
			draftUpdatedAt: stringColumn(row.draft_updated_at),
			publishedAt: nullableStringColumn(row.published_at),
			updatedBy: stringColumn(row.updated_by),
			publishedBy: nullableStringColumn(row.published_by),
			draft: parseStoredOrBootstrap(stringColumn(row.draft_json), draftRevision),
			published: parseStoredOrBootstrap(stringColumn(row.published_json), publishedRevision),
		};
	} catch (error) {
		if (error instanceof CmsDataError) {
			throw error;
		}

		throw new CmsDataError();
	}
}

async function readSnapshot(db: D1Database): Promise<CmsDocumentSnapshot> {
	const [stored] = await database(db)
		.select()
		.from(portfolioDocuments)
		.where(eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID))
		.limit(1);

	if (!stored) {
		throw new CmsDataError();
	}

	return snapshotFromRow({
		id: stored.id,
		schema_version: stored.schemaVersion,
		draft_json: stored.draftJson,
		published_json: stored.publishedJson,
		draft_revision: stored.draftRevision,
		published_revision: stored.publishedRevision,
		draft_updated_at: stored.draftUpdatedAt,
		published_at: stored.publishedAt,
		updated_by: stored.updatedBy,
		published_by: stored.publishedBy,
	});
}

/**
 * Public reads may use the empty seed when no D1 binding exists. A configured
 * database that is empty or malformed is an error, never a silent fallback.
 */
export async function getPublicContent(env: CmsEnvironment): Promise<PortfolioContent> {
	if (!env.DB) {
		return toPublicPortfolioContent(INITIAL_PORTFOLIO_CONTENT);
	}

	const snapshot = await readSnapshot(env.DB);
	const published =
		snapshot.publishedRevision <= 1 && snapshot.published.hero.title.trim() === ""
			? INITIAL_PORTFOLIO_CONTENT
			: snapshot.published;
	return toPublicPortfolioContent(published);
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
			documentId: portfolioDocuments.id,
			kind: sql<string>`'draft'`.as("kind"),
			revision: portfolioDocuments.draftRevision,
			contentJson: portfolioDocuments.draftJson,
			changedBy: sql<string>`${actor.email}`.as("changed_by"),
			changedAt: sql<string>`${now}`.as("changed_at"),
		})
		.from(portfolioDocuments)
		.where(
			and(
				eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID),
				eq(portfolioDocuments.draftRevision, expectedRevision + 1),
			),
		);
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
	const before = await readSnapshot(db);
	if (before.draftRevision !== expectedDraftRevision) {
		return { ok: false, kind: "conflict", current: before };
	}
	const mediaIds = referencedMediaIds(before.draft);
	const query = database(db);
	const documentAtRevision = query
		.select({ id: portfolioDocuments.id })
		.from(portfolioDocuments)
		.where(
			and(
				eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID),
				eq(portfolioDocuments.draftRevision, expectedDraftRevision),
				eq(portfolioDocuments.publishedRevision, expectedDraftRevision),
			),
		);
	const publishedRevisionSelect = query
		.select({
			documentId: portfolioDocuments.id,
			kind: sql<string>`'published'`.as("kind"),
			revision: portfolioDocuments.publishedRevision,
			contentJson: portfolioDocuments.publishedJson,
			changedBy: sql<string>`${actor.email}`.as("changed_by"),
			changedAt: sql<string>`${now}`.as("changed_at"),
		})
		.from(portfolioDocuments)
		.where(
			and(
				eq(portfolioDocuments.id, PORTFOLIO_DOCUMENT_ID),
				eq(portfolioDocuments.draftRevision, expectedDraftRevision),
				eq(portfolioDocuments.publishedRevision, expectedDraftRevision),
			),
		);
	const results = await query.batch([
		query
			.update(portfolioDocuments)
			.set({
				publishedJson: portfolioDocuments.draftJson,
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
		query
			.update(mediaAssets)
			.set({ status: "draft", updatedAt: now })
			.where(and(eq(mediaAssets.status, "published"), exists(documentAtRevision))),
		query
			.update(mediaAssets)
			.set({ status: "published", updatedAt: now })
			.where(and(inArray(mediaAssets.id, mediaIds), exists(documentAtRevision))),
		query.insert(portfolioRevisions).select(publishedRevisionSelect),
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
