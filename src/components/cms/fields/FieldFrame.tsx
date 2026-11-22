import { AnimatePresence, motion } from "motion/react";
import {
	useEffect,
	useRef,
	useState,
	type MouseEvent,
	type PointerEvent,
	type ReactNode,
} from "react";
import { useLiveReducedMotion } from "../shell/use-live-reduced-motion";
import type { ValidationIssue } from "../../../lib/validation";
import { cn } from "../../../lib/utils";
import { useDraftSelector } from "../draft/context";
import { REDUCED, SPRING_SNAPPY } from "../motion";
import { correspondingPath, getAt, parsePath } from "../draft/paths";
import { AlertCircleIcon, RevertIcon } from "./field-icons";

/**
 * Deterministic DOM id for the control at a content path, so a validation
 * summary, the command bar, or a release diff can focus it:
 * `focusField("projects[2].title")`.
 */
export function fieldId(path: string): string {
	return `cms-field-${path.replace(/[^A-Za-z0-9_-]+/gu, "-").replace(/-+$/u, "")}`;
}

/** Scroll to and focus the control for a path. Returns whether focus reached it. */
export function focusField(path: string, touch = false): boolean {
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
	const touchTarget = touch
		? (control.closest(".cms-sortable-row")?.querySelector<HTMLElement>("[data-row-menu]") ?? frame)
		: null;
	const target =
		touchTarget ??
		(control.getAttribute("aria-hidden") === "true"
			? visible
			: control.matches(":disabled")
				? frame
				: (visible ?? control));
	if (!target) return false;
	// Keep the page still when the target is already on screen, even in
	// part (after removing a row, its neighbour is usually right there);
	// otherwise bring it to the middle, clear of the sticky top bar.
	const rect = target.getBoundingClientRect();
	const topBar = document.querySelector<HTMLElement>(".cms-topbar")?.getBoundingClientRect().bottom;
	const inView = rect.bottom > Math.max(0, topBar ?? 0) + 24 && rect.top < window.innerHeight - 24;
	if (!inView) target.scrollIntoView({ block: "center", inline: "nearest" });
	target.focus({ preventScroll: true });
	return document.activeElement === target;
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
	/**
	 * `inline` puts the label and description on the left and the control on
	 * the right in one row, like a settings toggle. `stack` puts the control
	 * under its label.
	 */
	layout?: "stack" | "inline";
	className?: string;
	children: ReactNode;
}

/**
 * Label, description, trace mark, revert action, and errors around one
 * control. The trace mark (a 2px accent bar in the gutter plus a "Changed"
 * text label for assistive tech) appears when the draft differs from live.
 *
 * A valid field reserves no space for errors. An error replaces the
 * description line when there is one, or opens a line under the control.
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
	layout = "stack",
	className,
	children,
}: FieldFrameProps) {
	const id = fieldId(path);
	const descriptionId = description ? `${id}-description` : undefined;
	const errorId = `${id}-error`;
	const reduced = useLiveReducedMotion();
	const frame = useRef<HTMLDivElement>(null);
	const pointer = useActionPointer();
	const LabelTag = asGroup ? "p" : "label";
	const changedFromLive = useDraftSelector(({ draft, published }) => {
		if (!changed) return false;
		const livePath = correspondingPath(draft, published, parsePath(path));
		if (!livePath) return false;
		// New rows and new embeds have no published parent to revert to.
		const parent = getAt(published, livePath.slice(0, -1));
		const key = livePath.at(-1);
		return parent != null && (typeof key !== "number" || getAt(parent, [key]) !== undefined);
	});
	const message = issues.map(fieldIssueMessage).join(" ");
	const labelNode = (
		<LabelTag
			id={`${id}-label`}
			{...(asGroup ? {} : { htmlFor: id })}
			className="m-0 min-w-0 text-[13px] leading-5 font-semibold text-foreground"
		>
			{label}
			{changedFromLive ? <span className="sr-only"> (changed from live)</span> : null}
		</LabelTag>
	);
	const revert = (
		<AnimatePresence initial={false}>
			{changedFromLive && onRevert ? (
				<motion.button
					type="button"
					initial={{ opacity: 0, x: reduced ? 0 : 4 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: reduced ? 0 : 4, pointerEvents: "none" }}
					transition={reduced ? REDUCED : SPRING_SNAPPY}
					onPointerDown={pointer.onPointerDown}
					onClick={(event) => {
						onRevert();
						if (pointer.isTouchClick(event) || !focusField(path)) {
							frame.current?.focus({ preventScroll: true });
						}
					}}
					className="cms-field-revert cms-press -my-1 inline-flex min-h-6 items-center gap-1 rounded-full px-2 text-xs font-medium text-primary-text pointer-coarse:-my-3 pointer-coarse:min-h-11"
				>
					<RevertIcon className="size-3.5" /> Revert
					<span className="sr-only"> {typeof label === "string" ? label : "field"} to live</span>
				</motion.button>
			) : null}
		</AnimatePresence>
	);
	return (
		<div
			data-slot="cms-field"
			ref={frame}
			tabIndex={-1}
			data-changed={changedFromLive || undefined}
			data-invalid={issues.length > 0 || undefined}
			data-layout={layout}
			className={cn("cms-field group/cms-field relative grid min-w-0 content-start", className)}
		>
			<span aria-hidden="true" data-slot="cms-trace-mark" className="cms-trace-mark" />
			{layout === "inline" ? (
				<>
					<div className="cms-field-inline">
						<div className="grid min-w-0 gap-0.5">
							{labelNode}
							{description ? (
								<p id={descriptionId} className="cms-field-description">
									{description}
								</p>
							) : null}
						</div>
						<div className="flex shrink-0 items-center gap-2">
							{revert}
							{children}
						</div>
					</div>
					<FieldMessage id={errorId} message={message} />
				</>
			) : (
				<>
					<div className="cms-field-head">
						{labelNode}
						<div className="flex shrink-0 items-center gap-2">
							{meta}
							{revert}
						</div>
					</div>
					{children}
					<FieldMessage
						id={errorId}
						message={message}
						description={description}
						descriptionId={descriptionId}
					/>
				</>
			)}
		</div>
	);
}

/**
 * The line under a control. With a description, the error takes the
 * description's place, so the field keeps its height. Without one, the
 * line opens only while there is an error. The live region stays mounted.
 */
