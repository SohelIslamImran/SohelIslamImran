import { describe, expect, it } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT } from "../../../content/initial";
import type { RevisionDetail, RevisionKind } from "../../../server/cms-storage.server";
import { cacheRevision, defaultRevision, readCachedRevision } from "./history-select";

const revision = (id: number, kind: RevisionKind = "draft", number = id): RevisionDetail => ({
	id,
	kind,
	revision: number,
	changedAt: "",
	changedBy: "",
	bytes: 0,
	content: INITIAL_PORTFOLIO_CONTENT,
});

describe("history selection", () => {
	it("skips only the current saved draft when choosing a comparison", () => {
		const latest = revision(3, "draft", 2);
		const live = revision(2, "published", 2);
		expect(defaultRevision([latest, live], { dirty: false, draftRevision: 2 })).toBe(live);
		expect(defaultRevision([latest, live], { dirty: true, draftRevision: 2 })).toBe(latest);
		expect(defaultRevision([latest], { dirty: false, draftRevision: 2 })).toBe(latest);
		expect(defaultRevision([], { dirty: false, draftRevision: 2 })).toBeNull();
	});

	it("keeps only the 20 most recently read or written details", () => {
		const cache = new Map<number, RevisionDetail>();
		for (let id = 1; id <= 20; id += 1) cacheRevision(cache, revision(id));
		expect(readCachedRevision(cache, 1)?.id).toBe(1);
		cacheRevision(cache, revision(21));
		expect(cache.size).toBe(20);
		expect(readCachedRevision(cache, 2)).toBeUndefined();
		expect(cache.has(1)).toBe(true);
	});
});
