import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * The D1 schema is intentionally small: one editable document, its immutable
 * revision log, and media metadata. Drizzle gives the server boundary typed
 * columns while the existing SQL migrations remain the source of truth.
 */
export const portfolioDocuments = sqliteTable("portfolio_documents", {
	id: text("id").primaryKey(),
	schemaVersion: integer("schema_version").notNull(),
	draftJson: text("draft_json").notNull(),
	publishedJson: text("published_json").notNull(),
	draftRevision: integer("draft_revision").notNull(),
	publishedRevision: integer("published_revision").notNull(),
	draftUpdatedAt: text("draft_updated_at").notNull(),
	publishedAt: text("published_at"),
	updatedBy: text("updated_by").notNull(),
	publishedBy: text("published_by"),
});

export const portfolioRevisions = sqliteTable("portfolio_revisions", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	documentId: text("document_id").notNull(),
	kind: text("kind").notNull(),
	revision: integer("revision").notNull(),
	contentJson: text("content_json").notNull(),
	changedBy: text("changed_by").notNull(),
	changedAt: text("changed_at").notNull(),
});

export const mediaAssets = sqliteTable("media_assets", {
	id: text("id").primaryKey(),
	objectKey: text("object_key").notNull(),
	alt: text("alt").notNull(),
	mimeType: text("mime_type"),
	width: integer("width"),
	height: integer("height"),
	bytes: integer("bytes"),
	status: text("status").notNull(),
	createdAt: text("created_at").notNull(),
	updatedAt: text("updated_at").notNull(),
	createdBy: text("created_by").notNull(),
});

export type PortfolioDocumentRow = typeof portfolioDocuments.$inferSelect;
