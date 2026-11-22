import { AnimatePresence, motion, useIsPresent } from "motion/react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createPortal } from "react-dom";
import { useLiveReducedMotion } from "../shell/use-live-reduced-motion";
import { useDraftSelector, useDraftStore } from "../draft/context";
import { getAt, insertItem, jsonEqual, moveItem, removeItem } from "../draft/paths";
import type { DraftState } from "../draft/store";
import { REDUCED, SPRING_SURFACE } from "../motion";
import {
	createRemoval,
	replacedDraft,
	restoreAll,
	restoreRemoval,
	type PendingRemoval,
	keyRows,
	sameRowKey,
	type KeyedRow,
} from "./row-list";

export const editorButton = "cms-editor-button cms-press";

interface RemovalToast {
	id: string;
	label: string;
	canUndo: boolean;
	onUndo: () => void;
	onDismiss: () => void;
}

const UndoHost = createContext<Dispatch<SetStateAction<RemovalToast[]>> | null>(null);

interface RowIdentity {
	keys: number[];
	next: number;
}

type RemovalLists = Map<string, readonly PendingRemoval<KeyedRow<unknown>>[]>;
const EMPTY_REMOVALS: readonly never[] = [];
const RemovalListsContext = createContext<{
	lists: RemovalLists;
	setLists: Dispatch<SetStateAction<RemovalLists>>;
	identities: Map<string, RowIdentity>;
} | null>(null);
const RemovalScope = createContext<{ key: string; path: string } | null>(null);

/** Collection detail fields keep their state with the item when its index moves. */
export function UndoRemovalScope({
	collection,
	id,
	path,
	children,
}: {
	collection: string;
	id: string;
	path: string;
	children: ReactNode;
}) {
	const value = useMemo(
		() => ({ key: `${collection}\0${JSON.stringify(id)}\0`, path }),
		[collection, id, path],
	);
	return <RemovalScope.Provider value={value}>{children}</RemovalScope.Provider>;
}

/** Keep the stack outside the animated editor so it stays fixed to the viewport. */
export function UndoRemovalHost({ children }: { children: ReactNode }) {
	const [host, setHost] = useState<HTMLElement | null>(null);
	const [toasts, setToasts] = useState<RemovalToast[]>([]);
	const [lists, setLists] = useState<RemovalLists>(() => new Map());
	const [identities] = useState(() => new Map<string, RowIdentity>());
	const store = useDraftStore();
	const removals = useMemo(() => ({ lists, setLists, identities }), [lists, identities]);
	useLayoutEffect(() => {
		let previous = store.getState();
		return store.subscribe(() => {
			const next = store.getState();
			if (replacedDraft(previous, next))
				setLists((current) => (current.size ? new Map() : current));
			previous = next;
		});
	}, [store]);
	useEffect(() => setHost(document.querySelector<HTMLElement>(".cms-root") ?? document.body), []);
	return (
		<UndoHost.Provider value={setToasts}>
			<RemovalListsContext.Provider value={removals}>{children}</RemovalListsContext.Provider>
			{host
				? createPortal(
						<div className="cms-undo-stack pointer-events-none fixed inset-x-0 bottom-20 z-(--z-toast) mx-auto flex max-h-[calc(100dvh-9rem)] w-fit max-w-full flex-col gap-2 overflow-y-auto px-3 py-4 lg:bottom-2">
							<AnimatePresence initial={false}>
								{toasts.map((toast) => (
									<UndoToast key={toast.id} {...toast} />
								))}
							</AnimatePresence>
						</div>,
						host,
					)
				: null}
		</UndoHost.Provider>
	);
}

export function UndoRemoval({
	removal,
	onUndo,
	onDismiss,
}: {
	removal: { label: string; canUndo: boolean } | null;
	onUndo: () => void;
	onDismiss: () => void;
}) {
	const setToasts = useContext(UndoHost);
	const id = useId();
	const label = removal?.label;
	const canUndo = removal?.canUndo ?? false;
	const actions = useRef({ onUndo, onDismiss });
	useLayoutEffect(() => {
		actions.current = { onUndo, onDismiss };
	}, [onUndo, onDismiss]);

	useLayoutEffect(() => {
		if (!setToasts || label === undefined) return;
		const toast = {
			id,
			label,
			canUndo,
			onUndo: () => actions.current.onUndo(),
			onDismiss: () => actions.current.onDismiss(),
		};
		setToasts((current) => [toast, ...current]);
		return () => setToasts((current) => current.filter((toast) => toast.id !== id));
	}, [setToasts, id, label, canUndo]);

	return null;
}

