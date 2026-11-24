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

function mockApi(overrides: Partial<DraftApi> = {}): DraftApi {
	return { save: vi.fn(), publish: vi.fn(), restore: vi.fn(), discard: vi.fn(), ...overrides };
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

	it("refuses a row or field match when either side has duplicate IDs", () => {
		const single = { list: [{ id: "x", title: "Live" }] };
		const duplicate = { list: [...single.list, { id: "x", title: "Second" }] };
		expect(correspondingPath(duplicate, single, "list[0].title")).toBeNull();
		expect(correspondingPath(duplicate, single, "list[1].title")).toBeNull();
		expect(correspondingPath(single, duplicate, "list[0]")).toBeNull();
		expect(correspondingPath(single, duplicate, "list")).toEqual(["list"]);
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
		const store = new DraftStore(snapshot(), mockApi({ save }), { autosaveDelay: 10_000 });

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
		const store = new DraftStore(snapshot(), mockApi({ save, publish }), { autosaveDelay: 10_000 });
		store.update("hero.title", "Live title");
		expect(store.getState().ahead).toBe(false);
		await store.publish({ reviewedDraft: store.getState().draft });
		expect(publish).toHaveBeenCalledWith({ expectedDraftRevision: 9 });
		expect(store.getState().published.hero.title).toBe("Live title");
		expect(store.getState().ahead).toBe(false);
		store.dispose();
	});

	it("rejects a publish confirmation when edits happened before the queued publish", async () => {
		const publish = vi.fn<DraftApi["publish"]>();
		const store = new DraftStore(snapshot(), mockApi({ publish }));
		const reviewedDraft = store.getState().draft;
		const action = store.publish({ reviewedDraft });
		store.update("hero.title", "Edited after review");
		expect(await action).toBe(false);
		expect(publish).not.toHaveBeenCalled();
		store.dispose();
	});

	it("does not publish a reviewed snapshot if new edits arrive while saving it", async () => {
		const pending = deferred<Awaited<ReturnType<DraftApi["save"]>>>();
		const save = vi.fn<DraftApi["save"]>().mockReturnValue(pending.promise);
		const publish = vi.fn<DraftApi["publish"]>();
		const store = new DraftStore(snapshot(), mockApi({ save, publish }));
		store.update("hero.title", "Reviewed");
		const action = store.publish({ reviewedDraft: store.getState().draft });
		await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
		store.update("hero.title", "Later edit");
		pending.resolve({ ok: true, revision: 6, updatedAt: "t" });
		expect(await action).toBe(false);
		expect(publish).not.toHaveBeenCalled();
		expect(store.valueAt("hero.title")).toBe("Later edit");
		store.dispose();
	});

	it.each(["restore", "discard"] as const)("queues %s behind an in-flight save", async (method) => {
		const pending = deferred<Awaited<ReturnType<DraftApi["save"]>>>();
		const save = vi.fn<DraftApi["save"]>().mockReturnValue(pending.promise);
		const replacement = snapshot();
		replacement.draftRevision = 7;
		const replace = vi
			.fn<DraftApi["restore"] | DraftApi["discard"]>()
			.mockResolvedValue({ ok: true, snapshot: replacement });
		const store = new DraftStore(snapshot(), mockApi({ save, [method]: replace }));
		store.update("hero.title", "A title to save");
		const saving = store.save();
		await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
		const replacing = method === "restore" ? store.restore(20) : store.discard(5);
		expect(replace).not.toHaveBeenCalled();
		pending.resolve({ ok: true, revision: 6, updatedAt: "t" });
		await saving;
		expect(await replacing).toBe(true);
		expect(replace).toHaveBeenCalledWith(
			method === "restore"
				? { id: 20, expectedRevision: 6 }
				: { expectedPublishedRevision: 5, expectedRevision: 6 },
		);
		expect(store.getState()).toMatchObject({ status: "idle", draftRevision: 7, dirty: false });
		expect(store.getState().draft).toBe(replacement.draft);
		store.dispose();
	});

	it.each(["restore", "discard"] as const)(
		"keeps unsaved edits on a %s conflict",
		async (method) => {
			const remote = snapshot();
			remote.draftRevision = 6;
			const replace = vi.fn().mockResolvedValue({ ok: false, kind: "conflict", current: remote });
			const store = new DraftStore(snapshot(), mockApi({ [method]: replace }));
			store.update("hero.title", "Keep this");
			expect(await (method === "restore" ? store.restore(10) : store.discard(5))).toBe(false);
			expect(store.getState()).toMatchObject({ status: "conflict", conflict: remote, dirty: true });
			expect(store.valueAt("hero.title")).toBe("Keep this");
			store.dispose();
		},
	);

	it("requires fresh confirmation when new edits arrive before a discard starts", async () => {
		const discard = vi.fn<DraftApi["discard"]>();
		const store = new DraftStore(snapshot(), mockApi({ discard }));
		const confirmedDraft = store.getState().draft;
		store.update("hero.title", "Edited after confirmation opened");
		expect(await store.discard(5, confirmedDraft)).toBe(false);
		expect(discard).not.toHaveBeenCalled();
		expect(store.getState().dirty).toBe(true);
		store.dispose();
	});

	it("holds edits made during a replacement for the conflict dialog", async () => {
		const pending = deferred<Awaited<ReturnType<DraftApi["restore"]>>>();
		const restore = vi.fn<DraftApi["restore"]>().mockReturnValue(pending.promise);
		const store = new DraftStore(snapshot(), mockApi({ restore }));
		const action = store.restore(20);
		await vi.waitFor(() => expect(restore).toHaveBeenCalledOnce());
		store.update("hero.title", "New typing");
		const restored = snapshot();
		restored.draftRevision = 6;
		pending.resolve({ ok: true, snapshot: restored });
		expect(await action).toBe(false);
		expect(store.getState().conflict).toBe(restored);
		expect(store.valueAt("hero.title")).toBe("New typing");
		store.dispose();
	});

	it("pauses on conflict, keeps local edits, and can overwrite against the new revision", async () => {
		const remote = snapshot();
		remote.draftRevision = 12;
		const save = vi
			.fn<DraftApi["save"]>()
			.mockResolvedValueOnce({ ok: false, kind: "conflict", current: remote })
			.mockResolvedValue({ ok: true, revision: 13, updatedAt: "t" });
		const store = new DraftStore(snapshot(), mockApi({ save }), { autosaveDelay: 10_000 });
		store.update("hero.title", "Mine");
		await store.save();
		expect(store.getState().status).toBe("conflict");
		expect(store.getState().draft.hero.title).toBe("Mine");
		await store.overwriteRemote();
		expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ expectedRevision: 12 }));
		expect(store.getState().draftRevision).toBe(13);
		store.dispose();
	});

	it("retries a save after the owner signs in again", async () => {
		const save = vi
			.fn<DraftApi["save"]>()
			.mockRejectedValueOnce(Object.assign(new Error("expired"), { status: 401 }))
			.mockResolvedValue({ ok: true, revision: 6, updatedAt: "t" });
		const store = new DraftStore(snapshot(), mockApi({ save }), { autosaveDelay: 10_000 });
		store.update("hero.title", "Kept");
		expect(await store.save()).toBe(false);
		expect(store.getState().authExpired).toBe(true);
		expect(store.getState().status).toBe("error");
		expect(await store.resumeAfterSignIn()).toBe(true);
		expect(store.getState()).toMatchObject({
			authExpired: false,
			status: "idle",
			error: null,
			dirty: false,
			draftRevision: 6,
		});
		store.dispose();
	});

	it("does not save an invalid draft", async () => {
		const save = vi.fn<DraftApi["save"]>();
		const store = new DraftStore(snapshot(), mockApi({ save }), { autosaveDelay: 10_000 });
		store.update("projects[0].title", "");
		expect(store.getState().issues.all.length).toBeGreaterThan(0);
		expect(await store.save()).toBe(false);
		expect(save).not.toHaveBeenCalled();
		store.dispose();
	});

	it("tracks changes and reverts by row id after reordering", () => {
		const store = new DraftStore(snapshot(), mockApi(), { autosaveDelay: 10_000 });
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

	it("accepts already-published when retrying a publish after a lost acknowledgement", async () => {
		const publish = vi
			.fn<DraftApi["publish"]>()
			.mockRejectedValueOnce(new Error("network dropped"))
			.mockResolvedValueOnce({
				ok: true,
				status: "already-published",
				revision: 6,
				publishedAt: "2026-11-02T00:00:00.000Z",
			});
		const initial = snapshot();
		initial.draft.hero.title = "Ready to go live";
		initial.draftRevision = 6;
		const store = new DraftStore(initial, mockApi({ publish }), { autosaveDelay: 10_000 });
		const reviewedDraft = store.getState().draft;

		expect(store.getState().ahead).toBe(true);
		expect(await store.publish({ reviewedDraft })).toBe(false);
		expect(store.getState()).toMatchObject({ status: "error", ahead: true, publishedRevision: 5 });

		expect(await store.publish({ reviewedDraft })).toBe(true);
		expect(publish).toHaveBeenCalledTimes(2);
		expect(publish).toHaveBeenLastCalledWith({ expectedDraftRevision: 6 });
		expect(store.getState()).toMatchObject({
			status: "idle",
			error: null,
			ahead: false,
			publishedRevision: 6,
			publishedAt: "2026-11-02T00:00:00.000Z",
		});
		expect(store.getState().published.hero.title).toBe("Ready to go live");
		store.dispose();
	});
});

