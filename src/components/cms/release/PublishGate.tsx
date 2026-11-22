/**
 * The Changes page's one publish call to action and its confirmation, plus the
 * receipt that replaces the page body after a publish. Focus never drops to
 * `<body>`: the confirm button takes focus when it appears, Escape or Cancel
 * returns focus to Publish, and a successful publish focuses the receipt.
 */
import { useId, useLayoutEffect, useRef, type Ref } from "react";
import { useLiveReducedMotion } from "../shell/use-live-reduced-motion";
import { motion } from "motion/react";
import { controlClass } from "../analytics/Widgets";
import { REDUCED, SPRING_SNAPPY } from "../motion";
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	ExternalArrowIcon,
	PublishIcon,
} from "../shell/cms-icons";
import { Button } from "../../ui/button";
import { cn } from "../../../lib/utils";

export interface PublishGateProps {
	totalChanges: number;
	sectionCount: number;
	issueCount: number;
	conflict: boolean;
	dirty: boolean;
	busy: boolean;
	canPublish: boolean;
	confirming: boolean;
	host: string;
	onRequestPublish: () => void;
	onCancel: () => void;
	onConfirm: () => void;
	onDiscard: () => void;
	discardDisabled: boolean;
}

export function PublishGate({
	totalChanges,
	sectionCount,
	issueCount,
	conflict,
	dirty,
	busy,
	canPublish,
	confirming,
	host,
	onRequestPublish,
	onCancel,
	onConfirm,
	onDiscard,
	discardDisabled,
}: PublishGateProps) {
	const reduced = useLiveReducedMotion();
	const publishRef = useRef<HTMLButtonElement>(null);
	const confirmRef = useRef<HTMLButtonElement>(null);
	const gateRef = useRef<HTMLElement>(null);
	const confirmationId = useId();
	const wasConfirming = useRef(false);

	useLayoutEffect(() => {
		if (confirming && !wasConfirming.current) confirmRef.current?.focus();
		if (!confirming && wasConfirming.current) {
			const publish = publishRef.current;
			(publish && !publish.disabled ? publish : gateRef.current)?.focus();
		}
		wasConfirming.current = confirming;
	}, [confirming]);

	const changesLabel =
		totalChanges > 0
			? `${totalChanges} ${totalChanges === 1 ? "change" : "changes"} in ${sectionCount} ${sectionCount === 1 ? "section" : "sections"}`
			: "Saved draft with no content changes";

	return (
		<section
			id="release-gate"
			ref={gateRef}
			tabIndex={-1}
			aria-label="Publish"
			className="cms-panel cms-enter cms-page-focus grid scroll-mt-20 gap-3 p-4 sm:px-5"
			onKeyDown={(event) => {
				if (event.key === "Escape" && confirming && !busy) {
					event.stopPropagation();
					event.preventDefault();
					onCancel();
				}
			}}
		>
			<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
				<div className="grid min-w-0 gap-0.5">
					<h2 className="m-0 text-[16px] font-semibold tracking-[-0.015em] text-foreground">
						{changesLabel}
					</h2>
					<p
						className={cn(
							"m-0 inline-flex items-center gap-1.5 text-[13px]",
							issueCount > 0 || conflict ? "text-destructive" : "text-muted-foreground",
						)}
					>
						{issueCount > 0 || conflict ? (
							<AlertTriangleIcon className="size-3.5 shrink-0" />
						) : (
							<CheckCircleIcon className="size-3.5 shrink-0 text-success" />
						)}
						<span>
							{conflict
								? "The draft changed elsewhere. Reload it before publishing."
								: issueCount > 0
									? `Fix ${issueCount} ${issueCount === 1 ? "issue" : "issues"} before publishing.`
									: "Every field is valid."}
						</span>
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{confirming ? (
						<>
							<Button
								variant="outline"
								size="sm"
								disabled={busy}
								onClick={onCancel}
								className="pointer-coarse:min-h-11"
							>
								Cancel
							</Button>
							<Button
								ref={confirmRef}
								variant="default"
								size="sm"
								aria-disabled={!canPublish}
								aria-describedby={confirmationId}
								onClick={() => {
									if (canPublish) onConfirm();
								}}
								className="pointer-coarse:min-h-11"
							>
								<PublishIcon className="size-3.5" />
								<span>{busy ? "Publishing…" : "Confirm publish"}</span>
							</Button>
						</>
					) : (
						<>
							<button
								type="button"
								disabled={discardDisabled}
								onClick={onDiscard}
								className="cms-press cms-page-focus inline-flex min-h-9 items-center rounded-full px-3 text-[13px] font-medium text-destructive hover:bg-destructive/8 disabled:pointer-events-none disabled:opacity-45 pointer-coarse:min-h-11"
							>
								Discard changes
							</button>
							<Button
								ref={publishRef}
								variant="default"
								size="sm"
								disabled={!canPublish}
								onClick={onRequestPublish}
								className="pointer-coarse:min-h-11"
							>
								<PublishIcon className="size-3.5" />
								<span>Publish</span>
							</Button>
						</>
					)}
				</div>
			</div>

			{confirming ? (
				<motion.p
					id={confirmationId}
					initial={reduced ? { opacity: 0 } : { opacity: 0, y: -3 }}
					animate={{ opacity: 1, y: 0 }}
					transition={reduced ? REDUCED : SPRING_SNAPPY}
					className="m-0 rounded-[11px] border border-primary-line bg-primary-soft/60 px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground"
				>
					Publish to <span className="font-medium">{host}</span>? Visitors see the changes right
					away.{dirty ? " Unsaved edits are saved first." : ""}
				</motion.p>
			) : null}
		</section>
	);
}

