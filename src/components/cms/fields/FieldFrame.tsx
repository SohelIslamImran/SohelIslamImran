import type { ReactNode } from "react";
import type { ValidationIssue } from "../../../lib/validation";
import { cn } from "../../../lib/utils";

/**
 * Deterministic DOM id for the control at a content path, so a validation
 * summary, the command bar, or a release diff can focus it:
 * `focusField("projects[2].title")`.
 */
export function fieldId(path: string): string {
	return `cms-field-${path.replace(/[^A-Za-z0-9_-]+/gu, "-").replace(/-+$/u, "")}`;
}

/** Scroll to and focus the control for a path. Returns false when it is not on screen. */
export function focusField(path: string): boolean {
	if (typeof document === "undefined") return false;
	const control = document.getElementById(fieldId(path));
	if (!(control instanceof HTMLElement)) return false;
	control.scrollIntoView({ block: "center", inline: "nearest" });
	control.focus({ preventScroll: true });
	return true;
}

export interface FieldFrameProps {
	path: string;
	label: ReactNode;
	description?: ReactNode;
	issues: readonly ValidationIssue[];
	changed: boolean;
	onRevert?: () => void;
	/** Right side of the label row: a character count, a hint. */
	meta?: ReactNode;
	/** Render the label as a legend-like title, not a `<label for>` (for groups). */
	asGroup?: boolean;
	className?: string;
	children: ReactNode;
}

/**
 * Label, description, trace mark, revert action, and errors around one
 * control. The trace mark (a 2px accent bar in the gutter plus a "Changed"
 * text label for assistive tech) appears when the draft differs from live.
 */
export function FieldFrame({
	path,
	label,
	description,
	issues,
	changed,
	onRevert,
	meta,
	asGroup = false,
	className,
	children,
}: FieldFrameProps) {
	const id = fieldId(path);
	const descriptionId = description ? `${id}-description` : undefined;
	const errorId = issues.length ? `${id}-error` : undefined;
	const LabelTag = asGroup ? "p" : "label";
	return (
		<div
			data-slot="cms-field"
			data-changed={changed || undefined}
			data-invalid={issues.length > 0 || undefined}
			className={cn("cms-field group/cms-field relative grid min-w-0 gap-1.5", className)}
		>
			<span aria-hidden="true" data-slot="cms-trace-mark" className="cms-trace-mark" />
			<div className="flex min-h-6 min-w-0 items-center justify-between gap-3">
				<LabelTag
					{...(asGroup ? { id: `${id}-label` } : { htmlFor: id })}
					className="m-0 min-w-0 text-[13px] font-medium text-foreground"
				>
					{label}
					{changed ? <span className="sr-only"> (changed from live)</span> : null}
				</LabelTag>
				<div className="flex shrink-0 items-center gap-2">
					{meta}
					{changed && onRevert ? (
						<button
							type="button"
							onClick={onRevert}
							className="cms-revert pressable inline-flex min-h-7 items-center gap-1 rounded-full px-2 font-mono text-[11px] text-muted-foreground hover:bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)] hover:text-foreground"
						>
							<span aria-hidden="true">↺</span> Revert
							<span className="sr-only">
								{" "}
								{typeof label === "string" ? label : "field"} to live
							</span>
						</button>
					) : null}
				</div>
			</div>
			{children}
			{description ? (
				<p id={descriptionId} className="m-0 text-[12.5px] leading-normal text-muted-foreground">
					{description}
				</p>
			) : null}
			{issues.length ? (
				<p
					id={errorId}
					data-slot="cms-field-error"
					className="m-0 flex items-start gap-1.5 text-[12.5px] leading-normal text-destructive"
				>
					<span aria-hidden="true" className="font-mono">
						!
					</span>
					<span>{issues.map((issue) => sentenceCase(issue.message)).join(" · ")}</span>
				</p>
			) : null}
		</div>
	);
}

/** `aria-describedby` for a control rendered inside `FieldFrame`. */
export function describedBy(path: string, hasDescription: boolean, issues: readonly unknown[]) {
	const id = fieldId(path);
	const ids = [hasDescription ? `${id}-description` : null, issues.length ? `${id}-error` : null];
	const value = ids.filter(Boolean).join(" ");
	return value === "" ? undefined : value;
}

function sentenceCase(message: string): string {
	const trimmed = message.trim();
	if (trimmed === "") return trimmed;
	const text = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
	return /[.!?]$/u.test(text) ? text : `${text}.`;
}

/** Shared control chrome for the CMS density tier. */
export const controlClass =
	"cms-control w-full min-w-0 rounded-[10px] border border-control-border bg-surface-solid px-3 text-[14px] text-foreground shadow-[inset_0_1px_var(--theme-highlight)] outline-hidden transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted-foreground/70 hover:border-line-strong focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--theme-focus)_28%,transparent)] aria-invalid:border-destructive disabled:opacity-50";
