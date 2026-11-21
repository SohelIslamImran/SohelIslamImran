import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useSyncExternalStore,
	type ReactNode,
} from "react";
import type { ValidationIssue } from "../../../lib/validation";
import { DraftStore, type DraftApi, type DraftSnapshotInput, type DraftState } from "./store";

export interface CmsSession {
	csrfToken: string;
	owner: string;
	mediaEnabled: boolean;
}

interface CmsContextValue {
	store: DraftStore;
	session: CmsSession;
}

const CmsDraftContext = createContext<CmsContextValue | null>(null);

/**
 * One store per CMS layout mount. The store is created once from the loader
 * snapshot; later loader refreshes do not replace local edits.
 */
export function CmsDraftProvider({
	snapshot,
	session,
	api,
	children,
}: {
	snapshot: DraftSnapshotInput;
	session: CmsSession;
	api: DraftApi;
	children: ReactNode;
}) {
	const apiRef = useRef(api);
	apiRef.current = api;
	const valueRef = useRef<CmsContextValue | null>(null);
	if (valueRef.current === null) {
		valueRef.current = {
			store: new DraftStore(snapshot, {
				save: (input) => apiRef.current.save(input),
				publish: (input) => apiRef.current.publish(input),
			}),
			session,
		};
	}
	const { store } = valueRef.current;

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

	return <CmsDraftContext.Provider value={valueRef.current}>{children}</CmsDraftContext.Provider>;
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

/**
 * Subscribe to a slice of draft state. The selector must return a stable
 * value (a primitive, or a reference held by the state) or it re-renders on
 * every store change.
 */
export function useDraftSelector<T>(selector: (state: DraftState, store: DraftStore) => T): T {
	const store = useDraftStore();
	const getSnapshot = () => selector(store.getState(), store);
	return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
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
