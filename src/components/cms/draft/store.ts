/**
 * The CMS draft store: one instance per CMS layout mount, created from the
 * loader snapshot. It is framework-free so it can be unit tested; React
 * subscribes through `useSyncExternalStore` with narrow selectors (see
 * `context.tsx`), so typing in one field re-renders that field only.
 *
 * Every revision-changing action (save, publish, restore, discard, conflict
 * overwrite) runs through one serial queue. A save captures the exact document
 * and expected revision it submits; edits made while it is in flight stay in
 * the draft and trigger the next save.
 */
import { validatePortfolioContent, type ValidationIssue } from "../../../lib/validation";
import type { PortfolioContent } from "../../../types/content";
import {
	correspondingPath,
	getAt,
	indexIssues,
	jsonEqual,
	parsePath,
	setAt,
	type IssueIndex,
	type PathSegment,
} from "./paths";

export interface DraftSnapshotInput {
	draft: PortfolioContent;
	published: PortfolioContent;
	draftRevision: number;
	publishedRevision: number;
	draftUpdatedAt: string;
	publishedAt: string | null;
}

export type SaveResult =
	| { ok: true; revision: number; updatedAt: string }
	| { ok: false; kind: "conflict"; current: DraftSnapshotInput };

export type PublishResult =
	| {
			ok: true;
			status: "published" | "already-published";
			revision: number;
			publishedAt: string | null;
	  }
	| { ok: false; kind: "conflict"; current: DraftSnapshotInput };

type ReplaceResult =
	| { ok: true; snapshot: DraftSnapshotInput }
	| { ok: false; kind: "conflict"; current: DraftSnapshotInput }
	| { ok: false; kind: "not-found" };

/** Outcome of `importDraft`. The working copy changes only on `saved`. */
export type ImportDraftResult =
	| { status: "saved"; revision: number }
	/** The draft changed after the owner reviewed the import. Nothing was sent. */
	| { status: "stale" }
	/** The import fails validation. Nothing was sent. */
	| { status: "invalid" }
	/** A conflict is already open. Nothing was sent. */
	| { status: "blocked" }
	/** The server holds a newer revision, or edits landed while the import was in flight. */
	| { status: "conflict" }
	/** Transport or server failure. The import may or may not have been stored. */
	| { status: "failed"; message: string; authExpired: boolean };

export interface DraftApi {
	save(input: { content: PortfolioContent; expectedRevision: number }): Promise<SaveResult>;
	publish(input: { expectedDraftRevision: number }): Promise<PublishResult>;
	restore(input: { id: number; expectedRevision: number }): Promise<ReplaceResult>;
	discard(input: {
		expectedRevision: number;
		expectedPublishedRevision: number;
	}): Promise<ReplaceResult>;
}

export type SaveStatus = "idle" | "saving" | "publishing" | "error" | "conflict";

export interface DraftState {
	draft: PortfolioContent;
	/** The document the server holds at `draftRevision`. */
	saved: PortfolioContent;
	published: PortfolioContent;
	draftRevision: number;
	publishedRevision: number;
	draftUpdatedAt: string;
	publishedAt: string | null;
	status: SaveStatus;
	/** Plain-language message for the last failure, never server internals. */
	error: string | null;
	/** True when the failure was 401/403: Access expired or the CSRF token aged out. */
	authExpired: boolean;
	/** The server's document when a save or publish hit a revision conflict. */
	conflict: DraftSnapshotInput | null;
	issues: IssueIndex;
	/** Unsaved edits exist (draft differs from what the server holds). */
	dirty: boolean;
	/** The saved draft differs from what is live. */
	ahead: boolean;
	autosave: boolean;
}

const AUTOSAVE_DELAY_MS = 1500;

function issuesFor(content: PortfolioContent): IssueIndex {
	const result = validatePortfolioContent(content);
	return indexIssues(result.ok ? [] : (result.issues as ValidationIssue[]));
}