/** Keep row identity through edits, reorders and successive removals. */
export function usePendingRemovals<T>(
	path: string,
	max: number,
	sameValue?: (a: T, b: T) => boolean,
) {
	const store = useDraftStore();
	const host = useContext(RemovalListsContext);
	const scope = useContext(RemovalScope);
	const field = scope ? scope.key + path.slice(scope.path.length) : path;
	const setLists = host?.setLists;
	const identities = host?.identities;
	const localIdentity = useRef<RowIdentity>({ keys: [], next: 0 });
	const identity = identities?.get(field) ?? localIdentity.current;
	useLayoutEffect(() => {
		identities?.set(field, identity);
	}, [field, identities, identity]);
	const all =
		(host?.lists.get(field) as readonly PendingRemoval<KeyedRow<T>>[] | undefined) ??
		EMPTY_REMOVALS;
	const setAll = useCallback(
		(
			update: (
				current: readonly PendingRemoval<KeyedRow<T>>[],
			) => readonly PendingRemoval<KeyedRow<T>>[],
		) => {
			setLists?.((lists) => {
				const current =
					(lists.get(field) as readonly PendingRemoval<KeyedRow<T>>[] | undefined) ??
					EMPTY_REMOVALS;
				const next = update(current);
				if (next === current) return lists;
				const updated = new Map(lists);
				if (next.length) updated.set(field, next);
				else updated.delete(field);
				return updated;
			});
		},
		[field, setLists],
	);
	const rowsAt = (state: DraftState) => (getAt(state.draft, path) as T[] | undefined) ?? [];
	const count = useDraftSelector((state) => rowsAt(state).length);
	const keys = Array.from({ length: count }, (_, index) => identity.keys[index] ?? identity.next++);
	identity.keys = keys;

	const same = (a: KeyedRow<T>, b: KeyedRow<T>) =>
		sameRowKey(a, b) || (!b.allowDuplicate && sameValue?.(a.value, b.value) === true);
	const rules = { max, same, match: sameRowKey };
	const back = useDraftSelector((state) => {
		if (!all.length) return "";
		const rows = keyRows(rowsAt(state), identity.keys);
		return all.map((removal) => (rows.some((row) => same(row, removal.row)) ? "1" : "0")).join("");
	});
	const restoresLive = useDraftSelector((state, store) => {
		if (!all.length) return false;
		const restored = restoreAll(keyRows(rowsAt(state), identity.keys), all, rules);
		return (
			restored !== null &&
			jsonEqual(
				restored.map((row) => row.value),
				store.liveValueAt(path, state),
			)
		);
	});
	const removals = all.filter((_, index) => back[index] !== "1");
	useEffect(() => {
		if (removals.length === all.length) return;
		const stale = all.filter((_, index) => back[index] === "1");
		setAll((current) => current.filter((removal) => !stale.includes(removal)));
	});

	const update = useCallback(
		(rows: T[], keys: number[]) => {
			identity.keys = keys;
			store.update(path, rows);
		},
		[identity, path, store],
	);
	const remove = useCallback(
		(index: number, label: string) => {
			const rows = (store.valueAt(path) as T[] | undefined) ?? [];
			if (index >= rows.length || index < 0) return;
			const { keys } = identity;
			const before = keyRows(rows, keys);
			const row = before[index]!;
			row.allowDuplicate = rows.some((value, at) => at !== index && sameValue?.(value, row.value));
			update(removeItem(rows, index), removeItem(keys, index));
			setAll((current) => [
				...current,
				createRemoval(before, index, label, current, sameRowKey, row.key),
			]);
		},
		[identity, path, sameValue, setAll, store, update],
	);
	const move = useCallback(
		(from: number, to: number) => {
			const rows = (store.valueAt(path) as T[] | undefined) ?? [];
			update(moveItem(rows, from, to), moveItem(identity.keys, from, to));
		},
		[identity, path, store, update],
	);
	const insert = useCallback(
		(index: number, row: T) => {
			const rows = (store.valueAt(path) as T[] | undefined) ?? [];
			if (rows.length >= max) return;
			update(insertItem(rows, index, row), insertItem(identity.keys, index, identity.next++));
		},
		[identity, max, path, store, update],
	);
	const dismiss = (id: number) =>
		setAll((current) => current.filter((removal) => removal.id !== id));

	return {
		keys,
		remove,
		move,
		dismiss,
		removals: removals.map((removal) => ({
			id: removal.id,
			label: removal.label,
			row: removal.row.value,
			canUndo: count < max,
		})),
		reorder(next: number[]) {
			const rows = (store.valueAt(path) as T[] | undefined) ?? [];
			const { keys } = identity;
			update(
				next.map((key) => rows[keys.indexOf(key)]!),
				next,
			);
		},
		insert,
		clear() {
			setLists?.(
				(lists) =>
					new Map([...lists].filter(([key]) => key !== field && !key.startsWith(`${field}\0`))),
			);
		},
		undo(id: number) {
			const rows = (store.valueAt(path) as T[] | undefined) ?? [];
			const removal = removals.find((entry) => entry.id === id);
			const restored = removal && restoreRemoval(keyRows(rows, identity.keys), removal, rules);
			if (!restored) return undefined;
			dismiss(id);
			update(
				restored.rows.map((row) => row.value),
				restored.rows.map((row) => row.key),
			);
			return restored.index;
		},
		/** Undo would return the field to its live value, so Revert adds nothing. */
		restoresLive,
	};
}

function UndoToast({ label, canUndo, onUndo, onDismiss }: RemovalToast) {
	const reduced = useLiveReducedMotion();
	const present = useIsPresent();
	return (
		<motion.div
			inert={!present}
			initial={{ opacity: 0, y: reduced ? 0 : 16, scale: reduced ? 1 : 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{
				opacity: 0,
				y: reduced ? 0 : 10,
				scale: reduced ? 1 : 0.98,
				transition: reduced ? REDUCED : { duration: 0.16, ease: [0.55, 0, 1, 0.45] },
			}}
			transition={reduced ? REDUCED : SPRING_SURFACE}
			className="cms-panel cms-undo pointer-events-auto flex max-w-full shrink-0 flex-wrap items-center gap-2 p-2 shadow-md"
		>
			<p role="status" className="m-0 min-w-0 max-w-[55ch] wrap-anywhere px-2 text-[13px]">
				Removed {label}.{canUndo ? "" : " Make room in the list to undo."}
			</p>
			<button
				type="button"
				className={`${editorButton} cms-editor-primary`}
				onClick={onUndo}
				disabled={!canUndo}
			>
				Undo
			</button>
			<button type="button" className={editorButton} onClick={onDismiss}>
				Dismiss
			</button>
		</motion.div>
	);
}
