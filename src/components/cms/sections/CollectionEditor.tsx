import { animate, AnimatePresence, LayoutGroup, motion, Reorder, useIsPresent } from "motion/react";
import {
	memo,
	useCallback,
	useId,
	useLayoutEffect,
	useRef,
	useState,
	useSyncExternalStore,
	type ComponentPropsWithRef,
	type ComponentType,
	type ReactNode,
} from "react";
import { useLiveReducedMotion } from "../shell/use-live-reduced-motion";
import { MAX_COLLECTION_ITEMS, PUBLIC_SLUG_PATTERN } from "../../../lib/validation";
import { cn } from "../../../lib/utils";
import { useChangedAt, useDraftStore, useDraftSelector, useIssuesAt } from "../draft/context";
import { childPath, duplicateIds } from "../draft/paths";
import { REDUCED, SPRING_MOVE } from "../motion";
import { FieldMessage, sentenceCase, useActionPointer } from "../fields/FieldFrame";
import { SortableRow } from "../fields/SortableRow";
import { SearchIcon } from "../shell/cms-icons";
import { controlClass, fieldId, focusField } from "../fields";
import {
	UndoRemoval,
	UndoRemovalScope,
	editorButton,
	usePendingRemovals,
} from "../fields/UndoRemoval";
import { AddButton, RowMenu } from "../fields/RowControls";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	DuplicateIcon,
	StackIcon,
	TrashIcon,
} from "../fields/field-icons";
import { toSingleLine } from "../fields/field-logic";
import { duplicateRow, newRowId, sameRow } from "../fields/row-list";
import { EditorGroup } from "./EditorLayout";

