import { AnimatePresence, LayoutGroup, motion, Reorder, useReducedMotion } from "motion/react";
import { memo, useCallback, useId, useRef, useState, type ComponentType } from "react";
import { MAX_COLLECTION_ITEMS, PUBLIC_SLUG_PATTERN } from "../../../lib/validation";
import { cn } from "../../../lib/utils";
import { useChangedAt, useDraftStore, useDraftSelector, useIssuesAt } from "../draft/context";
import { childPath, duplicateIds, insertItem, moveItem, removeItem } from "../draft/paths";
import { REDUCED, SPRING_MOVE } from "../motion";
import { FieldMessage } from "../fields/FieldFrame";
import { SortableRow } from "../fields/SortableRow";
import { SearchIcon } from "../shell/cms-icons";
import { controlClass, fieldId, focusField, RowActions } from "../fields";
import { UndoRemoval, editorButton } from "../fields/UndoRemoval";
import { duplicateRow, newRowId, restoreRow, type RemovedRow } from "../fields/row-list";
import { EditorGroup } from "./EditorLayout";

export interface EditorProps {
	item?: string;
	tab?: "social";
	select: (item?: string, tab?: "social", replace?: boolean) => Promise<void>;
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
	const rowIds = useDraftSelector((_state, store) =>
		(store.valueAt(path) as T[]).map((row) => row.id),
	);
	const current = rowIds.indexOf(item ?? "");
	const detailPath = childPath(path, current);
	const activeId = rowIds[current];

	const profile = path === "profileLinks";
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
	const length = rowIds.length;
	const full = length >= MAX_COLLECTION_ITEMS;
	const reduced = useReducedMotion();
	const issues = useIssuesAt(path);
	const visible = useDraftSelector((_state, store) =>
		(store.valueAt(path) as T[]).flatMap((row, index) => {
			if (!filter) return [index];
			const summary = describe(row);
			const words = [summary.title, summary.subtitle, ...(summary.chips ?? [])];
			return words.some((word) => word?.toLowerCase().includes(filter)) ? [index] : [];
		}),
	);
	const duplicates = duplicateIds(rowIds.map((id) => ({ id })));
	const rowKeys = rowIds.map((id, index) => (duplicates.has(id) ? `${id}:${index}` : id));

	const rowButton = useCallback(
		(id: string | undefined) =>
			Array.from(list.current?.querySelectorAll<HTMLButtonElement>("button[data-row]") ?? []).find(
				(button) => button.dataset.row === id && !button.closest("[inert]"),
			),
		[],
	);

	const detailHeadingId = useCallback((id: string) => `${listId}-item-${id}`, [listId]);

	const focusAfterNavigation = useCallback(
		(id: string | undefined, callback: () => void) => {
			// Router navigation may settle before React commits the next pane.
			const ready = () =>
				id ? document.getElementById(detailHeadingId(id)) : search.current?.getClientRects().length;
			let attempts = 12;
			const wait = () => {
				if (ready()) callback();
				else if (attempts-- > 0) requestAnimationFrame(wait);
			};
			requestAnimationFrame(wait);
		},
		[detailHeadingId],
	);

	const open = useCallback(
		(id: string) => {
			if (item === undefined || listPosition.current === null)
				listPosition.current = { scroll: window.scrollY, id };
			void select(id, undefined, item !== undefined).then(() =>
				focusAfterNavigation(id, () => {
					const heading = document.getElementById(detailHeadingId(id));
					heading?.focus({ preventScroll: true });
					heading?.scrollIntoView({ block: "nearest" });
				}),
			);
		},
		[item, select, focusAfterNavigation, detailHeadingId],
	);

	function back(focusId = activeId) {
		const previous = listPosition.current;
		listPosition.current = null;
		void select(undefined, undefined, true).then(() =>
			focusAfterNavigation(undefined, () => {
				const target = rowButton(focusId) ?? rowButton(previous?.id) ?? search.current;
				target?.focus({ preventScroll: true });
				if (previous) window.scrollTo({ top: previous.scroll, behavior: "instant" });
				target?.scrollIntoView({ block: "nearest" });
			}),
		);
	}

