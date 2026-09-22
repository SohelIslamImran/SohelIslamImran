import type { MediaAsset } from "../types/content";

/** Build the public route for a published media asset without exposing its storage key. */
export function mediaHref(asset: MediaAsset | null | undefined): string | undefined {
	return asset?.id ? `/media/${encodeURIComponent(asset.id)}` : undefined;
}

export function mediaById(assets: MediaAsset[]): Map<string, MediaAsset> {
	return new Map(assets.map((asset) => [asset.id, asset]));
}
