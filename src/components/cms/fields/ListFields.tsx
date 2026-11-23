import { AnimatePresence, motion, Reorder, useIsPresent } from "motion/react";
import { memo, useCallback, useRef, useState, type ReactNode } from "react";
import { useLiveReducedMotion } from "../shell/use-live-reduced-motion";
import { MAX_COLLECTION_ITEMS } from "../../../lib/validation";
import { cn } from "../../../lib/utils";
import {
	useChangedAt,
	useDraftSelector,
	useDraftStore,
	useField,
	useIssuesAt,
	useIssuesUnder,
} from "../draft/context";
import { childPath } from "../draft/paths";
import { REDUCED, SPRING_SNAPPY } from "../motion";
import { SortableRow } from "./SortableRow";
import { UndoRemoval, usePendingRemovals } from "./UndoRemoval";
import { Counter } from "./TextFields";
import {
	FieldFrame,
	FieldMessage,
	controlClass,
	describedBy,
	fieldId,
	focusField,
	useActionPointer,
	useFieldIssueFeedback,
	sentenceCase,
} from "./FieldFrame";
import { AddButton, RowMenu } from "./RowControls";
import { CloseIcon } from "../shell/cms-icons";
import { tagBackspace, toSingleLine } from "./field-logic";
import { sameTag } from "./row-list";

const EMPTY: readonly never[] = [];

export interface TagsFieldProps {
	path: string;
	label: ReactNode;
	description?: ReactNode;
	placeholder?: string;
	max?: number;
	className?: string;
}

/**
 * Chips for short string lists (tags, technologies, tools). Enter or comma
 * adds; pasting a comma-separated list adds each item. Backspace on an empty
 * input selects the last chip, and a second Backspace removes it. Every
 * removal can be undone.
 */