describe("DraftStore.importDraft", () => {
	function editedContent(title: string): PortfolioContent {
		const next = structuredClone(initialContent);
		next.hero.title = title;
		return next;
	}

	it("adopts the imported snapshot only after the server accepts it", async () => {
		const pending = deferred<Awaited<ReturnType<DraftApi["save"]>>>();
		const save = vi.fn<DraftApi["save"]>().mockReturnValue(pending.promise);
		const store = new DraftStore(snapshot(), mockApi({ save }), { autosaveDelay: 10_000 });
		const reviewedDraft = store.getState().draft;
		const imported = editedContent("Imported headline");

		const action = store.importDraft(imported, reviewedDraft);
		await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
		// Working copy stays untouched while the save is in flight.
		expect(store.getState().draft).toBe(reviewedDraft);
		expect(store.getState().status).toBe("saving");
		expect(save).toHaveBeenCalledWith({ content: imported, expectedRevision: 5 });

		pending.resolve({ ok: true, revision: 6, updatedAt: "2026-11-02T00:00:00.000Z" });
		expect(await action).toEqual({ status: "saved", revision: 6 });
		expect(store.getState()).toMatchObject({
			status: "idle",
			dirty: false,
			ahead: true,
			draftRevision: 6,
			draftUpdatedAt: "2026-11-02T00:00:00.000Z",
			error: null,
			conflict: null,
		});
		expect(store.getState().draft).toBe(imported);
		expect(store.getState().saved).toBe(imported);
		store.dispose();
	});

	it("returns stale without a network call when the draft changed after review", async () => {
		const save = vi.fn<DraftApi["save"]>();
		const store = new DraftStore(snapshot(), mockApi({ save }), { autosaveDelay: 10_000 });
		const reviewedDraft = store.getState().draft;
		store.update("hero.title", "Local edit after preview");

		expect(await store.importDraft(editedContent("Imported"), reviewedDraft)).toEqual({
			status: "stale",
		});
		expect(save).not.toHaveBeenCalled();
		expect(store.valueAt("hero.title")).toBe("Local edit after preview");
		store.dispose();
	});

	it("returns invalid without a network call when the imported content fails validation", async () => {
		const save = vi.fn<DraftApi["save"]>();
		const store = new DraftStore(snapshot(), mockApi({ save }), { autosaveDelay: 10_000 });
		const reviewedDraft = store.getState().draft;
		const invalid = editedContent("Valid hero");
		invalid.projects[0]!.title = "";

		expect(await store.importDraft(invalid, reviewedDraft)).toEqual({ status: "invalid" });
		expect(save).not.toHaveBeenCalled();
		expect(store.getState().draft).toBe(reviewedDraft);
		store.dispose();
	});

	it("leaves the working copy alone and sets conflict when the server holds a newer revision", async () => {
		const remote = snapshot();
		remote.draftRevision = 8;
		remote.draft.hero.title = "Remote headline";
		const save = vi
			.fn<DraftApi["save"]>()
			.mockResolvedValue({ ok: false, kind: "conflict", current: remote });
		const store = new DraftStore(snapshot(), mockApi({ save }), { autosaveDelay: 10_000 });
		store.update("hero.title", "Unsaved local copy");
		const reviewedDraft = store.getState().draft;

		expect(await store.importDraft(editedContent("Imported"), reviewedDraft)).toEqual({
			status: "conflict",
		});
		expect(store.getState()).toMatchObject({
			status: "conflict",
			conflict: remote,
			dirty: true,
		});
		expect(store.getState().draft).toBe(reviewedDraft);
		expect(store.valueAt("hero.title")).toBe("Unsaved local copy");
		store.dispose();
	});

	it("leaves the working copy alone and sets error on a transport failure", async () => {
		const save = vi.fn<DraftApi["save"]>().mockRejectedValue(new Error("offline"));
		const store = new DraftStore(snapshot(), mockApi({ save }), { autosaveDelay: 10_000 });
		store.update("hero.title", "Pre-import draft");
		const reviewedDraft = store.getState().draft;

		const result = await store.importDraft(editedContent("Imported"), reviewedDraft);
		expect(result).toEqual({
			status: "failed",
			message: "The draft could not be saved. Check your connection.",
			authExpired: false,
		});
		expect(store.getState()).toMatchObject({
			status: "error",
			error: "The draft could not be saved. Check your connection.",
			authExpired: false,
			dirty: true,
		});
		expect(store.getState().draft).toBe(reviewedDraft);
		expect(store.valueAt("hero.title")).toBe("Pre-import draft");
		store.dispose();
	});

	it("produces a conflict with the import as the server copy when edits land in flight", async () => {
		const pending = deferred<Awaited<ReturnType<DraftApi["save"]>>>();
		const save = vi.fn<DraftApi["save"]>().mockReturnValue(pending.promise);
		const store = new DraftStore(snapshot(), mockApi({ save }), { autosaveDelay: 10_000 });
		const reviewedDraft = store.getState().draft;
		const imported = editedContent("Imported copy");

		const action = store.importDraft(imported, reviewedDraft);
		await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
		store.update("hero.title", "Typed while importing");
		pending.resolve({ ok: true, revision: 6, updatedAt: "2026-11-02T00:00:00.000Z" });

		expect(await action).toEqual({ status: "conflict" });
		expect(store.valueAt("hero.title")).toBe("Typed while importing");
		expect(store.getState().status).toBe("conflict");
		expect(store.getState().conflict).toMatchObject({
			draft: imported,
			draftRevision: 6,
			draftUpdatedAt: "2026-11-02T00:00:00.000Z",
		});
		store.dispose();
	});

	it("returns blocked without a network call while a conflict is already open", async () => {
		const remote = snapshot();
		remote.draftRevision = 9;
		const save = vi
			.fn<DraftApi["save"]>()
			.mockResolvedValueOnce({ ok: false, kind: "conflict", current: remote });
		const store = new DraftStore(snapshot(), mockApi({ save }), { autosaveDelay: 10_000 });
		store.update("hero.title", "Local conflict");
		await store.save();
		expect(store.getState().status).toBe("conflict");

		const reviewedDraft = store.getState().draft;
		expect(await store.importDraft(editedContent("Imported"), reviewedDraft)).toEqual({
			status: "blocked",
		});
		expect(save).toHaveBeenCalledTimes(1);
		expect(store.getState().conflict).toBe(remote);
		store.dispose();
	});
});
