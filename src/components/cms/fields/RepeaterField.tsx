import { useRef, useState, type ComponentType, type ReactNode } from "react";
import { MAX_COLLECTION_ITEMS } from "../../../lib/validation";
import { useDraftStore, useField, useIssuesUnder } from "../draft/context";
import { childPath, insertItem, moveItem, removeItem } from "../draft/paths";
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
	const field = useField<T[] | undefined>(path);
	const rows = field.value ?? EMPTY;
	const localKeys = useRef<number[]>([]);
	const nextKey = useRef(0);
	const [removed, setRemoved] = useState<RemovedRow<T> | null>(null);

	// Generate the same initial keys in SSR and hydration. Move the keys with
	// rows so edits that replace an object preserve its expanded state.
	localKeys.current = rows.map((_, index) => localKeys.current[index] ?? nextKey.current++);

	const move = (from: number, to: number, focusSummary = false) => {
		if (to < 0 || to >= rows.length) return;
		localKeys.current = moveItem(localKeys.current, from, to);
		field.set(moveItem(rows, from, to));
		if (focusSummary) requestAnimationFrame(() => focusField(childPath(path, to)));
	};
	const insert = (index: number, row: T) => {
		if (rows.length >= max) return;
		localKeys.current = insertItem(localKeys.current, index, nextKey.current++);
		field.set(insertItem(rows, index, row));
		requestAnimationFrame(() => {
			const summary = document.getElementById(fieldId(childPath(path, index)));
			if (summary?.parentElement instanceof HTMLDetailsElement) summary.parentElement.open = true;
			focusField(childPath(path, index));
		});
	};

	return (
		<FieldFrame
			path={path}
			label={label}
			description={description}
			asGroup
			issues={field.issues}
			changed={field.changed}
			onRevert={field.revert}
			meta={
				<span className="font-mono text-[11px] text-muted-foreground">
					{rows.length}/{max}
				</span>
			}
		>
			{rows.length ? (
				<ol className="m-0 grid list-none gap-2 p-0" aria-labelledby={`${fieldId(path)}-label`}>
					{rows.map((row, index) => {
						const rowPath = childPath(path, index);
						const name = summarize(row).trim() || `${itemLabel} ${index + 1}`;
						return (
							<RepeaterRow
								key={rowId(row) || `local-${localKeys.current[index]}`}
								path={rowPath}
								name={name}
								actions={
									<RowActions
										label={name}
										canMoveUp={index > 0}
										canMoveDown={index < rows.length - 1}
										onMoveUp={() => move(index, index - 1, true)}
										onMoveDown={() => move(index, index + 1, true)}
										onRemove={() => {
											localKeys.current = removeItem(localKeys.current, index);
											field.set(removeItem(rows, index));
											setRemoved({ row, index, label: name });
											const target =
												rows.length === 1
													? path
													: childPath(path, Math.min(index, rows.length - 2));
											requestAnimationFrame(() => focusField(target));
										}}
									>
										<button
											type="button"
											className={editorButton}
											disabled={rows.length >= max}
											onClick={() => insert(index + 1, duplicateRow(row))}
											aria-label={`Duplicate ${name}`}
										>
											Duplicate
										</button>
									</RowActions>
								}
								onMove={(step) => move(index, index + step)}
								Editor={Editor}
							/>
						);
					})}
				</ol>
			) : (
				<p className="m-0 text-[13px] text-muted-foreground">No entries yet.</p>
			)}
			<div>
				<button
					type="button"
					id={fieldId(path)}
					aria-describedby={describedBy(path, Boolean(description), field.issues)}
					className={editorButton}
					disabled={rows.length >= max}
					onClick={() => insert(rows.length, create())}
				>
					Add {itemLabel.toLowerCase()}
				</button>
			</div>
			{removed ? (
				<UndoRemoval
					label={removed.label}
					canUndo={
						rows.length < max &&
						!rows.some((row) => rowId(row) && rowId(row) === rowId(removed.row))
					}
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
						field.set(restored);
						setRemoved(null);
						requestAnimationFrame(() => focusField(childPath(path, index)));
					}}
				/>
			) : null}
		</FieldFrame>
	);
}

function RepeaterRow({
	path,
	name,
	actions,
	onMove,
	Editor,
}: {
	path: string;
	name: string;
	actions: ReactNode;
	onMove: (step: number) => void;
	Editor: ComponentType<{ path: string }>;
}) {
	const [opened, setOpened] = useState(false);
	const issues = useIssuesUnder(path);
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
				onMove(event.key === "ArrowUp" ? -1 : 1);
			}}
		>
			<details onToggle={(event) => setOpened(event.currentTarget.open)}>
				<summary
					id={fieldId(path)}
					aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
					className="min-h-10 cursor-pointer wrap-anywhere rounded-[10px] px-3 py-2.5 text-[14px] font-medium marker:text-muted-foreground pointer-coarse:min-h-11"
				>
					{name}
					{issues.length ? (
						<span className="ml-2 text-xs text-destructive">
							· {issues.length} {issues.length === 1 ? "error" : "errors"}
						</span>
					) : null}
				</summary>
				{opened ? (
					<div className="grid min-w-0 gap-4 border-t border-line px-4 py-4">
						<Editor path={path} />
					</div>
				) : null}
			</details>
			<div className="flex justify-end border-t border-line p-1.5">{actions}</div>
		</li>
	);
}
