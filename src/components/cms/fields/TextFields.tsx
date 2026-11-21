import { useLayoutEffect, useRef, type ReactNode } from "react";
import type { ValidationIssue } from "../../../lib/validation";
import { cn } from "../../../lib/utils";
import { useField } from "../draft/context";
import { FieldFrame, controlClass, describedBy, fieldId } from "./FieldFrame";

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
	extraIssue?: ValidationIssue;
}

export function Counter({ length, max }: { length: number; max?: number }) {
	if (!max) return null;
	const over = length > max;
	return (
		<span
			className={cn(
				"font-mono text-[11px] tabular-nums",
				over ? "text-destructive" : "text-muted-foreground",
			)}
		>
			{length}/{max}
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
	extraIssue,
}: TextFieldProps) {
	const field = useField<string | undefined>(path);
	const value = valueOverride ?? field.value ?? "";
	const issues = extraIssue ? [...field.issues, extraIssue] : field.issues;
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
				<input
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
}

/** Auto-growing textarea for prose. */
export function TextAreaField({
	path,
	label,
	description,
	placeholder,
	maxLength,
	optional,
	className,
	disabled,
	rows = 3,
	required,
}: TextAreaFieldProps) {
	const field = useField<string | undefined>(path);
	const value = field.value ?? "";
	const ref = useRef<HTMLTextAreaElement>(null);
	useLayoutEffect(() => {
		const element = ref.current;
		if (!element) return;
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
				ref={ref}
				id={fieldId(path)}
				rows={rows}
				value={value}
				placeholder={placeholder}
				disabled={disabled}
				aria-required={required || undefined}
				aria-invalid={field.issues.length > 0 || undefined}
				aria-describedby={describedBy(path, Boolean(description), field.issues)}
				onChange={(event) => {
					const next = event.currentTarget.value;
					field.set(optional && next === "" ? undefined : next);
				}}
				className={cn(controlClass, "min-h-20 resize-y py-2.5 leading-relaxed")}
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
			<input
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
