/**
 * Owner-only preview URL for a media asset, published or not. The route
 * (`src/routes/draft-media/$assetId.ts`) checks the CMS host and the owner on
 * every request and serves images only, so every caller keeps a non-image
 * and error fallback. Takes only the public asset id, never a storage key.
 * The public `/media/:id` route and `mediaHref` stay public-only.
 */
const ASSET_ID = /^[A-Za-z0-9_-]{8,160}$/u;

export function ownerMediaPreviewSrc(assetId: string | null | undefined): string | null {
	if (!assetId || !ASSET_ID.test(assetId)) return null;
	return `/draft-media/${encodeURIComponent(assetId)}`;
}