function messageFor(error: unknown): { message: string; authExpired: boolean } {
	const status =
		error && typeof error === "object" && "status" in error
			? (error as { status?: unknown }).status
			: undefined;
	if (status === 401 || status === 403) {
		return {
			message: "Your session expired. Sign in again, then retry; your edits stay in this tab.",
			authExpired: true,
		};
	}
	if (status === 413) {
		return { message: "The document is too large to save.", authExpired: false };
	}
	if (status === 400 || status === 422) {
		return {
			message: "The server rejected the draft. Fix the flagged fields.",
			authExpired: false,
		};
	}
	return { message: "The draft could not be saved. Check your connection.", authExpired: false };
}

export class DraftStore {
	private state: DraftState;
	private listeners = new Set<() => void>();
	private queue: Promise<unknown> = Promise.resolve();
	private timer: ReturnType<typeof setTimeout> | null = null;
	private readonly api: DraftApi;
	private readonly autosaveDelay: number;

	constructor(snapshot: DraftSnapshotInput, api: DraftApi, options?: { autosaveDelay?: number }) {
		this.api = api;
		this.autosaveDelay = options?.autosaveDelay ?? AUTOSAVE_DELAY_MS;
		this.state = {
			...snapshot,
			saved: snapshot.draft,
			status: "idle",
			error: null,
			authExpired: false,
			conflict: null,
			issues: issuesFor(snapshot.draft),
			dirty: false,
			ahead: !jsonEqual(snapshot.draft, snapshot.published),
			autosave: true,
		};
	}

	// ── subscription ────────────────────────────────────────────────────────

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	getState = (): DraftState => this.state;

	private set(patch: Partial<DraftState>) {
		const next = { ...this.state, ...patch };
		if (patch.draft !== undefined && patch.draft !== this.state.draft) {
			next.issues = issuesFor(next.draft);
		}
		if (patch.draft !== undefined || patch.saved !== undefined) {
			next.dirty = !jsonEqual(next.draft, next.saved);
		}
		if (patch.saved !== undefined || patch.published !== undefined) {
			next.ahead = !jsonEqual(next.saved, next.published);
		}
		this.state = next;
		for (const listener of this.listeners) listener();
	}

	dispose() {
		if (this.timer) clearTimeout(this.timer);
		this.timer = null;
		this.listeners.clear();
	}

	// ── reads ───────────────────────────────────────────────────────────────

	valueAt(path: string): unknown {
		return getAt(this.state.draft, path);
	}

	/** The live value for a draft path, matching id-bearing rows by id. */
	liveValueAt(path: string, state: DraftState = this.state): unknown {
		const livePath = correspondingPath(state.draft, state.published, path);
		return livePath === null ? undefined : getAt(state.published, livePath);
	}

	/** True when the draft value at `path` differs from the live one. */
	changedAt(path: string, state: DraftState = this.state): boolean {
		const livePath = correspondingPath(state.draft, state.published, path);
		if (livePath === null) return true;
		return !jsonEqual(getAt(state.draft, path), getAt(state.published, livePath));
	}

	// ── edits ───────────────────────────────────────────────────────────────

	update(path: string | readonly PathSegment[], value: unknown) {
		const draft = setAt(this.state.draft, path, value);
		if (draft === this.state.draft) return;
		this.set({ draft, status: this.state.status === "error" ? "idle" : this.state.status });
		this.scheduleAutosave();
	}

	updateWith<V>(path: string, update: (current: V) => V) {
		this.update(path, update(getAt(this.state.draft, path) as V));
	}

	/**
	 * Restore the live value of one field or row. A row that does not exist on
	 * the live side has nothing to revert to and is left alone.
	 */
	revertAt(path: string) {
		const livePath = correspondingPath(this.state.draft, this.state.published, path);
		if (livePath === null) return;
		this.update(parsePath(path), structuredClone(getAt(this.state.published, livePath)));
	}

	setAutosave(enabled: boolean) {
		this.set({ autosave: enabled });
		if (enabled) this.scheduleAutosave();
		else this.cancelAutosave();
	}

	private cancelAutosave() {
		if (this.timer) clearTimeout(this.timer);
		this.timer = null;
	}

	private scheduleAutosave() {
		this.cancelAutosave();
		const { autosave, conflict, authExpired } = this.state;
		if (!autosave || conflict || authExpired) return;
		this.timer = setTimeout(() => {
			this.timer = null;
			if (this.state.issues.all.length === 0) void this.save();
		}, this.autosaveDelay);
	}

	// ── revision-changing actions (serialized) ──────────────────────────────

