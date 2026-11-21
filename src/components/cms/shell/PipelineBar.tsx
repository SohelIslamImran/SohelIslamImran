/**
 * Sticky 56px Pipeline Bar: a five-state machine (synced, dirty, saving,
 * draft ahead, invalid) visualizing `Draft r42 ──●── Valid ── Live r39`.
 *
 * Never relies on hue alone: every state pairs color with an icon/glyph,
 * dash pattern, or explicit label. Includes the clickable issue jump list,
 * hydration-safe relative save timestamp, ⌘K trigger, single accent Publish
 * button, and the phone top bar + bottom glass action bar.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "../../../lib/utils";
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

export type PipelineStage = "synced" | "dirty" | "saving" | "ahead" | "invalid";

export function usePipelineStage(): {
	stage: PipelineStage;
	label: string;
	shortLabel: string;
} {
	return useDraftSelector((state) => {
		if (state.status === "conflict") {
			return { stage: "invalid", label: "Conflict", shortLabel: "Conflict" };
		}
		if (state.status === "error") {
			return { stage: "invalid", label: "Save failed", shortLabel: "Error" };
		}
		if (state.issues.all.length > 0) {
			const count = state.issues.all.length;
			return {
				stage: "invalid",
				label: `${count} ${count === 1 ? "issue" : "issues"}`,
				shortLabel: `! ${count}`,
			};
		}
		if (state.status === "publishing") {
			return { stage: "saving", label: "Publishing…", shortLabel: "Publishing…" };
		}
		if (state.status === "saving") {
			return { stage: "saving", label: "Saving…", shortLabel: "Saving…" };
		}
		if (state.dirty) {
			return { stage: "dirty", label: "Unsaved", shortLabel: "Unsaved" };
		}
		if (state.ahead) {
			return { stage: "ahead", label: "Draft ahead", shortLabel: "Ahead" };
		}
		return { stage: "synced", label: "Synced", shortLabel: "Live" };
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

function IssueJumpPopover({ trigger }: { trigger: React.ReactNode }) {
	const [open, setOpen] = useState(false);
	const navigate = useNavigate();
	const store = useDraftStore();
	const issues = useDraftSelector((state) => state.issues.all);

	const jumpToIssue = (path: string) => {
		setOpen(false);
		const target = resolvePathTarget(path, store.getState().draft);
		if (target) {
			void navigate({
				to: "/cms/content/$section",
				params: { section: target.sectionId },
				search: target.itemId ? { item: target.itemId } : {},
			}).then(() => {
				focusFieldAfterNavigation(path);
			});
		} else {
			focusFieldAfterNavigation(path);
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger render={<span className="inline-flex" />}>{trigger}</PopoverTrigger>
			<PopoverContent
				align="start"
				sideOffset={10}
				positionMethod="fixed"
				className="w-auto rounded-none border-0 bg-transparent p-0 shadow-none ring-0"
			>
				<MenuSurface className="grid w-[min(380px,calc(100vw-24px))] gap-2 p-2.5">
					<PopoverHeader className="flex flex-row items-center justify-between px-1.5 pt-0.5">
						<PopoverTitle className="mono-label text-[10.5px] text-destructive">
							! Validation issues ({issues.length})
						</PopoverTitle>
						<span className="font-mono text-[10.5px] text-muted-foreground">Jump to field</span>
					</PopoverHeader>
					<ul className="m-0 grid max-h-[300px] list-none gap-1 overflow-y-auto p-0">
						{issues.map((issue, index) => {
							const target = resolvePathTarget(issue.path, store.getState().draft);
							return (
								<li key={`${issue.path}-${index}`}>
									<button
										type="button"
										onClick={() => jumpToIssue(issue.path)}
										className="pressable grid w-full gap-0.5 rounded-[10px] border border-transparent px-2.5 py-2 text-left transition-colors duration-150 hover:border-line hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)]"
									>
										<div className="flex items-center justify-between gap-2">
											<span className="text-[12.5px] font-medium text-foreground">
												{target ? `${target.sectionLabel} · ${target.fieldLabel}` : issue.path}
											</span>
											<span aria-hidden="true" className="font-mono text-[11px] text-primary-text">
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
				</MenuSurface>
			</PopoverContent>
		</Popover>
	);
}

export function PipelineBar({
	onOpenCommandBar,
	onOpenDrawer,
	onRequestPublish,
	publishSweepKey,
}: {
	onOpenCommandBar: () => void;
	onOpenDrawer: () => void;
	onRequestPublish: () => void;
	publishSweepKey: number;
}) {
	const store = useDraftStore();
	const { stage, label, shortLabel } = usePipelineStage();
	const draftRevision = useDraftSelector((state) => state.draftRevision);
	const publishedRevision = useDraftSelector((state) => state.publishedRevision);
	const draftUpdatedAt = useDraftSelector((state) => state.draftUpdatedAt);
	const dirty = useDraftSelector((state) => state.dirty);
	const issueCount = useDraftSelector((state) => state.issues.all.length);
	const canPublish = useDraftSelector(
		(state) => (state.ahead || state.dirty) && state.issues.all.length === 0 && !state.conflict,
	);
	const busy = useDraftSelector(
		(state) => state.status === "saving" || state.status === "publishing",
	);
	const conflict = useDraftSelector((state) => state.conflict !== null);
	const relativeSaved = useRelativeTime(draftUpdatedAt, 10_000);
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 8);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	const leftLineTone =
		stage === "invalid"
			? "invalid"
			: stage === "synced"
				? "success"
				: stage === "ahead" || stage === "saving" || stage === "dirty"
					? "accent"
					: "neutral";

	const rightLineTone =
		stage === "invalid" ? "invalid" : stage === "synced" ? "success" : "neutral";

	return (
		<header
			data-slot="cms-pipeline-bar"
			data-stage={stage}
			data-scrolled={scrolled || undefined}
			className="cms-topbar sticky top-0 z-(--z-sticky) flex min-h-14 items-center justify-between gap-2 px-3 pt-[env(safe-area-inset-top)] lg:px-6"
		>
			{/* Phone & tablet (< lg) top bar */}
			<div className="flex w-full items-center justify-between gap-2 lg:hidden">
				<button
					type="button"
					onClick={onOpenDrawer}
					aria-label="Open navigation menu"
					className="pressable grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)] hover:text-foreground"
				>
					<MenuIcon className="size-5" />
				</button>

				{issueCount > 0 ? (
					<IssueJumpPopover
						trigger={
							<button
								type="button"
								className="pressable inline-flex min-h-9 items-center gap-2 rounded-full border border-dashed border-destructive/55 bg-destructive/10 px-3 font-mono text-[11.5px] font-medium text-destructive"
							>
								<AlertTriangleIcon className="size-3.5" />
								<span>
									r{draftRevision} · {label}
								</span>
							</button>
						}
					/>
				) : (
					<Link
						to="/cms/release"
						className={cn(
							"inline-flex min-h-9 items-center gap-2 rounded-full border px-3 font-mono text-[11.5px] tabular-nums no-underline transition-colors duration-150",
							stage === "synced" && "border-line bg-surface-solid text-ink-soft",
							stage === "ahead" && "border-primary-line bg-primary-soft text-primary-text",
							stage === "dirty" && "border-primary-line bg-surface-solid text-foreground",
							stage === "saving" && "border-primary-line bg-primary-soft text-primary-text",
							stage === "invalid" &&
								"border-dashed border-destructive/55 bg-destructive/10 text-destructive",
						)}
					>
						<span aria-hidden="true">
							{stage === "synced" ? "✓" : stage === "ahead" ? "Δ" : stage === "dirty" ? "●" : "⋯"}
						</span>
						<span>
							r{draftRevision} → r{publishedRevision}
						</span>
						<span className="opacity-75">· {shortLabel}</span>
					</Link>
				)}

				<button
					type="button"
					onClick={onOpenCommandBar}
					aria-label="Search and commands"
					className="pressable grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)] hover:text-foreground"
				>
					<SearchIcon className="size-[18px]" />
				</button>
			</div>

			{/* Desktop (>= lg) 5-state pipeline bar */}
			<div className="hidden min-w-0 flex-1 items-center justify-between gap-4 lg:flex">
				<div
					role="status"
					aria-live="polite"
					className="flex min-w-0 items-center gap-2.5 font-mono text-[12px] tabular-nums"
				>
					<span className="inline-flex shrink-0 items-center gap-1.5 text-foreground">
						<span
							aria-hidden="true"
							className={cn(
								"size-2 rounded-full",
								stage === "dirty" && "border-2 border-primary bg-transparent",
								stage === "saving" && "bg-primary",
								stage === "ahead" && "bg-primary",
								stage === "synced" && "bg-success",
								stage === "invalid" && "bg-destructive",
							)}
						/>
						<span>Draft r{draftRevision}</span>
					</span>

					<span
						aria-hidden="true"
						data-tone={leftLineTone}
						className="cms-pipeline-line w-8 xl:w-12"
					>
						{stage === "saving" ? <span className="cms-pipeline-runner" /> : null}
					</span>

					{issueCount > 0 ? (
						<IssueJumpPopover
							trigger={
								<button
									type="button"
									className="pressable inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-destructive/55 bg-destructive/10 px-2.5 font-mono text-[11.5px] font-medium text-destructive hover:bg-destructive/16"
								>
									<AlertTriangleIcon className="size-3.5" />
									<span>{label}</span>
								</button>
							}
						/>
					) : stage === "ahead" ? (
						<Link
							to="/cms/release"
							className="inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded-full border border-primary-line bg-primary-soft px-2.5 font-mono text-[11.5px] font-medium text-primary-text no-underline transition-colors duration-150 hover:bg-primary/15"
						>
							<span aria-hidden="true">Δ</span>
							<span>{label}</span>
						</Link>
					) : (
						<span
							className={cn(
								"inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[11.5px]",
								stage === "synced" && "border-success/35 bg-success/10 text-success",
								stage === "dirty" && "border-primary-line bg-surface-solid text-foreground",
								stage === "saving" && "border-primary-line bg-primary-soft text-primary-text",
								stage === "invalid" &&
									"border-dashed border-destructive/55 bg-destructive/10 text-destructive",
							)}
						>
							{stage === "synced" ? (
								<CheckCircleIcon className="size-3.5" />
							) : stage === "invalid" ? (
								<AlertTriangleIcon className="size-3.5" />
							) : (
								<span aria-hidden="true">{stage === "saving" ? "⋯" : "●"}</span>
							)}
							<span>{label}</span>
						</span>
					)}

					<span
						aria-hidden="true"
						data-tone={rightLineTone}
						className="cms-pipeline-line w-8 xl:w-12"
					/>

					<Link
						to="/cms/release"
						className="inline-flex shrink-0 items-center gap-1.5 text-muted-foreground no-underline transition-colors duration-150 hover:text-foreground"
					>
						<span
							aria-hidden="true"
							className={cn(
								"size-2 rounded-full",
								stage === "synced" ? "bg-success" : "border border-line-strong bg-transparent",
							)}
						/>
						<span>Live r{publishedRevision}</span>
					</Link>
				</div>

				<div className="flex shrink-0 items-center gap-2">
					<span className="hidden font-mono text-[11.5px] text-muted-foreground xl:inline">
						{dirty ? "Unsaved edits" : relativeSaved ? `Saved ${relativeSaved}` : "Saved"}
					</span>

					<button
						type="button"
						onClick={onOpenCommandBar}
						className="pressable inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-surface-solid px-3 text-[12.5px] text-muted-foreground transition-colors duration-150 hover:border-line-strong hover:text-foreground"
					>
						<SearchIcon className="size-3.5" />
						<span className="hidden xl:inline">Jump</span>
						<Kbd>⌘K</Kbd>
					</button>

					<Button
						variant="outline"
						size="sm"
						disabled={busy || conflict || issueCount > 0 || !dirty}
						onClick={() => void store.save()}
					>
						<SaveIcon className="size-3.5" />
						<span>{busy && dirty ? "Saving…" : "Save"}</span>
					</Button>

					<Button
						variant="default"
						size="sm"
						disabled={!canPublish || busy}
						onClick={onRequestPublish}
					>
						<PublishIcon className="size-3.5" />
						<span>Publish</span>
					</Button>
				</div>
			</div>

			{publishSweepKey > 0 ? (
				<span key={publishSweepKey} aria-hidden="true" className="cms-publish-sweep" />
			) : null}
		</header>
	);
}

