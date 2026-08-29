export interface MediaEnvironment {
	DB?: D1Database;
	MEDIA?: R2Bucket;
}

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
	["image/jpeg", "jpg"],
	["image/png", "png"],
	["image/webp", "webp"],
	["image/avif", "avif"],
	["application/pdf", "pdf"],
]);

export class MediaStorageUnavailableError extends Error {}
export class MediaUploadError extends Error {}

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
	await bucket.put(key, file.stream(), {
		httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
		customMetadata: { assetId: id },
	});
	try {
		await db
			.prepare(
				`INSERT INTO media_assets (id, object_key, alt, mime_type, bytes, status, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
			)
			.bind(id, key, cleanAlt, file.type, file.size, now, now, actorEmail)
			.run();
	} catch {
		// The immutable R2 object is left for an explicit orphan-cleanup job.
		throw new MediaUploadError(
			"The file uploaded, but its metadata could not be saved. Try again with a new file.",
		);
	}
	return { id, key, alt: cleanAlt, mimeType: file.type, bytes: file.size };
}

export async function getPublishedMedia(env: MediaEnvironment, assetId: string) {
	const { db, bucket } = requireBindings(env);
	const row = await db
		.prepare(
			`SELECT object_key, mime_type FROM media_assets WHERE id = ? AND status = 'published' LIMIT 1`,
		)
		.bind(assetId)
		.first<{ object_key: string; mime_type: string | null }>();
	if (!row) return null;
	const object = await bucket.get(row.object_key);
	if (!object) return null;
	return {
		object,
		mimeType: row.mime_type ?? object.httpMetadata?.contentType ?? "application/octet-stream",
	};
}