export interface EditorProps {
	item?: string;
	tab?: "social";
	field?: string;
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
	listSettings,
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
	listSettings?: ReactNode;
	Editor: ComponentType<{ path: string }>;
}) {
	const store = useDraftStore();
	const rowIds = useDraftSelector((_state, store) =>
		(store.valueAt(path) as T[]).map((row) => row.id),
	);
	const current = rowIds.indexOf(item ?? "");
	const activeId = rowIds[current];

	const profile = path === "profileLinks";
	const listId = useId();
	const queryId = useId();
	const nameId = useId();
	const headingId = useId();
	const list = useRef<HTMLOListElement>(null);
	const listPanel = useRef<HTMLElement>(null);
	const detailPanel = useRef<HTMLDivElement>(null);
	const search = useRef<HTMLInputElement>(null);
	const pointer = useActionPointer();
	const [query, setQuery] = useState("");
	const [adding, setAdding] = useState(false);
	const [name, setName] = useState("");
	const removals = usePendingRemovals<T>(path, MAX_COLLECTION_ITEMS, sameRow);
	const { keys: rowKeys, move: moveRow } = removals;
	const listPosition = useRef<{ scroll: number; id: string } | null>(null);
	const pendingListFocus = useRef<{
		id?: string;
		touch: boolean;
		previous: typeof listPosition.current;
	} | null>(null);
	const filter = query.trim().toLowerCase();
	const length = rowIds.length;
	const full = length >= MAX_COLLECTION_ITEMS;
	const reduced = useLiveReducedMotion();
	const narrow = useMediaQuery(NARROW_QUERY);
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

	// Phones show one pane at a time. Opening an item slides its pane in from
	// the trailing edge over the list; Back slides it out again. `pane`
	// keeps both panes painted while they move.
	const [pane, setPane] = useState<"idle" | "entering" | "leaving">("idle");
	const leavingId = useRef<string | undefined>(undefined);
	const shownId = activeId ?? (pane === "leaving" ? leavingId.current : undefined);
	const shownIndex = rowIds.indexOf(shownId ?? "");
	const shownPath = childPath(path, shownIndex);
	const detailOpen = item !== undefined || pane === "leaving";

	// Start sliding in once the router has committed the item, so the pane
	// arrives with its content.
	const paneReady = pane === "leaving" || (pane === "entering" && shownId !== undefined);
	const paneMoving = useRef(false);
	useLayoutEffect(() => {
		const detail = detailPanel.current;
		const panel = listPanel.current;
		if (!paneReady || !detail || !panel) return;
		const entering = pane === "entering";
		// A reversal (Back during the entry, or opening during Back) carries on
		// from where both panes are now instead of jumping to the start.
		const resume = paneMoving.current;
		paneMoving.current = true;
		const from = <V,>(rest: V, to: V): V | [V, V] => (resume ? to : [rest, to]);
		if (entering && !resume) {
			if (reduced) detail.style.opacity = "0";
			else detail.style.transform = "translateX(100%)";
		}
		if (reduced) {
			detail.style.transform = "";
			panel.style.transform = "";
			panel.style.opacity = "";
		}
		let frame = 0;
		let stopped = false;
		const controls = reduced
			? [animate(detail, { opacity: from(entering ? 0 : 1, entering ? 1 : 0) }, REDUCED)]
			: [
					animate(
						detail,
						{ x: from(entering ? "100%" : "0%", entering ? "0%" : "100%") },
						SPRING_MOVE,
					),
					animate(
						panel,
						{
							x: from(entering ? "0%" : "-24%", entering ? "-24%" : "0%"),
							opacity: from(entering ? 1 : 0.6, entering ? 0.6 : 1),
						},
						SPRING_MOVE,
					),
				];
		// Motion commits the final keyframe after the promise settles; clear
		// the inline styles a frame later so neither pane keeps an offset.
		void Promise.all(controls).then(() => {
			if (stopped) return;
			frame = requestAnimationFrame(() => {
				paneMoving.current = false;
				clearPaneStyles(detail, panel);
				setPane("idle");
			});
		});
		return () => {
			stopped = true;
			cancelAnimationFrame(frame);
			// Leave the styles where the motion stopped; the next run resumes from them.
			for (const control of controls) control.stop();
		};
	}, [pane, paneReady, reduced]);
	// A slide cut short without a reversal, such as removing the open item.
	useLayoutEffect(() => {
		const detail = detailPanel.current;
		const panel = listPanel.current;
		if (pane !== "idle" || !paneMoving.current) return;
		paneMoving.current = false;
		if (detail && panel) clearPaneStyles(detail, panel);
	}, [pane]);

	const rowButton = useCallback(
		(id: string | undefined) =>
			Array.from(list.current?.querySelectorAll<HTMLButtonElement>("button[data-row]") ?? []).find(
				(button) => button.dataset.row === id && !button.closest("[inert]"),
			),
		[],
	);

	// Wait until the detail and any page settings have settled before restoring the list.
	useLayoutEffect(() => {
		const pending = pendingListFocus.current;
		if (detailOpen || !pending) return;
		pendingListFocus.current = null;
		const row = rowButton(pending.id) ?? rowButton(pending.previous?.id);
		const target = pending.touch
			? (row?.closest("li")?.querySelector<HTMLElement>("[data-row-menu]") ?? listPanel.current)
			: (row ?? search.current ?? document.getElementById(fieldId(path)));
		target?.focus({ preventScroll: true });
		if (pending.previous) window.scrollTo({ top: pending.previous.scroll, behavior: "instant" });
		target?.scrollIntoView({ block: "nearest" });
	}, [detailOpen, path, rowButton]);

	const detailHeadingId = useCallback((id: string) => `${listId}-item-${id}`, [listId]);

	const focusAfterNavigation = useCallback(
		(id: string, callback: () => void) => {
			// Router navigation may settle before React commits the next pane.
			const ready = () =>
				document.querySelector(`[id="${CSS.escape(detailHeadingId(id))}"]:not([inert] *)`);
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
			if (narrow && item === undefined) setPane("entering");
			void select(id, undefined, item !== undefined).then(() =>
				focusAfterNavigation(id, () => {
					const heading = document.getElementById(detailHeadingId(id));
					heading?.focus({ preventScroll: true });
					heading?.scrollIntoView({ block: "nearest" });
				}),
			);
		},
		[item, narrow, select, focusAfterNavigation, detailHeadingId],
	);

	function back(focusId = activeId, slide = true, touch = false) {
		pendingListFocus.current = { id: focusId, touch, previous: listPosition.current };
		listPosition.current = null;
		if (narrow && slide && activeId !== undefined) {
			leavingId.current = activeId;
			setPane("leaving");
		} else setPane("idle");
		void select(undefined, undefined, true);
	}

	const move = useCallback(
		(from: number, to: number) => {
			const rows = store.valueAt(path) as T[];
			const row = rows[from];
			if (!row || to < 0 || to >= rows.length || filter) return;
			const focused = document.activeElement;
			moveRow(from, to);
			// The menu restores focus to the row trigger on close.
			if (focused?.matches("[role=menuitem]")) return;
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
		[filter, moveRow, path, rowButton, store],
	);

	function add(rows: T[], row: T, index: number) {
		if (rows.length >= MAX_COLLECTION_ITEMS) return;
		removals.insert(index, row);
		setQuery("");
		setAdding(false);
		setName("");
		open(row.id);
	}

	function remove(index: number, touch: boolean) {
		const rows = store.valueAt(path) as T[];
		const row = rows[index];
		if (!row) return;
		removals.remove(index, describe(row).title || itemLabel.toLowerCase());
		back(rows[index + 1]?.id ?? rows[index - 1]?.id, false, touch);
	}

	function closeAddForm() {
		setAdding(false);
		setName("");
		requestAnimationFrame(() => document.getElementById(fieldId(path))?.focus());
	}

	const rename = useCallback(
		(id: string) => {
			store.update(`${shownPath}.id`, id);
			void select(id, undefined, true).then(() =>
				focusAfterNavigation(id, () => focusField(`${shownPath}.id`)),
			);
		},
		[shownPath, focusAfterNavigation, select, store],
	);

	const addTrigger = (
		<AddButton
			id={fieldId(path)}
			aria-controls={adding ? `${nameId}-form` : undefined}
			aria-expanded={adding}
			aria-describedby={issues.length ? `${fieldId(path)}-error` : undefined}
			primary={!adding}
			disabled={full && !adding}
			className={adding ? "cms-add-cancel" : undefined}
			onClick={() => {
				if (adding) closeAddForm();
				else {
					setAdding(true);
					requestAnimationFrame(() => document.getElementById(nameId)?.focus());
				}
			}}
		>
			{adding
				? "Cancel"
				: length
					? `Add ${itemLabel.toLowerCase()}`
					: `Add your first ${itemLabel.toLowerCase()}`}
		</AddButton>
	);

	const detailKey = shownId ?? (item !== undefined ? "missing" : "placeholder");

	const collection = (
		<div
			className={cn(
				"cms-collection grid min-w-0 items-start gap-4",
				!length && item === undefined && "cms-collection-empty",
			)}
			data-pane={pane === "idle" ? undefined : pane}
		>
			<section
				ref={listPanel}
				className={cn(
					"cms-panel cms-collection-list min-w-0 gap-3 p-3",
					item !== undefined && pane === "idle" && "max-lg:hidden",
				)}
				inert={narrow && detailOpen}
				aria-labelledby={headingId}
				aria-describedby={issues.length ? `${fieldId(path)}-error` : undefined}
				data-slot="cms-field"
				tabIndex={-1}
			>
				<header className="flex min-w-0 flex-wrap items-center justify-between gap-2 pl-1">
					<div className="grid min-w-0">
						<h2 id={headingId} className="m-0 text-[15px] font-semibold tracking-[-0.01em]">
							{label}
						</h2>
						<p className="m-0 text-xs tabular-nums text-muted-foreground">
							{length} {length === 1 ? "item" : "items"}
							{full ? ` · limit ${MAX_COLLECTION_ITEMS}` : ""}
						</p>
					</div>
					{length || adding ? addTrigger : null}
				</header>
				{adding ? (
					<form
						id={`${nameId}-form`}
						className="cms-enter grid min-w-0 gap-2 rounded-[12px] bg-muted p-2"
						onKeyDown={(event) => {
							if (event.key !== "Escape" || event.nativeEvent.isComposing) return;
							event.preventDefault();
							event.stopPropagation();
							closeAddForm();
						}}
						onSubmit={(event) => {
							event.preventDefault();
							if (!name.trim() || full) return;
							const rows = store.valueAt(path) as T[];
							add(rows, create(name.trim(), newRowId(), rows), rows.length);
						}}
					>
						<label htmlFor={nameId} className="text-[13px] font-semibold">
							{nameLabel}
						</label>
						<textarea
							id={nameId}
							className={`${controlClass} cms-textarea cms-textarea-single min-h-10 py-[8px] leading-[22px]`}
							rows={1}
							required
							value={name}
							maxLength={nameLimit}
							onChange={(event) => setName(toSingleLine(event.currentTarget.value))}
							onKeyDown={(event) => {
								if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
								event.preventDefault();
								event.currentTarget.form?.requestSubmit();
							}}
						/>
						<button
							type="submit"
							disabled={!name.trim() || full}
							className={`${editorButton} cms-editor-primary justify-self-start`}
						>
							Create
						</button>
					</form>
				) : null}
				{length ? (
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
				) : null}
				{orderNote && length > 1 ? (
					<p className="m-0 px-1 text-[12px] text-muted-foreground">{orderNote}</p>
				) : null}
				{filter ? (
					<p className="m-0 px-1 text-[12px] text-muted-foreground">Clear search to reorder.</p>
				) : null}
				<FieldMessage
					id={`${fieldId(path)}-error`}
					message={issues.map((issue) => sentenceCase(issue.message)).join(" ")}
				/>
				<LayoutGroup id={listId}>
					<Reorder.Group
						as="ol"
						axis="y"
						values={visible.map((index) => rowKeys[index])}
						onReorder={(next) => {
							if (filter || duplicates.size) return;
							removals.reorder(next);
						}}
						layoutScroll
						ref={list}
						className="cms-collection-rows m-0 grid min-w-0 content-start list-none gap-1 p-1 empty:hidden"
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
				{!length && !adding ? (
					<div className="cms-collection-empty-state cms-enter">
						<span className="cms-collection-empty-icon" aria-hidden="true">
							<StackIcon className="size-5" />
						</span>
						<p className="m-0 text-[14px] font-semibold text-foreground">
							No {label.toLowerCase()} yet
						</p>
						{addTrigger}
					</div>
				) : length && visible.length === 0 ? (
					<div className="cms-editor-empty">
						<p className="m-0 font-medium text-foreground">No matches</p>
						<p className="m-0 mt-1">Try another search.</p>
					</div>
				) : null}
				{removals.restoresLive ? null : (
					<RevertList
						path={path}
						label={label}
						onReverted={(touch) => {
							removals.clear();
							const rows = store.valueAt(path) as T[];
							if (item !== undefined && !rows.some((row) => row.id === item)) {
								back(rows[0]?.id, false, touch);
							} else {
								requestAnimationFrame(() =>
									(touch ? listPanel.current : (rowButton(item) ?? search.current))?.focus({
										preventScroll: true,
									}),
								);
							}
						}}
					/>
				)}
			</section>
			<div
				ref={detailPanel}
				inert={pane === "leaving"}
				className={cn(
					"cms-collection-detail relative grid min-w-0 content-start gap-3",
					!detailOpen && "max-lg:hidden",
				)}
			>
				{detailOpen ? (
					<div className="cms-collection-back sticky top-14 z-10 rounded-[10px] bg-background py-1">
						<button
							type="button"
							className={editorButton}
							onClick={() => back()}
							disabled={pane === "leaving"}
						>
							<ChevronLeftIcon className="size-3.5" /> {label}
						</button>
					</div>
				) : null}
				<AnimatePresence initial={false} mode="popLayout">
					<CollectionDetailPane
						key={detailKey}
						initial={narrow ? false : { opacity: 0, y: reduced ? 0 : 6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{
							opacity: 0,
							transition: reduced || narrow ? { duration: 0 } : { duration: 0.12, ease: "easeOut" },
						}}
						transition={reduced ? REDUCED : SPRING_MOVE}
						className={cn(
							"grid min-w-0 gap-3",
							shownId === undefined && item === undefined && length === 0 && "hidden",
						)}
					>
						{shownId !== undefined ? (
							<>
								<EditorGroup
									title={
										<span
											id={detailHeadingId(shownId)}
											tabIndex={-1}
											className="block scroll-mt-32 wrap-anywhere rounded-sm"
										>
											<CollectionTitle path={shownPath} describe={describe} itemLabel={itemLabel} />
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
													add(rows, duplicate(rows[shownIndex], rows), shownIndex + 1);
												}}
											>
												<DuplicateIcon className="size-3.5" />
												Duplicate
											</button>
											<button
												type="button"
												className={`${editorButton} cms-editor-destructive`}
												onPointerDown={pointer.onPointerDown}
												onClick={(event) => remove(shownIndex, pointer.isTouchClick(event))}
											>
												<TrashIcon className="size-3.5" />
												Remove
											</button>
										</div>
									}
								/>
								<CollectionDetails
									key={shownId}
									collection={path}
									path={shownPath}
									id={shownId}
									profile={profile}
									onRename={rename}
									Editor={Editor}
								/>
							</>
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
							<div className="cms-panel cms-collection-empty-state max-lg:hidden">
								<span className="cms-collection-empty-icon" aria-hidden="true">
									<StackIcon className="size-5" />
								</span>
								<h2 className="m-0 text-[15px] font-semibold text-foreground">
									Choose a {itemLabel.toLowerCase()} to edit
								</h2>
							</div>
						) : null}
					</CollectionDetailPane>
				</AnimatePresence>
			</div>
			{removals.removals.map((removal) => (
				<UndoRemoval
					key={removal.id}
					removal={removal}
					onDismiss={() => {
						removals.dismiss(removal.id);
						requestAnimationFrame(() => search.current?.focus({ preventScroll: true }));
					}}
					onUndo={() => {
						if (removals.undo(removal.id) !== undefined) open(removal.row.id);
					}}
				/>
			))}
		</div>
	);
	return listSettings ? (
		<>
			<div className={detailOpen ? "max-lg:hidden" : undefined}>{listSettings}</div>
			{collection}
		</>
	) : (
		collection
	);
}