	private enqueue<T>(task: () => Promise<T>): Promise<T> {
		const run = this.queue.then(task, task);
		this.queue = run.catch(() => undefined);
		return run;
	}

	/** Save now. Resolves true when the server holds the current draft. */
	save(): Promise<boolean> {
		this.cancelAutosave();
		return this.enqueue(() => this.saveNow());
	}

	private async saveNow(): Promise<boolean> {
		const submitted = this.state.draft;
		if (this.state.conflict) return false;
		if (jsonEqual(submitted, this.state.saved)) {
			this.set({ saved: submitted });
			return true;
		}
		if (this.state.issues.all.length > 0) return false;
		this.set({ status: "saving", error: null });
		try {
			const result = await this.api.save({
				content: submitted,
				expectedRevision: this.state.draftRevision,
			});
			if (!result.ok) {
				this.set({ status: "conflict", conflict: result.current });
				return false;
			}
			this.set({
				saved: submitted,
				draftRevision: result.revision,
				draftUpdatedAt: result.updatedAt,
				status: "idle",
				error: null,
				authExpired: false,
			});
			// Edits made while the request was in flight get their own save.
			if (this.state.draft !== submitted) this.scheduleAutosave();
			return this.state.draft === submitted;
		} catch (error) {
			const { message, authExpired } = messageFor(error);
			this.set({ status: "error", error: message, authExpired });
			return false;
		}
	}

	/**
	 * Publish the saved draft. Unsaved edits are saved first; the publish is
	 * pinned to the revision that save produced.
	 */
	publish({ reviewedDraft }: { reviewedDraft: PortfolioContent }): Promise<boolean> {
		this.cancelAutosave();
		return this.enqueue(async () => {
			if (this.state.draft !== reviewedDraft) {
				this.scheduleAutosave();
				return false;
			}
			if (this.state.conflict || this.state.issues.all.length > 0) return false;
			if (!jsonEqual(this.state.draft, this.state.saved)) {
				const saved = await this.saveNow();
				if (!saved) return false;
			}
			const submitted = this.state.saved;
			this.set({ status: "publishing", error: null });
			try {
				const result = await this.api.publish({ expectedDraftRevision: this.state.draftRevision });
				if (!result.ok) {
					this.set({ status: "conflict", conflict: result.current });
					return false;
				}
				this.set({
					published: submitted,
					publishedRevision: result.revision,
					publishedAt: result.publishedAt,
					status: "idle",
				});
				return true;
			} catch (error) {
				const { message, authExpired } = messageFor(error);
				this.set({ status: "error", error: message, authExpired });
				return false;
			}
		});
	}

	/**
	 * Save an imported document as the next draft revision without changing
	 * the working copy until the server accepts it. `reviewedDraft` is the
	 * draft the owner compared the import against; if the draft changed since,
	 * nothing is sent. Runs in the serial queue like every other write.
	 */
	importDraft(
		content: PortfolioContent,
		reviewedDraft: PortfolioContent,
	): Promise<ImportDraftResult> {
		this.cancelAutosave();
		return this.enqueue(async (): Promise<ImportDraftResult> => {
			if (this.state.conflict) return { status: "blocked" };
			if (this.state.draft !== reviewedDraft) {
				this.scheduleAutosave();
				return { status: "stale" };
			}
			if (issuesFor(content).all.length > 0) {
				this.scheduleAutosave();
				return { status: "invalid" };
			}
			if (jsonEqual(content, this.state.saved)) {
				this.set({ draft: this.state.saved, status: "idle", error: null });
				return { status: "saved", revision: this.state.draftRevision };
			}
			this.set({ status: "saving", error: null });
			try {
				const result = await this.api.save({
					content,
					expectedRevision: this.state.draftRevision,
				});
				if (!result.ok) {
					this.set({ status: "conflict", conflict: result.current });
					return { status: "conflict" };
				}
				const snapshot: DraftSnapshotInput = {
					draft: content,
					published: this.state.published,
					draftRevision: result.revision,
					publishedRevision: this.state.publishedRevision,
					draftUpdatedAt: result.updatedAt,
					publishedAt: this.state.publishedAt,
				};
				// Edits landed while the request ran: let the owner choose which to keep.
				if (this.state.draft !== reviewedDraft) {
					this.set({ status: "conflict", conflict: snapshot });
					return { status: "conflict" };
				}
				this.adoptSnapshot(snapshot);
				return { status: "saved", revision: result.revision };
			} catch (error) {
				const { message, authExpired } = messageFor(error);
				this.set({ status: "error", error: message, authExpired });
				this.scheduleAutosave();
				return { status: "failed", message, authExpired };
			}
		});
	}

