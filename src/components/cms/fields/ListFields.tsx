import { AnimatePresence, motion, Reorder, useIsPresent, useReducedMotion } from "motion/react";
import { memo, useCallback, useRef, useState, type ReactNode } from "react";
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
import { childPath, moveItem, removeItem } from "../draft/paths";
import { REDUCED, SPRING_SNAPPY } from "../motion";
import { SortableRow } from "./SortableRow";
import { editorButton } from "./UndoRemoval";
import { Counter } from "./TextFields";
import {
	FieldFrame,
	FieldMessage,
	controlClass,
	describedBy,
	fieldId,
	focusField,
} from "./FieldFrame";

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
 * adds; Backspace on an empty input removes the last chip; pasting a
 * comma-separated list adds each item.
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
	const tags = field.value ?? [];
	const [draft, setDraft] = useState("");
	const [limitReached, setLimitReached] = useState(false);
	const chips = useRef<HTMLUListElement>(null);
	const input = useRef<HTMLInputElement>(null);
	const composing = useRef(false);
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
	return (
		<FieldFrame
			path={path}
			label={label}
			description={description}
			issues={nested}
			changed={field.changed}
			onRevert={field.revert}
			meta={
				<span className="font-mono text-[11px] tabular-nums text-muted-foreground">
					{tags.length}/{max}
				</span>
			}
			className={className}
		>
			<div
				className={cn(
					controlClass,
					"cms-tags flex min-h-10 flex-wrap items-center gap-1.5 px-1.5 py-1.5",
				)}
			>
				<ul
					ref={chips}
					className="contents"
					aria-label={typeof label === "string" ? label : undefined}
				>
					<AnimatePresence initial={false}>
						{tags.map((tag, index) => (
							<TagChip
								key={JSON.stringify([
									tag,
									tags.slice(0, index).filter((value) => value === tag).length,
								])}
							>
								<span className="min-w-0 wrap-anywhere">{tag}</span>
								<button
									type="button"
									onClick={() => {
										field.set(removeItem(tags, index));
										setLimitReached(false);
										requestAnimationFrame(() => {
											const buttons =
												chips.current?.querySelectorAll<HTMLButtonElement>(
													"li:not([inert]) button",
												);
											(buttons?.[index] ?? buttons?.[index - 1] ?? input.current)?.focus();
										});
									}}
									className="cms-press inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-[color-mix(in_srgb,var(--theme-ink)_8%,transparent)] hover:text-foreground pointer-coarse:size-11"
								>
									<span aria-hidden="true">×</span>
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
							add(draft);
						} else if (event.key === "Backspace" && draft === "" && tags.length) {
							field.set(tags.slice(0, -1));
							setLimitReached(false);
						}
					}}
					onCompositionStart={() => {
						composing.current = true;
					}}
					onCompositionEnd={() => {
						composing.current = false;
					}}
					onBlur={() => add(draft)}
					className="min-h-7 pointer-coarse:min-h-11 min-w-[8ch] flex-1 bg-transparent px-1.5 text-[14px] outline-hidden placeholder:text-muted-foreground/70"
				/>
			</div>
			{limitReached ? (
				<p role="status" className="m-0 text-xs text-muted-foreground">
					Maximum {max} tags. Remove a tag to add another.
				</p>
			) : null}
			{draft ? (
				<div className="justify-self-end">
					<Counter length={draft.trim().length} max={240} />
				</div>
			) : null}
		</FieldFrame>
	);
}