	const move = useCallback(
		(from: number, to: number) => {
			const rows = store.valueAt(path) as T[];
			const row = rows[from];
			if (!row || to < 0 || to >= rows.length || filter) return;
			const focused = document.activeElement;
			store.update(path, moveItem(rows, from, to));
			requestAnimationFrame(() => {
				if (
					focused instanceof HTMLElement &&
					focused.isConnected &&
					!focused.matches(":disabled")
				) {
					focused.focus({ preventScroll: true });
				} else {
					rowButton(row.id)?.focus({ preventScroll: true });
				}
			});
		},
		[filter, path, rowButton, store],
	);

	function add(rows: T[], row: T, index: number) {
		if (rows.length >= MAX_COLLECTION_ITEMS) return;
		store.update(path, insertItem(rows, index, row));
		setQuery("");
		setAdding(false);
		setName("");
		open(row.id);
	}

	function remove(index: number) {
		const rows = store.valueAt(path) as T[];
		const row = rows[index];
		if (!row) return;
		setRemoved({ row, index, label: describe(row).title || itemLabel.toLowerCase() });
		store.update(path, removeItem(rows, index));
		back(rows[index + 1]?.id ?? rows[index - 1]?.id);
	}

	const rename = useCallback(
		(id: string) => {
			store.update(`${detailPath}.id`, id);
			void select(id, undefined, true).then(() =>
				focusAfterNavigation(id, () => focusField(`${detailPath}.id`)),
			);
		},
		[detailPath, focusAfterNavigation, select, store],
	);