	/** Replace the confirmed draft after any in-flight save settles. */
	restore(id: number, reviewedDraft = this.state.draft): Promise<boolean> {
		return this.replaceFromServer(reviewedDraft, (expectedRevision) =>
			this.api.restore({ id, expectedRevision }),
		);
	}

	discard(
		expectedPublishedRevision = this.state.publishedRevision,
		reviewedDraft = this.state.draft,
	): Promise<boolean> {
		return this.replaceFromServer(reviewedDraft, (expectedRevision) =>
			this.api.discard({ expectedRevision, expectedPublishedRevision }),
		);
	}

	private replaceFromServer(
		reviewedDraft: PortfolioContent,
		replace: (expectedRevision: number) => Promise<ReplaceResult>,
	): Promise<boolean> {
		this.cancelAutosave();
		return this.enqueue(async () => {
			if (this.state.conflict) return false;
			if (this.state.draft !== reviewedDraft) {
				this.scheduleAutosave();
				this.set({ status: "error", error: "The draft changed. Review it and try again." });
				return false;
			}
			this.cancelAutosave();
			this.set({ status: "saving", error: null });
			try {
				const result = await replace(this.state.draftRevision);
				if (!result.ok) {
					if (result.kind === "conflict") {
						this.set({ status: "conflict", conflict: result.current });
					} else {
						this.set({ status: "error", error: "That revision could not be found." });
						this.scheduleAutosave();
					}
					return false;
				}
				// If editing resumed while the request ran, let the owner choose
				// which version to keep before autosave can overwrite either one.
				if (this.state.draft !== reviewedDraft) {
					this.set({ status: "conflict", conflict: result.snapshot });
					return false;
				}
				this.adoptSnapshot(result.snapshot);
				return true;
			} catch (error) {
				const { message, authExpired } = messageFor(error);
				this.set({
					status: "error",
					error: authExpired ? message : "The draft could not be replaced. Check your connection.",
					authExpired,
				});
				this.scheduleAutosave();
				return false;
			}
		});
	}

	/**
	 * The owner signed in again in another tab. Clear the expired session and
	 * save any unsaved edits; a new 401 or 403 marks the session expired again.
	 */
	resumeAfterSignIn(): Promise<boolean> {
		if (!this.state.authExpired) return this.save();
		this.set({
			authExpired: false,
			...(this.state.status === "error" ? { status: "idle" as const, error: null } : {}),
		});
		return this.save();
	}

	/** Conflict: drop local edits and load the server's document. */
	acceptRemote() {
		const remote = this.state.conflict;
		if (!remote) return;
		this.cancelAutosave();
		this.set({
			draft: remote.draft,
			saved: remote.draft,
			published: remote.published,
			draftRevision: remote.draftRevision,
			publishedRevision: remote.publishedRevision,
			draftUpdatedAt: remote.draftUpdatedAt,
			publishedAt: remote.publishedAt,
			conflict: null,
			status: "idle",
			error: null,
		});
	}

	/** Conflict: keep local edits and overwrite the server, checked against its new revision. */
	overwriteRemote(): Promise<boolean> {
		const remote = this.state.conflict;
		if (!remote) return Promise.resolve(false);
		this.set({
			saved: remote.draft,
			published: remote.published,
			draftRevision: remote.draftRevision,
			publishedRevision: remote.publishedRevision,
			draftUpdatedAt: remote.draftUpdatedAt,
			publishedAt: remote.publishedAt,
			conflict: null,
			status: "idle",
		});
		return this.save();
	}

	private adoptSnapshot(snapshot: DraftSnapshotInput) {
		this.cancelAutosave();
		this.set({
			...snapshot,
			saved: snapshot.draft,
			conflict: null,
			status: "idle",
			error: null,
			authExpired: false,
		});
	}
}