function AnimatedCheckBadge() {
	const reduced = useLiveReducedMotion();
	return (
		<span
			aria-hidden="true"
			className="grid size-9 shrink-0 place-items-center rounded-full border border-success/40 bg-success/12 text-success"
		>
			<svg
				viewBox="0 0 20 20"
				className="size-4.5 fill-none stroke-current stroke-[2] [stroke-linecap:round] [stroke-linejoin:round]"
			>
				<motion.path
					d="m5 10.5 3.2 3.2L15 7"
					initial={reduced ? { opacity: 0 } : { pathLength: 0, opacity: 0.4 }}
					animate={reduced ? { opacity: 1 } : { pathLength: 1, opacity: 1 }}
					transition={reduced ? REDUCED : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
				/>
			</svg>
		</span>
	);
}

export function PublishedReceipt({
	revision,
	publicOrigin,
	onDismiss,
	ref,
}: {
	revision: number;
	publicOrigin: string;
	onDismiss: () => void;
	ref?: Ref<HTMLElement>;
}) {
	const reduced = useLiveReducedMotion();
	const host = new URL(publicOrigin).host;
	return (
		<motion.section
			ref={ref}
			tabIndex={-1}
			role="status"
			aria-labelledby="cms-publish-receipt-title"
			initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.99 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={reduced ? REDUCED : SPRING_SNAPPY}
			className="cms-panel cms-confirm-card cms-page-focus flex flex-wrap items-center justify-between gap-4 border-success/40 bg-surface-solid p-4 outline-none sm:px-5"
		>
			<div className="flex min-w-0 items-center gap-3.5">
				<AnimatedCheckBadge />
				<div className="grid min-w-0 gap-0.5">
					<h2
						id="cms-publish-receipt-title"
						className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-foreground"
					>
						Your changes are live
					</h2>
					<p className="m-0 text-[13px] text-muted-foreground">
						{host} now serves revision <span className="font-mono tabular-nums">{revision}</span>.
					</p>
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					onClick={onDismiss}
					className="cms-press cms-page-focus inline-flex min-h-9 items-center rounded-full px-3 text-[13px] font-medium text-muted-foreground hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)] hover:text-foreground pointer-coarse:min-h-11"
				>
					Dismiss
				</button>
				<a href={publicOrigin} target="_blank" rel="noreferrer" className={controlClass}>
					<span>View live site</span>
					<ExternalArrowIcon className="size-3.5 text-muted-foreground" />
				</a>
			</div>
		</motion.section>
	);
}