function CollectionDetailPane(props: ComponentPropsWithRef<typeof motion.div>) {
	const present = useIsPresent();
	useLayoutEffect(() => {
		const active = document.activeElement;
		// Chromium can retain focus briefly on an element that just became inert.
		if (!present && active instanceof HTMLElement && active.closest("[data-detail-pane][inert]"))
			active.blur();
	}, [present]);
	return <motion.div {...props} data-detail-pane="" inert={!present} />;
}

const NARROW_QUERY = "(max-width: 63.999rem)";

function clearPaneStyles(...elements: HTMLElement[]) {
	for (const element of elements) {
		element.style.transform = "";
		element.style.opacity = "";
	}
}

function subscribeMedia(query: string) {
	return (onChange: () => void) => {
		const media = window.matchMedia(query);
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	};
}

/** SSR-safe media query: false on the server and during hydration. */
function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		useCallback((onChange: () => void) => subscribeMedia(query)(onChange), [query]),
		() => window.matchMedia(query).matches,
		() => false,
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
	rowKey: number;
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
	const isNew = useDraftSelector((state, store) => store.liveValueAt(path, state) === undefined);
	const reduced = useLiveReducedMotion();
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
						<span className="grid min-w-0 flex-1 gap-[3px]">
							<span className="wrap-break-word text-[14px] font-medium">
								{title || `Untitled ${itemLabel.toLowerCase()}`}
							</span>
							{subtitle ? (
								<span className="cms-collection-subtitle wrap-break-word text-[12px]">
									{subtitle}
								</span>
							) : null}
							<span className="flex flex-wrap gap-1 empty:hidden">
								{(isNew ? ["New", ...chips] : chips).map((chip) => (
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
						</span>
						<ChevronRightIcon className="cms-collection-chevron size-4 text-muted-foreground" />
					</button>
					{handle}
					{reorderable ? (
						<RowMenu
							className="cms-collection-row-actions"
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
	onConfirm: (touch: boolean) => void;
}) {
	const [confirming, setConfirming] = useState(false);
	const pointer = useActionPointer();
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
				onPointerDown={pointer.onPointerDown}
				onClick={(event) => {
					setConfirming(false);
					onConfirm(pointer.isTouchClick(event));
				}}
			>
				{label}
			</button>
		</div>
	) : (
		<button
			ref={trigger}
			type="button"
			className={`${editorButton} self-start justify-self-start`}
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
	onReverted: (touch: boolean) => void;
}) {
	const changed = useChangedAt(path);
	const store = useDraftStore();
	if (!changed) return null;
	return (
		<ConfirmListAction
			label="Revert list to live"
			prompt={`Revert all draft edits in ${label.toLowerCase()}?`}
			onConfirm={(touch) => {
				store.revertAt(path);
				onReverted(touch);
			}}
		/>
	);
}

const CollectionDetails = memo(function CollectionDetails({
	collection,
	path,
	id,
	profile,
	onRename,
	Editor,
}: {
	collection: string;
	path: string;
	id: string;
	profile: boolean;
	onRename: (id: string) => void;
	Editor: ComponentType<{ path: string }>;
}) {
	return (
		<>
			<div id={fieldId(path)} tabIndex={-1} className="grid min-w-0 gap-3 rounded-sm">
				<UndoRemovalScope collection={collection} id={id} path={path}>
					<Editor path={path} />
				</UndoRemovalScope>
			</div>
			{profile ? (
				<EditorGroup heading="h3" title="Public URL">
					<ProfileSlugField path={`${path}.id`} id={id} onRename={onRename} />
				</EditorGroup>
			) : (
				<dl className="m-0 grid gap-1 px-4 py-2">
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
			className="grid gap-2"
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
