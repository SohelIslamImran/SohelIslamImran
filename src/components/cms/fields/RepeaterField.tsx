import { AnimatePresence, Reorder } from "motion/react";
import { memo, useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { MAX_COLLECTION_ITEMS } from "../../../lib/validation";
import { useChangedAt, useDraftSelector, useDraftStore, useIssuesAt } from "../draft/context";
import { childPath, duplicateIds, insertItem, moveItem, removeItem } from "../draft/paths";
import { FieldFrame, describedBy, fieldId, focusField } from "./FieldFrame";
import { SortableRow } from "./SortableRow";
import { RowActions } from "./ListFields";
import { UndoRemoval, editorButton } from "./UndoRemoval";
import {
	duplicateRow,
	pendingRowRemoval,
	restoreRow,
	rowId,
	type PendingRowRemoval,
} from "./row-list";

const EMPTY: readonly never[] = [];

export function RepeaterField<T extends object>({
	path,
	label,
	itemLabel,
	description,
	create,
	summarize,
	Editor,
	max = MAX_COLLECTION_ITEMS,
}: {
	path: string;
	label: string;
	itemLabel: string;
	description?: string;
	create: () => T;
	summarize: (row: T) => string;
	Editor: ComponentType<{ path: string }>;
	max?: number;
}) {
	const store = useDraftStore();
	const keys = useDraftSelector((_state, store) =>
		((store.valueAt(path) as T[] | undefined) ?? EMPTY).map(rowId),
	);
	const issues = useIssuesAt(path);
	const changed = useChangedAt(path);
	const localKeys = useRef<number[]>([]);
	const nextKey = useRef(0);
	const [removal, setRemoved] = useState<PendingRowRemoval<T> | null>(null);
	const removed = useDraftSelector((_state, store) =>
		pendingRowRemoval((store.valueAt(path) as T[] | undefined) ?? EMPTY, removal),
	);
	useEffect(() => {
		if (removal && !removed) setRemoved(null);
	}, [removal, removed]);
	const duplicates = duplicateIds(keys.map((id) => ({ id })));

	// Assign the same initial keys in SSR and hydration. Move them with rows
	// that lack IDs so a reorder preserves their disclosure state.
	localKeys.current = keys.map((_, index) => localKeys.current[index] ?? nextKey.current++);

	const rowKeys = keys.map((id, index) =>
		id && !duplicates.has(id) ? id : `local-${localKeys.current[index]}`,
	);

	const move = useCallback(
		(from: number, to: number) => {
			const rows = (store.valueAt(path) as T[] | undefined) ?? EMPTY;
			if (to < 0 || to >= rows.length) return;
			const focused = document.activeElement;
			localKeys.current = moveItem(localKeys.current, from, to);
			store.update(path, moveItem(rows, from, to));
			requestAnimationFrame(() => {
				if (
					focused instanceof HTMLElement &&
					focused.isConnected &&
					!focused.matches(":disabled")
				) {
					focused.focus({ preventScroll: true });
				} else focusField(childPath(path, to));
			});
		},
		[path, store],
	);

	const insert = useCallback(
		(index: number, row: T) => {
			const rows = (store.valueAt(path) as T[] | undefined) ?? EMPTY;
			if (rows.length >= max) return;
			localKeys.current = insertItem(localKeys.current, index, nextKey.current++);
			store.update(path, insertItem(rows, index, row));
			requestAnimationFrame(() => {
				const summary = document.getElementById(fieldId(childPath(path, index)));
				if (summary?.parentElement instanceof HTMLDetailsElement) summary.parentElement.open = true;
				focusField(childPath(path, index));
			});
		},
		[max, path, store],
	);

	const duplicate = useCallback(
		(index: number) => {
			const row = store.valueAt(childPath(path, index)) as T;
			insert(index + 1, duplicateRow(row));
		},
		[insert, path, store],
	);

	const remove = useCallback(
		(index: number, label: string) => {
			const rows = (store.valueAt(path) as T[] | undefined) ?? EMPTY;
			const row = rows[index];
			if (!row) return;
			localKeys.current = removeItem(localKeys.current, index);
			const remaining = removeItem(rows, index);
			store.update(path, remaining);
			setRemoved({ row, index, label, remaining });
			const target = rows.length === 1 ? path : childPath(path, Math.min(index, rows.length - 2));
			requestAnimationFrame(() => focusField(target));
		},
		[path, store],
	);

	return (
		<FieldFrame
			path={path}
			label={label}
			description={description}
			asGroup
			issues={issues}
			changed={changed}
			onRevert={() => {
				setRemoved(null);
				store.revertAt(path);
			}}
			meta={
				<span className="font-mono text-[11px] text-muted-foreground">
					{keys.length}/{max}
				</span>
			}
		>
			<Reorder.Group
				as="ol"
				axis="y"
				values={rowKeys}
				onReorder={(next) => {
					const positions = next.map((key) => rowKeys.indexOf(key));
					const rows = store.valueAt(path) as T[];
					localKeys.current = positions.map((index) => localKeys.current[index]);
					store.update(
						path,
						positions.map((index) => rows[index]),
					);
				}}
				className="cms-repeater-list m-0 grid list-none gap-2 p-0"
				aria-labelledby={`${fieldId(path)}-label`}
			>
				<AnimatePresence initial={false}>
					{rowKeys.map((rowKey, index) => (
						<MemoRepeaterRow
							key={rowKey}
							rowKey={rowKey}
							path={childPath(path, index)}
							index={index}
							itemLabel={itemLabel}
							summarize={summarize}
							canMoveDown={index < keys.length - 1}
							full={keys.length >= max}
							move={move}
							remove={remove}
							duplicate={duplicate}
							Editor={Editor}
						/>
					))}
				</AnimatePresence>
			</Reorder.Group>
			{keys.length === 0 ? <p className="cms-editor-empty">No {label.toLowerCase()} yet.</p> : null}
			<div>
				<button
					type="button"
					id={fieldId(path)}
					aria-describedby={describedBy(path, Boolean(description), issues)}
					className={editorButton}
					disabled={keys.length >= max}
					onClick={() => insert(keys.length, create())}
				>
					Add {itemLabel.toLowerCase()}
				</button>
			</div>
			{removed ? (
				<UndoRemoval
					label={removed.label}
					canUndo={keys.length < max && (!rowId(removed.row) || !keys.includes(rowId(removed.row)))}
					onDismiss={() => {
						setRemoved(null);
						requestAnimationFrame(() => focusField(path));
					}}
					onUndo={() => {
						const current = (store.valueAt(path) as T[] | undefined) ?? EMPTY;
						if (!pendingRowRemoval(current, removed)) return;
						const restored = restoreRow(current, removed, max);
						if (!restored) return;
						const index = Math.min(removed.index, current.length);
						localKeys.current = insertItem(localKeys.current, index, nextKey.current++);
						store.update(path, restored);
						setRemoved(null);
						requestAnimationFrame(() => focusField(childPath(path, index)));
					}}
				/>
			) : null}
		</FieldFrame>
	);
}

function RepeaterRow<T extends object>({
	rowKey,
	path,
	index,
	itemLabel,
	summarize,
	canMoveDown,
	full,
	move,
	remove,
	duplicate,
	Editor,
}: {
	rowKey: string;
	path: string;
	index: number;
	itemLabel: string;
	summarize: (row: T) => string;
	canMoveDown: boolean;
	full: boolean;
	move: (from: number, to: number) => void;
	remove: (index: number, label: string) => void;
	duplicate: (index: number) => void;
	Editor: ComponentType<{ path: string }>;
}) {
	const [opened, setOpened] = useState(false);
	const summary = useDraftSelector((_state, store) => {
		const row = store.valueAt(path) as T | undefined;
		return row ? summarize(row).trim() : "";
	});
	const name = summary || `${itemLabel} ${index + 1}`;
	const issueCount = useDraftSelector((state) => state.issues.under(path).length);
	return (
		<SortableRow
			value={rowKey}
			label={name}
			reorderable={index > 0 || canMoveDown}
			className="cms-repeater-row"
			onMove={index > 0 || canMoveDown ? (offset) => move(index, index + offset) : undefined}
		>
			{(handle) => (
				<>
					<details onToggle={(event) => setOpened(event.currentTarget.open)}>
						<summary
							id={fieldId(path)}
							data-row-reorder=""
							aria-keyshortcuts={index > 0 || canMoveDown ? "Alt+ArrowUp Alt+ArrowDown" : undefined}
							className="cms-repeater-summary cms-press"
						>
							{name}
							{issueCount ? (
								<span className="ml-2 text-xs text-destructive">
									· {issueCount} {issueCount === 1 ? "error" : "errors"}
								</span>
							) : null}
						</summary>
						{opened ? (
							<div className="cms-enter grid min-w-0 gap-4 px-4 pb-4">
								<Editor path={path} />
							</div>
						) : null}
					</details>
					<div className="flex flex-wrap items-center justify-between gap-1 px-2 pb-1.5">
						{handle ?? <span />}
						<RowActions
							label={name}
							canMoveUp={index > 0}
							canMoveDown={canMoveDown}
							onMoveUp={() => move(index, index - 1)}
							onMoveDown={() => move(index, index + 1)}
							onRemove={() => remove(index, name)}
						>
							<button
								type="button"
								className={editorButton}
								disabled={full}
								onClick={() => duplicate(index)}
								aria-label={`Duplicate ${name}`}
							>
								Duplicate
							</button>
						</RowActions>
					</div>
				</>
			)}
		</SortableRow>
	);
}

const MemoRepeaterRow = memo(RepeaterRow) as typeof RepeaterRow;
