import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useSyncExternalStore,
	type ReactNode,
} from "react";
import type { CmsBuildInfo } from "../../../lib/cloudflare-dashboard";
import type { ValidationIssue } from "../../../lib/validation";
import { withCsrfRetry } from "../shell/session-refresh";
import { DraftStore, type DraftApi, type DraftSnapshotInput, type DraftState } from "./store";

export interface CmsSession {
	csrfToken: string;
	owner: string;
	mediaEnabled: boolean;
	/**
	 * Public portfolio origin (derived from `APP_ORIGIN` on the server). Optional
	 * so test sessions can omit it; read it through `usePublicOrigin()`.
	 */
	publicOrigin?: string;
	/** The running Worker version (version metadata binding), when known. */
	build?: CmsBuildInfo | null;
}

interface CmsContextValue {
	store: DraftStore;
	session: CmsSession;
	/** Read the active token even before React commits a session refresh. */
	readCsrfToken: () => string;
	/**
	 * Re-read the owner session (a fresh CSRF token) without touching the
	 * draft. Resolves true when a new session for the same owner was adopted.
	 */
	refreshSession: () => Promise<boolean>;
}

const CmsDraftContext = createContext<CmsContextValue | null>(null);

const NO_REFRESH = () => Promise.resolve(false);

/**
 * One store per CMS layout mount. The store is created once from the loader
 * snapshot; later loader refreshes do not replace local edits. `session` is
 * reactive: a refreshed CSRF token reaches every consumer, while the store
 * instance never changes.
 */
export function CmsDraftProvider({
	snapshot,
	session,
	api,
	refreshSession,
	readCsrfToken,
	children,
}: {
	snapshot: DraftSnapshotInput;
	session: CmsSession;
	api: DraftApi;
	/** Supplied by the layout route. Optional so tests can omit it. */
	refreshSession?: () => Promise<boolean>;
	readCsrfToken?: () => string;
	children: ReactNode;
}) {
	const apiRef = useRef(api);
	apiRef.current = api;
	const refreshRef = useRef(refreshSession);
	refreshRef.current = refreshSession;
	const storeRef = useRef<DraftStore | null>(null);
	if (storeRef.current === null) {
		storeRef.current = new DraftStore(snapshot, {
			save: (input) => apiRef.current.save(input),
			publish: (input) => apiRef.current.publish(input),
			restore: (input) => apiRef.current.restore(input),
			discard: (input) => apiRef.current.discard(input),
		});
	}
	const store = storeRef.current;
	const refresh = useCallback(() => (refreshRef.current ?? NO_REFRESH)(), []);
	const value = useMemo<CmsContextValue>(
		() => ({
			store,
			session,
			refreshSession: refresh,
			readCsrfToken: readCsrfToken ?? (() => session.csrfToken),
		}),
		[store, session, refresh, readCsrfToken],
	);

	useEffect(() => () => store.dispose(), [store]);

	// Leaving the CMS (closing the tab, typing another URL) with work that
	// the server does not hold yet asks first.
	useEffect(() => {
		const onBeforeUnload = (event: BeforeUnloadEvent) => {
			const state = store.getState();
			if (state.dirty || state.status === "saving" || state.status === "publishing") {
				event.preventDefault();
			}
		};
		window.addEventListener("beforeunload", onBeforeUnload);
		return () => window.removeEventListener("beforeunload", onBeforeUnload);
	}, [store]);

	return <CmsDraftContext.Provider value={value}>{children}</CmsDraftContext.Provider>;
}

function useCmsContext(): CmsContextValue {
	const value = useContext(CmsDraftContext);
	if (!value) throw new Error("CMS draft hooks must be used inside <CmsDraftProvider>.");
	return value;
}

export function useDraftStore(): DraftStore {
	return useCmsContext().store;
}

export function useCmsSession(): CmsSession {
	return useCmsContext().session;
}

/** Public portfolio origin for links and publish copy (falls back to production). */
export function usePublicOrigin(): string {
	return useCmsContext().session.publicOrigin ?? "https://sohelislamimran.com";
}

/** Refresh the owner session in place (new CSRF token); the draft is untouched. */
export function useRefreshCmsSession(): () => Promise<boolean> {
	return useCmsContext().refreshSession;
}

export function useCsrfRetry() {
	const { readCsrfToken, refreshSession } = useCmsContext();
	return <T,>(call: (csrfToken: string) => Promise<T>) =>
		withCsrfRetry(call, readCsrfToken, refreshSession);
}

/**
 * Subscribe to a slice of draft state. The result is cached per store state,
 * and a new result that is shallow-equal to the previous one keeps the
 * previous reference, so selectors may return small objects or arrays
 * without looping `useSyncExternalStore` or re-rendering on unrelated edits.
 */
export function useDraftSelector<T>(selector: (state: DraftState, store: DraftStore) => T): T {
	const store = useDraftStore();
	const cache = useRef<{ state: DraftState; selector: unknown; value: T } | null>(null);
	const getSnapshot = () => {
		const state = store.getState();
		const previous = cache.current;
		if (previous && previous.state === state && previous.selector === selector) {
			return previous.value;
		}
		const next = selector(state, store);
		const value = previous && shallowEqual(previous.value, next) ? previous.value : next;
		cache.current = { state, selector, value };
		return value;
	};
	return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

function shallowEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;
	if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
	if (Array.isArray(a) !== Array.isArray(b)) return false;
	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((item, index) => Object.is(item, b[index]));
	}
	const left = a as Record<string, unknown>;
	const right = b as Record<string, unknown>;
	const keys = Object.keys(left);
	if (keys.length !== Object.keys(right).length) return false;
	return keys.every((key) => Object.is(left[key], right[key]));
}

export function useDraftValue<T = unknown>(path: string): T {
	return useDraftSelector((_state, store) => store.valueAt(path) as T);
}

export function useIssuesAt(path: string): readonly ValidationIssue[] {
	return useDraftSelector((state) => state.issues.at(path));
}

export function useIssuesUnder(path: string): readonly ValidationIssue[] {
	return useDraftSelector((state) => state.issues.under(path));
}

export function useChangedAt(path: string): boolean {
	return useDraftSelector((state, store) => store.changedAt(path, state));
}

export interface FieldBinding<T> {
	path: string;
	value: T;
	issues: readonly ValidationIssue[];
	changed: boolean;
	set: (value: T) => void;
	revert: () => void;
}

/** Everything a field control needs for one path. */
export function useField<T = unknown>(path: string): FieldBinding<T> {
	const store = useDraftStore();
	const value = useDraftValue<T>(path);
	const issues = useIssuesAt(path);
	const changed = useChangedAt(path);
	const set = useCallback((next: T) => store.update(path, next), [store, path]);
	const revert = useCallback(() => store.revertAt(path), [store, path]);
	return { path, value, issues, changed, set, revert };
}
