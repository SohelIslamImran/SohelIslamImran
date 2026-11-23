import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { auditEvents, PORTFOLIO_DOCUMENT_ID, type CmsActor } from "./cms-storage.server";
import { mediaAssets } from "./schema.server";
import type { MediaAsset, PortfolioContent } from "../types/content";

export interface MediaEnvironment {
	DB?: D1Database;
	MEDIA?: R2Bucket;
}

export interface MediaReference {
	sectionId: string;
	label: string;
	path: string;
	itemId?: string;
}

export interface MediaLibraryItem {
	id: string;
	alt: string;
	mimeType: string | null;
	width: number | null;
	height: number | null;
	bytes: number | null;
	status: "draft" | "published";
	createdAt: string;
	updatedAt: string;
	createdBy: string;
	url: string;
	usages: MediaReference[];
	attachment?: MediaAsset;
}

export interface MediaLibraryResult {
	mediaEnabled: boolean;
	items: MediaLibraryItem[];
}

export type UpdateMediaAltResult =
	| { ok: true; id: string; alt: string; updatedAt: string }
	| { ok: false; kind: "not-found" };

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
	["image/jpeg", "jpg"],
	["image/png", "png"],
	["image/webp", "webp"],
	["image/avif", "avif"],
	["application/pdf", "pdf"],
]);

export class MediaStorageUnavailableError extends Error {}
export class MediaUploadError extends Error {
	constructor(message: string, options?: { cause: unknown }) {
		super(message, options);
		this.name = "MediaUploadError";
	}
}

function requireBindings(env: MediaEnvironment) {
	if (!env.DB || !env.MEDIA)
		throw new MediaStorageUnavailableError("Media storage is not configured.");
	return { db: env.DB, bucket: env.MEDIA };
}

export async function uploadMedia(
	env: MediaEnvironment,
	file: File,
	alt: string,
	actorEmail: string,
) {
	const { db, bucket } = requireBindings(env);
	const extension = ALLOWED_TYPES.get(file.type);
	if (!extension) throw new MediaUploadError("Use JPEG, PNG, WebP, AVIF, or PDF files.");
	if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES)
		throw new MediaUploadError("Files must be between 1 byte and 20 MB.");
	const cleanAlt = alt.trim().slice(0, 240);
	if (file.type.startsWith("image/") && cleanAlt.length === 0)
		throw new MediaUploadError("Image alt text is required.");

	const id = crypto.randomUUID();
	const key = `portfolio/media/${id}.${extension}`;
	const now = new Date().toISOString();
	await bucket.put(key, file, {
		httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
		customMetadata: { assetId: id },
	});
	try {
		const query = drizzle(db, { logger: false });
		await query.batch([
			query.insert(mediaAssets).values({
				id,
				objectKey: key,
				alt: cleanAlt,
				mimeType: file.type,
				bytes: file.size,
				status: "draft",
				createdAt: now,
				updatedAt: now,
				createdBy: actorEmail,
			}),
			query.insert(auditEvents).values({
				id: crypto.randomUUID(),
				eventType: "media.upload",
				actorEmail: actorEmail.trim().toLowerCase(),
				actorSubject: null,
				documentId: PORTFOLIO_DOCUMENT_ID,
				revision: null,
				detailsJson: JSON.stringify({ assetId: id, mimeType: file.type, bytes: file.size }),
				createdAt: now,
			}),
		]);
	} catch (error) {
		// The key cannot be logged per the security rules, but leaving the object
		// behind forever is worse than a generic signal, so surface that the
		// rollback itself failed.
		const rolledBack = await bucket.delete(key).then(
			() => true,
			() => false,
		);
		throw new MediaUploadError(
			rolledBack
				? "The media record could not be saved. Check the storage configuration and try again."
				: "The media record could not be saved, and the uploaded file could not be cleaned up. Remove it from storage manually.",
			{ cause: error },
		);
	}
	const asset: MediaAsset = {
		id,
		key,
		alt: cleanAlt,
		mimeType: file.type,
		bytes: file.size,
	};
	return asset;
}

export async function getPublishedMedia(env: MediaEnvironment, assetId: string) {
	const { db, bucket } = requireBindings(env);
	const [row] = await drizzle(db, { logger: false })
		.select({ objectKey: mediaAssets.objectKey, mimeType: mediaAssets.mimeType })
		.from(mediaAssets)
		.where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.status, "published")))
		.limit(1);
	if (!row) return null;
	const object = await bucket.get(row.objectKey);
	if (!object) return null;
	return {
		object,
		mimeType: row.mimeType ?? object.httpMetadata?.contentType ?? "application/octet-stream",
	};
}

/**
 * Any image asset, published or not, for the owner-only library preview at
 * `/draft-media/:id`. The caller must check the owner first.
 */
export async function getOwnerMediaPreview(env: MediaEnvironment, assetId: string) {
	const { db, bucket } = requireBindings(env);
	const [row] = await drizzle(db, { logger: false })
		.select({ objectKey: mediaAssets.objectKey, mimeType: mediaAssets.mimeType })
		.from(mediaAssets)
		.where(eq(mediaAssets.id, assetId))
		.limit(1);
	if (!row?.mimeType?.startsWith("image/")) return null;
	const object = await bucket.get(row.objectKey);
	if (!object) return null;
	return { object, mimeType: row.mimeType };
}

