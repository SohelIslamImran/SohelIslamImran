import { AnimatePresence, Reorder } from "motion/react";
import { memo, useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { MAX_COLLECTION_ITEMS } from "../../../lib/validation";
import { cn } from "../../../lib/utils";
import { useChangedAt, useDraftSelector, useDraftStore, useIssuesAt } from "../draft/context";
import { childPath, duplicateIds, insertItem, moveItem, removeItem } from "../draft/paths";
import { FieldFrame, describedBy, fieldId, focusField } from "./FieldFrame";
import { SortableRow } from "./SortableRow";
import { AddButton, RowMenu } from "./RowControls";
import { UndoRemoval } from "./UndoRemoval";
import { ChevronRightIcon } from "./field-icons";
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
	summaryClassName,
	create,
	summarize,
	Editor,
	max = MAX_COLLECTION_ITEMS,
}: {
	path: string;
	label: string;
	itemLabel: string;
	description?: string;
	summaryClassName?: string;
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
				className="cms-repeater-list m-0 grid list-none gap-2 p-0 empty:hidden"
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
							summaryClassName={summaryClassName}
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
			{keys.length === 0 ? (
				<p className="cms-editor-empty mb-2">No {label.toLowerCase()} yet.</p>
			) : null}
			<div className={keys.length ? "mt-2" : undefined}>
				<AddButton
					id={fieldId(path)}
					aria-describedby={describedBy(path, Boolean(description), issues)}
					disabled={keys.length >= max}
					onClick={() => insert(keys.length, create())}
				>
					Add {itemLabel.toLowerCase()}
				</AddButton>
			</div>
			<UndoRemoval
				removal={
					removed
						? {
								label: removed.label,
								canUndo:
									keys.length < max && (!rowId(removed.row) || !keys.includes(rowId(removed.row))),
							}
						: null
				}
				onDismiss={() => {
					setRemoved(null);
					requestAnimationFrame(() => focusField(path));
				}}
				onUndo={() => {
					const current = (store.valueAt(path) as T[] | undefined) ?? EMPTY;
					if (!removed || !pendingRowRemoval(current, removed)) return;
					const restored = restoreRow(current, removed, max);
					if (!restored) return;
					const index = Math.min(removed.index, current.length);
					localKeys.current = insertItem(localKeys.current, index, nextKey.current++);
					store.update(path, restored);
					setRemoved(null);
					requestAnimationFrame(() => focusField(childPath(path, index)));
				}}
			/>
		</FieldFrame>
	);
}

function RepeaterRow<T extends object>({
	rowKey,
	path,
	index,
	itemLabel,
	summarize,
	summaryClassName,
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
	summaryClassName?: string;
	canMoveDown: boolean;
	full: boolean;
	move: (from: number, to: number) => void;
	remove: (index: number, label: string) => void;
	duplicate: (index: number) => void;
	Editor: ComponentType<{ path: string }>;
}) {
	// Mount the editor on first open and keep it, so closing can animate.
	const [opened, setOpened] = useState(false);
	const summary = useDraftSelector((_state, store) => {
		const row = store.valueAt(path) as T | undefined;
		return row ? summarize(row).trim() : "";
	});
	const name = summary || `${itemLabel} ${index + 1}`;
	const issueCount = useDraftSelector((state) => state.issues.under(path).length);
	const reorderable = index > 0 || canMoveDown;
	return (
		<SortableRow
			value={rowKey}
			label={name}
			reorderable={reorderable}
			data-handle={reorderable || undefined}
			className="cms-repeater-row"
			onMove={reorderable ? (offset) => move(index, index + offset) : undefined}
		>
			{(handle) => (
				<>
					<details
						className="cms-disclosure"
						onToggle={(event) => {
							if (event.currentTarget.open) setOpened(true);
						}}
					>
						<summary
							id={fieldId(path)}
							data-row-reorder=""
							aria-keyshortcuts={reorderable ? "Alt+ArrowUp Alt+ArrowDown" : undefined}
							className="cms-repeater-summary"
						>
							<span className={cn("min-w-0 flex-1 wrap-anywhere", summaryClassName)}>
								{name}
								{issueCount ? (
									<span className="ml-2 text-xs font-medium text-destructive">
										{issueCount} {issueCount === 1 ? "error" : "errors"}
									</span>
								) : null}
							</span>
							<ChevronRightIcon className="cms-disclosure-chevron size-3.5 text-muted-foreground" />
						</summary>
						{opened ? (
							<div className="cms-repeater-body grid min-w-0 gap-5 px-4 pt-1 pb-4">
								<Editor path={path} />
							</div>
						) : null}
					</details>
					{handle ? <div className="cms-repeater-tool cms-repeater-handle">{handle}</div> : null}
					<div className="cms-repeater-tool cms-repeater-menu">
						<RowMenu
							label={name}
							canMoveUp={index > 0}
							canMoveDown={canMoveDown}
							onMoveUp={() => move(index, index - 1)}
							onMoveDown={() => move(index, index + 1)}
							onDuplicate={() => duplicate(index)}
							duplicateDisabled={full}
							onRemove={() => remove(index, name)}
						/>
					</div>
				</>
			)}
		</SortableRow>
	);
}

const MemoRepeaterRow = memo(RepeaterRow) as typeof RepeaterRow;
