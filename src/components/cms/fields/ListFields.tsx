import { useRef, useState, type ReactNode } from "react";
import { cn } from "../../../lib/utils";
import { useDraftStore, useField, useIssuesUnder } from "../draft/context";
import { childPath, insertItem, moveItem, removeItem } from "../draft/paths";
import { FieldFrame, controlClass, describedBy, fieldId } from "./FieldFrame";

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
	max = 100,
	className,
}: TagsFieldProps) {
	const field = useField<string[] | undefined>(path);
	const nested = useIssuesUnder(path);
	const tags = field.value ?? [];
	const [draft, setDraft] = useState("");
	const add = (raw: string) => {
		const parts = raw
			.split(",")
			.map((part) => part.trim())
			.filter(Boolean);
		if (!parts.length) return;
		const next = [...tags];
		for (const part of parts) {
			if (next.length >= max) break;
			if (!next.some((tag) => tag.toLowerCase() === part.toLowerCase())) next.push(part);
		}
		field.set(next);
		setDraft("");
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
					"flex min-h-10 flex-wrap items-center gap-1.5 px-1.5 py-1.5 focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--theme-focus)_28%,transparent)]",
				)}
			>
				<ul className="contents" aria-label={typeof label === "string" ? label : undefined}>
					{tags.map((tag, index) => (
						<li
							key={`${tag}-${index}`}
							className="inline-flex min-h-7 items-center gap-0.5 rounded-full border border-line bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)] py-0.5 pr-0.5 pl-2.5 text-[12.5px] text-foreground"
						>
							{tag}
							<button
								type="button"
								onClick={() => field.set(removeItem(tags, index))}
								className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-[color-mix(in_srgb,var(--theme-ink)_8%,transparent)] hover:text-foreground pointer-coarse:size-8"
							>
								<span aria-hidden="true">×</span>
								<span className="sr-only">Remove {tag}</span>
							</button>
						</li>
					))}
				</ul>
				<input
					id={fieldId(path)}
					value={draft}
					placeholder={tags.length ? "" : placeholder}
					aria-describedby={describedBy(path, Boolean(description), nested)}
					aria-invalid={nested.length > 0 || undefined}
					onChange={(event) => {
						const value = event.currentTarget.value;
						if (value.includes(",")) add(value);
						else setDraft(value);
					}}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							add(draft);
						} else if (event.key === "Backspace" && draft === "" && tags.length) {
							field.set(tags.slice(0, -1));
						}
					}}
					onBlur={() => add(draft)}
					className="min-h-7 min-w-[8ch] flex-1 bg-transparent px-1.5 text-[14px] outline-hidden placeholder:text-muted-foreground/70"
				/>
			</div>
		</FieldFrame>
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
	max = 100,
	multiline = false,
	className,
}: StringListFieldProps) {
	const store = useDraftStore();
	const field = useField<string[] | undefined>(path);
	const issues = useIssuesUnder(path);
	const items = field.value ?? [];
	const listRef = useRef<HTMLOListElement>(null);
	const focusRow = (index: number) =>
		requestAnimationFrame(() => document.getElementById(fieldId(childPath(path, index)))?.focus());
	const move = (from: number, to: number) => {
		if (to < 0 || to >= items.length) return;
		field.set(moveItem(items, from, to));
		focusRow(to);
	};
	return (
		<FieldFrame
			path={path}
			label={label}
			description={description}
			issues={field.issues}
			changed={field.changed}
			onRevert={field.revert}
			asGroup
			meta={
				<span className="font-mono text-[11px] tabular-nums text-muted-foreground">
					{items.length}/{max}
				</span>
			}
			className={className}
		>
			<ol
				ref={listRef}
				className="m-0 grid list-none gap-2 p-0"
				aria-labelledby={`${fieldId(path)}-label`}
			>
				{items.map((item, index) => {
					const rowPath = childPath(path, index);
					const rowIssues = issues.filter((issue) => issue.path === rowPath);
					const Control = multiline ? "textarea" : "input";
					return (
						<li key={index} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
							<span className="mt-2.5 w-6 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
								{String(index + 1).padStart(2, "0")}
							</span>
							<div className="grid min-w-0 gap-1">
								<Control
									id={fieldId(rowPath)}
									value={item}
									placeholder={placeholder}
									aria-label={`${itemLabel} ${index + 1}`}
									aria-invalid={rowIssues.length > 0 || undefined}
									rows={multiline ? 3 : undefined}
									onChange={(event) => store.update(rowPath, event.currentTarget.value)}
									onKeyDown={(event) => {
										if (!event.altKey) return;
										if (event.key === "ArrowUp") {
											event.preventDefault();
											move(index, index - 1);
										} else if (event.key === "ArrowDown") {
											event.preventDefault();
											move(index, index + 1);
										}
									}}
									className={cn(
										controlClass,
										multiline ? "min-h-20 resize-y py-2.5 leading-relaxed" : "min-h-10",
									)}
								/>
								{rowIssues.length ? (
									<p className="m-0 text-[12.5px] text-destructive">
										<span aria-hidden="true">! </span>
										{rowIssues.map((issue) => issue.message).join(" · ")}
									</p>
								) : null}
							</div>
							<RowActions
								label={`${itemLabel} ${index + 1}`}
								canMoveUp={index > 0}
								canMoveDown={index < items.length - 1}
								onMoveUp={() => move(index, index - 1)}
								onMoveDown={() => move(index, index + 1)}
								onRemove={() => {
									field.set(removeItem(items, index));
									if (items.length > 1) focusRow(Math.max(0, index - 1));
								}}
							/>
						</li>
					);
				})}
			</ol>
			<div>
				<button
					type="button"
					disabled={items.length >= max}
					onClick={() => {
						field.set(insertItem(items, items.length, ""));
						focusRow(items.length);
					}}
					className="pressable inline-flex min-h-9 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3.5 text-[13px] font-medium text-ink-soft hover:border-solid hover:text-foreground disabled:opacity-45 pointer-coarse:min-h-11"
				>
					<span aria-hidden="true">+</span> {addLabel}
				</button>
			</div>
		</FieldFrame>
	);
}

/** Move up / move down / remove, shared by list rows and repeaters. */
export function RowActions({
	label,
	canMoveUp,
	canMoveDown,
	onMoveUp,
	onMoveDown,
	onRemove,
	children,
}: {
	label: string;
	canMoveUp: boolean;
	canMoveDown: boolean;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onRemove?: () => void;
	children?: ReactNode;
}) {
	const button =
		"inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)] hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent pointer-coarse:size-11";
	return (
		<div className="flex shrink-0 items-center gap-0.5">
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
