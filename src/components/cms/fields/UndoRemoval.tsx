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
import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../lib/utils";
import { useLiveReducedMotion } from "../shell/use-live-reduced-motion";
import { useDraftSelector, useDraftStore } from "../draft/context";
import { childPath, getAt, insertItem, jsonEqual, moveItem, removeItem } from "../draft/paths";
import type { DraftState } from "../draft/store";
import { REDUCED, SPRING_MOVE } from "../motion";
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
import { stackSlot } from "./undo-stack";

export const editorButton = "cms-editor-button cms-press";

interface RemovalToast {
	id: string;
	/** Removal order across every field, newest highest, so the deck leads with the latest. */
	seq: number;
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

type ListRemoval<T> = PendingRemoval<KeyedRow<T>> & { seq: number; scoped?: ScopedRemoval };

let removalSequence = 0;
const nextRemovalSeq = () => ++removalSequence;
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

function focusFallbackAfterScopedClose() {
	const back = document.querySelector<HTMLElement>(".cms-collection-back button:not(:disabled)");
	const target = back?.getClientRects().length
		? back
		: document.getElementById("cms-section-heading");
	target?.focus({ preventScroll: true });
}

/** Keep the stack outside the animated editor so it stays fixed to the viewport. */
export function UndoRemovalHost({ children }: { children: ReactNode }) {
	const [host, setHost] = useState<HTMLElement | null>(null);
	const [toasts, setToasts] = useState<RemovalToast[]>([]);
	const [lists, setLists] = useState<RemovalLists>(() => new Map());
	const [identities] = useState(() => new Map<string, RowIdentity>());
	const [expanded, setExpanded] = useState(false);
	const [hovered, setHovered] = useState(false);
	const stackId = useId();
	const toggleRef = useRef<HTMLButtonElement>(null);
	const reduced = useLiveReducedMotion();
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
	// Read scoped availability as a primitive string so unrelated edits don't re-render the host.
	const scopedCounts = useDraftSelector((state) => {
		if (pending.length === 0) return "";
		return pending
			.map(({ scoped }) => {
				if (!scoped) return "";
				const targetPath = scoped.pathAt(state);
				if (targetPath === undefined) return "x";
				return String((getAt(state.draft, targetPath) as unknown[] | undefined)?.length ?? 0);
			})
			.join(",");
	});
	const counts = scopedCounts ? scopedCounts.split(",") : [];

	const deckItems: RemovalToast[] = [
		...toasts.filter((toast) => !toast.scoped),
		...pending.flatMap(({ label, scoped, seq }, index) => {
			if (!scoped) return [];
			const rawCount = counts[index];
			if (rawCount === undefined || rawCount === "" || rawCount === "x") return [];
			const count = Number(rawCount);
			const mounted = toasts.find((toast) => toast.id === scoped.key);
			const close = () => {
				scoped.dismiss();
				focusFallbackAfterScopedClose();
			};
			return [
				{
					id: scoped.key,
					seq,
					label,
					canUndo: mounted?.canUndo ?? count < scoped.max,
					onUndo:
						mounted?.onUndo ??
						(() => {
							if (scoped.restore() !== undefined) close();
						}),
					onDismiss: mounted?.onDismiss ?? close,
				},
			];
		}),
	];

	deckItems.sort((a, b) => b.seq - a.seq);
	const total = deckItems.length;
	const isExpanded = expanded && total > 1;
	const isCollapsed = total > 1 && !isExpanded;

	useEffect(() => {
		if (total <= 1 && expanded) setExpanded(false);
		if (total <= 1 && hovered) setHovered(false);
	}, [expanded, hovered, total]);

	const toggleExpanded = useCallback(() => {
		setExpanded((current) => {
			const next = !current;
			if (next) setHovered(false);
			return next;
		});
	}, []);

	return (
		<UndoHost.Provider value={setToasts}>
			<RemovalListsContext.Provider value={removals}>{children}</RemovalListsContext.Provider>
			{host
				? createPortal(
						<div
							id={stackId}
							data-collapsed={isCollapsed || undefined}
							data-expanded={isExpanded || undefined}
							onPointerEnter={(event) => {
								if (isCollapsed && event.pointerType === "mouse") setHovered(true);
							}}
							onPointerLeave={() => setHovered(false)}
							onKeyDown={(event) => {
								if (event.key !== "Escape" || !isExpanded) return;
								event.preventDefault();
								event.stopPropagation();
								setExpanded(false);
								requestAnimationFrame(() => toggleRef.current?.focus({ preventScroll: true }));
							}}
							className={cn(
								"cms-undo-stack pointer-events-none fixed bottom-20 z-(--z-toast) mx-auto flex max-h-[calc(100dvh-9rem)] w-fit flex-col gap-2 px-3 pb-4 lg:bottom-2",
								isCollapsed ? "pt-7 overflow-visible" : "pt-4 overflow-y-auto",
							)}
						>
							<div
								className={cn(
									"cms-undo-deck",
									isCollapsed ? "relative" : "flex flex-col-reverse gap-2",
								)}
							>
								<AnimatePresence initial={false}>
									{deckItems.map((toast, index) => (
										<UndoToast
											key={toast.id}
											toast={toast}
											index={index}
											total={total}
											expanded={isExpanded}
											spread={isCollapsed && hovered && !reduced}
											stackId={stackId}
											toggleRef={index === 0 ? toggleRef : undefined}
											onToggleExpanded={index === 0 && total > 1 ? toggleExpanded : undefined}
										/>
									))}
								</AnimatePresence>
							</div>
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
	removal: { label: string; canUndo: boolean; seq?: number; scopeKey?: string } | null;
	onUndo: () => void;
	onDismiss: () => void;
}) {
	const setToasts = useContext(UndoHost);
	const instanceId = useId();
	const id = removal?.scopeKey ?? instanceId;
	const scoped = removal?.scopeKey !== undefined;
	const label = removal?.label;
	const canUndo = removal?.canUndo ?? false;
	const seq = removal?.seq ?? 0;
	const actions = useRef({ onUndo, onDismiss });
	useLayoutEffect(() => {
		actions.current = { onUndo, onDismiss };
	}, [onUndo, onDismiss]);

	useLayoutEffect(() => {
		if (!setToasts || label === undefined) return;
		const toast = {
			id,
			seq,
			scoped,
			label,
			canUndo,
			onUndo: () => actions.current.onUndo(),
			onDismiss: () => actions.current.onDismiss(),
		};
		setToasts((current) => [toast, ...current.filter((entry) => entry.id !== id)]);
		return () => setToasts((current) => current.filter((entry) => entry !== toast));
	}, [setToasts, id, label, canUndo, scoped, seq]);

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
				const removal: ListRemoval<T> = {
					...createRemoval(before, index, label, current, sameRowKey, row.key),
					seq: nextRemovalSeq(),
				};
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
			seq: removal.seq,
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

function UndoToast({
	toast,
	index,
	total,
	expanded,
	spread,
	stackId,
	toggleRef,
	onToggleExpanded,
}: {
	toast: RemovalToast;
	index: number;
	total: number;
	expanded: boolean;
	spread: boolean;
	stackId: string;
	toggleRef?: RefObject<HTMLButtonElement | null>;
	onToggleExpanded?: () => void;
}) {
	const reduced = useLiveReducedMotion();
	const present = useIsPresent();
	const slot = stackSlot(index, total, expanded, spread);
	const stackedBehind = total > 1 && !expanded && index > 0;
	const target =
		reduced && stackedBehind
			? { opacity: 0, y: 0, scale: 1 }
			: {
					opacity: slot.opacity,
					y: reduced ? 0 : slot.y,
					scale: reduced ? 1 : slot.scale,
				};

	return (
		<motion.div
			layout={reduced ? false : "position"}
			inert={!present || !slot.interactive}
			aria-hidden={!slot.interactive || undefined}
			data-stacked={stackedBehind || undefined}
			style={{ zIndex: total - index }}
			initial={{ opacity: 0, y: reduced ? 0 : 16, scale: reduced ? 1 : 0.98 }}
			animate={target}
			exit={{
				opacity: 0,
				y: reduced ? 0 : 10,
				scale: reduced ? 1 : 0.98,
				transition: reduced ? REDUCED : { duration: 0.16, ease: [0.55, 0, 1, 0.45] },
			}}
			transition={reduced ? REDUCED : SPRING_MOVE}
			className={cn(
				"cms-panel cms-undo max-w-full shrink-0 items-center gap-2 p-2 shadow-md",
				total > 1 ? "grid grid-cols-[auto_auto_minmax(0,1fr)]" : "flex flex-wrap",
				expanded && "w-full",
				expanded && index > 0 && "[contain:inline-size]",
				slot.interactive ? "pointer-events-auto relative" : "pointer-events-none",
				stackedBehind && "cms-undo-behind",
			)}
		>
			<p
				role={slot.interactive ? "status" : undefined}
				className={cn(
					"m-0 min-w-0 max-w-[55ch] wrap-anywhere px-2 text-[13px]",
					total > 1 && "col-span-full",
				)}
			>
				Removed {toast.label}.{toast.canUndo ? "" : " Make room in the list to undo."}
			</p>
			<button
				type="button"
				className={`${editorButton} cms-editor-primary`}
				onClick={toast.onUndo}
				disabled={!toast.canUndo}
			>
				Undo
			</button>
			<button type="button" className={editorButton} onClick={toast.onDismiss}>
				Dismiss
			</button>
			{onToggleExpanded ? (
				<button
					ref={toggleRef}
					type="button"
					className={cn(editorButton, "justify-self-end whitespace-nowrap")}
					aria-expanded={expanded}
					aria-controls={stackId}
					onClick={onToggleExpanded}
				>
					{expanded ? "Show less" : `${total - 1} more`}
				</button>
			) : null}
		</motion.div>
	);
}
