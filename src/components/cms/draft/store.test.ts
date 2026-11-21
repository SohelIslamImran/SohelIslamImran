import { describe, expect, it, vi } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT as initialContent } from "../../../content/initial";
import type { PortfolioContent } from "../../../types/content";
import { correspondingPath, getAt, indexIssues, parsePath, setAt } from "./paths";
import { DraftStore, type DraftApi, type DraftSnapshotInput } from "./store";

function snapshot(content: PortfolioContent = initialContent): DraftSnapshotInput {
	return {
		draft: structuredClone(content),
		published: structuredClone(content),
		draftRevision: 5,
		publishedRevision: 5,
		draftUpdatedAt: "2026-11-01T00:00:00.000Z",
		publishedAt: "2026-11-01T00:00:00.000Z",
	};
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => (resolve = done));
	return { promise, resolve };
}

describe("paths", () => {
	it("parses and walks validator paths", () => {
		expect(parsePath("projects[2].metrics[0].label")).toEqual([
			"projects",
			2,
			"metrics",
			0,
			"label",
		]);
		expect(parsePath("$")).toEqual([]);
		const doc = { a: [{ b: 1 }, { b: 2 }] };
		expect(getAt(doc, "a[1].b")).toBe(2);
		const next = setAt(doc, "a[1].b", 3);
		expect(next.a[1]?.b).toBe(3);
		expect(next.a[0]).toBe(doc.a[0]);
		expect(doc.a[1]?.b).toBe(2);
	});

	it("deletes optional keys when set to undefined", () => {
		const next = setAt({ href: "x", label: "y" }, "href", undefined);
		expect("href" in next).toBe(false);
	});

	it("matches id-bearing rows by id across documents", () => {
		const draft = {
			list: [
				{ id: "b", v: 1 },
				{ id: "a", v: 2 },
			],
		};
		const live = {
			list: [
				{ id: "a", v: 2 },
				{ id: "b", v: 1 },
			],
		};
		expect(correspondingPath(draft, live, "list[0].v")).toEqual(["list", 1, "v"]);
		expect(correspondingPath({ list: [{ id: "new" }] }, live, "list[0]")).toBeNull();
	});

	it("indexes issues with stable arrays", () => {
		const index = indexIssues([
			{ path: "projects[0].title", message: "required" },
			{ path: "projects[0].slug", message: "required" },
		]);
		expect(index.at("projects[0].title")).toHaveLength(1);
		expect(index.under("projects[0]")).toHaveLength(2);
		expect(index.under("projects[0]")).toBe(index.under("projects[0]"));
		expect(index.at("hero.title")).toBe(index.at("site.title"));
	});
});

describe("DraftStore", () => {
	it("keeps edits made while a save is in flight and saves them next", async () => {
		const first = deferred<{ ok: true; revision: number; updatedAt: string }>();
		const save = vi
			.fn<DraftApi["save"]>()
			.mockImplementationOnce(() => first.promise)
			.mockResolvedValue({ ok: true, revision: 7, updatedAt: "t2" });
		const store = new DraftStore(snapshot(), { save, publish: vi.fn() }, { autosaveDelay: 10_000 });

		store.update("hero.title", "One");
		const pending = store.save();
		await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
		store.update("hero.title", "Two");
		first.resolve({ ok: true, revision: 6, updatedAt: "t1" });
		await pending;

		expect(store.getState().draftRevision).toBe(6);
		expect(store.getState().dirty).toBe(true);
		expect(store.getState().draft.hero.title).toBe("Two");
		await store.save();
		expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ expectedRevision: 6 }));
		expect(store.getState().dirty).toBe(false);
		store.dispose();
	});

	it("saves before publishing and pins the publish to that revision", async () => {
		const save = vi
			.fn<DraftApi["save"]>()
			.mockResolvedValue({ ok: true, revision: 9, updatedAt: "t" });
		const publish = vi
			.fn<DraftApi["publish"]>()
			.mockResolvedValue({ ok: true, status: "published", revision: 9, publishedAt: "p" });
		const store = new DraftStore(snapshot(), { save, publish }, { autosaveDelay: 10_000 });
		store.update("hero.title", "Live title");
		expect(store.getState().ahead).toBe(false);
		await store.publish();
		expect(publish).toHaveBeenCalledWith({ expectedDraftRevision: 9 });
		expect(store.getState().published.hero.title).toBe("Live title");
		expect(store.getState().ahead).toBe(false);
		store.dispose();
	});

	it("pauses on conflict, keeps local edits, and can overwrite against the new revision", async () => {
		const remote = snapshot();
		remote.draftRevision = 12;
		const save = vi
			.fn<DraftApi["save"]>()
			.mockResolvedValueOnce({ ok: false, kind: "conflict", current: remote })
			.mockResolvedValue({ ok: true, revision: 13, updatedAt: "t" });
		const store = new DraftStore(snapshot(), { save, publish: vi.fn() }, { autosaveDelay: 10_000 });
		store.update("hero.title", "Mine");
		await store.save();
		expect(store.getState().status).toBe("conflict");
		expect(store.getState().draft.hero.title).toBe("Mine");
		await store.overwriteRemote();
		expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ expectedRevision: 12 }));
		expect(store.getState().draftRevision).toBe(13);
		store.dispose();
	});

	it("does not save an invalid draft", async () => {
		const save = vi.fn<DraftApi["save"]>();
		const store = new DraftStore(snapshot(), { save, publish: vi.fn() }, { autosaveDelay: 10_000 });
		store.update("projects[0].title", "");
		expect(store.getState().issues.all.length).toBeGreaterThan(0);
		expect(await store.save()).toBe(false);
		expect(save).not.toHaveBeenCalled();
		store.dispose();
	});

	it("tracks changes and reverts by row id after reordering", () => {
		const store = new DraftStore(
			snapshot(),
			{ save: vi.fn(), publish: vi.fn() },
			{ autosaveDelay: 10_000 },
		);
		const projects = store.getState().draft.projects;
		store.update("projects", [...projects].reverse());
		const last = projects.length - 1;
		expect(store.changedAt("projects[0].title")).toBe(false);
		store.update("projects[0].title", "Renamed");
		expect(store.changedAt("projects[0].title")).toBe(true);
		store.revertAt("projects[0].title");
		expect(store.getState().draft.projects[0]?.title).toBe(projects[last]?.title);
		store.dispose();
	});
});
