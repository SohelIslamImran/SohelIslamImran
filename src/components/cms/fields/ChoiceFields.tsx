import { useId, type ReactNode } from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { Checkbox } from "@base-ui/react/checkbox";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { LayoutGroup, motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { Select } from "@base-ui/react/select";
import { Switch } from "@base-ui/react/switch";
import { cn } from "../../../lib/utils";
import { REDUCED, SPRING_SNAPPY, SPRING_SURFACE } from "../motion";
import { useField } from "../draft/context";
import { FieldFrame, controlClass, describedBy, fieldId } from "./FieldFrame";

export interface ChoiceOption<V extends string> {
	value: V;
	label: string;
	hint?: string;
	thumbnail?: ReactNode;
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
	const items = optional ? [{ value: NONE, label: "None" }, ...options] : options;
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
			<ChoiceSelect
				id={fieldId(path)}
				invalid={field.issues.length > 0}
				descriptionId={describedBy(path, Boolean(description), field.issues)}
				placeholder={placeholder}
				options={items}
				value={current}
				onChange={(next) => field.set(next === NONE ? undefined : (next as V))}
			/>
		</FieldFrame>
	);
}

export function ChoiceSelect({
	id,
	label,
	descriptionId,
	invalid,
	disabled,
	value,
	options,
	placeholder = "Choose…",
	onChange,
}: {
	id: string;
	label?: string;
	descriptionId?: string;
	invalid?: boolean;
	disabled?: boolean;
	value: string | null;
	options: readonly ChoiceOption<string>[];
	placeholder?: string;
	onChange: (value: string) => void;
}) {
	const items = [...options];
	const groupId = useId();
	const reduced = useReducedMotion();
	return (
		<Select.Root
			items={items}
			value={value}
			disabled={disabled}
			onValueChange={(next) => {
				if (next === null) return;
				onChange(next);
			}}
		>
			<Select.Trigger
				id={id}
				aria-label={label}
				aria-invalid={invalid || undefined}
				aria-describedby={descriptionId}
				className={cn(
					controlClass,
					"cms-press cms-choice-trigger flex min-h-10 cursor-pointer items-center justify-between gap-2 text-left",
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
				<Select.Positioner
					sideOffset={7}
					alignItemWithTrigger={false}
					className="isolate z-(--z-overlay) outline-none"
				>
					<Select.Popup className="cms-field-popup" render={<FieldPopup />}>
						<LayoutGroup id={groupId}>
							<Select.List className="cms-popup-list">
								{items.map((item) => (
									<Select.Item
										key={item.value}
										value={item.value}
										label={item.label}
										className="cms-choice-option cms-select-option"
										render={(props, { highlighted }) => (
											<div {...props}>
												{highlighted ? <ChoiceHighlight reduced={reduced} /> : null}
												{props.children}
											</div>
										)}
									>
										<Select.ItemIndicator className="col-start-1 text-primary-text">
											<span aria-hidden="true">✓</span>
										</Select.ItemIndicator>
										<span className="col-start-2 flex min-w-0 items-center gap-2.5">
											{item.thumbnail}
											<span className="grid min-w-0 wrap-anywhere">
												<Select.ItemText>{item.label}</Select.ItemText>
												{item.hint ? (
													<span className="text-xs text-muted-foreground">{item.hint}</span>
												) : null}
											</span>
										</span>
									</Select.Item>
								))}
							</Select.List>
						</LayoutGroup>
					</Select.Popup>
				</Select.Positioner>
			</Select.Portal>
		</Select.Root>
	);
}

function FieldPopup(props: HTMLMotionProps<"div">) {
	const reduced = useReducedMotion();
	return (
		<motion.div
			{...props}
			initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={reduced ? REDUCED : SPRING_SURFACE}
		/>
	);
}

function ChoiceHighlight({ reduced }: { reduced: boolean | null }) {
	return (
		<motion.span
			aria-hidden="true"
			className="cms-choice-highlight"
			layoutId={reduced ? undefined : "highlight"}
			transition={SPRING_SNAPPY}
		/>
	);
}

export function SuggestionField({
	path,
	label,
	description,
	items,
}: {
	path: string;
	label: string;
	description?: string;
	items: readonly string[];
}) {
	const field = useField<string | undefined>(path);
	const id = fieldId(path);
	const groupId = useId();
	const reduced = useReducedMotion();
	return (
		<FieldFrame
			path={path}
			label={label}
			description={description}
			issues={field.issues}
			changed={field.changed}
			onRevert={field.revert}
		>
			<div className="relative min-w-0">
				<Autocomplete.Root
					items={items}
					value={field.value ?? ""}
					onValueChange={field.set}
					openOnInputClick
					limit={24}
				>
					<Autocomplete.Input
						id={id}
						autoComplete="off"
						spellCheck={false}
						className={cn(controlClass, "min-h-10 pr-12 font-mono")}
						aria-invalid={field.issues.length > 0 || undefined}
						aria-describedby={describedBy(path, Boolean(description), field.issues)}
					/>
					<Autocomplete.Trigger
						aria-label={`Show ${label.toLowerCase()} suggestions`}
						className="cms-press absolute inset-y-0 right-0 grid min-w-10 place-items-center rounded-[10px] text-muted-foreground hover:text-foreground pointer-coarse:min-w-11"
					>
						<span aria-hidden="true">⌄</span>
					</Autocomplete.Trigger>
					<Autocomplete.Portal>
						<Autocomplete.Positioner sideOffset={7} className="isolate z-(--z-overlay)">
							<Autocomplete.Popup className="cms-field-popup" render={<FieldPopup />}>
								<Autocomplete.Empty className="px-3 py-2 text-xs text-muted-foreground empty:hidden">
									No suggestions. You can enter a custom value.
								</Autocomplete.Empty>
								<LayoutGroup id={groupId}>
									<Autocomplete.List className="cms-popup-list">
										{(item: string) => (
											<Autocomplete.Item
												key={item}
												value={item}
												className="cms-choice-option"
												render={(props, { highlighted }) => (
													<div {...props}>
														{highlighted ? <ChoiceHighlight reduced={reduced} /> : null}
														{props.children}
													</div>
												)}
											>
												{item}
											</Autocomplete.Item>
										)}
									</Autocomplete.List>
								</LayoutGroup>
							</Autocomplete.Popup>
						</Autocomplete.Positioner>
					</Autocomplete.Portal>
				</Autocomplete.Root>
			</div>
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
	const reduced = useReducedMotion();
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
				data-visible-field-control=""
				aria-labelledby={`${fieldId(path)}-label`}
				checked={checked}
				aria-invalid={field.issues.length > 0 || undefined}
				onCheckedChange={(next) => field.set(next ? true : optional ? undefined : false)}
				aria-describedby={describedBy(path, Boolean(description), field.issues)}
				className="cms-switch cms-press"
			>
				<span className="cms-switch-track" aria-hidden="true">
					<Switch.Thumb
						className="cms-switch-thumb"
						render={
							<motion.span
								initial={false}
								animate={{ x: checked ? 20 : 0 }}
								transition={reduced ? { duration: 0 } : SPRING_SNAPPY}
							/>
						}
					/>
				</span>
			</Switch.Root>
		</FieldFrame>
	);
}

export function CheckboxField({ path, label, optional = true }: SwitchFieldProps) {
	const field = useField<boolean | undefined>(path);
	const id = fieldId(path);
	return (
		<FieldFrame
			path={path}
			label={label}
			issues={field.issues}
			changed={field.changed}
			onRevert={field.revert}
		>
			<Checkbox.Root
				id={id}
				aria-labelledby={`${id}-label`}
				aria-invalid={field.issues.length > 0 || undefined}
				aria-describedby={describedBy(path, false, field.issues)}
				data-visible-field-control=""
				checked={field.value === true}
				onCheckedChange={(next) => field.set(next ? true : optional ? undefined : false)}
				className="cms-checkbox cms-press"
			>
				<span className="cms-checkbox-box" aria-hidden="true">
					<Checkbox.Indicator keepMounted className="cms-checkbox-check">
						✓
					</Checkbox.Indicator>
				</span>
			</Checkbox.Root>
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
	const groupId = useId();
	const reduced = useReducedMotion();
	const hint = description ?? options.find((option) => option.value === field.value)?.hint;
	return (
		<FieldFrame
			path={path}
			label={label}
			description={hint}
			issues={field.issues}
			changed={field.changed}
			onRevert={field.revert}
			asGroup
			className={className}
		>
			<LayoutGroup id={groupId}>
				<RadioGroup
					value={field.value ?? ""}
					onValueChange={(value) => field.set(value as V)}
					aria-labelledby={`${id}-label`}
					aria-describedby={describedBy(path, Boolean(hint), field.issues)}
					aria-invalid={field.issues.length > 0 || undefined}
					className="cms-segments flex justify-self-start"
				>
					{options.map((option, index) => (
						<Radio.Root
							key={option.value}
							id={index === 0 ? id : undefined}
							data-visible-field-control=""
							value={option.value}
							className="cms-segment cms-press"
						>
							{field.value === option.value ? <ChoiceHighlight reduced={reduced} /> : null}
							{option.label}
						</Radio.Root>
					))}
				</RadioGroup>
			</LayoutGroup>
		</FieldFrame>
	);
}