export function FieldMessage({
	id,
	message,
	description,
	descriptionId,
}: {
	id: string;
	message: string;
	description?: ReactNode;
	descriptionId?: string;
}) {
	const hasDescription = description != null && description !== false && description !== "";
	return (
		<div
			className="cms-field-foot"
			data-open={Boolean(message) || hasDescription || undefined}
			data-error={Boolean(message) || undefined}
		>
			<div className="cms-field-foot-clip">
				<div className="cms-field-foot-stack">
					{hasDescription ? (
						<p id={descriptionId} className="cms-field-description">
							{description}
						</p>
					) : null}
					<div className="cms-field-message" aria-live="polite" aria-atomic="true">
						<p
							id={id}
							data-open={Boolean(message) || undefined}
							className="m-0 flex items-start gap-1.5 wrap-anywhere text-destructive"
						>
							{message ? <AlertCircleIcon className="mt-px size-3.5" /> : null}
							<span>{message}</span>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

/** Keyboard and assistive clicks have no pointer, even after a touch. */
export function useActionPointer() {
	const pointerType = useRef("");
	return {
		onPointerDown: (event: PointerEvent) => {
			pointerType.current = event.pointerType;
		},
		isTouchClick: (event: MouseEvent) =>
			event.detail > 0 &&
			((event.nativeEvent as globalThis.PointerEvent).pointerType || pointerType.current) ===
				"touch",
	};
}

const NO_ISSUES: readonly ValidationIssue[] = [];

/** Keep draft validation live. Delay the input's message and ARIA state together. */
export function useFieldIssueFeedback(
	issues: readonly ValidationIssue[],
	value: string | number,
	delay: number | null = 700,
) {
	const [editing, setEditing] = useState(false);
	const [revealed, setRevealed] = useState(false);
	const invalid = issues.length > 0;
	useEffect(() => {
		if (!editing || !invalid || revealed || delay === null) return;
		const timer = setTimeout(() => setRevealed(true), delay);
		return () => clearTimeout(timer);
	}, [editing, invalid, revealed, value, delay]);

	function commit() {
		setEditing(false);
	}

	return {
		issues: editing && !revealed ? NO_ISSUES : issues,
		onFocus: () => {
			setEditing(true);
			setRevealed(invalid);
		},
		onBlur: commit,
		commit,
	};
}

export function fieldIssueMessage(issue: ValidationIssue): string {
	if (issue.path === "site.url" && issue.message.startsWith("must be an https,")) {
		return "Enter the full public address, such as https://example.com.";
	}
	return sentenceCase(issue.message);
}

/** `aria-describedby` for a control rendered inside `FieldFrame`. */
export function describedBy(path: string, hasDescription: boolean, issues: readonly unknown[]) {
	const id = fieldId(path);
	const ids = [hasDescription ? `${id}-description` : null, issues.length ? `${id}-error` : null];
	const value = ids.filter(Boolean).join(" ");
	return value === "" ? undefined : value;
}

export function sentenceCase(message: string): string {
	const trimmed = message.trim();
	if (trimmed === "") return trimmed;
	const text = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
	return /[.!?]$/u.test(text) ? text : `${text}.`;
}

/** Shared control chrome for the CMS density tier. */
export const controlClass = "cms-control min-w-0 w-full px-3 text-[14px] pointer-coarse:min-h-11";