/** Find every reference to a media asset id in a portfolio draft. */
export function findMediaReferences(content: PortfolioContent): Map<string, MediaReference[]> {
	const refs = new Map<string, MediaReference[]>();
	const add = (id: string | undefined | null, ref: MediaReference) => {
		if (!id) return;
		const list = refs.get(id);
		if (list) list.push(ref);
		else refs.set(id, [ref]);
	};

	if (content.identity.avatar?.id) {
		add(content.identity.avatar.id, {
			sectionId: "identity",
			label: "Identity · Portrait",
			path: "identity.avatar",
		});
	}

	content.projects.forEach((project, index) => {
		if (project.cover?.id) {
			add(project.cover.id, {
				sectionId: "projects",
				label: `Projects · ${project.title.trim() || project.slug || project.id}`,
				path: `projects[${index}].cover`,
				itemId: project.id,
			});
		}
	});

	content.travel.entries.forEach((entry, index) => {
		for (const id of entry.mediaIds) {
			add(id, {
				sectionId: "travel",
				label: `Travel · ${entry.place.trim() || entry.id}`,
				path: `travel.entries[${index}].mediaIds`,
				itemId: entry.id,
			});
		}
	});

	return refs;
}

/** List media assets recorded in D1 along with where each is used in the draft. */
export async function listMediaAssets(
	env: MediaEnvironment,
	draft: PortfolioContent,
	includeAttachments = false,
): Promise<MediaLibraryResult> {
	if (!env.DB) {
		throw new MediaStorageUnavailableError("Media database is not configured.");
	}
	const references = findMediaReferences(draft);
	const rows = await drizzle(env.DB, { logger: false })
		.select({
			id: mediaAssets.id,
			objectKey: mediaAssets.objectKey,
			alt: mediaAssets.alt,
			mimeType: mediaAssets.mimeType,
			width: mediaAssets.width,
			height: mediaAssets.height,
			bytes: mediaAssets.bytes,
			status: mediaAssets.status,
			createdAt: mediaAssets.createdAt,
			updatedAt: mediaAssets.updatedAt,
			createdBy: mediaAssets.createdBy,
		})
		.from(mediaAssets)
		.orderBy(desc(mediaAssets.createdAt), desc(mediaAssets.id));

	const items: MediaLibraryItem[] = rows.map((row) => ({
		id: row.id,
		alt: row.alt,
		mimeType: row.mimeType ?? null,
		width: row.width ?? null,
		height: row.height ?? null,
		bytes: row.bytes ?? null,
		status: row.status === "published" ? "published" : "draft",
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		createdBy: row.createdBy,
		url: `/media/${encodeURIComponent(row.id)}`,
		usages: references.get(row.id) ?? [],
		...(includeAttachments &&
			env.MEDIA && {
				attachment: {
					id: row.id,
					key: row.objectKey,
					alt: row.alt,
					mimeType: row.mimeType ?? undefined,
					width: row.width ?? undefined,
					height: row.height ?? undefined,
					bytes: row.bytes ?? undefined,
				},
			}),
	}));

	return {
		mediaEnabled: Boolean(env.MEDIA),
		items,
	};
}

/** Update a media asset's default alt text in D1 and write an audit event. */
export async function updateMediaAlt(
	env: MediaEnvironment,
	input: { id: string; alt: string; actor: CmsActor },
): Promise<UpdateMediaAltResult> {
	if (!env.DB) {
		throw new MediaStorageUnavailableError("Media database is not configured.");
	}
	const id = input.id.trim();
	const cleanAlt = input.alt.trim().slice(0, 240);
	const query = drizzle(env.DB, { logger: false });
	const [existing] = await query
		.select({ id: mediaAssets.id, mimeType: mediaAssets.mimeType })
		.from(mediaAssets)
		.where(eq(mediaAssets.id, id))
		.limit(1);

	if (!existing) return { ok: false, kind: "not-found" };
	if (existing.mimeType?.startsWith("image/") && cleanAlt.length === 0) {
		throw new MediaUploadError("Image alt text is required.");
	}

	const now = new Date().toISOString();
	const email = input.actor.email.trim().toLowerCase();
	const subject = input.actor.subject?.trim().slice(0, 256) ?? null;

	await query.batch([
		query.update(mediaAssets).set({ alt: cleanAlt, updatedAt: now }).where(eq(mediaAssets.id, id)),
		query.insert(auditEvents).values({
			id: crypto.randomUUID(),
			eventType: "media.update_alt",
			actorEmail: email,
			actorSubject: subject,
			documentId: PORTFOLIO_DOCUMENT_ID,
			revision: null,
			detailsJson: JSON.stringify({ assetId: id }),
			createdAt: now,
		}),
	]);

	return { ok: true, id, alt: cleanAlt, updatedAt: now };
}
