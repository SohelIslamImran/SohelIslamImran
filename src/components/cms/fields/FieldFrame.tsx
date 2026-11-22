import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import type { ValidationIssue } from "../../../lib/validation";
import { cn } from "../../../lib/utils";
import { useDraftSelector } from "../draft/context";
import { REDUCED, SPRING_SNAPPY } from "../motion";
import { correspondingPath, getAt, parsePath } from "../draft/paths";

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
	const id = fieldId(path);
	const first = document.getElementById(id);
	const control = first?.closest("[inert]")
		? document.querySelector<HTMLElement>(`[id="${id}"]:not([inert] *)`)
		: first;
	if (!(control instanceof HTMLElement) || !control.getClientRects().length) return false;
	const frame = control.closest<HTMLElement>('[data-slot="cms-field"]');
	const visibleControls = Array.from(
		frame?.querySelectorAll<HTMLElement>("[data-visible-field-control]") ?? [],
	).filter((element) => element.closest('[data-slot="cms-field"]') === frame);
	const visible =
		visibleControls.find((element) => element.matches("[aria-checked=true], [data-checked]")) ??
		visibleControls[0];
	const target =
		control.getAttribute("aria-hidden") === "true"
			? visible
			: control.matches(":disabled")
				? frame
				: (visible ?? control);
	if (!target) return false;
	target.scrollIntoView({ block: "center", inline: "nearest" });
	target.focus({ preventScroll: true });
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
	const errorId = `${id}-error`;
	const reduced = useReducedMotion();
	const frame = useRef<HTMLDivElement>(null);
	const LabelTag = asGroup ? "p" : "label";
	const canRevert = useDraftSelector(({ draft, published }) => {
		if (!changed || !onRevert) return false;
		const livePath = correspondingPath(draft, published, parsePath(path));
		if (!livePath) return false;
		// New rows and new embeds have no published parent to revert to.
		const parent = getAt(published, livePath.slice(0, -1));
		const key = livePath.at(-1);
		return parent != null && (typeof key !== "number" || getAt(parent, [key]) !== undefined);
	});
	return (
		<div
			data-slot="cms-field"
			ref={frame}
			tabIndex={-1}
			data-changed={changed || undefined}
			data-invalid={issues.length > 0 || undefined}
			className={cn("cms-field group/cms-field relative grid min-w-0 gap-2", className)}
		>
			<span aria-hidden="true" data-slot="cms-trace-mark" className="cms-trace-mark" />
			<div className="flex min-h-6 min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-0">
				<LabelTag
					id={`${id}-label`}
					{...(asGroup ? {} : { htmlFor: id })}
					className="m-0 min-w-0 text-[13px] font-semibold text-foreground"
				>
					{label}
					{changed ? <span className="sr-only"> (changed from live)</span> : null}
				</LabelTag>
				<div className="flex shrink-0 items-center gap-2">
					{meta}
					<AnimatePresence initial={false}>
						{canRevert ? (
							<motion.button
								type="button"
								initial={{ opacity: 0, x: reduced ? 0 : 4 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: reduced ? 0 : 4, pointerEvents: "none" }}
								transition={reduced ? REDUCED : SPRING_SNAPPY}
								onClick={() => {
									onRevert?.();
									if (!focusField(path)) frame.current?.focus({ preventScroll: true });
								}}
								className="cms-field-revert cms-press inline-flex min-h-7 items-center gap-1 rounded-full px-2 text-xs font-medium text-primary-text pointer-coarse:min-h-11"
							>
								<span aria-hidden="true">↺</span> Revert
								<span className="sr-only">
									{" "}
									{typeof label === "string" ? label : "field"} to live
								</span>
							</motion.button>
						) : null}
					</AnimatePresence>
				</div>
			</div>
			{children}
			{description ? (
				<p id={descriptionId} className="m-0 text-[12.5px] leading-normal text-muted-foreground">
					{description}
				</p>
			) : null}
			<FieldMessage
				id={errorId}
				message={issues.map((issue) => sentenceCase(issue.message)).join(" ")}
			/>
		</div>
	);
}

/** The collapse wrapper takes up no space when the field is valid. */
export function FieldMessage({ id, message }: { id: string; message: string }) {
	const lastMessage = useRef(message);
	if (message) lastMessage.current = message;
	return (
		<div
			className="cms-field-message"
			data-open={Boolean(message) || undefined}
			aria-hidden={!message}
		>
			<div>
				<p
					id={id}
					className="m-0 flex items-start gap-1.5 text-[12.5px] leading-normal text-destructive"
				>
					<span aria-hidden="true" className="font-mono">
						!
					</span>
					<span>{lastMessage.current}</span>
				</p>
			</div>
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
export const controlClass = "cms-control min-w-0 w-full px-3 text-[14px] pointer-coarse:min-h-11";