function TagChip({ children }: { children: ReactNode }) {
	const reduced = useReducedMotion();
	const present = useIsPresent();
	return (
		<motion.li
			inert={!present}
			layout={reduced ? false : "position"}
			initial={{ opacity: 0, scale: reduced ? 1 : 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: reduced ? 1 : 0.9 }}
			transition={reduced ? REDUCED : SPRING_SNAPPY}
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
 * An ordered list of strings (paragraphs, highlights). Each row has
 * move up/down (also Alt+↑/↓ from inside the row) and remove.
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
	const nextKey = useRef(0);
	const keys = useRef<number[]>([]);
	keys.current = Array.from(
		{ length: count },
		(_, index) => keys.current[index] ?? nextKey.current++,
	);

	const move = useCallback(
		(from: number, to: number) => {
			const items = (store.valueAt(path) as string[] | undefined) ?? [];
			if (to < 0 || to >= items.length) return;
			const focus = document.activeElement;
			keys.current = moveItem(keys.current, from, to);
			store.update(path, moveItem(items, from, to));
			requestAnimationFrame(() => {
				if (document.activeElement !== focus || focus?.matches(":disabled")) {
					focusField(childPath(path, to));
				}
			});
		},
		[path, store],
	);

	const remove = useCallback(
		(index: number) => {
			const items = (store.valueAt(path) as string[] | undefined) ?? [];
			keys.current = removeItem(keys.current, index);
			store.update(path, removeItem(items, index));
			const target = items.length > 1 ? childPath(path, Math.min(index, items.length - 2)) : path;
			requestAnimationFrame(() => focusField(target));
		},
		[path, store],
	);

	return (
		<FieldFrame
			path={path}
			label={label}
			description={description}
			issues={issues}
			changed={changed}
			onRevert={() => store.revertAt(path)}
			asGroup
			meta={
				<span className="font-mono text-[11px] tabular-nums text-muted-foreground">
					{count}/{max}
				</span>
			}
			className={className}
		>
			<Reorder.Group
				as="ol"
				axis="y"
				values={keys.current}
				onReorder={(next) => {
					const items = (store.valueAt(path) as string[] | undefined) ?? [];
					const reordered = next.map((key) => items[keys.current.indexOf(key)]);
					keys.current = next;
					store.update(path, reordered);
				}}
				className="m-0 grid min-w-0 list-none gap-2 p-0"
				aria-labelledby={`${fieldId(path)}-label`}
			>
				<AnimatePresence initial={false}>
					{keys.current.map((key, index) => (
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
			<div>
				<button
					type="button"
					id={fieldId(path)}
					aria-describedby={describedBy(path, Boolean(description), issues)}
					disabled={count >= max}
					onClick={() => {
						const items = (store.valueAt(path) as string[] | undefined) ?? [];
						keys.current = [...keys.current, nextKey.current++];
						store.update(path, [...items, ""]);
						requestAnimationFrame(() => focusField(childPath(path, count)));
					}}
					className={editorButton}
				>
					<span aria-hidden="true">+</span> {addLabel}
				</button>
			</div>
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
	remove: (index: number) => void;
}) {
	const field = useField<string | undefined>(path);
	const value = field.value ?? "";
	const Control = multiline ? "textarea" : "input";
	return (
		<SortableRow
			value={rowKey}
			label={label}
			reorderable={index > 0 || canMoveDown}
			className="cms-string-row"
			onKeyDown={(event) => {
				if (!event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
				event.preventDefault();
				move(index, index + (event.key === "ArrowUp" ? -1 : 1));
			}}
		>
			{(handle) => (
				<>
					<Control
						id={fieldId(path)}
						value={value}
						placeholder={placeholder}
						aria-label={label}
						aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
						aria-invalid={field.issues.length > 0 || undefined}
						aria-describedby={describedBy(path, false, field.issues)}
						rows={multiline ? 3 : undefined}
						onChange={(event) => field.set(event.currentTarget.value)}
						className={cn(
							controlClass,
							multiline ? "cms-textarea min-h-20 py-2.5 leading-relaxed" : "min-h-10",
						)}
					/>
					<div className="cms-string-tools flex flex-wrap items-center gap-1">
						{handle}
						<div className="ml-auto">
							<Counter length={value.length} max={maxLength} />
						</div>
						<RowActions
							label={label}
							canMoveUp={index > 0}
							canMoveDown={canMoveDown}
							onMoveUp={() => move(index, index - 1)}
							onMoveDown={() => move(index, index + 1)}
							onRemove={() => remove(index)}
						/>
					</div>
					<FieldMessage
						id={`${fieldId(path)}-error`}
						message={field.issues.map((issue) => issue.message).join(" ")}
					/>
				</>
			)}
		</SortableRow>
	);
});

/** Move up / move down / remove, shared by list rows and repeaters. */
export function RowActions({
	label,
	canMoveUp,
	canMoveDown,
	onMoveUp,
	onMoveDown,
	onRemove,
	className,
	children,
}: {
	label: string;
	canMoveUp: boolean;
	canMoveDown: boolean;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onRemove?: () => void;
	className?: string;
	children?: ReactNode;
}) {
	const button =
		"cms-press inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)] hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent pointer-coarse:size-11";
	return (
		<div className={cn("flex shrink-0 flex-wrap items-center gap-0.5", className)}>
			{children}
			<button type="button" className={button} disabled={!canMoveUp} onClick={onMoveUp}>
				<span aria-hidden="true">↑</span>
				<span className="sr-only">Move {label} up</span>
			</button>
			<button type="button" className={button} disabled={!canMoveDown} onClick={onMoveDown}>
				<span aria-hidden="true">↓</span>
				<span className="sr-only">Move {label} down</span>
			</button>
			{onRemove ? (
				<button type="button" className={cn(button, "hover:text-destructive")} onClick={onRemove}>
					<span aria-hidden="true">×</span>
					<span className="sr-only">Remove {label}</span>
				</button>
			) : null}
		</div>
	);
}
