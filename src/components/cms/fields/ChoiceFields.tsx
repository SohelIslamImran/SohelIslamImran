import { useCallback, useId, useState, type ReactNode } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Checkbox } from "@base-ui/react/checkbox";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { LayoutGroup, motion } from "motion/react";
import { Select } from "@base-ui/react/select";
import { Switch } from "@base-ui/react/switch";
import { useLiveReducedMotion } from "../shell/use-live-reduced-motion";
import { cn } from "../../../lib/utils";
import { REDUCED, SPRING_SNAPPY } from "../motion";
import { useField } from "../draft/context";
import {
	FieldFrame,
	controlClass,
	describedBy,
	fieldId,
	useFieldIssueFeedback,
} from "./FieldFrame";
import { InputShell, identifierAttributes, inputClass } from "./InputShell";
import { splitMatch } from "./field-logic";
import { CheckIcon, ChevronDownIcon, PlusIcon } from "./field-icons";

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
			optional={optional}
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
	trigger = "field",
	triggerContent,
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
	trigger?: "field" | "media" | "add-row";
	triggerContent?: ReactNode;
}) {
	const items = [...options];
	const groupId = useId();
	const reduced = useLiveReducedMotion();
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
					trigger === "add-row"
						? "cms-stack-add"
						: trigger === "media"
							? "cms-control w-full"
							: controlClass,
					"cms-choice-trigger",
					trigger === "media" && "cms-media-card",
				)}
			>
				{trigger === "add-row" ? <PlusIcon className="size-4 shrink-0" /> : null}
				{triggerContent ?? <Select.Value placeholder={placeholder} className="min-w-0 truncate" />}
				<Select.Icon className="cms-control-icon">
					<ChevronDownIcon className="size-3.5" />
				</Select.Icon>
			</Select.Trigger>
			<Select.Portal>
				<Select.Positioner
					sideOffset={7}
					alignItemWithTrigger={false}
					className="isolate z-(--z-overlay) outline-none"
				>
					<Select.Popup className="cms-field-popup">
						<LayoutGroup id={groupId}>
							<Select.List className="cms-popup-list">
								{items.length === 0 ? (
									<p className="px-3 py-2 text-xs text-muted-foreground">No options</p>
								) : null}
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
										<Select.ItemIndicator className="cms-choice-check col-start-1">
											<CheckIcon className="size-3.5 stroke-2" />
										</Select.ItemIndicator>
										<span className="col-start-2 flex min-w-0 items-center gap-2.5">
											{item.thumbnail}
											<span className="grid min-w-0 wrap-anywhere">
												<Select.ItemText>{item.label}</Select.ItemText>
												{item.hint ? (
													<span className="cms-choice-hint text-xs">{item.hint}</span>
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

/**
 * A text input with a suggestion list (time zones). Opening the list shows
 * every suggestion; typing filters it. Focus selects the current value, so
 * typing replaces it instead of appending.
 */
export function SuggestionField({
	path,
	label,
	description,
	items,
	emptyMessage = "No matches.",
}: {
	path: string;
	label: string;
	description?: string;
	items: readonly string[];
	emptyMessage?: string;
}) {
	const field = useField<string | undefined>(path);
	const id = fieldId(path);
	const groupId = useId();
	const reduced = useLiveReducedMotion();
	const value = field.value ?? "";
	const feedback = useFieldIssueFeedback(field.issues, value);
	const [open, setOpen] = useState(false);
	// Show the whole list when it opens; filter once the owner types.
	const [typed, setTyped] = useState(false);
	const query = value.trim().toLowerCase();
	const filtered =
		typed && query ? items.filter((item) => item.toLowerCase().includes(query)) : items;
	const scrollToCurrent = useCallback(
		(list: HTMLDivElement | null) => {
			if (!list || !open || typed) return;
			const current = list.querySelector<HTMLElement>("[data-current]");
			if (!current) return;
			const center = () => {
				list.scrollTop = current.offsetTop - (list.clientHeight - current.offsetHeight) / 2;
			};
			center();
			// Recheck once the positioner has set the available height.
			const frame = requestAnimationFrame(center);
			return () => cancelAnimationFrame(frame);
		},
		[open, typed],
	);
	return (
		<FieldFrame
			path={path}
			label={label}
			description={description}
			issues={feedback.issues}
			changed={field.changed}
			onRevert={field.revert}
		>
			<div className="relative min-w-0">
				<Combobox.Root
					items={items}
					filteredItems={filtered}
					value={items.includes(value) ? value : null}
					inputValue={value}
					onInputValueChange={(next, details) => {
						if (details.reason !== "input-change") return;
						setTyped(true);
						field.set(next);
					}}
					onValueChange={(next, details) => {
						if (next === null || details.reason !== "item-press") return;
						feedback.commit();
						field.set(next);
					}}
					onOpenChange={(open, details) => {
						setOpen(open);
						if (open && details.reason !== "input-change") setTyped(false);
					}}
					openOnInputClick
				>
					<InputShell
						invalid={feedback.issues.length > 0}
						trailing={
							<Combobox.Trigger
								aria-label={`Show ${label.toLowerCase()} suggestions`}
								className="cms-input-action cms-combo-trigger"
							>
								<ChevronDownIcon className="size-3.5" />
							</Combobox.Trigger>
						}
					>
						<Combobox.Input
							id={id}
							{...identifierAttributes}
							className={inputClass}
							aria-invalid={feedback.issues.length > 0 || undefined}
							aria-describedby={describedBy(path, Boolean(description), feedback.issues)}
							data-settle-issues=""
							onBlur={feedback.onBlur}
							onFocus={(event) => {
								feedback.onFocus();
								const input = event.currentTarget;
								// After the click that focused it places the caret.
								requestAnimationFrame(() => {
									if (document.activeElement === input) input.select();
								});
							}}
						/>
					</InputShell>
					<Combobox.Portal>
						<Combobox.Positioner sideOffset={7} className="isolate z-(--z-overlay)">
							<Combobox.Popup className="cms-field-popup">
								<Combobox.Empty className="px-3 py-2 text-xs text-muted-foreground empty:hidden">
									{emptyMessage}
								</Combobox.Empty>
								<LayoutGroup id={groupId}>
									<Combobox.List ref={scrollToCurrent} className="cms-popup-list relative">
										{(item: string) => {
											const [before, match, after] = splitMatch(item, typed ? query : "");
											return (
												<Combobox.Item
													key={item}
													value={item}
													data-current={item === value || undefined}
													className="cms-choice-option cms-select-option"
													render={(props, { highlighted }) => (
														<div {...props}>
															{highlighted ? <ChoiceHighlight reduced={reduced} /> : null}
															{props.children}
														</div>
													)}
												>
													{item === value ? (
														<CheckIcon className="cms-choice-check col-start-1 size-3.5 stroke-2" />
													) : null}
													<span className="col-start-2 min-w-0">
														{before}
														{match ? <mark className="cms-match">{match}</mark> : null}
														{after}
														{item === value ? (
															<span className="sr-only"> (current value)</span>
														) : null}
													</span>
												</Combobox.Item>
											);
										}}
									</Combobox.List>
								</LayoutGroup>
							</Combobox.Popup>
						</Combobox.Positioner>
					</Combobox.Portal>
				</Combobox.Root>
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
	const reduced = useLiveReducedMotion();
	const [pressed, setPressed] = useState(false);
	return (
		<FieldFrame
			path={path}
			label={label}
			description={description}
			issues={field.issues}
			changed={field.changed}
			onRevert={field.revert}
			layout="inline"
			className={className}
		>
			<Switch.Root
				id={fieldId(path)}
				data-visible-field-control=""
				data-pressed={!reduced && pressed ? "" : undefined}
				aria-labelledby={`${fieldId(path)}-label`}
				checked={checked}
				aria-invalid={field.issues.length > 0 || undefined}
				onCheckedChange={(next) => field.set(next ? true : optional ? undefined : false)}
				aria-describedby={describedBy(path, Boolean(description), field.issues)}
				onPointerDown={() => setPressed(true)}
				onPointerUp={() => setPressed(false)}
				onPointerCancel={() => setPressed(false)}
				onPointerLeave={() => setPressed(false)}
				onKeyDown={(event) => {
					if (event.key === " " || event.key === "Enter") setPressed(true);
				}}
				onKeyUp={(event) => {
					if (event.key === " " || event.key === "Enter") setPressed(false);
				}}
				onBlur={() => setPressed(false)}
				className="cms-switch"
			>
				<span className="cms-switch-track" aria-hidden="true">
					<Switch.Thumb
						className="cms-switch-thumb"
						render={
							<motion.span
								initial={false}
								animate={{ x: checked ? 18 : 0 }}
								transition={reduced ? { duration: 0 } : SPRING_SNAPPY}
							>
								<span className="cms-switch-thumb-inner" />
							</motion.span>
						}
					/>
				</span>
			</Switch.Root>
		</FieldFrame>
	);
}

export function CheckboxField({ path, label, description, optional = true }: SwitchFieldProps) {
	const field = useField<boolean | undefined>(path);
	const checked = field.value === true;
	const reduced = useLiveReducedMotion();
	const id = fieldId(path);
	return (
		<FieldFrame
			path={path}
			label={label}
			description={description}
			issues={field.issues}
			changed={field.changed}
			onRevert={field.revert}
			layout="inline"
		>
			<Checkbox.Root
				id={id}
				aria-labelledby={`${id}-label`}
				aria-invalid={field.issues.length > 0 || undefined}
				aria-describedby={describedBy(path, Boolean(description), field.issues)}
				data-visible-field-control=""
				checked={checked}
				onCheckedChange={(next) => field.set(next ? true : optional ? undefined : false)}
				className="cms-checkbox cms-press"
			>
				<span className="cms-checkbox-box" aria-hidden="true">
					<Checkbox.Indicator keepMounted className="cms-checkbox-check">
						<svg
							viewBox="0 0 20 20"
							aria-hidden="true"
							className="size-3.5 shrink-0 fill-none stroke-current stroke-[2.2] [stroke-linecap:round] [stroke-linejoin:round]"
						>
							<motion.path
								d="m4.75 10.25 3.5 3.5 7-7.5"
								initial={false}
								animate={
									checked
										? { pathLength: 1, opacity: 1 }
										: { pathLength: reduced ? 1 : 0, opacity: 0 }
								}
								transition={
									reduced
										? { pathLength: { duration: 0 }, opacity: REDUCED }
										: checked
											? { pathLength: SPRING_SNAPPY, opacity: { duration: 0.08, ease: "linear" } }
											: {
													opacity: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
													pathLength: { duration: 0, delay: 0.16 },
												}
								}
							/>
						</svg>
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
	const reduced = useLiveReducedMotion();
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
