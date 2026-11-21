import { memo, useId, useRef, useState, type ComponentType } from "react";
import { MAX_COLLECTION_ITEMS } from "../../../lib/validation";
import { cn } from "../../../lib/utils";
import {
	useChangedAt,
	useDraftStore,
	useDraftValue,
	useIssuesAt,
	useIssuesUnder,
} from "../draft/context";
import { childPath, insertItem, moveItem, removeItem } from "../draft/paths";
import { controlClass, fieldId, RowActions } from "../fields";
import { UndoRemoval, editorButton } from "../fields/UndoRemoval";
import { duplicateRow, newRowId, restoreRow, type RemovedRow } from "../fields/row-list";
import { EditorGroup } from "./EditorLayout";

export interface EditorProps {
	item?: string;
	tab?: "social";
	select: (item?: string, tab?: "social") => Promise<void>;
}

interface CollectionSummary {
	title: string;
	subtitle?: string;
	chips?: readonly string[];
}

export function CollectionEditor<T extends { id: string }>({
	path,
	label,
	itemLabel,
	nameLabel,
	nameLimit,
	item,
	select,
	create,
	duplicate = duplicateRow,
	describe,
	orderNote,
	Editor,
}: EditorProps & {
	path: string;
	label: string;
	itemLabel: string;
	nameLabel: string;
	nameLimit: number;
	create: (name: string, id: string, rows: readonly T[]) => T;
	duplicate?: (row: T, rows: readonly T[]) => T;
	describe: (row: T) => CollectionSummary;
	orderNote?: string;
	Editor: ComponentType<{ path: string }>;
}) {
	const store = useDraftStore();
	const rows = useDraftValue<T[]>(path);
	const current = rows.findIndex((row) => row.id === item);
	const active = rows[current];
	const detailPath = childPath(path, current);
	const listId = useId();
	const queryId = useId();
	const nameId = useId();
	const list = useRef<HTMLOListElement>(null);
	const search = useRef<HTMLInputElement>(null);
	const [query, setQuery] = useState("");
	const [adding, setAdding] = useState(false);
	const [name, setName] = useState("");
	const [removed, setRemoved] = useState<RemovedRow<T> | null>(null);
	const listPosition = useRef<{ scroll: number; id: string } | null>(null);
	const filter = query.trim().toLowerCase();
	const full = rows.length >= MAX_COLLECTION_ITEMS;
	const changed = useChangedAt(path);
	const issues = useIssuesAt(path);
	const visible = rows.flatMap((row, index) => {
		const summary = describe(row);
		const words = [summary.title, summary.subtitle, ...(summary.chips ?? [])];
		return !filter || words.some((word) => word?.toLowerCase().includes(filter))
			? [{ row, index, summary }]
			: [];
	});

	function rowButton(id: string | undefined) {
		return Array.from(
			list.current?.querySelectorAll<HTMLButtonElement>("button[data-row]") ?? [],
		).find((button) => button.dataset.row === id);
	}

	function focusAfterNavigation(id: string | undefined, callback: () => void) {
		// Router navigation may settle before React commits the next pane.
		const ready = () =>
			id ? document.getElementById(detailHeadingId(id)) : search.current?.getClientRects().length;
		let attempts = 12;
		const wait = () => {
			if (ready()) callback();
			else if (attempts-- > 0) requestAnimationFrame(wait);
		};
		requestAnimationFrame(wait);
	}

	function detailHeadingId(id: string) {
		return `${listId}-item-${id}`;
	}

	function open(id: string) {
		if (!active || listPosition.current === null)
			listPosition.current = { scroll: window.scrollY, id };
		void select(id).then(() =>
			focusAfterNavigation(id, () => {
				const heading = document.getElementById(detailHeadingId(id));
				heading?.focus({ preventScroll: true });
				heading?.scrollIntoView({ block: "nearest" });
			}),
		);
	}

	function back(focusId = active?.id) {
		const previous = listPosition.current;
		listPosition.current = null;
		void select().then(() =>
			focusAfterNavigation(undefined, () => {
				const target = rowButton(focusId) ?? rowButton(previous?.id) ?? search.current;
				target?.focus({ preventScroll: true });
				if (previous) window.scrollTo({ top: previous.scroll, behavior: "instant" });
				target?.scrollIntoView({ block: "nearest" });
			}),
		);
	}

	function move(from: number, to: number) {
		const row = rows[from];
		if (!row || to < 0 || to >= rows.length || filter) return;
		store.update(path, moveItem(rows, from, to));
		requestAnimationFrame(() => rowButton(row.id)?.focus());
	}

	function add(row: T, index: number) {
		if (full) return;
		store.update(path, insertItem(rows, index, row));
		setQuery("");
		setAdding(false);
		setName("");
		open(row.id);
	}

	function remove(index: number) {
		const row = rows[index];
		if (!row) return;
		setRemoved({ row, index, label: describe(row).title || itemLabel.toLowerCase() });
		store.update(path, removeItem(rows, index));
		back(rows[index + 1]?.id ?? rows[index - 1]?.id);
	}

	return (
		<div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(232px,280px)_minmax(0,1fr)]">
			<section
				className={cn(
					"cms-panel grid min-w-0 gap-3 p-3 lg:sticky lg:top-16",
					item !== undefined && "max-lg:hidden",
				)}
				aria-label={`${label} list`}
			>
				<header className="flex min-w-0 flex-wrap items-center justify-between gap-2">
					<p className="mono-label m-0 text-muted-foreground">
						{rows.length} / {MAX_COLLECTION_ITEMS} items
					</p>
					<button
						id={fieldId(path)}
						aria-controls={adding ? `${nameId}-form` : undefined}
						aria-expanded={adding}
						aria-describedby={issues.length ? `${fieldId(path)}-error` : undefined}
						type="button"
						className={editorButton}
						disabled={full && !adding}
						onClick={() => {
							setAdding(!adding);
							if (!adding) requestAnimationFrame(() => document.getElementById(nameId)?.focus());
						}}
					>
						{adding ? "Cancel" : `Add ${itemLabel.toLowerCase()}`}
					</button>
				</header>
				{adding ? (
					<form
						id={`${nameId}-form`}
						className="grid min-w-0 gap-2 rounded-[12px] border border-line p-2"
						onSubmit={(event) => {
							event.preventDefault();
							if (name.trim() && !full) add(create(name.trim(), newRowId(), rows), rows.length);
						}}
					>
						<label htmlFor={nameId} className="text-[13px] font-medium">
							{nameLabel}
						</label>
						<input
							id={nameId}
							className={`${controlClass} min-h-10`}
							required
							value={name}
							maxLength={nameLimit}
							onChange={(event) => setName(event.currentTarget.value)}
						/>
						<button
							type="submit"
							disabled={!name.trim() || full}
							className={`${editorButton} justify-self-start`}
						>
							Create
						</button>
					</form>
				) : null}
				<div className="grid gap-1.5">
					<label htmlFor={queryId} className="sr-only">
						Search {label.toLowerCase()}
					</label>
					<input
						ref={search}
						id={queryId}
						type="search"
						placeholder={`Search ${label.toLowerCase()}`}
						value={query}
						className={`${controlClass} min-h-10`}
						onChange={(event) => setQuery(event.currentTarget.value)}
					/>
				</div>
				{orderNote ? <p className="m-0 text-[12px] text-muted-foreground">{orderNote}</p> : null}
				{filter ? (
					<p className="m-0 text-[12px] text-muted-foreground">Clear search to reorder.</p>
				) : null}
				{issues.length ? (
					<p id={`${fieldId(path)}-error`} className="m-0 text-[13px] text-destructive">
						{issues.map((issue) => issue.message).join(". ")}
					</p>
				) : null}
				{visible.length ? (
					<ol
						ref={list}
						className="m-0 grid min-w-0 list-none gap-1 p-1 lg:max-h-[max(16rem,calc(100svh-17rem))] lg:overflow-y-auto"
					>
						{visible.map(({ row, index, summary }) => (
							<li
								key={row.id}
								className={cn(
									"flex min-w-0 items-center rounded-[10px] border border-transparent",
									row.id === item && "border-line-strong bg-primary-soft",
								)}
							>
								<button
									type="button"
									data-row={row.id}
									aria-current={row.id === item ? "true" : undefined}
									onClick={() => open(row.id)}
									onKeyDown={(event) => {
										if (filter || !event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key))
											return;
										event.preventDefault();
										move(index, index + (event.key === "ArrowUp" ? -1 : 1));
									}}
									aria-keyshortcuts={
										!filter && rows.length > 1 ? "Alt+ArrowUp Alt+ArrowDown" : undefined
									}
									className="grid min-h-11 min-w-0 flex-1 gap-1 rounded-[10px] px-2.5 py-2 text-left hover:bg-muted aria-[current=true]:text-primary-text"
								>
									<span className="wrap-anywhere text-[14px] font-medium">
										{summary.title || `Untitled ${itemLabel.toLowerCase()}`}
									</span>
									{summary.subtitle ? (
										<span className="wrap-anywhere text-[12px] text-muted-foreground">
											{summary.subtitle}
										</span>
									) : null}
									<span className="flex flex-wrap gap-1">
										{summary.chips?.map((chip) => (
											<span
												key={chip}
												className="rounded-full border border-line-strong px-1.5 py-0.5 text-[11px] leading-tight text-foreground"
											>
												{chip}
											</span>
										))}
										<ErrorCount path={childPath(path, index)} />
									</span>
								</button>
								{!filter && rows.length > 1 ? (
									<RowActions
										className="justify-end pr-1"
										label={summary.title || `${itemLabel} ${index + 1}`}
										canMoveUp={index > 0}
										canMoveDown={index < rows.length - 1}
										onMoveUp={() => move(index, index - 1)}
										onMoveDown={() => move(index, index + 1)}
									/>
								) : null}
							</li>
						))}
					</ol>
				) : (
					<p className="m-0 rounded-[12px] border border-dashed border-line-strong p-3 text-[13px] text-muted-foreground">
						{filter ? "No matching items." : `No items yet.`}
					</p>
				)}
				{changed ? (
					<button
						type="button"
						className={`${editorButton} justify-self-start`}
						onClick={() => {
							if (!window.confirm(`Revert all draft edits in ${label.toLowerCase()} to live?`))
								return;
							store.revertAt(path);
							setRemoved(null);
							back();
						}}
					>
						Revert list to live
					</button>
				) : null}
			</section>
			<div className={cn("grid min-w-0 gap-3", item === undefined && "max-lg:hidden")}>
				{item !== undefined ? (
					<div className="sticky top-28 z-10 rounded-[10px] bg-background py-1 sm:top-16 lg:hidden">
						<button type="button" className={editorButton} onClick={() => back()}>
							<span aria-hidden="true">←</span> {label}
						</button>
					</div>
				) : null}
				{active ? (
					<EditorGroup
						title={
							<span
								id={detailHeadingId(active.id)}
								tabIndex={-1}
								className="block scroll-mt-32 wrap-anywhere rounded-sm"
							>
								{describe(active).title || `Untitled ${itemLabel.toLowerCase()}`}
							</span>
						}
						actions={
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									className={editorButton}
									disabled={full}
									onClick={() => add(duplicate(active, rows), current + 1)}
								>
									Duplicate
								</button>
								<button
									type="button"
									className={`${editorButton} text-destructive`}
									onClick={() => remove(current)}
								>
									Remove
								</button>
							</div>
						}
					>
						<CollectionDetails
							key={active.id}
							path={detailPath}
							id={active.id}
							profile={path === "profileLinks"}
							Editor={Editor}
						/>
					</EditorGroup>
				) : item !== undefined ? (
					<EditorGroup title="Item unavailable">
						<p className="m-0 text-[14px] text-muted-foreground">
							This item is no longer in the draft. Return to the list to choose another.
						</p>
						<button
							type="button"
							className={`${editorButton} justify-self-start`}
							onClick={() => back()}
						>
							Return to list
						</button>
					</EditorGroup>
				) : (
					<EditorGroup title="Choose an item">
						<p className="m-0 text-[14px] text-muted-foreground">
							Select an item in the list to edit it.
						</p>
					</EditorGroup>
				)}
			</div>
			{removed ? (
				<UndoRemoval
					label={removed.label}
					canUndo={!full && !rows.some((row) => row.id === removed.row.id)}
					onDismiss={() => {
						setRemoved(null);
						requestAnimationFrame(() => search.current?.focus({ preventScroll: true }));
					}}
					onUndo={() => {
						const restored = restoreRow(store.valueAt(path) as T[], removed);
						if (!restored) return;
						store.update(path, restored);
						setRemoved(null);
						open(removed.row.id);
					}}
				/>
			) : null}
		</div>
	);
}

const CollectionDetails = memo(function CollectionDetails({
	path,
	id,
	profile,
	Editor,
}: {
	path: string;
	id: string;
	profile: boolean;
	Editor: ComponentType<{ path: string }>;
}) {
	return (
		<>
			<div id={fieldId(path)} tabIndex={-1} className="rounded-sm">
				<Editor path={path} />
			</div>
			<dl className="m-0 grid gap-1 border-t border-line pt-3">
				<dt className="mono-label text-muted-foreground">Item ID</dt>
				<dd
					id={fieldId(`${path}.id`)}
					tabIndex={-1}
					className="m-0 wrap-anywhere rounded-sm font-mono text-xs text-ink-soft"
				>
					{profile ? `/links/${id}` : id}
				</dd>
			</dl>
		</>
	);
});

function ErrorCount({ path }: { path: string }) {
	const issues = useIssuesUnder(path);
	if (!issues.length) return null;
	return (
		<span className="rounded-full border border-line-strong px-1.5 py-0.5 text-[11px] leading-tight text-destructive">
			{issues.length} {issues.length === 1 ? "error" : "errors"}
		</span>
	);
}
