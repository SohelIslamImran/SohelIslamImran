/**
 * The Changes page's one publish call to action and its confirmation, plus the
 * receipt that replaces the page body after a publish. Focus never drops to
 * `<body>`: the confirmation heading takes focus when it appears, Escape or Cancel
 * returns focus to Publish, and a successful publish focuses the receipt.
 */
import { useId, useLayoutEffect, useRef, type Ref } from "react";
import { useLiveReducedMotion } from "../shell/use-live-reduced-motion";
import { motion } from "motion/react";
import { controlClass } from "../analytics/Widgets";
import { REDUCED, SPRING_MOVE, SPRING_SNAPPY } from "../motion";
import { RELEASE_GATE_ID } from "../shell/CmsShell";
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	ExternalArrowIcon,
	PublishIcon,
} from "../shell/cms-icons";
import { Button } from "../../ui/button";
import { cn } from "../../../lib/utils";
import type { PublishStep } from "./publish-steps";

export interface PublishGateProps {
	totalChanges: number;
	sectionCount: number;
	issueCount: number;
	conflict: boolean;
	dirty: boolean;
	step: PublishStep | null;
	onRetry?: () => void;
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
	step,
	onRetry,
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
	const publishRef = useRef<HTMLButtonElement>(null);
	const confirmRef = useRef<HTMLHeadingElement>(null);
	const gateRef = useRef<HTMLElement>(null);
	const confirmationId = useId();
	const retryRef = useRef<HTMLButtonElement>(null);
	const wasConfirming = useRef(false);

	useLayoutEffect(() => {
		if (confirming && !wasConfirming.current) confirmRef.current?.focus();
		if (!confirming && wasConfirming.current) {
			const publish = publishRef.current;
			(
				retryRef.current ??
				(publish?.getAttribute("aria-disabled") === "false" ? publish : gateRef.current)
			)?.focus();
		}
		wasConfirming.current = confirming;
	}, [confirming]);

	const changesLabel =
		totalChanges > 0
			? `${totalChanges} ${totalChanges === 1 ? "change" : "changes"} in ${sectionCount} ${sectionCount === 1 ? "section" : "sections"}`
			: "Saved draft with no content changes";

	return (
		<section
			id={RELEASE_GATE_ID}
			ref={gateRef}
			tabIndex={-1}
			aria-label="Publish"
			className="cms-panel cms-enter grid scroll-mt-20 p-4 outline-none sm:px-5"
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
					<h2 className="m-0 text-[16px] font-semibold tracking-[-0.01em] text-foreground">
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
					<button
						type="button"
						aria-disabled={discardDisabled || confirming}
						onClick={() => {
							if (!discardDisabled && !confirming) onDiscard();
						}}
						className="cms-press cms-page-focus -ml-3 inline-flex min-h-9 items-center rounded-full px-3 text-[13px] font-medium text-destructive hover:bg-destructive/8 aria-disabled:opacity-45 sm:ml-0 pointer-coarse:min-h-11"
					>
						Discard changes
					</button>
					<Button
						ref={publishRef}
						size="sm"
						aria-disabled={!canPublish || confirming || !!onRetry}
						onClick={() => {
							if (canPublish && !confirming && !onRetry) onRequestPublish();
						}}
						className="pointer-coarse:min-h-11"
					>
						<PublishIcon className="size-3.5" />
						<span>Publish</span>
					</Button>
				</div>
			</div>
			{step ? <PublishTrace step={step} /> : null}
			{onRetry ? (
				<Button
					ref={retryRef}
					variant="outline"
					size="sm"
					className="mt-2 justify-self-start pointer-coarse:min-h-11"
					aria-disabled={!canPublish}
					onClick={() => {
						if (canPublish) onRetry();
					}}
				>
					Retry publish
				</Button>
			) : null}
			<div className="cms-review-expander">
				<div data-open={confirming} inert={!confirming} className="cms-review-expand">
					<div className="mt-3 grid gap-2 rounded-[12px] border border-primary-line bg-surface-solid p-3.5">
						<h3
							ref={confirmRef}
							tabIndex={-1}
							className="cms-page-focus m-0 text-[14px] font-semibold"
						>
							Publish to {host}?
						</h3>
						<p id={confirmationId} className="m-0 text-[13px] text-muted-foreground">
							Visitors see the changes right away.{dirty ? " Unsaved edits are saved first." : ""}
						</p>
						<div className="flex flex-wrap items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								aria-disabled={busy}
								onClick={() => {
									if (!busy) onCancel();
								}}
								className="pointer-coarse:min-h-11"
							>
								Cancel
							</Button>
							<Button
								size="sm"
								aria-disabled={!canPublish}
								aria-describedby={confirmationId}
								onClick={() => {
									if (canPublish && confirming) onConfirm();
								}}
								className="pointer-coarse:min-h-11"
							>
								Confirm publish
							</Button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

const steps = ["save", "publish", "live"] as const;

function PublishTrace({ step }: { step: PublishStep }) {
	const reduced = useLiveReducedMotion();
	return (
		<div
			className={cn(
				"mt-3 flex min-w-0 items-start gap-3 text-[13px]",
				step.unconfirmed ? "text-destructive" : "text-muted-foreground",
			)}
		>
			<span aria-hidden="true" className="relative mt-[7px] grid shrink-0 grid-cols-3 items-center">
				<span
					className={cn(
						"absolute inset-x-2 border-t",
						step.unconfirmed ? "border-dashed border-current" : "border-line-strong",
					)}
				/>
				{steps.map((value) => (
					<span key={value} className="relative grid h-1.5 w-5 place-items-center">
						{value === step.step ? (
							<motion.span
								layoutId={reduced ? undefined : "cms-release-publish-step"}
								initial={reduced ? { opacity: 0 } : false}
								animate={{ opacity: 1 }}
								transition={reduced ? REDUCED : SPRING_MOVE}
								className={cn(
									"h-1.5 w-4 rounded-full",
									step.unconfirmed ? "bg-destructive" : "bg-primary",
								)}
							/>
						) : (
							<span className="size-1.5 rounded-full border border-current bg-surface-solid" />
						)}
					</span>
				))}
			</span>
			<span className="min-w-0">{step.text}</span>
		</div>
	);
}

export function PublishedReceipt({
	revision,
	publicOrigin,
	step,
	onDismiss,
	ref,
}: {
	revision: number;
	publicOrigin: string;
	step: PublishStep | null;
	onDismiss: () => void;
	ref?: Ref<HTMLElement>;
}) {
	const reduced = useLiveReducedMotion();
	const host = new URL(publicOrigin).host;
	return (
		<motion.section
			ref={ref}
			tabIndex={-1}
			aria-labelledby="cms-publish-receipt-title"
			initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.99 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={reduced ? REDUCED : SPRING_SNAPPY}
			className="cms-panel cms-confirm-card flex flex-wrap items-center justify-between gap-4 border-success/40 bg-surface-solid p-4 outline-none sm:px-5"
		>
			<div className="flex min-w-0 items-center gap-3.5">
				<span className="grid size-9 shrink-0 place-items-center rounded-full border border-success/40 bg-success/12 text-success">
					<CheckCircleIcon aria-hidden="true" className="size-4.5" />
				</span>
				<div className="grid min-w-0 gap-0.5">
					<h2
						id="cms-publish-receipt-title"
						className="m-0 text-[16px] font-semibold tracking-[-0.01em] text-foreground"
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
			{step ? (
				<div className="basis-full">
					<PublishTrace step={step} />
				</div>
			) : null}
		</motion.section>
	);
}
