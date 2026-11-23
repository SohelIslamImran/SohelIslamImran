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
import { childPath, getAt, insertItem, jsonEqual, moveItem, removeItem } from "../draft/paths";
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
	scoped?: boolean;
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

interface ScopedRemoval {
	key: string;
	max: number;
	pathAt: (state: DraftState) => string | undefined;
	restore: () => number | undefined;
	dismiss: () => void;
}

type ListRemoval<T> = PendingRemoval<KeyedRow<T>> & { scoped?: ScopedRemoval };
type RemovalLists = Map<string, readonly ListRemoval<unknown>[]>;
const EMPTY_REMOVALS: readonly never[] = [];
const RemovalListsContext = createContext<{
	lists: RemovalLists;
	setLists: Dispatch<SetStateAction<RemovalLists>>;
	identities: Map<string, RowIdentity>;
} | null>(null);
const RemovalScope = createContext<{ collection: string; id: string; path: string } | null>(null);

function updateRemovals<T>(
	lists: RemovalLists,
	field: string,
	update: (current: readonly ListRemoval<T>[]) => readonly ListRemoval<T>[],
): RemovalLists {
	const current = (lists.get(field) as readonly ListRemoval<T>[] | undefined) ?? EMPTY_REMOVALS;
	const next = update(current);
	if (next === current) return lists;
	const result = new Map(lists);
	if (next.length) result.set(field, next);
	else result.delete(field);
	return result;
}

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
	const value = useMemo(() => ({ collection, id, path }), [collection, id, path]);
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
	const pending = Array.from(lists.values()).flat().reverse();
	return (
		<UndoHost.Provider value={setToasts}>
			<RemovalListsContext.Provider value={removals}>{children}</RemovalListsContext.Provider>
			{host
				? createPortal(
						<div className="cms-undo-stack pointer-events-none fixed bottom-20 z-(--z-toast) mx-auto flex max-h-[calc(100dvh-9rem)] w-fit flex-col gap-2 overflow-y-auto px-3 py-4 lg:bottom-2">
							<AnimatePresence initial={false}>
								{toasts
									.filter((toast) => !toast.scoped)
									.map((toast) => (
										<UndoToast key={toast.id} {...toast} />
									))}
								{pending.map(({ label, scoped }) =>
									scoped ? (
										<ScopedUndoToast
											key={scoped.key}
											removal={scoped}
											label={label}
											mounted={toasts.find((toast) => toast.id === scoped.key)}
										/>
									) : null,
								)}
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
	removal: { label: string; canUndo: boolean; scopeKey?: string } | null;
	onUndo: () => void;
	onDismiss: () => void;
}) {
	const setToasts = useContext(UndoHost);
	const instanceId = useId();
	const id = removal?.scopeKey ?? instanceId;
	const scoped = removal?.scopeKey !== undefined;
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
			scoped,
			label,
			canUndo,
			onUndo: () => actions.current.onUndo(),
			onDismiss: () => actions.current.onDismiss(),
		};
		setToasts((current) => [toast, ...current.filter((entry) => entry.id !== id)]);
		return () => setToasts((current) => current.filter((entry) => entry !== toast));
	}, [setToasts, id, label, canUndo, scoped]);

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
	const field = scope
		? `${scope.collection}\0${JSON.stringify(scope.id)}\0${path.slice(scope.path.length)}`
		: path;
	const setLists = host?.setLists;
	const identities = host?.identities;
	const localIdentity = useRef<RowIdentity>({ keys: [], next: 0 });
	const identity = identities?.get(field) ?? localIdentity.current;
	useLayoutEffect(() => {
		identities?.set(field, identity);
	}, [field, identities, identity]);
	const all = (host?.lists.get(field) as readonly ListRemoval<T>[] | undefined) ?? EMPTY_REMOVALS;
	const setAll = useCallback(
		(update: (current: readonly ListRemoval<T>[]) => readonly ListRemoval<T>[]) => {
			setLists?.((lists) => updateRemovals(lists, field, update));
		},
		[field, setLists],
	);
	const rowsAt = (state: DraftState) => (getAt(state.draft, path) as T[] | undefined) ?? [];
	const count = useDraftSelector((state) => rowsAt(state).length);
	const keys = Array.from({ length: count }, (_, index) => identity.keys[index] ?? identity.next++);
	identity.keys = keys;

	const rules = useMemo(
		() => ({
			max,
			same: (a: KeyedRow<T>, b: KeyedRow<T>) =>
				sameRowKey(a, b) || (!b.allowDuplicate && sameValue?.(a.value, b.value) === true),
			match: sameRowKey,
		}),
		[max, sameValue],
	);
	const back = useDraftSelector((state) => {
		if (!all.length) return "";
		const rows = keyRows(rowsAt(state), identity.keys);
		return all
			.map((removal) => (rows.some((row) => rules.same(row, removal.row)) ? "1" : "0"))
			.join("");
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
	const restoreAt = useCallback(
		(target: string, removal: ListRemoval<T>) => {
			const rows = (store.valueAt(target) as T[] | undefined) ?? [];
			const restored = restoreRemoval(keyRows(rows, identity.keys), removal, rules);
			if (!restored) return undefined;
			identity.keys = restored.rows.map((row) => row.key);
			store.update(
				target,
				restored.rows.map((row) => row.value),
			);
			return restored.index;
		},
		[identity, rules, store],
	);
	const dismiss = useCallback(
		(id: number) => setAll((current) => current.filter((removal) => removal.id !== id)),
		[setAll],
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
			setAll((current) => {
				const removal: ListRemoval<T> = createRemoval(
					before,
					index,
					label,
					current,
					sameRowKey,
					row.key,
				);
				if (scope) {
					const suffix = path.slice(scope.path.length);
					const pathAt = (state: DraftState) => {
						const items = getAt(state.draft, scope.collection) as { id: string }[];
						const position = items.findIndex((item) => item.id === scope.id);
						return position < 0 ? undefined : childPath(scope.collection, position) + suffix;
					};
					removal.scoped = {
						key: `${field}\0${removal.id}`,
						max,
						pathAt,
						restore: () => {
							const target = pathAt(store.getState());
							return target === undefined ? undefined : restoreAt(target, removal);
						},
						dismiss: () => dismiss(removal.id),
					};
				}
				return [...current, removal];
			});
		},
		[dismiss, field, identity, max, path, restoreAt, sameValue, scope, setAll, store, update],
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
			scopeKey: removal.scoped?.key,
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
			const removal = removals.find((entry) => entry.id === id);
			if (!removal) return undefined;
			const index = removal.scoped ? removal.scoped.restore() : restoreAt(path, removal);
			if (index !== undefined) dismiss(id);
			return index;
		},
		/** Undo would return the field to its live value, so Revert adds nothing. */
		restoresLive,
	};
}

function ScopedUndoToast({
	removal,
	label,
	mounted,
}: {
	removal: ScopedRemoval;
	label: string;
	mounted?: RemovalToast;
}) {
	const count = useDraftSelector((state) => {
		const path = removal.pathAt(state);
		return path === undefined
			? null
			: ((getAt(state.draft, path) as unknown[] | undefined)?.length ?? 0);
	});
	if (count === null) return null;

	// An inactive field has no focus target. Restore it in place by item ID.
	const close = () => {
		removal.dismiss();
		const back = document.querySelector<HTMLElement>(".cms-collection-back button:not(:disabled)");
		const target = back?.getClientRects().length
			? back
			: document.getElementById("cms-section-heading");
		target?.focus({ preventScroll: true });
	};
	return (
		<UndoToast
			id={removal.key}
			label={label}
			canUndo={mounted?.canUndo ?? count < removal.max}
			onUndo={
				mounted?.onUndo ??
				(() => {
					if (removal.restore() !== undefined) close();
				})
			}
			onDismiss={mounted?.onDismiss ?? close}
		/>
	);
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
