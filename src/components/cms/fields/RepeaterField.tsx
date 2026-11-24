import { Counter } from "./TextFields";
import { AnimatePresence, Reorder } from "motion/react";
import { memo, useCallback, useRef, useState, type ComponentType } from "react";
import { MAX_COLLECTION_ITEMS } from "../../../lib/validation";
import { cn } from "../../../lib/utils";
import { useChangedAt, useDraftSelector, useDraftStore, useIssuesAt } from "../draft/context";
import { useSettledIssues } from "../draft/use-settled-issues";
import { childPath, isPathWithin } from "../draft/paths";
import { FieldFrame, describedBy, fieldId, focusField } from "./FieldFrame";
import { SortableRow, useReorderFeedback } from "./SortableRow";
import { AddButton, RowMenu } from "./RowControls";
import { UndoRemoval, usePendingRemovals } from "./UndoRemoval";
import { ChevronDownIcon } from "./field-icons";
import { duplicateRow } from "./row-list";

const EMPTY: readonly never[] = [];

export function RepeaterField<T extends object>({
	path,
	label,
	itemLabel,
	description,
	labelHidden,
	summaryClassName,
	targetPath,
	create,
	summarize,
	Editor,
	max = MAX_COLLECTION_ITEMS,
}: {
	path: string;
	label: string;
	itemLabel: string;
	description?: string;
	labelHidden?: boolean;
	summaryClassName?: string;
	targetPath?: string;
	create: () => T;
	summarize: (row: T) => string;
	Editor: ComponentType<{ path: string }>;
	max?: number;
}) {
	const store = useDraftStore();
	const issues = useIssuesAt(path);
	const changed = useChangedAt(path);
	const removals = usePendingRemovals<T>(path, max);
	const { keys, move: moveRow, insert: insertRow, remove: removeRow } = removals;
	const keysRef = useRef(keys);
	keysRef.current = keys;
	const reorderFeedback = useReorderFeedback();
	const { markMoved, startDrag, endDrag } = reorderFeedback;
	const handleDragEnd = useCallback(() => endDrag(keysRef.current), [endDrag]);

	const move = useCallback(
		(from: number, to: number) => {
			const rows = (store.valueAt(path) as T[] | undefined) ?? EMPTY;
			if (from === to || to < 0 || to >= rows.length) return;
			const movedKey = keysRef.current[from];
			const row = rows[from];
			const rowName = (row ? summarize(row).trim() : "") || `${itemLabel} ${from + 1}`;
			const focused = document.activeElement;
			moveRow(from, to);
			if (movedKey !== undefined) {
				markMoved(movedKey, rowName, from, to, rows.length);
			}
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
		[itemLabel, markMoved, moveRow, path, store, summarize],
	);

	const insert = useCallback(
		(index: number, row: T) => {
			const rows = (store.valueAt(path) as T[] | undefined) ?? EMPTY;
			if (rows.length >= max) return;
			insertRow(index, row);
			requestAnimationFrame(() => {
				const summary = document.getElementById(fieldId(childPath(path, index)));
				if (summary?.parentElement instanceof HTMLDetailsElement) summary.parentElement.open = true;
				focusField(childPath(path, index));
			});
		},
		[insertRow, max, path, store],
	);

	const duplicate = useCallback(
		(index: number) => {
			const row = store.valueAt(childPath(path, index)) as T;
			insert(index + 1, duplicateRow(row));
		},
		[insert, path, store],
	);

	const remove = useCallback(
		(index: number, label: string, touch: boolean) => {
			const rows = (store.valueAt(path) as T[] | undefined) ?? EMPTY;
			const row = rows[index];
			if (!row) return;
			removeRow(index, label);
			const target = rows.length === 1 ? path : childPath(path, Math.min(index, rows.length - 2));
			requestAnimationFrame(() => focusField(target, touch));
		},
		[path, removeRow, store],
	);

	return (
		<FieldFrame
			path={path}
			label={label}
			description={description}
			labelHidden={labelHidden}
			asGroup
			issues={issues}
			changed={changed}
			onRevert={
				removals.restoresLive
					? undefined
					: () => {
							removals.clear();
							store.revertAt(path);
						}
			}
			meta={<Counter length={keys.length} unit="items" max={max} />}
		>
			<Reorder.Group
				as="ol"
				axis="y"
				values={keys}
				onReorder={removals.reorder}
				className="cms-repeater-list m-0 grid list-none gap-2 p-0 empty:hidden"
				aria-labelledby={`${fieldId(path)}-label`}
			>
				<AnimatePresence initial={false}>
					{keys.map((rowKey, index) => (
						<MemoRepeaterRow
							key={rowKey}
							rowKey={rowKey}
							path={childPath(path, index)}
							settled={reorderFeedback.settledKey === rowKey}
							targeted={
								targetPath !== undefined && isPathWithin(targetPath, childPath(path, index))
							}
							index={index}
							itemLabel={itemLabel}
							summarize={summarize}
							summaryClassName={summaryClassName}
							canMoveDown={index < keys.length - 1}
							full={keys.length >= max}
							move={move}
							remove={remove}
							duplicate={duplicate}
							onDragStart={startDrag}
							onDragEnd={handleDragEnd}
							Editor={Editor}
						/>
					))}
				</AnimatePresence>
			</Reorder.Group>
			<p role="status" aria-live="polite" className="sr-only">
				{reorderFeedback.announcement}
			</p>
			{keys.length === 0 ? (
				<div className="cms-repeater-empty">
					<p className="m-0 text-[13px] text-muted-foreground">No {label.toLowerCase()} yet.</p>
					<AddButton
						id={fieldId(path)}
						aria-describedby={describedBy(path, Boolean(description), issues)}
						disabled={keys.length >= max}
						onClick={() => insert(keys.length, create())}
					>
						Add {itemLabel.toLowerCase()}
					</AddButton>
				</div>
			) : (
				<div className="mt-2">
					<AddButton
						id={fieldId(path)}
						aria-describedby={describedBy(path, Boolean(description), issues)}
						disabled={keys.length >= max}
						onClick={() => insert(keys.length, create())}
					>
						Add {itemLabel.toLowerCase()}
					</AddButton>
				</div>
			)}
			{removals.removals.map((removal) => (
				<UndoRemoval
					key={removal.id}
					removal={removal}
					onDismiss={() => {
						removals.dismiss(removal.id);
						requestAnimationFrame(() => focusField(path));
					}}
					onUndo={() => {
						const index = removals.undo(removal.id);
						if (index !== undefined)
							requestAnimationFrame(() => focusField(childPath(path, index)));
					}}
				/>
			))}
		</FieldFrame>
	);
}

function RepeaterRow<T extends object>({
	rowKey,
	path,
	settled,
	targeted,
	index,
	itemLabel,
	summarize,
	summaryClassName,
	canMoveDown,
	full,
	move,
	remove,
	duplicate,
	onDragStart,
	onDragEnd,
	Editor,
}: {
	rowKey: number;
	path: string;
	settled: boolean;
	targeted: boolean;
	index: number;
	itemLabel: string;
	summarize: (row: T) => string;
	summaryClassName?: string;
	canMoveDown: boolean;
	full: boolean;
	move: (from: number, to: number) => void;
	remove: (index: number, label: string, touch: boolean) => void;
	duplicate: (index: number) => void;
	onDragStart: (key: number, from: number, rowName: string) => void;
	onDragEnd: () => void;
	Editor: ComponentType<{ path: string }>;
}) {
	// Mount the editor on first open and keep it, so closing can animate.
	const [opened, setOpened] = useState(targeted);
	const summary = useDraftSelector((_state, store) => {
		const row = store.valueAt(path) as T | undefined;
		return row ? summarize(row).trim() : "";
	});
	const name = summary || `${itemLabel} ${index + 1}`;
	const changed = useChangedAt(path);
	const issueCount = useSettledIssues().under(path).length;
	const reorderable = index > 0 || canMoveDown;
	return (
		<SortableRow
			value={rowKey}
			label={name}
			settled={settled}
			reorderable={reorderable}
			data-handle={reorderable || undefined}
			className="cms-repeater-row"
			onMove={reorderable ? (offset) => move(index, index + offset) : undefined}
			onDragStart={() => onDragStart(rowKey, index, name)}
			onDragEnd={onDragEnd}
		>
			{(handle) => (
				<>
					<details
						className="cms-disclosure"
						open={targeted || undefined}
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
							{/* The count sits beside the name so a truncated name never hides it. */}
							<span className="flex min-w-0 flex-1 items-baseline gap-2">
								<span className={cn("min-w-0 wrap-break-word", summaryClassName)}>{name}</span>
								{issueCount ? (
									<span className="shrink-0 text-xs font-medium whitespace-nowrap text-destructive">
										{issueCount} {issueCount === 1 ? "error" : "errors"}
									</span>
								) : null}
							</span>
							{changed ? (
								<>
									<span className="cms-repeater-changed" aria-hidden="true" />
									<span className="sr-only"> has changes</span>
								</>
							) : null}
							<ChevronDownIcon className="cms-disclosure-chevron cms-disclosure-chevron-down size-3.5 text-muted-foreground" />
						</summary>
						{opened || targeted ? (
							<div className="cms-repeater-body grid min-w-0 gap-5 px-4 pt-4 pb-[18px]">
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
							onRemove={(touch) => remove(index, name, touch)}
						/>
					</div>
				</>
			)}
		</SortableRow>
	);
}

const MemoRepeaterRow = memo(RepeaterRow) as typeof RepeaterRow;
