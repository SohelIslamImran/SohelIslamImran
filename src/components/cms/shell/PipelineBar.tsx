/**
 * Sticky 56px Pipeline Bar: a five-state machine (synced, dirty, saving,
 * draft ahead, invalid) visualizing `Draft r42 ──●── Valid ── Live r39`.
 *
 * Never relies on hue alone: every state pairs color with an icon/glyph,
 * dash pattern, or explicit label. Includes the clickable issue jump list,
 * hydration-safe relative save timestamp, ⌘K trigger, single accent Publish
 * button, and the phone top bar + bottom glass action bar.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "../../ui/button";
import { Kbd, MenuSurface } from "../../ui/portfolio";
import {
	Popover,
	PopoverContent,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "../../ui/popover";
import { useDraftSelector, useDraftStore } from "../draft/context";
import { focusField } from "../fields";
import { REDUCED, SPRING_MOVE } from "../motion";
import { resolvePathTarget } from "../release/diff";
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	MenuIcon,
	PublishIcon,
	SaveIcon,
	SearchIcon,
} from "./cms-icons";
import { useRelativeTime } from "./time";
import { useLiveReducedMotion } from "./use-live-reduced-motion";

export type PipelineStage = "synced" | "dirty" | "saving" | "ahead" | "invalid";

export function usePipelineStage(): {
	stage: PipelineStage;
	label: string;
} {
	return useDraftSelector((state) => {
		if (state.status === "conflict") {
			return { stage: "invalid", label: "Conflict" };
		}
		if (state.status === "error") {
			return { stage: "invalid", label: "Save failed" };
		}
		if (state.issues.all.length > 0) {
			const count = state.issues.all.length;
			return {
				stage: "invalid",
				label: `${count} ${count === 1 ? "issue" : "issues"}`,
			};
		}
		if (state.status === "publishing") {
			return { stage: "saving", label: "Publishing…" };
		}
		if (state.status === "saving") {
			return { stage: "saving", label: "Saving…" };
		}
		if (state.dirty) {
			return { stage: "dirty", label: "Unsaved" };
		}
		if (state.ahead) {
			return { stage: "ahead", label: "Draft ahead" };
		}
		return { stage: "synced", label: "Synced" };
	});
}

function focusFieldAfterNavigation(path: string) {
	if (typeof window === "undefined") return;
	let attempts = 0;
	const tryFocus = () => {
		if (focusField(path)) return;
		attempts += 1;
		if (attempts < 20) window.requestAnimationFrame(tryFocus);
	};
	window.requestAnimationFrame(tryFocus);
}

function PipelineStatus({
	stage,
	label,
	onResolveConflict,
}: ReturnType<typeof usePipelineStage> & { onResolveConflict: () => void }) {
	const [open, setOpen] = useState(false);
	const navigate = useNavigate();
	const store = useDraftStore();
	const issues = useDraftSelector((state) => state.issues.all);
	const conflict = useDraftSelector((state) => state.conflict !== null);

	const jumpToIssue = (path: string) => {
		setOpen(false);
		const target = resolvePathTarget(path, store.getState().draft);
		if (target) {
			void navigate({
				to: "/cms/content/$section",
				params: { section: target.sectionId },
				search: target.itemId ? { item: target.itemId } : {},
				resetScroll: false,
			}).then(() => {
				focusFieldAfterNavigation(path);
			});
		} else {
			focusFieldAfterNavigation(path);
		}
	};

	return (
		<Popover
			open={open && !conflict}
			onOpenChange={(next) => {
				if (next && conflict) {
					setOpen(false);
					onResolveConflict();
				} else {
					setOpen(next);
				}
			}}
		>
			<PopoverTrigger className="cms-status-pill cms-press" data-stage={stage} aria-label={label}>
				<span className="cms-status-content">
					<AnimatePresence initial={false} mode="wait">
						<motion.span
							key={label}
							className="cms-status-copy"
							aria-hidden="true"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ ...REDUCED, duration: 0.075 }}
						>
							{stage === "synced" ? (
								<CheckCircleIcon />
							) : stage === "invalid" ? (
								<AlertTriangleIcon />
							) : (
								<span className="cms-status-mark">
									{stage === "saving" ? "⋯" : stage === "ahead" ? "Δ" : "●"}
								</span>
							)}
							{label}
						</motion.span>
					</AnimatePresence>
				</span>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				sideOffset={10}
				positionMethod="fixed"
				className="w-auto rounded-none border-0 bg-transparent p-0 shadow-none ring-0"
			>
				<MenuSurface className="cms-overlay grid w-[min(380px,calc(100vw-24px))] gap-2 p-2.5">
					<PopoverHeader className="flex flex-row items-center justify-between px-1.5 pt-0.5">
						<PopoverTitle className="text-[13px] font-semibold">
							{issues.length > 0 ? "Validation issues" : "Release status"}
						</PopoverTitle>
						{issues.length > 0 ? (
							<span className="text-[11px] text-muted-foreground">Jump to field</span>
						) : null}
					</PopoverHeader>
					{issues.length === 0 ? (
						<Link
							to="/cms/release"
							preload="intent"
							resetScroll={false}
							onClick={() => setOpen(false)}
							className="cms-press cms-chrome-control flex min-h-11 items-center justify-between rounded-[10px] px-2.5 text-[13px] text-ink-soft no-underline"
						>
							Review changes <span aria-hidden="true">→</span>
						</Link>
					) : (
						<ul className="m-0 grid max-h-[300px] list-none gap-1 overflow-y-auto p-0">
							{issues.map((issue, index) => {
								const target = resolvePathTarget(issue.path, store.getState().draft);
								return (
									<li key={`${issue.path}-${index}`}>
										<button
											type="button"
											onClick={() => jumpToIssue(issue.path)}
											className="cms-press cms-chrome-control grid min-h-11 w-full gap-0.5 rounded-[10px] border border-transparent px-2.5 py-2 text-left transition-colors duration-150 hover:border-line hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)]"
										>
											<div className="flex items-center justify-between gap-2">
												<span className="text-[12.5px] font-medium text-foreground">
													{target ? `${target.sectionLabel} · ${target.fieldLabel}` : issue.path}
												</span>
												<span
													aria-hidden="true"
													className="font-mono text-[11px] text-primary-text"
												>
													→
												</span>
											</div>
											<code className="truncate font-mono text-[11px] text-muted-foreground">
												{issue.path}
											</code>
											<span className="text-[12px] text-destructive">{issue.message}</span>
										</button>
									</li>
								);
							})}
						</ul>
					)}
				</MenuSurface>
			</PopoverContent>
		</Popover>
	);
}

export function PipelineBar({
	onOpenCommandBar,
	onOpenDrawer,
	onResolveConflict,
	onRequestPublish,
	publishSweepKey,
}: {
	onOpenCommandBar: (trigger: HTMLButtonElement) => void;
	onOpenDrawer: () => void;
	onResolveConflict: () => void;
	onRequestPublish: () => void;
	publishSweepKey: number;
}) {
	const { stage, label } = usePipelineStage();
	const draftRevision = useDraftSelector((state) => state.draftRevision);
	const publishedRevision = useDraftSelector((state) => state.publishedRevision);
	const draftUpdatedAt = useDraftSelector((state) => state.draftUpdatedAt);
	const relativeSaved = useRelativeTime(draftUpdatedAt, 10_000);
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 8);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<header
			data-slot="cms-pipeline-bar"
			data-stage={stage}
			data-scrolled={scrolled || undefined}
			className="cms-topbar sticky top-0 z-(--z-sticky) flex min-h-14 items-center justify-between gap-2 px-3 pt-[env(safe-area-inset-top)] lg:px-5"
		>
			<button
				type="button"
				onClick={onOpenDrawer}
				aria-label="Open navigation menu"
				aria-haspopup="dialog"
				className="cms-press cms-chrome-control grid size-11 shrink-0 place-items-center rounded-[10px] text-ink-soft lg:hidden"
			>
				<MenuIcon className="size-5" />
			</button>

			<div className="cms-pipeline flex min-w-0 items-center justify-center gap-2 tabular-nums lg:justify-start lg:gap-2.5">
				<span
					className="font-mono text-[11px] whitespace-nowrap text-muted-foreground"
					aria-label={`Draft revision ${draftRevision}`}
					title={relativeSaved ? `Saved ${relativeSaved}` : undefined}
				>
					<span className="hidden sm:inline">Draft </span>r{draftRevision}
				</span>
				<span aria-hidden="true" className="cms-pipeline-connector" />
				<PipelineStatus stage={stage} label={label} onResolveConflict={onResolveConflict} />
				<span aria-hidden="true" className="cms-pipeline-connector" />
				<Link
					to="/cms/release"
					preload="intent"
					resetScroll={false}
					aria-label={`Live revision ${publishedRevision}`}
					className="cms-chrome-control cms-press inline-flex min-h-8 shrink-0 items-center rounded-md px-1.5 font-mono text-[11px] whitespace-nowrap text-muted-foreground no-underline pointer-coarse:min-h-11 pointer-coarse:min-w-11 max-sm:justify-center"
				>
					<span className="hidden sm:inline">Live </span>r{publishedRevision}
				</Link>
				<span role="status" className="sr-only">
					{label}
				</span>
			</div>

			<div className="flex shrink-0 items-center gap-2">
				<button
					type="button"
					onClick={(event) => onOpenCommandBar(event.currentTarget)}
					aria-label="Search and commands"
					aria-haspopup="dialog"
					aria-keyshortcuts="Meta+K Control+K"
					data-slot="cms-command-trigger"
					className="cms-press cms-chrome-control flex size-11 shrink-0 items-center justify-center gap-2 rounded-[10px] text-ink-soft lg:h-9 lg:w-auto lg:border lg:border-line lg:bg-surface-solid lg:px-2.5 pointer-coarse:min-h-11"
				>
					<SearchIcon />
					<span className="hidden text-[12px] xl:inline">Search</span>
					<span className="hidden lg:inline">
						<Kbd>⌘K</Kbd>
					</span>
				</button>

				<div className="hidden items-center gap-2 lg:flex">
					<PipelineActions onRequestPublish={onRequestPublish} />
				</div>
			</div>

			{publishSweepKey > 0 ? (
				<span key={publishSweepKey} aria-hidden="true" className="cms-publish-sweep" />
			) : null}
		</header>
	);
}

function useRevisionFeedback(revision: number) {
	const previous = useRef(revision);
	const [recent, setRecent] = useState(false);
	useEffect(() => {
		if (previous.current === revision) return;
		previous.current = revision;
		setRecent(true);
		const reset = window.setTimeout(() => setRecent(false), 1500);
		return () => window.clearTimeout(reset);
	}, [revision]);
	return recent;
}

function PipelineActions({ onRequestPublish }: { onRequestPublish: () => void }) {
	const store = useDraftStore();
	const { dirty, ahead, canSave, canPublish, status, draftRevision, publishedRevision } =
		useDraftSelector((state) => {
			const busy = state.status === "saving" || state.status === "publishing";
			const ready = !state.conflict && !busy && !state.authExpired && state.issues.all.length === 0;
			return {
				dirty: state.dirty,
				ahead: state.ahead,
				canSave: ready && state.dirty,
				canPublish: ready && (state.dirty || state.ahead),
				status: state.status,
				draftRevision: state.draftRevision,
				publishedRevision: state.publishedRevision,
			};
		});
	const savedRecently = useRevisionFeedback(draftRevision);
	const publishedRecently = useRevisionFeedback(publishedRevision);
	const saving = status === "saving";
	const publishing = status === "publishing";
	const justSaved = savedRecently && !dirty && !saving && !publishing;
	const justPublished = publishedRecently && !ahead && !dirty && !saving && !publishing;

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				disabled={!canSave}
				aria-busy={saving || undefined}
				data-complete={justSaved || undefined}
				className="cms-action cms-save-action min-h-11 lg:min-h-9 pointer-coarse:min-h-11"
				onClick={() => void store.save()}
			>
				{justSaved ? <CheckCircleIcon /> : <SaveIcon />}
				{saving ? "Saving…" : justSaved ? "Saved" : "Save"}
			</Button>
			<Button
				size="sm"
				disabled={!canPublish}
				aria-busy={publishing || undefined}
				data-complete={justPublished || undefined}
				className="cms-action cms-publish-action min-h-11 lg:min-h-9 pointer-coarse:min-h-11"
				onClick={onRequestPublish}
			>
				{justPublished ? <CheckCircleIcon /> : <PublishIcon />}
				{publishing ? "Publishing…" : justPublished ? "Published" : "Publish"}
			</Button>
		</>
	);
}

/** Keep mobile actions visible while there are draft changes to save or publish. */
export function MobileActionBar({ onRequestPublish }: { onRequestPublish: () => void }) {
	const reduce = useLiveReducedMotion();
	const visible = useDraftSelector(
		(state) =>
			state.dirty ||
			state.ahead ||
			state.issues.all.length > 0 ||
			state.status === "saving" ||
			state.status === "publishing",
	);

	return (
		<AnimatePresence initial={false}>
			{visible ? (
				<motion.div
					data-slot="cms-mobile-action-bar"
					className="cms-overlay cms-glass fixed inset-x-0 bottom-0 z-(--z-dock) flex items-center gap-2 border-t px-3 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] lg:hidden"
					initial={{ y: reduce ? 0 : 20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: reduce ? 0 : 20, opacity: 0, pointerEvents: "none" }}
					transition={reduce ? REDUCED : SPRING_MOVE}
				>
					<PipelineActions onRequestPublish={onRequestPublish} />
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}
