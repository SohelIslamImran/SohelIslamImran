import { memo, useCallback, useRef, useState, type ComponentType } from "react";
import { MAX_COLLECTION_ITEMS } from "../../../lib/validation";
import { useChangedAt, useDraftSelector, useDraftStore, useIssuesAt } from "../draft/context";
import { childPath, duplicateIds, insertItem, moveItem, removeItem } from "../draft/paths";
import { FieldFrame, describedBy, fieldId, focusField } from "./FieldFrame";
import { RowActions } from "./ListFields";
import { UndoRemoval, editorButton } from "./UndoRemoval";
import { duplicateRow, restoreRow, rowId, type RemovedRow } from "./row-list";

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
	const [removed, setRemoved] = useState<RemovedRow<T> | null>(null);
	const duplicates = duplicateIds(keys.map((id) => ({ id })));

	// Assign the same initial keys in SSR and hydration. Move them with rows
	// that lack IDs so a reorder preserves their disclosure state.
	localKeys.current = keys.map((_, index) => localKeys.current[index] ?? nextKey.current++);

	const move = useCallback(
		(from: number, to: number) => {
			const rows = (store.valueAt(path) as T[] | undefined) ?? EMPTY;
			if (to < 0 || to >= rows.length) return;
			localKeys.current = moveItem(localKeys.current, from, to);
			store.update(path, moveItem(rows, from, to));
			requestAnimationFrame(() => focusField(childPath(path, to)));
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
			store.update(path, removeItem(rows, index));
			setRemoved({ row, index, label });
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
			onRevert={() => store.revertAt(path)}
			meta={
				<span className="font-mono text-[11px] text-muted-foreground">
					{keys.length}/{max}
				</span>
			}
		>
			{keys.length ? (
				<ol className="m-0 grid list-none gap-2 p-0" aria-labelledby={`${fieldId(path)}-label`}>
					{keys.map((id, index) => (
						<MemoRepeaterRow
							key={id && !duplicates.has(id) ? id : `local-${localKeys.current[index]}`}
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
				</ol>
			) : (
				<p className="m-0 text-[13px] text-muted-foreground">No entries yet.</p>
			)}
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
		<li
			className="min-w-0 rounded-[12px] border border-line bg-surface-solid"
			onKeyDown={(event) => {
				if (
					event.defaultPrevented ||
					!event.altKey ||
					!["ArrowUp", "ArrowDown"].includes(event.key)
				)
					return;
				event.preventDefault();
				move(index, index + (event.key === "ArrowUp" ? -1 : 1));
			}}
		>
			<details onToggle={(event) => setOpened(event.currentTarget.open)}>
				<summary
					id={fieldId(path)}
					aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
					className="min-h-10 cursor-pointer wrap-anywhere rounded-[10px] px-3 py-2.5 text-[14px] font-medium marker:text-muted-foreground pointer-coarse:min-h-11"
				>
					{name}
					{issueCount ? (
						<span className="ml-2 text-xs text-destructive">
							· {issueCount} {issueCount === 1 ? "error" : "errors"}
						</span>
					) : null}
				</summary>
				{opened ? (
					<div className="grid min-w-0 gap-4 border-t border-line px-4 py-4">
						<Editor path={path} />
					</div>
				) : null}
			</details>
			<div className="flex justify-end border-t border-line p-1.5">
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
		</li>
	);
}

const MemoRepeaterRow = memo(RepeaterRow) as typeof RepeaterRow;
