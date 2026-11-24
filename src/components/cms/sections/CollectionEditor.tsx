import { animate, AnimatePresence, LayoutGroup, motion, Reorder, useIsPresent } from "motion/react";
import {
	memo,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
	useSyncExternalStore,
	type ComponentPropsWithRef,
	type ComponentType,
	type ReactNode,
} from "react";
import { RollingNumber } from "../../motion/RollingNumber";
import { useLiveReducedMotion } from "../shell/use-live-reduced-motion";
import { MAX_COLLECTION_ITEMS, PUBLIC_SLUG_PATTERN } from "../../../lib/validation";
import { cn } from "../../../lib/utils";
import { useChangedAt, useDraftStore, useDraftSelector, useIssuesAt } from "../draft/context";
import { useSettledIssues } from "../draft/use-settled-issues";
import { childPath, duplicateIds } from "../draft/paths";
import { REDUCED, SPRING_MOVE } from "../motion";
import {
	editorFocusBottom,
	editorFocusTop,
	FieldMessage,
	sentenceCase,
	useActionPointer,
} from "../fields/FieldFrame";
import { SortableRow, useReorderFeedback } from "../fields/SortableRow";
import { SearchIcon } from "../shell/cms-icons";
import { ClearAction, InputShell, inputClass } from "../fields/InputShell";
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
import { countNoun } from "./collection-helpers";
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
	const listPane = useRef<HTMLDivElement>(null);
	const detailPanel = useRef<HTMLDivElement>(null);
	const search = useRef<HTMLInputElement>(null);
	const pointer = useActionPointer();
	const [query, setQuery] = useState("");
	const [adding, setAdding] = useState(false);
	const [name, setName] = useState("");
	const removals = usePendingRemovals<T>(path, MAX_COLLECTION_ITEMS, sameRow);
	const { keys: rowKeys, move: moveRow } = removals;
	const rowKeysRef = useRef(rowKeys);
	rowKeysRef.current = rowKeys;
	const reorderFeedback = useReorderFeedback();
	const { markMoved, startDrag, endDrag } = reorderFeedback;
	const handleDragEnd = useCallback(() => endDrag(rowKeysRef.current), [endDrag]);
	const listPosition = useRef<{ scroll: number; id: string } | null>(null);
	const pendingListFocus = useRef<{
		id?: string;
		touch: boolean;
		previous: typeof listPosition.current;
	} | null>(null);
	const filter = query.trim().toLowerCase();
	const length = rowIds.length;
	const noun = countNoun(length, itemLabel);
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
	const [searchAnnouncement, setSearchAnnouncement] = useState("");
	useEffect(() => {
		if (!filter) {
			setSearchAnnouncement("");
			return;
		}
		const message = `${visible.length} of ${length} ${noun} match`;
		const timer = setTimeout(() => setSearchAnnouncement(message), 500);
		return () => clearTimeout(timer);
	}, [filter, length, noun, visible.length]);
	const duplicates = duplicateIds(rowIds.map((id) => ({ id })));
	const fade = useScrollFade(list);

	// Phones show one pane at a time. Opening an item slides its pane in from
	// the trailing edge over the list; Back slides it out again. `pane`
	// keeps both panes painted while they move.
	const [pane, setPane] = useState<"idle" | "entering" | "leaving">("idle");
	const leavingId = useRef<string | undefined>(undefined);
	const shownId = activeId ?? (pane === "leaving" ? leavingId.current : undefined);
	const shownIndex = rowIds.indexOf(shownId ?? "");
	const shownPath = childPath(path, shownIndex);
	const detailOpen = item !== undefined || pane === "leaving";
	const listHidden = item !== undefined && pane === "idle";

	// Start sliding in once the router has committed the item, so the pane
	// arrives with its content.
	const paneReady = pane === "leaving" || (pane === "entering" && shownId !== undefined);
	const paneMoving = useRef(false);
	const settledScroll = useRef<number | undefined>(undefined);
	useLayoutEffect(() => {
		const detail = detailPanel.current;
		const panel = listPane.current;
		if (!paneReady || !detail || !panel) return;
		const entering = pane === "entering";
		// A reversal (Back during the entry, or opening during Back) carries on
		// from where both panes are now instead of jumping to the start.
		const resume = paneMoving.current;
		paneMoving.current = true;
		const from = <V,>(rest: V, to: V): V | [V, V] => (resume ? to : [rest, to]);
		// Position the incoming pane at its destination scroll while the
		// outgoing pane still uses the current scroll. Release the offset
		// and restore the document scroll together when the slide settles.
		if (entering && !resume) {
			const back = detail.querySelector<HTMLElement>(".cms-collection-back button");
			const top = detail.getBoundingClientRect().top;
			detail.style.marginTop = `${Math.max(0, (back ? editorFocusTop(back) + 8 : 0) - top)}px`;
			if (reduced) detail.style.opacity = "0";
			else detail.style.transform = "translateX(100%)";
		}
		if (!entering && !panel.style.top) {
			const previous = pendingListFocus.current?.previous?.scroll;
			if (previous !== undefined) panel.style.top = `${window.scrollY - previous}px`;
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
				const offset = Number.parseFloat(entering ? detail.style.marginTop : panel.style.top);
				settledScroll.current = window.scrollY - (Number.isFinite(offset) ? offset : 0);
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
		const panel = listPane.current;
		if (pane !== "idle" || !paneMoving.current) return;
		paneMoving.current = false;
		if (detail && panel) {
			clearPaneStyles(detail, panel);
			detail.style.marginTop = "";
			panel.style.top = "";
		}
		if (settledScroll.current !== undefined) {
			window.scrollTo({ top: settledScroll.current, behavior: "instant" });
			settledScroll.current = undefined;
		}
	}, [pane]);

	const rowButton = useCallback(
		(id: string | undefined) =>
			Array.from(list.current?.querySelectorAll<HTMLButtonElement>("button[data-row]") ?? []).find(
				(button) => button.dataset.row === id && !button.closest("[inert]"),
			),
		[],
	);

	// Reserve the space above the list, including any settings or tabs.
	useLayoutEffect(() => {
		const panel = listPanel.current;
		const collection = panel?.closest<HTMLElement>(".cms-collection");
		if (narrow || !panel || !collection) return;
		let offset: number | undefined;
		const settings = panel.previousElementSibling;
		const measure = () => {
			const top = Math.max(
				0,
				Math.ceil(
					settings
						? settings.getBoundingClientRect().bottom + 16
						: collection.getBoundingClientRect().top,
				),
			);
			if (top === offset) return;
			offset = top;
			panel.style.setProperty("--cms-collection-offset", `${top}px`);
		};
		const observer = new ResizeObserver(measure);
		if (settings) observer.observe(settings);
		for (
			let node: HTMLElement | null = collection;
			node && !node.matches(".cms-editor");
			node = node.parentElement
		) {
			for (
				let sibling = node.previousElementSibling;
				sibling;
				sibling = sibling.previousElementSibling
			) {
				observer.observe(sibling);
			}
		}
		measure();
		window.addEventListener("resize", measure);
		window.addEventListener("scroll", measure, { passive: true });
		return () => {
			observer.disconnect();
			window.removeEventListener("resize", measure);
			window.removeEventListener("scroll", measure);
		};
	}, [narrow]);

	useLayoutEffect(() => {
		const scroller = list.current;
		const row = rowButton(activeId)?.closest("li");
		if (!scroller || !row || scroller.scrollHeight <= scroller.clientHeight) return;
		// Match scrollIntoView({ block: "nearest" }) inside the list alone.
		const bounds = scroller.getBoundingClientRect();
		const target = row.getBoundingClientRect();
		if (target.top < bounds.top) scroller.scrollTop += target.top - bounds.top;
		else if (target.bottom > bounds.bottom) scroller.scrollTop += target.bottom - bounds.bottom;
	}, [activeId, filter, narrow, rowButton]);

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
		if (target) {
			const rect = target.getBoundingClientRect();
			if (rect.top < editorFocusTop(target) || rect.bottom > editorFocusBottom()) {
				target.scrollIntoView({ block: "nearest", behavior: "instant" });
			}
		}
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
			const returning = pane === "leaving";
			if (item === undefined || listPosition.current === null)
				listPosition.current = {
					scroll: pendingListFocus.current?.previous?.scroll ?? window.scrollY,
					id,
				};
			pendingListFocus.current = null;
			if (narrow && (item === undefined || returning)) setPane("entering");
			void select(id, undefined, item !== undefined || returning).then(() =>
				focusAfterNavigation(id, () => {
					const heading = document.getElementById(detailHeadingId(id));
					heading?.focus({ preventScroll: true });
					if (!narrow) heading?.scrollIntoView({ block: "nearest" });
				}),
			);
		},
		[item, pane, narrow, select, focusAfterNavigation, detailHeadingId],
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
			if (!row || from === to || to < 0 || to >= rows.length || filter) return;
			const movedKey = rowKeysRef.current[from];
			const rowLabel = describe(row).title || `${itemLabel} ${from + 1}`;
			const focused = document.activeElement;
			moveRow(from, to);
			if (movedKey !== undefined) {
				markMoved(movedKey, rowLabel, from, to, rows.length);
			}
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
		[describe, filter, itemLabel, markMoved, moveRow, path, rowButton, store],
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

	const addTrigger = adding ? (
		<button
			type="button"
			id={fieldId(path)}
			aria-controls={`${nameId}-form`}
			aria-expanded
			aria-describedby={issues.length ? `${fieldId(path)}-error` : undefined}
			className={editorButton}
			onClick={closeAddForm}
		>
			Cancel
		</button>
	) : (
		<AddButton
			id={fieldId(path)}
			aria-expanded={false}
			aria-describedby={issues.length ? `${fieldId(path)}-error` : undefined}
			primary
			disabled={full}
			onClick={() => {
				setAdding(true);
				requestAnimationFrame(() => document.getElementById(nameId)?.focus());
			}}
		>
			{length ? `Add ${itemLabel.toLowerCase()}` : `Add your first ${itemLabel.toLowerCase()}`}
		</AddButton>
	);

	const detailKey = shownId ?? (item !== undefined ? "missing" : "placeholder");

	const listContent = (
		<section
			ref={listPanel}
			className="cms-panel cms-collection-list min-w-0 gap-3 p-3"
			aria-labelledby={headingId}
			aria-describedby={issues.length ? `${fieldId(path)}-error` : undefined}
			data-slot="cms-field"
			tabIndex={-1}
		>
			{/* The page heading already names the section; the toolbar leads with the count. */}
			<header className="cms-collection-toolbar">
				<h2 id={headingId} className="sr-only">
					{label}
				</h2>
				{/* An empty list says so in its empty state instead. */}
				{length || adding ? (
					<>
						<p className="cms-collection-count m-0 text-[13px] font-medium tabular-nums">
							{filter ? (
								<>
									<RollingNumber value={visible.length} pad={1} /> of{" "}
									<RollingNumber value={length} pad={1} /> {noun}
								</>
							) : (
								<>
									<RollingNumber value={length} pad={1} /> {noun}
								</>
							)}
							{full ? (
								<span className="text-muted-foreground"> · limit {MAX_COLLECTION_ITEMS}</span>
							) : null}
						</p>
						<div className="cms-collection-add">{addTrigger}</div>
					</>
				) : null}
				{length ? (
					<InputShell
						size="sm"
						className="cms-collection-search"
						leading={<SearchIcon />}
						trailing={
							query ? <ClearAction label="Clear search" onClear={() => setQuery("")} /> : undefined
						}
					>
						<label htmlFor={queryId} className="sr-only">
							Search {label.toLowerCase()}
						</label>
						<input
							ref={search}
							id={queryId}
							type="search"
							placeholder={`Search ${label.toLowerCase()}`}
							value={query}
							className={inputClass}
							enterKeyHint="search"
							autoComplete="off"
							spellCheck={false}
							onKeyDown={(event) => {
								if (event.key !== "Escape" || event.nativeEvent.isComposing) return;
								event.preventDefault();
								event.stopPropagation();
								if (query) setQuery("");
								else event.currentTarget.blur();
							}}
							onChange={(event) => setQuery(event.currentTarget.value)}
						/>
					</InputShell>
				) : null}
			</header>
			{adding ? (
				<form
					id={`${nameId}-form`}
					className="cms-enter cms-collection-create grid min-w-0 gap-2 rounded-[12px] bg-muted p-2"
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
					<InputShell multiline>
						<textarea
							id={nameId}
							className={`${inputClass} cms-textarea cms-textarea-single`}
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
					</InputShell>
					<button
						type="submit"
						disabled={!name.trim() || full}
						className={`${editorButton} cms-editor-primary justify-self-start`}
					>
						Create
					</button>
				</form>
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
					data-fade={fade || undefined}
					data-filtering={(filter && length > 1) || undefined}
					className="cms-collection-rows m-0 grid min-w-0 content-start list-none gap-1 p-1.5 empty:hidden"
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
								settled={reorderFeedback.settledKey === rowKeys[index]}
								reorderable={!filter && length > 1}
								draggable={!duplicates.size}
								last={index === length - 1}
								open={open}
								move={move}
								onDragStart={startDrag}
								onDragEnd={handleDragEnd}
							/>
						))}
					</AnimatePresence>
				</Reorder.Group>
			</LayoutGroup>
			<p role="status" aria-live="polite" className="sr-only">
				{searchAnnouncement}
			</p>
			<p role="status" aria-live="polite" className="sr-only">
				{reorderFeedback.announcement}
			</p>
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
	);
	return (
		<div
			className={cn(
				"cms-collection grid min-w-0 items-start gap-4",
				!length && item === undefined && "cms-collection-empty",
			)}
			data-pane={pane === "idle" ? undefined : pane}
			data-split={detailOpen || undefined}
		>
			<div
				ref={listPane}
				className={cn("cms-collection-list-pane min-w-0", listHidden && "max-lg:hidden")}
				inert={narrow && detailOpen && pane !== "leaving"}
			>
				{listSettings ? <div className="cms-collection-settings">{listSettings}</div> : null}
				{listContent}
			</div>
			<div
				ref={detailPanel}
				inert={pane === "leaving"}
				onFocusCapture={(event) => {
					const target = event.target;
					if (!narrow) return;
					requestAnimationFrame(() => {
						if (document.activeElement !== target || target.closest("[inert]")) return;
						const rect = target.getBoundingClientRect();
						const top = editorFocusTop(target) + 4;
						const bottom = editorFocusBottom() - 4;
						const scroll = rect.top < top ? rect.top - top : Math.max(0, rect.bottom - bottom);
						if (scroll) window.scrollBy({ top: scroll, behavior: "instant" });
					});
				}}
				className={cn(
					"cms-collection-detail relative grid min-w-0 content-start gap-3",
					!detailOpen && "hidden",
				)}
			>
				{/* Phones keep Back in a sticky bar; desktop sets it in the header card. */}
				{detailOpen ? (
					<div className="cms-collection-back sticky z-10 rounded-[10px] bg-background py-1">
						<BackButton label={label} onClick={() => back()} disabled={pane === "leaving"} />
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
						className="grid min-w-0 gap-3"
					>
						{shownId !== undefined ? (
							<>
								<section
									data-slot="cms-editor-group"
									className="cms-panel cms-editor-group grid min-w-0 gap-3 p-[clamp(16px,2.2vw,26px)]"
								>
									<div className="cms-collection-back-inline">
										<BackButton
											label={label}
											onClick={() => back()}
											disabled={pane === "leaving"}
										/>
									</div>
									<header className="cms-editor-group-heading flex min-w-0 flex-wrap items-start justify-between gap-3">
										<h2 className="m-0 min-w-0 text-[21px] font-semibold tracking-[-0.01em]">
											<span
												id={detailHeadingId(shownId)}
												tabIndex={-1}
												className="block wrap-anywhere rounded-sm lg:scroll-mt-32"
											>
												<CollectionTitle
													path={shownPath}
													describe={describe}
													itemLabel={itemLabel}
												/>
											</span>
										</h2>
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
									</header>
								</section>
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
}

function BackButton({
	label,
	onClick,
	disabled,
}: {
	label: string;
	onClick: () => void;
	disabled: boolean;
}) {
	return (
		<button type="button" className={editorButton} onClick={onClick} disabled={disabled}>
			<ChevronLeftIcon className="size-3.5" /> {label}
		</button>
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

/**
 * Marks which edges of a scrolling list hide rows ("top", "bottom", or
 * both), so CSS can fade those edges. Undefined while nothing overflows.
 */
function useScrollFade(ref: React.RefObject<HTMLElement | null>): string | undefined {
	const [fade, setFade] = useState<string | undefined>(undefined);
	useLayoutEffect(() => {
		const element = ref.current;
		if (!element) return;
		const update = () => {
			const { scrollTop, scrollHeight, clientHeight } = element;
			const edges = [
				scrollTop > 1 ? "top" : "",
				scrollTop + clientHeight < scrollHeight - 1 ? "bottom" : "",
			]
				.filter(Boolean)
				.join(" ");
			setFade(edges || undefined);
		};
		const resize = new ResizeObserver(update);
		const observeRows = () => {
			resize.disconnect();
			resize.observe(element);
			for (const child of element.children) resize.observe(child);
		};
		const mutations = new MutationObserver(observeRows);
		observeRows();
		mutations.observe(element, { childList: true });
		element.addEventListener("scroll", update, { passive: true });
		update();
		return () => {
			resize.disconnect();
			mutations.disconnect();
			element.removeEventListener("scroll", update);
		};
	}, [ref]);
	return fade;
}

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
	settled,
	reorderable,
	draggable,
	last,
	open,
	move,
	onDragStart,
	onDragEnd,
}: {
	rowKey: number;
	id: string;
	index: number;
	path: string;
	itemLabel: string;
	describe: (row: T) => CollectionSummary;
	selected: boolean;
	settled: boolean;
	reorderable: boolean;
	draggable: boolean;
	last: boolean;
	open: (id: string) => void;
	move: (from: number, to: number) => void;
	onDragStart: (key: number, from: number, label: string) => void;
	onDragEnd: () => void;
}) {
	const [title, subtitle, ...chips] = useDraftSelector((_state, store) => {
		const row = store.valueAt(path) as T | undefined;
		if (!row) return ["", undefined];
		const summary = describe(row);
		return [summary.title, summary.subtitle, ...(summary.chips ?? [])];
	});
	const issueCount = useSettledIssues().under(path).length;
	const isNew = useDraftSelector((state, store) => store.liveValueAt(path, state) === undefined);
	const reduced = useLiveReducedMotion();
	const rowLabel = title || itemLabel;
	return (
		<SortableRow
			value={rowKey}
			label={rowLabel}
			settled={settled}
			reorderable={reorderable && draggable}
			data-selected={selected || undefined}
			className="cms-collection-row"
			onMove={reorderable ? (offset) => move(index, index + offset) : undefined}
			onDragStart={() => onDragStart(rowKey, index, rowLabel)}
			onDragEnd={onDragEnd}
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
					{handle}
					{/* The button's hit area spans the row under the handle and the menu. */}
					<button
						type="button"
						data-row={id}
						data-row-reorder=""
						aria-current={selected ? "true" : undefined}
						onClick={() => open(id)}
						aria-keyshortcuts={reorderable ? "Alt+ArrowUp Alt+ArrowDown" : undefined}
						className="cms-collection-row-button"
					>
						<span className="cms-collection-row-text">
							<span className="cms-collection-title wrap-break-word text-[14px] font-medium">
								{title || `Untitled ${itemLabel.toLowerCase()}`}
							</span>
							<span className="cms-collection-meta empty:hidden">
								{subtitle ? (
									<span className="cms-collection-subtitle wrap-break-word text-[12px]">
										{subtitle}
									</span>
								) : null}
								{isNew ? (
									<span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[11px] leading-tight font-medium text-primary-text">
										New
									</span>
								) : null}
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
						</span>
					</button>
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
					<span aria-hidden="true" className="cms-collection-open">
						<span className="cms-collection-open-label">Edit</span>
						<ChevronRightIcon className="size-4" />
					</span>
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
			className="cms-list-confirm"
			onKeyDown={(event) => {
				if (event.key !== "Escape") return;
				event.preventDefault();
				event.stopPropagation();
				cancelConfirmation();
			}}
		>
			<p className="m-0 text-xs text-ink-soft">{prompt}</p>
			<div className="cms-list-confirm-actions">
				<button
					ref={cancel}
					type="button"
					className={`${editorButton} shrink-0`}
					onClick={cancelConfirmation}
				>
					Cancel
				</button>
				<button
					type="button"
					className={`${editorButton} cms-editor-destructive shrink-0`}
					onPointerDown={pointer.onPointerDown}
					onClick={(event) => {
						setConfirming(false);
						onConfirm(pointer.isTouchClick(event));
					}}
				>
					{label}
				</button>
			</div>
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
			) : null}
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
