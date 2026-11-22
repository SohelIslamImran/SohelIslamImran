/**
 * Sticky 56px Pipeline Bar: a five-state machine (synced, dirty, saving,
 * draft ahead, invalid) visualizing `Draft r42 ──●── Valid ── Live r39`.
 *
 * Never relies on hue alone: every state pairs color with an icon/glyph,
 * dash pattern, or explicit label. Includes the clickable issue jump list,
 * hydration-safe relative save timestamp, ⌘K trigger, single accent Publish
 * button, and the phone top bar + bottom glass action bar.
 */
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { sentenceCase } from "../fields/FieldFrame";
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
import { draftActionAvailability, saveDraftIfAvailable } from "./draft-actions";
import { useRelativeTime } from "./time";
import { useLiveReducedMotion } from "./use-live-reduced-motion";

export type PipelineStage = "synced" | "dirty" | "saving" | "ahead" | "invalid";

function usePipelineStage(
	publishFailed: boolean,
	saveFeedback: SaveFeedback,
): {
	stage: PipelineStage;
	label: string;
} {
	return useDraftSelector((state) => {
		if (state.status === "conflict") {
			return { stage: "invalid", label: "Conflict" };
		}
		if (state.status === "error") {
			return { stage: "invalid", label: publishFailed ? "Publish failed" : "Save failed" };
		}
		if (state.issues.all.length > 0) {
			const count = state.issues.all.length;
			return {
				stage: "invalid",
				label: `${count} ${count === 1 ? "error" : "errors"}`,
			};
		}
		if (state.status === "publishing") {
			return { stage: "saving", label: "Publishing…" };
		}
		if (state.status === "saving" || saveFeedback === "saving") {
			return { stage: "saving", label: "Saving…" };
		}
		if (saveFeedback === "saved" && !state.dirty) {
			return { stage: "synced", label: "Saved" };
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
	onReviewRelease,
}: ReturnType<typeof usePipelineStage> & {
	onResolveConflict: () => void;
	onReviewRelease: () => boolean;
}) {
	const [open, setOpen] = useState(false);
	const reviewingGate = useRef(false);
	const jumping = useRef(false);
	const navigate = useNavigate();
	const store = useDraftStore();
	const issues = useDraftSelector((state) => state.issues.all);
	const conflict = useDraftSelector((state) => state.conflict !== null);

	const jumpToIssue = (path: string) => {
		jumping.current = true;
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
					if (next) {
						reviewingGate.current = false;
						jumping.current = false;
					}
					setOpen(next);
				}
			}}
		>
			<PopoverTrigger
				className="cms-status-pill cms-chrome-control cms-press"
				data-stage={stage}
				aria-label={label}
			>
				<span className="cms-status-content">
					<span key={label} className="cms-status-copy" aria-hidden="true">
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
					</span>
				</span>
			</PopoverTrigger>
			<PopoverContent
				sideOffset={10}
				positionMethod="fixed"
				finalFocus={() => !reviewingGate.current && !jumping.current}
				className="w-auto rounded-none border-0 bg-transparent p-0 shadow-none ring-0"
			>
				<MenuSurface className="cms-overlay grid w-[min(380px,calc(100vw-24px))] gap-2 p-2.5">
					<PopoverHeader className="flex flex-row items-center justify-between px-1.5 pt-0.5">
						<PopoverTitle className="text-[13px] font-semibold">
							{issues.length > 0 ? "Validation errors" : "Release status"}
						</PopoverTitle>
						{issues.length > 0 ? (
							<span className="text-[11px] text-muted-foreground">Jump to field</span>
						) : null}
					</PopoverHeader>
					{issues.length === 0 ? (
						<Link
							to="/cms/release"
							preload="intent"
							onClick={(event) => {
								if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
									if (onReviewRelease()) {
										reviewingGate.current = true;
										event.preventDefault();
									}
									setOpen(false);
								}
							}}
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
											<span className="text-[12px] text-destructive">
												{sentenceCase(issue.message)}
											</span>
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
	onReviewRelease,
	publishFailed,
	publishSweepKey,
	saveFeedback,
	children,
}: {
	onOpenCommandBar: (trigger: HTMLButtonElement) => void;
	onOpenDrawer: () => void;
	onResolveConflict: () => void;
	onRequestPublish: () => void;
	onReviewRelease: () => boolean;
	publishFailed: boolean;
	publishSweepKey: number;
	saveFeedback: SaveFeedback;
	children: ReactNode;
}) {
	const { stage, label } = usePipelineStage(publishFailed, saveFeedback);
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
			className="cms-topbar sticky top-0 z-(--z-sticky) px-3 pt-[env(safe-area-inset-top)] lg:px-8"
		>
			<div className="cms-topbar-inner mx-auto flex min-h-14 items-center justify-between gap-2">
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
						<span className="hidden sm:inline">Draft </span>
						<span key={draftRevision} className="cms-count-tick">
							r{draftRevision}
						</span>
					</span>
					<span aria-hidden="true" className="cms-pipeline-connector" />
					<PipelineStatus
						stage={stage}
						label={label}
						onResolveConflict={onResolveConflict}
						onReviewRelease={onReviewRelease}
					/>
					<span aria-hidden="true" className="cms-pipeline-connector" />
					<Link
						to="/cms/release"
						preload="intent"
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
						<PipelineActions onRequestPublish={onRequestPublish} saveFeedback={saveFeedback} />
					</div>
				</div>
			</div>

			{publishSweepKey > 0 ? (
				<span key={publishSweepKey} aria-hidden="true" className="cms-publish-sweep" />
			) : null}
			{children}
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

type SaveFeedback = "saving" | "saved" | null;

export function useSaveFeedback(): SaveFeedback {
	const store = useDraftStore();
	const [feedback, setFeedback] = useState<SaveFeedback>(null);
	const savingSince = useRef(0);

	useLayoutEffect(() => {
		// Count the minimum from the committed label, including on a fast save.
		if (feedback === "saving") savingSince.current = performance.now();
	}, [feedback]);

	useEffect(() => {
		let previous = store.getState().status;
		let timer: number | undefined;
		const showSaved = () => {
			const remaining = 400 - (performance.now() - savingSince.current);
			if (remaining > 0) {
				timer = window.setTimeout(showSaved, remaining);
				return;
			}
			setFeedback("saved");
			timer = window.setTimeout(() => setFeedback(null), 1000);
		};
		const unsubscribe = store.subscribe(() => {
			const { status } = store.getState();
			if (status === previous) return;
			window.clearTimeout(timer);
			if (status === "saving") {
				savingSince.current = performance.now();
				setFeedback("saving");
			} else if (previous === "saving" && status === "idle") {
				showSaved();
			} else {
				setFeedback(null);
			}
			previous = status;
		});
		return () => {
			unsubscribe();
			window.clearTimeout(timer);
		};
	}, [store]);

	return feedback;
}

function PipelineActions({
	onRequestPublish,
	saveFeedback,
}: {
	onRequestPublish: () => void;
	saveFeedback: SaveFeedback;
}) {
	const store = useDraftStore();
	const { dirty, ahead, canSave, canPublish, status, publishedRevision } = useDraftSelector(
		(state) => {
			return {
				dirty: state.dirty,
				ahead: state.ahead,
				...draftActionAvailability(state),
				status: state.status,
				publishedRevision: state.publishedRevision,
			};
		},
	);
	const publishedRecently = useRevisionFeedback(publishedRevision);
	const saving = status === "saving" || (status === "idle" && saveFeedback === "saving");
	const publishing = status === "publishing";
	const justSaved = saveFeedback === "saved" && status === "idle" && !dirty;
	const justPublished = publishedRecently && !ahead && !dirty && !saving && !publishing;

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				disabled={!canSave}
				focusableWhenDisabled
				aria-busy={saving || undefined}
				data-complete={justSaved || undefined}
				className="cms-action cms-save-action min-h-11 min-w-[104px] whitespace-nowrap lg:min-h-9 pointer-coarse:min-h-11"
				onClick={() => saveDraftIfAvailable(store)}
			>
				{justSaved ? <CheckCircleIcon /> : <SaveIcon />}
				{saving ? "Saving…" : justSaved ? "Saved" : "Save"}
			</Button>
			<Button
				size="sm"
				disabled={!canPublish}
				focusableWhenDisabled
				aria-busy={publishing || undefined}
				data-complete={justPublished || undefined}
				className="cms-action cms-publish-action min-h-11 min-w-[128px] whitespace-nowrap lg:min-h-9 pointer-coarse:min-h-11"
				onClick={onRequestPublish}
			>
				{justPublished ? <CheckCircleIcon /> : <PublishIcon />}
				{publishing ? "Publishing…" : justPublished ? "Published" : "Publish"}
			</Button>
		</>
	);
}