	return (
		<div
			className={cn(
				"cms-collection grid min-w-0 items-start gap-4",
				!length && item === undefined && "cms-collection-empty",
			)}
		>
			<section
				className={cn(
					"cms-panel cms-collection-list grid min-w-0 gap-3 p-3",
					item !== undefined && "max-lg:hidden",
				)}
				aria-label={`${label} list`}
				aria-describedby={issues.length ? `${fieldId(path)}-error` : undefined}
				data-slot="cms-field"
				tabIndex={-1}
			>
				<header className="flex min-w-0 flex-wrap items-center justify-between gap-2">
					<p className="m-0 text-xs font-medium tabular-nums text-muted-foreground">
						{length} {length === 1 ? "item" : "items"}
						{full ? ` · limit ${MAX_COLLECTION_ITEMS}` : ""}
					</p>
					<button
						id={fieldId(path)}
						aria-controls={adding ? `${nameId}-form` : undefined}
						aria-expanded={adding}
						aria-describedby={issues.length ? `${fieldId(path)}-error` : undefined}
						type="button"
						className={cn(editorButton, !adding && "cms-editor-primary")}
						disabled={full && !adding}
						onClick={() => {
							setAdding(!adding);
							if (!adding) requestAnimationFrame(() => document.getElementById(nameId)?.focus());
						}}
					>
						{adding ? (
							"Cancel"
						) : (
							<>
								<span aria-hidden="true">+</span> Add {itemLabel.toLowerCase()}
							</>
						)}
					</button>
				</header>
				{adding ? (
					<form
						id={`${nameId}-form`}
						className="cms-enter grid min-w-0 gap-2 rounded-[12px] bg-muted p-2"
						onSubmit={(event) => {
							event.preventDefault();
							if (!name.trim() || full) return;
							const rows = store.valueAt(path) as T[];
							add(rows, create(name.trim(), newRowId(), rows), rows.length);
						}}
					>
						<label htmlFor={nameId} className="text-[13px] font-medium">
							{nameLabel}
						</label>
						<textarea
							id={nameId}
							className={`${controlClass} cms-textarea min-h-[calc(1lh+22px)] py-2.5 leading-relaxed`}
							rows={1}
							required
							value={name}
							maxLength={nameLimit}
							onChange={(event) => setName(event.currentTarget.value.replace(/\n/gu, ""))}
							onKeyDown={(event) => {
								if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
								event.preventDefault();
								event.currentTarget.form?.requestSubmit();
							}}
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
				<div className="relative grid gap-1.5">
					<SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
					<label htmlFor={queryId} className="sr-only">
						Search {label.toLowerCase()}
					</label>
					<input
						ref={search}
						id={queryId}
						type="search"
						placeholder={`Search ${label.toLowerCase()}`}
						value={query}
						className={`${controlClass} min-h-10 pl-9`}
						onChange={(event) => setQuery(event.currentTarget.value)}
					/>
				</div>
				{orderNote ? <p className="m-0 text-[12px] text-muted-foreground">{orderNote}</p> : null}
				{filter ? (
					<p className="m-0 text-[12px] text-muted-foreground">Clear search to reorder.</p>
				) : null}
				<FieldMessage
					id={`${fieldId(path)}-error`}
					message={issues.map((issue) => issue.message).join(". ")}
				/>
				<LayoutGroup id={listId}>
					<Reorder.Group
						as="ol"
						axis="y"
						values={visible.map((index) => rowKeys[index])}
						onReorder={(next) => {
							if (filter || duplicates.size) return;
							const rows = store.valueAt(path) as T[];
							const byId = new Map(rows.map((row) => [row.id, row]));
							store.update(
								path,
								next.map((id) => byId.get(id)!),
							);
						}}
						layoutScroll
						ref={list}
						className="cms-collection-rows m-0 grid min-w-0 list-none gap-1 p-1"
					>
						<AnimatePresence initial={false}>
							{visible.map((index) => (
								<MemoCollectionRow
									key={rowKeys[index]}
									rowKey={rowKeys[index]}
									id={rowIds[index]}
									index={index}
									path={childPath(path, index)}
									itemLabel={itemLabel}
									describe={describe}
									selected={index === current}
									reorderable={!filter && length > 1}
									draggable={!duplicates.size}
									last={index === length - 1}
									open={open}
									move={move}
								/>
							))}
						</AnimatePresence>
					</Reorder.Group>
				</LayoutGroup>
				{visible.length === 0 ? (
					<div className="cms-editor-empty">
						<p className="m-0 font-medium text-foreground">
							{filter ? "No matches" : `No ${label.toLowerCase()} yet`}
						</p>
						<p className="m-0 mt-1">
							{filter ? "Try another search." : `Add a ${itemLabel.toLowerCase()} to get started.`}
						</p>
					</div>
				) : null}
				<RevertList
					path={path}
					label={label}
					onReverted={() => {
						setRemoved(null);
						if (item !== undefined) back();
						else requestAnimationFrame(() => search.current?.focus());
					}}
				/>
			</section>
			<div className={cn("grid min-w-0 gap-3", item === undefined && "max-lg:hidden")}>
				{item !== undefined ? (
					<div className="cms-collection-back sticky top-14 z-10 rounded-[10px] bg-background py-1">
						<button type="button" className={editorButton} onClick={() => back()}>
							<span aria-hidden="true">←</span> {label}
						</button>
					</div>
				) : null}
				<AnimatePresence initial={false}>
					{activeId !== undefined ? (
						<motion.div
							key={activeId}
							initial={{ opacity: 0, y: reduced ? 0 : 6 }}
							animate={{ opacity: 1, y: 0 }}
							transition={reduced ? REDUCED : SPRING_MOVE}
							className="min-w-0"
						>
							<EditorGroup
								title={
									<span
										id={detailHeadingId(activeId)}
										tabIndex={-1}
										className="block scroll-mt-32 wrap-anywhere rounded-sm"
									>
										<CollectionTitle path={detailPath} describe={describe} itemLabel={itemLabel} />
									</span>
								}
								actions={
									<div className="flex flex-wrap gap-2">
										<button
											type="button"
											className={editorButton}
											disabled={full}
											onClick={() => {
												const rows = store.valueAt(path) as T[];
												add(rows, duplicate(rows[current], rows), current + 1);
											}}
										>
											Duplicate
										</button>
										<ConfirmListAction
											key={activeId}
											label="Remove"
											prompt="Remove this item?"
											onConfirm={() => remove(current)}
										/>
									</div>
								}
							>
								<CollectionDetails
									key={activeId}
									path={detailPath}
									id={activeId}
									profile={profile}
									onRename={rename}
									Editor={Editor}
								/>
							</EditorGroup>
						</motion.div>
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
					) : length ? (
						<EditorGroup
							title="Choose an item"
							className="cms-collection-placeholder max-lg:hidden"
						>
							<p className="m-0 text-[14px] text-muted-foreground">
								Select an item in the list to edit it.
							</p>
						</EditorGroup>
					) : null}
				</AnimatePresence>
			</div>
			{removed ? (
				<UndoRemoval
					label={removed.label}
					canUndo={!full && !rowIds.includes(removed.row.id)}
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

function CollectionTitle<T extends { id: string }>({
	path,
	describe,
	itemLabel,
}: {
	path: string;
	describe: (row: T) => CollectionSummary;
	itemLabel: string;
}) {
	const title = useDraftSelector((_state, store) => {
		const row = store.valueAt(path) as T | undefined;
		return row ? describe(row).title : "";
	});
	return title || `Untitled ${itemLabel.toLowerCase()}`;
}

// memo preserves the row component across unrelated draft edits. Each row
// reads its own data and validation count.
function CollectionRow<T extends { id: string }>({
	rowKey,
	id,
	index,
	path,
	itemLabel,
	describe,
	selected,
	reorderable,
	draggable,
	last,
	open,
	move,
}: {
	rowKey: string;
	id: string;
	index: number;
	path: string;
	itemLabel: string;
	describe: (row: T) => CollectionSummary;
	selected: boolean;
	reorderable: boolean;
	draggable: boolean;
	last: boolean;
	open: (id: string) => void;
	move: (from: number, to: number) => void;
}) {
	const [title, subtitle, ...chips] = useDraftSelector((_state, store) => {
		const row = store.valueAt(path) as T | undefined;
		if (!row) return ["", undefined];
		const summary = describe(row);
		return [summary.title, summary.subtitle, ...(summary.chips ?? [])];
	});
	const issueCount = useDraftSelector((state) => state.issues.under(path).length);
	const reduced = useReducedMotion();
	return (
		<SortableRow
			value={rowKey}
			label={title || itemLabel}
			reorderable={reorderable && draggable}
			data-selected={selected || undefined}
			className="cms-collection-row"
			onMove={reorderable ? (offset) => move(index, index + offset) : undefined}
		>
			{(handle) => (
				<>
					{selected ? (
						<motion.span
							aria-hidden="true"
							className="cms-choice-highlight"
							layoutId={reduced ? undefined : "selected-row"}
							transition={SPRING_MOVE}
						/>
					) : null}
					<button
						type="button"
						data-row={id}
						data-row-reorder=""
						aria-current={selected ? "true" : undefined}
						onClick={() => open(id)}
						aria-keyshortcuts={reorderable ? "Alt+ArrowUp Alt+ArrowDown" : undefined}
						className="cms-collection-row-button cms-press"
					>
						<span className="wrap-anywhere text-[14px] font-medium">
							{title || `Untitled ${itemLabel.toLowerCase()}`}
						</span>
						{subtitle ? (
							<span className="wrap-anywhere text-[12px] text-muted-foreground">{subtitle}</span>
						) : null}
						<span className="flex flex-wrap gap-1 empty:hidden">
							{chips.map((chip) => (
								<span
									key={chip}
									className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] leading-tight text-foreground"
								>
									{chip}
								</span>
							))}
							{issueCount ? (
								<span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] leading-tight text-destructive">
									{issueCount} {issueCount === 1 ? "error" : "errors"}
								</span>
							) : null}
						</span>
					</button>
					{handle}
					{reorderable ? (
						<RowActions
							className="cms-collection-row-actions justify-end pr-1 pointer-fine:grid pointer-fine:gap-0 pointer-fine:pr-0 pointer-fine:[&>button]:size-6"
							label={title || `${itemLabel} ${index + 1}`}
							canMoveUp={index > 0}
							canMoveDown={!last}
							onMoveUp={() => move(index, index - 1)}
							onMoveDown={() => move(index, index + 1)}
						/>
					) : null}
				</>
			)}
		</SortableRow>
	);
}

const MemoCollectionRow = memo(CollectionRow) as typeof CollectionRow;

function ConfirmListAction({
	label,
	prompt,
	onConfirm,
}: {
	label: string;
	prompt: string;
	onConfirm: () => void;
}) {
	const [confirming, setConfirming] = useState(false);
	const trigger = useRef<HTMLButtonElement>(null);
	const cancel = useRef<HTMLButtonElement>(null);
	const cancelConfirmation = () => {
		setConfirming(false);
		requestAnimationFrame(() => trigger.current?.focus());
	};
	return confirming ? (
		<div
			className="flex flex-wrap items-center gap-2"
			onKeyDown={(event) => {
				if (event.key !== "Escape") return;
				event.preventDefault();
				event.stopPropagation();
				cancelConfirmation();
			}}
		>
			<p className="m-0 text-xs">{prompt}</p>
			<button ref={cancel} type="button" className={editorButton} onClick={cancelConfirmation}>
				Cancel
			</button>
			<button
				type="button"
				className={`${editorButton} text-destructive`}
				onClick={() => {
					setConfirming(false);
					onConfirm();
				}}
			>
				{label}
			</button>
		</div>
	) : (
		<button
			ref={trigger}
			type="button"
			className={`${editorButton} justify-self-start`}
			onClick={() => {
				setConfirming(true);
				requestAnimationFrame(() => cancel.current?.focus());
			}}
		>
			{label}
		</button>
	);
}

function RevertList({
	path,
	label,
	onReverted,
}: {
	path: string;
	label: string;
	onReverted: () => void;
}) {
	const changed = useChangedAt(path);
	const store = useDraftStore();
	if (!changed) return null;
	return (
		<ConfirmListAction
			label="Revert list to live"
			prompt={`Revert all draft edits in ${label.toLowerCase()}?`}
			onConfirm={() => {
				store.revertAt(path);
				onReverted();
			}}
		/>
	);
}

const CollectionDetails = memo(function CollectionDetails({
	path,
	id,
	profile,
	onRename,
	Editor,
}: {
	path: string;
	id: string;
	profile: boolean;
	onRename: (id: string) => void;
	Editor: ComponentType<{ path: string }>;
}) {
	return (
		<>
			<div id={fieldId(path)} tabIndex={-1} className="rounded-sm">
				<Editor path={path} />
			</div>
			{profile ? (
				<ProfileSlugField path={`${path}.id`} id={id} onRename={onRename} />
			) : (
				<dl className="m-0 grid gap-1 border-t border-line pt-3">
					<dt className="mono-label text-muted-foreground">Item ID</dt>
					<dd
						id={fieldId(`${path}.id`)}
						tabIndex={-1}
						className="m-0 wrap-anywhere rounded-sm font-mono text-xs text-ink-soft"
					>
						{id}
					</dd>
				</dl>
			)}
		</>
	);
});

function ProfileSlugField({
	path,
	id,
	onRename,
}: {
	path: string;
	id: string;
	onRename: (id: string) => void;
}) {
	const [slug, setSlug] = useState(id);
	const issues = useIssuesAt(path);
	const existsLive = useDraftSelector(({ published }) =>
		published.profileLinks.some((link) => link.id === slug),
	);
	const taken = useDraftSelector(
		({ draft }) => slug !== id && draft.profileLinks.some((link) => link.id === slug),
	);
	const inputId = fieldId(path);
	return (
		<form
			className="grid gap-2 border-t border-line pt-3"
			onSubmit={(event) => {
				event.preventDefault();
				if (slug !== id && !taken && slug.length <= 80 && PUBLIC_SLUG_PATTERN.test(slug))
					onRename(slug);
			}}
		>
			<label htmlFor={inputId} className="text-[13px] font-medium">
				Public link slug
			</label>
			<div className="flex flex-wrap items-center gap-2">
				<span aria-hidden="true" className="font-mono text-xs text-muted-foreground">
					/links/
				</span>
				<input
					id={inputId}
					className={`${controlClass} min-h-10 flex-1 font-mono`}
					value={slug}
					required
					maxLength={80}
					pattern={PUBLIC_SLUG_PATTERN.source}
					spellCheck={false}
					autoComplete="off"
					aria-invalid={taken || issues.length > 0 || undefined}
					aria-describedby={`${inputId}-hint`}
					onChange={(event) => setSlug(event.currentTarget.value)}
				/>
				<button type="submit" className={editorButton} disabled={slug === id || taken}>
					Apply slug
				</button>
			</div>
			<p
				id={`${inputId}-hint`}
				className={`m-0 text-xs ${taken || issues.length ? "text-destructive" : "text-muted-foreground"}`}
			>
				{taken
					? "Another link uses this slug."
					: issues.length && slug === id
						? issues.map((issue) => issue.message).join(". ")
						: slug !== id || !existsLive
							? "Publishing uses this URL. If you rename a live link, update references to its previous URL."
							: "Use lowercase letters, numbers, and single hyphens."}
			</p>
		</form>
	);
}
