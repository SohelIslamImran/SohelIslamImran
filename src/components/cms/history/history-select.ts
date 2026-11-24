import type { RevisionDetail, RevisionSummary } from "../../../server/cms-storage.server";

export function defaultRevision(
	items: readonly RevisionSummary[],
	current: { dirty: boolean; draftRevision: number },
): RevisionSummary | null {
	return (
		(current.dirty
			? items[0]
			: items.find((item) => item.kind !== "draft" || item.revision !== current.draftRevision)) ??
		items[0] ??
		null
	);
}

export function readCachedRevision(cache: Map<number, RevisionDetail>, id: number) {
	const detail = cache.get(id);
	if (detail) cacheRevision(cache, detail);
	return detail;
}

export function cacheRevision(cache: Map<number, RevisionDetail>, detail: RevisionDetail) {
	cache.delete(detail.id);
	cache.set(detail.id, detail);
	if (cache.size > 20) {
		const oldest = cache.keys().next();
		if (!oldest.done) cache.delete(oldest.value);
	}
}
