import type { ReactNode } from "react";
import { Select } from "@base-ui/react/select";
import { Switch } from "@base-ui/react/switch";
import { cn } from "../../../lib/utils";
import { useField } from "../draft/context";
import { FieldFrame, controlClass, describedBy, fieldId } from "./FieldFrame";

export interface ChoiceOption<V extends string> {
	value: V;
	label: string;
	hint?: string;
}

export interface SelectFieldProps<V extends string> {
	path: string;
	label: ReactNode;
	description?: ReactNode;
	options: readonly ChoiceOption<V>[];
	/** Offer "None" and store `undefined` (optional enum fields). */
	optional?: boolean;
	placeholder?: string;
	className?: string;
}

const NONE = "__none__";

/** Dropdown on Base UI Select, styled to the CMS density tier. */
export function SelectField<V extends string>({
	path,
	label,
	description,
	options,
	optional,
	placeholder = "Choose…",
	className,
}: SelectFieldProps<V>) {
	const field = useField<V | undefined>(path);
	const current = field.value ?? (optional ? NONE : null);
	const items = [
		...(optional ? [{ value: NONE, label: "None" }] : []),
		...options.map((option) => ({ value: option.value as string, label: option.label })),
	];
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
			<Select.Root
				items={items}
				value={current}
				onValueChange={(next) => {
					if (next === null) return;
					field.set(next === NONE ? undefined : (next as V));
				}}
			>
				<Select.Trigger
					id={fieldId(path)}
					aria-invalid={field.issues.length > 0 || undefined}
					aria-describedby={describedBy(path, Boolean(description), field.issues)}
					className={cn(
						controlClass,
						"flex min-h-10 cursor-default items-center justify-between gap-2 text-left data-[popup-open]:border-ring",
					)}
				>
					<Select.Value placeholder={placeholder} className="min-w-0 truncate" />
					<Select.Icon className="shrink-0 text-muted-foreground">
						<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none">
							<path d="m4.5 6.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" />
						</svg>
					</Select.Icon>
				</Select.Trigger>
				<Select.Portal>
					<Select.Positioner sideOffset={6} className="isolate z-(--z-overlay) outline-none">
						<Select.Popup className="cms-popup min-w-(--anchor-width) origin-(--transform-origin) rounded-[14px] border border-line bg-surface-solid p-1 text-[14px] shadow-float outline-hidden transition-[opacity,transform,scale] duration-150 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0">
							<Select.List className="max-h-[min(320px,var(--available-height))] overflow-y-auto">
								{items.map((item) => {
									const option = options.find((candidate) => candidate.value === item.value);
									return (
										<Select.Item
											key={item.value}
											value={item.value}
											className="grid min-h-10 cursor-default grid-cols-[16px_1fr] items-center gap-2 rounded-[10px] px-2.5 py-1.5 outline-hidden select-none data-[highlighted]:bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)]"
										>
											<Select.ItemIndicator className="col-start-1 text-primary-text">
												<svg
													viewBox="0 0 16 16"
													width="14"
													height="14"
													aria-hidden="true"
													fill="none"
												>
													<path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.6" />
												</svg>
											</Select.ItemIndicator>
											<span className="col-start-2 grid min-w-0">
												<Select.ItemText>{item.label}</Select.ItemText>
												{option?.hint ? (
													<span className="text-[12px] text-muted-foreground">{option.hint}</span>
												) : null}
											</span>
										</Select.Item>
									);
								})}
							</Select.List>
						</Select.Popup>
					</Select.Positioner>
				</Select.Portal>
			</Select.Root>
		</FieldFrame>
	);
}

export interface SwitchFieldProps {
	path: string;
	label: ReactNode;
	description?: ReactNode;
	className?: string;
	/** Store `undefined` when off (optional boolean flags such as `featured`). */
	optional?: boolean;
}

export function SwitchField({
	path,
	label,
	description,
	className,
	optional = true,
}: SwitchFieldProps) {
	const field = useField<boolean | undefined>(path);
	const checked = field.value === true;
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
			<Switch.Root
				id={fieldId(path)}
				checked={checked}
				onCheckedChange={(next) => field.set(next ? true : optional ? undefined : false)}
				aria-describedby={describedBy(path, Boolean(description), field.issues)}
				className="group/switch relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-control-border bg-[color-mix(in_srgb,var(--theme-ink)_10%,transparent)] p-0.5 outline-hidden transition-[background-color,border-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[checked]:border-transparent data-[checked]:bg-primary"
			>
				<Switch.Thumb className="block size-[22px] rounded-full bg-surface-solid shadow-[0_1px_3px_var(--theme-shadow)] transition-transform duration-200 ease-trace data-[checked]:translate-x-5" />
			</Switch.Root>
		</FieldFrame>
	);
}

export interface SegmentedFieldProps<V extends string> {
	path: string;
	label: ReactNode;
	description?: ReactNode;
	options: readonly ChoiceOption<V>[];
	className?: string;
}

/** A small set of mutually exclusive values shown at once (radio group). */
export function SegmentedField<V extends string>({
	path,
	label,
	description,
	options,
	className,
}: SegmentedFieldProps<V>) {
	const field = useField<V | undefined>(path);
	const id = fieldId(path);
	return (
		<FieldFrame
			path={path}
			label={label}
			description={description}
			issues={field.issues}
			changed={field.changed}
			onRevert={field.revert}
			asGroup
			className={className}
		>
			<div
				role="radiogroup"
				aria-labelledby={`${id}-label`}
				aria-describedby={describedBy(path, Boolean(description), field.issues)}
				className="inline-flex max-w-full flex-wrap gap-1 rounded-[12px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_4%,transparent)] p-1"
			>
				{options.map((option, index) => {
					const selected = field.value === option.value;
					return (
						<button
							key={option.value}
							id={index === 0 ? id : undefined}
							type="button"
							role="radio"
							aria-checked={selected}
							tabIndex={selected || (field.value === undefined && index === 0) ? 0 : -1}
							onClick={() => field.set(option.value)}
							onKeyDown={(event) => {
								if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key))
									return;
								event.preventDefault();
								const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
								const next = options[(index + step + options.length) % options.length];
								if (!next) return;
								field.set(next.value);
								const group = event.currentTarget.parentElement;
								requestAnimationFrame(() =>
									group?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus(),
								);
							}}
							className={cn(
								"min-h-9 rounded-[9px] px-3 text-[13px] font-medium text-ink-soft outline-hidden transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-ring",
								selected
									? "bg-surface-solid text-foreground shadow-[0_1px_2px_var(--theme-shadow-soft),inset_0_1px_var(--theme-highlight)]"
									: "hover:text-foreground",
							)}
						>
							{option.label}
						</button>
					);
				})}
			</div>
		</FieldFrame>
	);
}
