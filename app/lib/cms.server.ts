import { INITIAL_PORTFOLIO_CONTENT } from "../content/initial";
import type { PortfolioContent } from "../types/content";
import {
  parseStoredContent,
  serializePortfolioContent,
} from "./validation";

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

interface PortfolioDocumentRow {
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

const SELECT_DOCUMENT_SQL = `
  SELECT
    id,
    schema_version,
    draft_json,
    published_json,
    draft_revision,
    published_revision,
    draft_updated_at,
    published_at,
    updated_by,
    published_by
  FROM portfolio_documents
  WHERE id = ?
  LIMIT 1
`;

const UPDATE_DRAFT_SQL = `
  UPDATE portfolio_documents
  SET
    draft_json = ?,
    draft_revision = draft_revision + 1,
    draft_updated_at = ?,
    updated_by = ?
  WHERE id = ?
    AND draft_revision = ?
`;

const INSERT_DRAFT_REVISION_SQL = `
  INSERT INTO portfolio_revisions (
    document_id,
    kind,
    revision,
    content_json,
    changed_by,
    changed_at
  )
  SELECT
    id,
    ?,
    draft_revision,
    draft_json,
    ?,
    ?
  FROM portfolio_documents
  WHERE id = ?
    AND draft_revision = ?
`;

const PUBLISH_DRAFT_SQL = `
  UPDATE portfolio_documents
  SET
    published_json = draft_json,
    published_revision = draft_revision,
    published_at = ?,
    published_by = ?
  WHERE id = ?
    AND draft_revision = ?
    AND published_revision < ?
`;

const INSERT_PUBLISHED_REVISION_SQL = `
  INSERT INTO portfolio_revisions (
    document_id,
    kind,
    revision,
    content_json,
    changed_by,
    changed_at
  )
  SELECT
    id,
    ?,
    published_revision,
    published_json,
    ?,
    ?
  FROM portfolio_documents
  WHERE id = ?
    AND draft_revision = ?
    AND published_revision = ?
`;

function requireDatabase(env: CmsEnvironment): D1Database {
  if (!env.DB) {
    throw new CmsStorageUnavailableError();
  }

  return env.DB;
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
  return subject && subject.length > 0
    ? { email, subject: subject.slice(0, 256) }
    : { email };
}

function integerColumn(value: unknown, column: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new CmsDataError();
  }

  return value;
}

function stringColumn(value: unknown, column: string): string {
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

function referencedMediaIds(content: PortfolioContent): string[] {
  const ids = new Set(content.media.map((asset) => asset.id));
  if (content.identity.avatar?.id) ids.add(content.identity.avatar.id);
  for (const project of content.projects) if (project.cover?.id) ids.add(project.cover.id);
  for (const entry of content.travel.entries) for (const id of entry.mediaIds) ids.add(id);
  return [...ids].filter((id) => id.length > 0);
}

function snapshotFromRow(row: PortfolioDocumentRow): CmsDocumentSnapshot {
  try {
    return {
      id: stringColumn(row.id, "id"),
      schemaVersion: integerColumn(row.schema_version, "schema_version"),
      draftRevision: integerColumn(row.draft_revision, "draft_revision"),
      publishedRevision: integerColumn(row.published_revision, "published_revision"),
      draftUpdatedAt: stringColumn(row.draft_updated_at, "draft_updated_at"),
      publishedAt: nullableStringColumn(row.published_at),
      updatedBy: stringColumn(row.updated_by, "updated_by"),
      publishedBy: nullableStringColumn(row.published_by),
      draft: parseStoredContent(stringColumn(row.draft_json, "draft_json")),
      published: parseStoredContent(stringColumn(row.published_json, "published_json")),
    };
  } catch (error) {
    if (error instanceof CmsDataError) {
      throw error;
    }

    throw new CmsDataError();
  }
}

async function readSnapshot(db: D1Database): Promise<CmsDocumentSnapshot> {
  const row = await db
    .prepare(SELECT_DOCUMENT_SQL)
    .bind(PORTFOLIO_DOCUMENT_ID)
    .first<PortfolioDocumentRow>();

  if (!row) {
    throw new CmsDataError();
  }

  return snapshotFromRow(row);
}

/**
 * Public reads may use the empty seed when no D1 binding exists. A configured
 * database that is empty or malformed is an error, never a silent fallback.
 */
export async function getPublicContent(env: CmsEnvironment): Promise<PortfolioContent> {
  if (!env.DB) {
    return INITIAL_PORTFOLIO_CONTENT;
  }

  const snapshot = await readSnapshot(env.DB);
  return snapshot.publishedRevision <= 1 && snapshot.published.hero.title.trim() === ""
    ? INITIAL_PORTFOLIO_CONTENT
    : snapshot.published;
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

  const results = await db.batch([
    db
      .prepare(UPDATE_DRAFT_SQL)
      .bind(contentJson, now, actor.email, PORTFOLIO_DOCUMENT_ID, expectedRevision),
    db
      .prepare(INSERT_DRAFT_REVISION_SQL)
      .bind(
        "draft",
        actor.email,
        now,
        PORTFOLIO_DOCUMENT_ID,
        expectedRevision + 1,
      ),
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
  const statements: D1PreparedStatement[] = [
    db
      .prepare(PUBLISH_DRAFT_SQL)
      .bind(
        now,
        actor.email,
        PORTFOLIO_DOCUMENT_ID,
        expectedDraftRevision,
        expectedDraftRevision,
      ),
  ];
  if (mediaIds.length > 0) {
    const placeholders = mediaIds.map(() => "?").join(", ");
    statements.push(
      db.prepare(`UPDATE media_assets SET status = 'published', updated_at = ? WHERE id IN (${placeholders})`)
        .bind(now, ...mediaIds),
    );
  }
  statements.push(
    db
      .prepare(INSERT_PUBLISHED_REVISION_SQL)
      .bind(
        "published",
        actor.email,
        now,
        PORTFOLIO_DOCUMENT_ID,
        expectedDraftRevision,
        expectedDraftRevision,
      ),
  );
  const results = await db.batch(statements);

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