/** Phone bottom glass action bar shown only while dirty, invalid, or actively saving/publishing. */
export function MobileActionBar({ onRequestPublish }: { onRequestPublish: () => void }) {
	const store = useDraftStore();
	const { stage, label } = usePipelineStage();
	const dirty = useDraftSelector((state) => state.dirty);
	const issueCount = useDraftSelector((state) => state.issues.all.length);
	const conflict = useDraftSelector((state) => state.conflict !== null);
	const busy = useDraftSelector(
		(state) => state.status === "saving" || state.status === "publishing",
	);
	const canPublish = useDraftSelector(
		(state) => (state.ahead || state.dirty) && state.issues.all.length === 0 && !state.conflict,
	);

	const visible = dirty || issueCount > 0 || busy;
	if (!visible) return null;

	return (
		<div
			data-slot="cms-mobile-action-bar"
			className="cms-glass fixed inset-x-0 bottom-0 z-(--z-dock) flex items-center justify-between gap-2 border-t px-3 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))] lg:hidden"
		>
			<div className="flex min-w-0 items-center gap-2 font-mono text-[11.5px]">
				{issueCount > 0 ? (
					<AlertTriangleIcon className="size-4 shrink-0 text-destructive" />
				) : (
					<span
						aria-hidden="true"
						className={cn(
							"size-2 shrink-0 rounded-full",
							stage === "saving" ? "bg-primary" : "border-2 border-primary bg-transparent",
						)}
					/>
				)}
				<span className={cn("truncate", issueCount > 0 ? "text-destructive" : "text-foreground")}>
					{label}
				</span>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				<Button
					variant="outline"
					size="default"
					disabled={busy || conflict || issueCount > 0 || !dirty}
					onClick={() => void store.save()}
					className="min-h-11 px-4 text-[13.5px]"
				>
					Save
				</Button>
				<Button
					variant="default"
					size="default"
					disabled={!canPublish || busy}
					onClick={onRequestPublish}
					className="min-h-11 px-4 text-[13.5px]"
				>
					Publish
				</Button>
			</div>
		</div>
	);
}
