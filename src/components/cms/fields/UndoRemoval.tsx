import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createPortal } from "react-dom";
import { useDraftSelector, useDraftStore } from "../draft/context";
import { getAt, jsonEqual } from "../draft/paths";
import type { DraftState } from "../draft/store";
import { REDUCED, SPRING_SURFACE } from "../motion";
import {
	createRemoval,
	replacedDraft,
	restoreAll,
	restoreRemoval,
	type PendingRemoval,
	type RemovalRules,
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

/** Keep the stack outside the animated editor so it stays fixed to the viewport. */
export function UndoRemovalHost({ children }: { children: ReactNode }) {
	const [host, setHost] = useState<HTMLElement | null>(null);
	const [toasts, setToasts] = useState<RemovalToast[]>([]);
	useEffect(() => setHost(document.querySelector<HTMLElement>(".cms-root") ?? document.body), []);
	return (
		<UndoHost.Provider value={setToasts}>
			{children}
			{host
				? createPortal(
						<div className="pointer-events-none fixed inset-x-0 bottom-20 z-(--z-toast) mx-auto flex max-h-[calc(100dvh-9rem)] w-fit max-w-full flex-col items-end gap-2 overflow-y-auto px-3 py-4 lg:bottom-2">
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

export function useUndoRestoresLive(path: string, restored: readonly unknown[] | null): boolean {
	return useDraftSelector(
		(state, store) => restored !== null && jsonEqual(restored, store.liveValueAt(path, state)),
	);
}

/**
 * One Undo per removed row. Removals survive later edits to the list; each
 * puts its row back beside its old neighbours. A removal ends when its row
 * is back, when the owner dismisses it or reverts the field, or when the
 * whole draft is replaced (history restore, discard, conflict resolution).
 */
export function usePendingRemovals<T>(path: string, rules: RemovalRules<T>) {
	const store = useDraftStore();
	const [all, setAll] = useState<PendingRemoval<T>[]>([]);
	const nextId = useRef(0);
	const { max, same, match } = rules;
	const rowsAt = (state: DraftState) => (getAt(state.draft, path) as T[] | undefined) ?? [];
	// Subscribe to what the toasts show, not to every edit inside the list.
	const back = useDraftSelector((state) => {
		const rows = rowsAt(state);
		return all.map((removal) => (rows.some((row) => same(row, removal.row)) ? "1" : "0")).join("");
	});
	const full = useDraftSelector((state) => rowsAt(state).length >= max);
	const restoresLive = useDraftSelector((state, store) => {
		if (!all.length) return false;
		const restored = restoreAll(rowsAt(state), all, { max, same, match });
		return restored !== null && jsonEqual(restored, store.liveValueAt(path, state));
	});
	const removals = all.filter((_, index) => back[index] !== "1");
	const stale = removals.length !== all.length;
	useEffect(() => {
		if (stale) setAll((current) => current.filter((removal) => removals.includes(removal)));
	});
	useEffect(() => {
		let previous = store.getState();
		return store.subscribe(() => {
			const next = store.getState();
			if (replacedDraft(previous, next)) setAll([]);
			previous = next;
		});
	}, [store]);

	const add = useCallback(
		(before: readonly T[], index: number, label: string) => {
			const id = nextId.current++;
			setAll((current) => [...current, createRemoval(before, index, label, current, match, id)]);
		},
		[match],
	);
	const dismiss = useCallback(
		(id: number) => setAll((current) => current.filter((removal) => removal.id !== id)),
		[],
	);
	const clear = useCallback(() => setAll([]), []);
	return {
		removals: removals.map((removal) => ({ ...removal, canUndo: !full })),
		add,
		dismiss,
		clear,
		/** Undo one removal against the current list, and drop its toast. */
		take(id: number, current: readonly T[]) {
			const removal = removals.find((entry) => entry.id === id);
			const restored = removal && restoreRemoval(current, removal, { max, same, match });
			if (!restored) return null;
			dismiss(id);
			return restored;
		},
		/** Undo would return the field to its live value, so Revert adds nothing. */
		restoresLive,
	};
}

function UndoToast({ label, canUndo, onUndo, onDismiss }: RemovalToast) {
	const reduced = useReducedMotion();
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
			className="cms-panel cms-undo pointer-events-auto flex w-fit max-w-full shrink-0 flex-wrap items-center gap-2 p-2 shadow-md"
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
