import { Input } from "@base-ui/react/input";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "../../../lib/utils";
import { REDUCED, SPRING_SNAPPY } from "../motion";
import { useField } from "../draft/context";
import { FieldFrame, controlClass, describedBy, fieldId } from "./FieldFrame";
import { toSingleLine } from "./field-logic";

interface BaseFieldProps {
	path: string;
	label: ReactNode;
	description?: ReactNode;
	placeholder?: string;
	/** Soft limit shown as a counter; the validator owns hard limits. */
	maxLength?: number;
	/** Store `undefined` instead of "" when cleared (optional string fields). */
	optional?: boolean;
	className?: string;
	disabled?: boolean;
	required?: boolean;
}

export interface TextFieldProps extends BaseFieldProps {
	type?: "text" | "email" | "url" | "search" | "date";
	inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
	autoComplete?: string;
	spellCheck?: boolean;
	/** Monospace input, for slugs, ids, hrefs. */
	mono?: boolean;
	prefix?: ReactNode;
	valueOverride?: string;
}

export function Counter({ length, max }: { length: number; max?: number }) {
	const reduced = useReducedMotion();
	if (!max || length < Math.ceil(max * 0.8)) return null;
	return (
		<span
			className={cn(
				"cms-counter inline-flex font-mono text-[11px] tabular-nums",
				length > max ? "text-destructive" : "text-muted-foreground",
			)}
		>
			<AnimatePresence initial={false}>
				<motion.span
					key={length}
					initial={{ opacity: 0.5, y: reduced ? 0 : 3 }}
					animate={{ opacity: 1, y: 0 }}
					transition={reduced ? REDUCED : SPRING_SNAPPY}
				>
					{length}
				</motion.span>
			</AnimatePresence>
			/{max}
		</span>
	);
}

export function TextField({
	path,
	label,
	description,
	placeholder,
	maxLength,
	optional,
	className,
	disabled,
	type = "text",
	inputMode,
	autoComplete = "off",
	spellCheck,
	mono,
	prefix,
	required,
	valueOverride,
}: TextFieldProps) {
	const field = useField<string | undefined>(path);
	const value = valueOverride ?? field.value ?? "";
	const { issues } = field;
	return (
		<FieldFrame
			path={path}
			label={label}
			description={description}
			issues={issues}
			changed={field.changed}
			onRevert={field.revert}
			meta={<Counter length={value.length} max={maxLength} />}
			className={className}
		>
			<div className="relative flex min-w-0 items-center">
				{prefix ? (
					<span className="pointer-events-none absolute left-3 font-mono text-[12.5px] text-muted-foreground">
						{prefix}
					</span>
				) : null}
				<Input
					id={fieldId(path)}
					type={type}
					value={value}
					placeholder={placeholder}
					disabled={disabled}
					aria-required={required || undefined}
					inputMode={inputMode}
					autoComplete={autoComplete}
					spellCheck={spellCheck}
					aria-invalid={issues.length > 0 || undefined}
					aria-describedby={describedBy(path, Boolean(description), issues)}
					onChange={(event) => {
						const next = event.currentTarget.value;
						field.set(optional && next === "" ? undefined : next);
					}}
					className={cn(
						controlClass,
						"min-h-10",
						mono && "font-mono text-[13px]",
						prefix && "pl-[calc(var(--prefix-ch,1)*1ch+1.5rem)]",
					)}
					style={
						prefix && typeof prefix === "string"
							? ({ "--prefix-ch": prefix.length } as React.CSSProperties)
							: undefined
					}
				/>
			</div>
		</FieldFrame>
	);
}

export interface TextAreaFieldProps extends BaseFieldProps {
	rows?: number;
	/**
	 * One line of text that wraps on screen (headlines, roles): Return does
	 * nothing, pasted line breaks become spaces, and the box starts at the
	 * height of a text input.
	 */
	singleLine?: boolean;
}

/** Auto-growing textarea for prose, or a wrapping single line. */
export function TextAreaField({
	path,
	label,
	description,
	placeholder,
	maxLength,
	optional,
	className,
	disabled,
	rows: rowsProp = 3,
	singleLine = false,
	required,
}: TextAreaFieldProps) {
	const rows = singleLine ? 1 : rowsProp;
	const field = useField<string | undefined>(path);
	const value = field.value ?? "";
	const textarea = useRef<HTMLTextAreaElement>(null);
	useLayoutEffect(() => {
		const element = textarea.current;
		if (!element || CSS.supports("field-sizing", "content")) return;
		element.style.height = "auto";
		element.style.height = `${element.scrollHeight + 2}px`;
	}, [value]);
	return (
		<FieldFrame
			path={path}
			label={label}
			description={description}
			issues={field.issues}
			changed={field.changed}
			onRevert={field.revert}
			meta={<Counter length={value.length} max={maxLength} />}
			className={className}
		>
			<textarea
				ref={textarea}
				id={fieldId(path)}
				rows={rows}
				style={singleLine ? undefined : { minBlockSize: `calc(${rows}lh + 22px)` }}
				value={value}
				placeholder={placeholder}
				disabled={disabled}
				aria-required={required || undefined}
				aria-invalid={field.issues.length > 0 || undefined}
				aria-describedby={describedBy(path, Boolean(description), field.issues)}
				onKeyDown={
					singleLine
						? (event) => {
								if (event.key === "Enter" && !event.nativeEvent.isComposing) event.preventDefault();
							}
						: undefined
				}
				onChange={(event) => {
					const raw = event.currentTarget.value;
					const next = singleLine ? toSingleLine(raw) : raw;
					field.set(optional && next === "" ? undefined : next);
				}}
				className={cn(
					controlClass,
					"cms-textarea",
					singleLine
						? "cms-textarea-single min-h-10 py-[8px] leading-[22px]"
						: "py-2.5 leading-relaxed",
				)}
			/>
		</FieldFrame>
	);
}

export interface NumberFieldProps extends Omit<BaseFieldProps, "maxLength"> {
	min?: number;
	max?: number;
	step?: number | "any";
}

/** Optional numeric value; an empty input stores `undefined`. */
export function NumberField({
	path,
	label,
	description,
	placeholder,
	className,
	disabled,
	min,
	max,
	step = "any",
}: NumberFieldProps) {
	const field = useField<number | undefined>(path);
	return (
		<FieldFrame
			path={path}
			label={label}
			description={description}
			issues={field.issues}
			changed={field.changed}
			onRevert={field.revert}
			className={className}
		>
			<Input
				id={fieldId(path)}
				type="number"
				inputMode="decimal"
				value={field.value ?? ""}
				placeholder={placeholder}
				disabled={disabled}
				min={min}
				max={max}
				step={step}
				aria-invalid={field.issues.length > 0 || undefined}
				aria-describedby={describedBy(path, Boolean(description), field.issues)}
				onChange={(event) => {
					const raw = event.currentTarget.value;
					const parsed = raw === "" ? undefined : Number(raw);
					field.set(parsed === undefined || Number.isNaN(parsed) ? undefined : parsed);
				}}
				className={cn(controlClass, "min-h-10 font-mono tabular-nums")}
			/>
		</FieldFrame>
	);
}