export function TagsField({
	path,
	label,
	description,
	placeholder = "Add and press Enter",
	max = MAX_COLLECTION_ITEMS,
	className,
}: TagsFieldProps) {
	const field = useField<string[] | undefined>(path);
	const nested = useIssuesUnder(path);
	const tags = field.value ?? EMPTY;
	const [draft, setDraft] = useState("");
	const [limitReached, setLimitReached] = useState(false);
	const [armed, setArmed] = useState(false);
	const removals = usePendingRemovals(path, max, sameTag);
	const chips = useRef<HTMLUListElement>(null);
	const input = useRef<HTMLInputElement>(null);
	const composing = useRef(false);
	const pointer = useActionPointer();
	const add = (raw: string) => {
		const parts = raw
			.split(",")
			.map((part) => part.trim())
			.filter(Boolean);
		if (!parts.length) return;
		const next = [...tags];
		const remaining = [];
		for (const part of parts) {
			if (next.some((tag) => tag.toLowerCase() === part.toLowerCase())) continue;
			if (next.length >= max) remaining.push(part);
			else next.push(part);
		}
		if (next.length !== tags.length) field.set(next);
		setDraft(remaining.join(", "));
		setLimitReached(remaining.length > 0);
	};
	const remove = (index: number) => {
		const tag = tags[index];
		if (tag === undefined) return;
		removals.remove(index, tag);
		setLimitReached(false);
		setArmed(false);
	};
	return (
		<FieldFrame
			path={path}
			label={label}
			description={description}
			issues={nested}
			changed={field.changed}
			onRevert={
				removals.restoresLive
					? undefined
					: () => {
							removals.clear();
							field.revert();
						}
			}
			meta={<Counter length={tags.length} max={max} />}
			className={className}
		>
			<div
				className={cn(
					controlClass,
					"cms-tags flex min-h-10 flex-wrap items-center gap-1.5 px-1.5 py-1.5",
				)}
				onClick={(event) => {
					if (event.target === event.currentTarget) input.current?.focus();
				}}
			>
				<ul
					ref={chips}
					className="contents"
					aria-label={typeof label === "string" ? label : undefined}
				>
					<AnimatePresence initial={false}>
						{tags.map((tag, index) => (
							<TagChip key={removals.keys[index]} armed={armed && index === tags.length - 1}>
								<span className="min-w-0 wrap-anywhere">{tag}</span>
								<button
									type="button"
									onPointerDown={pointer.onPointerDown}
									onClick={(event) => {
										const touch = pointer.isTouchClick(event);
										remove(index);
										requestAnimationFrame(() => {
											const buttons =
												chips.current?.querySelectorAll<HTMLButtonElement>(
													"li:not([inert]) button",
												);
											const nearest = buttons?.[index] ?? buttons?.[index - 1];
											if (nearest) nearest.focus();
											else focusField(path, touch);
										});
									}}
									className={cn(
										"cms-press inline-flex size-6 shrink-0 items-center justify-center rounded-full hover:bg-[color-mix(in_srgb,var(--theme-ink)_8%,transparent)] pointer-coarse:size-11",
										armed && index === tags.length - 1
											? "text-primary-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									<CloseIcon className="size-3" />
									<span className="sr-only">Remove {tag}</span>
								</button>
							</TagChip>
						))}
					</AnimatePresence>
				</ul>
				<input
					ref={input}
					id={fieldId(path)}
					value={draft}
					placeholder={tags.length ? "" : placeholder}
					aria-describedby={describedBy(path, Boolean(description), nested)}
					aria-invalid={nested.length > 0 || undefined}
					onChange={(event) => {
						const value = event.currentTarget.value;
						setArmed(false);
						if (!composing.current && value.includes(",")) add(value);
						else {
							setDraft(value);
							setLimitReached(false);
						}
					}}
					onKeyDown={(event) => {
						if (event.nativeEvent.isComposing) return;
						if (event.key === "Enter") {
							event.preventDefault();
							setArmed(false);
							add(draft);
						} else if (event.key === "Backspace") {
							const next = tagBackspace(draft, tags.length, armed, event.repeat);
							if (next.remove) {
								event.preventDefault();
								remove(tags.length - 1);
							} else setArmed(next.armed);
						} else if (event.key !== "Shift") setArmed(false);
					}}
					onCompositionStart={() => {
						composing.current = true;
					}}
					onCompositionEnd={() => {
						composing.current = false;
					}}
					onBlur={() => {
						setArmed(false);
						add(draft);
					}}
					className="min-h-7 pointer-coarse:min-h-11 min-w-[8ch] flex-1 bg-transparent px-1.5 text-[14px] outline-hidden"
				/>
			</div>
			<p role="status" className="sr-only">
				{armed && tags.length ? `Press Backspace again to remove ${tags.at(-1)}.` : ""}
			</p>
			{limitReached ? (
				<p role="status" className="m-0 mt-1.5 text-xs text-muted-foreground">
					Maximum {max} tags. Remove a tag to add another.
				</p>
			) : null}
			{draft ? (
				<div className="mt-1 justify-self-end">
					<Counter length={draft.trim().length} max={240} />
				</div>
			) : null}
			{removals.removals.map((removal) => (
				<UndoRemoval
					key={removal.id}
					removal={removal}
					onDismiss={() => {
						removals.dismiss(removal.id);
						input.current?.focus({ preventScroll: true });
					}}
					onUndo={() => {
						if (removals.undo(removal.id) === undefined) return;
						requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
					}}
				/>
			))}
		</FieldFrame>
	);
}

function TagChip({ children, armed }: { children: ReactNode; armed?: boolean }) {
	const reduced = useLiveReducedMotion();
	const present = useIsPresent();
	return (
		<motion.li
			inert={!present}
			layout={reduced ? false : "position"}
			initial={{ opacity: 0, scale: reduced ? 1 : 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: reduced ? 1 : 0.9 }}
			transition={reduced ? REDUCED : SPRING_SNAPPY}
			data-armed={armed || undefined}
			className="cms-tag-chip"
		>
			{children}
		</motion.li>
	);
}

export interface StringListFieldProps {
	path: string;
	label: ReactNode;
	description?: ReactNode;
	itemLabel?: string;
	addLabel?: string;
	placeholder?: string;
	max?: number;
	maxLength?: number;
	/** Textareas for paragraphs, single-line inputs for highlights. */
	multiline?: boolean;
	className?: string;
}

/**
 * An ordered list of strings (paragraphs, highlights). Rows reorder by
 * drag or Alt+Arrow on the handle; the row menu moves and removes, and a
 * removal can be undone.
 */
export function StringListField({
	path,
	label,
	description,
	itemLabel = "Item",
	addLabel = "Add item",
	placeholder,
	max = MAX_COLLECTION_ITEMS,
	multiline = false,
	maxLength = 240,
	className,
}: StringListFieldProps) {
	const store = useDraftStore();
	const count = useDraftSelector(
		(_state, store) => ((store.valueAt(path) as string[] | undefined) ?? []).length,
	);
	const issues = useIssuesAt(path);
	const changed = useChangedAt(path);
	const removals = usePendingRemovals<string>(path, max);
	const { keys, move: moveRow, remove: removeRow } = removals;

	const move = useCallback(
		(from: number, to: number) => {
			const items = (store.valueAt(path) as string[] | undefined) ?? [];
			if (to < 0 || to >= items.length) return;
			const focus = document.activeElement;
			moveRow(from, to);
			requestAnimationFrame(() => {
				if (document.activeElement !== focus || focus?.matches(":disabled")) {
					focusField(childPath(path, to));
				}
			});
		},
		[moveRow, path, store],
	);

	const remove = useCallback(
		(index: number, label: string, touch: boolean) => {
			const items = (store.valueAt(path) as string[] | undefined) ?? [];
			const row = items[index];
			if (row === undefined) return;
			// Positions shift as rows go, so name the row by its text.
			const text = row.trim();
			const excerpt = text.length > 40 ? `${text.slice(0, 40).trimEnd()}…` : text;
			removeRow(index, excerpt ? `${itemLabel.toLowerCase()} “${excerpt}”` : label.toLowerCase());
			const target = items.length > 1 ? childPath(path, Math.min(index, items.length - 2)) : path;
			requestAnimationFrame(() => focusField(target, touch));
		},
		[itemLabel, path, removeRow, store],
	);

	return (
		<FieldFrame
			path={path}
			label={label}
			description={description}
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
			asGroup
			meta={<Counter length={count} max={max} />}
			className={className}
		>
			<Reorder.Group
				as="ol"
				axis="y"
				values={keys}
				onReorder={removals.reorder}
				className="m-0 grid min-w-0 list-none gap-2 p-0 empty:hidden"
				aria-labelledby={`${fieldId(path)}-label`}
			>
				<AnimatePresence initial={false}>
					{keys.map((key, index) => (
						<StringRow
							key={key}
							rowKey={key}
							path={childPath(path, index)}
							index={index}
							label={`${itemLabel} ${index + 1}`}
							maxLength={maxLength}
							multiline={multiline}
							placeholder={placeholder}
							canMoveDown={index < count - 1}
							move={move}
							remove={remove}
						/>
					))}
				</AnimatePresence>
			</Reorder.Group>
			<div className={count ? "mt-2" : undefined}>
				<AddButton
					id={fieldId(path)}
					aria-describedby={describedBy(path, Boolean(description), issues)}
					disabled={count >= max}
					onClick={() => {
						removals.insert(count, "");
						requestAnimationFrame(() => focusField(childPath(path, count)));
					}}
				>
					{addLabel}
				</AddButton>
			</div>
			{removals.removals.map((removal) => (
				<UndoRemoval
					key={removal.id}
					removal={removal}
					onDismiss={() => {
						removals.dismiss(removal.id);
						focusField(path);
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

const StringRow = memo(function StringRow({
	rowKey,
	path,
	index,
	label,
	maxLength,
	multiline,
	placeholder,
	canMoveDown,
	move,
	remove,
}: {
	rowKey: number;
	path: string;
	index: number;
	label: string;
	maxLength: number;
	multiline: boolean;
	placeholder?: string;
	canMoveDown: boolean;
	move: (from: number, to: number) => void;
	remove: (index: number, label: string, touch: boolean) => void;
}) {
	const field = useField<string | undefined>(path);
	const value = field.value ?? "";
	const { issues, onFocus, onBlur } = useFieldIssueFeedback(field.issues, value);
	const reorderable = index > 0 || canMoveDown;
	return (
		<SortableRow
			value={rowKey}
			label={label}
			reorderable={reorderable}
			className="cms-string-row"
			onMove={(offset) => move(index, index + offset)}
		>
			{(handle) => (
				<>
					{handle ? <div className="cms-string-handle">{handle}</div> : null}
					<div className="grid min-w-0 [grid-column:2]">
						{/* Highlights wrap like paragraphs but stay one line of text. */}
						<textarea
							id={fieldId(path)}
							value={value}
							placeholder={placeholder}
							aria-label={label}
							aria-invalid={issues.length > 0 || undefined}
							aria-describedby={describedBy(path, false, issues)}
							rows={multiline ? 3 : 1}
							onKeyDown={
								multiline
									? undefined
									: (event) => {
											if (event.key === "Enter" && !event.nativeEvent.isComposing)
												event.preventDefault();
										}
							}
							data-settle-issues=""
							onFocus={onFocus}
							onBlur={onBlur}
							onChange={(event) => {
								const raw = event.currentTarget.value;
								field.set(multiline ? raw : toSingleLine(raw));
							}}
							className={cn(
								controlClass,
								"cms-textarea",
								multiline
									? "min-h-20 py-2.5 leading-relaxed"
									: "cms-textarea-single min-h-10 py-[8px] leading-[22px]",
							)}
						/>
						<div className="justify-self-end empty:hidden">
							<Counter length={value.length} max={maxLength} />
						</div>
						<FieldMessage
							id={`${fieldId(path)}-error`}
							message={issues.map((issue) => sentenceCase(issue.message)).join(" ")}
						/>
					</div>
					<RowMenu
						label={label}
						className="cms-string-menu"
						canMoveUp={index > 0}
						canMoveDown={canMoveDown}
						onMoveUp={() => move(index, index - 1)}
						onMoveDown={() => move(index, index + 1)}
						onRemove={(touch) => remove(index, label, touch)}
					/>
				</>
			)}
		</SortableRow>
	);
});