/** Keep mobile actions visible while there are draft changes to save or publish. */
export function MobileActionBar({
	onRequestPublish,
	saveFeedback,
}: {
	onRequestPublish: () => void;
	saveFeedback: SaveFeedback;
}) {
	const reduce = useLiveReducedMotion();
	const bar = useRef<HTMLDivElement>(null);
	const visible = useDraftSelector(
		(state) =>
			state.dirty ||
			state.ahead ||
			state.issues.all.length > 0 ||
			state.status === "saving" ||
			state.status === "publishing",
	);

	useLayoutEffect(() => {
		if (!visible && bar.current?.contains(document.activeElement)) {
			document.querySelector<HTMLElement>(".cms-status-pill")?.focus({ preventScroll: true });
		}
	}, [visible]);

	return (
		<AnimatePresence initial={false}>
			{visible ? (
				<motion.div
					ref={bar}
					data-slot="cms-mobile-action-bar"
					className="cms-overlay cms-glass fixed inset-x-0 bottom-0 z-(--z-dock) flex items-center gap-2 border-t px-3 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] lg:hidden"
					initial={{ y: reduce ? 0 : 20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: reduce ? 0 : 20, opacity: 0, pointerEvents: "none" }}
					transition={reduce ? REDUCED : SPRING_MOVE}
				>
					<PipelineActions onRequestPublish={onRequestPublish} saveFeedback={saveFeedback} />
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}
