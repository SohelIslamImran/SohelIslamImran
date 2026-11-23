/**
 * Control Plane CMS Shell:
 * - Skip link + exactly one `<main id="main-content" tabIndex={-1}>`
 * - Responsive Layer Rail (232px at >=1280px, 56px icon rail at 1024-1279px,
 *   collapsible via ⌘\ / Ctrl+\, slide-over glass drawer on phones/tablets)
 * - Live-pulse slot at the top of the rail (`RailPulseSlot` or `pulseSlot` prop)
 * - Release group pinned to the bottom of the rail + AccentSwitcher + Live site ↗
 * - Sticky 56px five-state Pipeline Bar + phone bottom action bar while dirty
 * - ⌘K Command Bar, ⌘S save shortcut, Conflict AlertDialog, Auth expired banner
 * - On the Changes page, the command bar and release status can focus the
 *   page's publish gate. The gate owns the primary Publish button.
 */
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type ReactNode,
	type TouchEvent,
} from "react";
import { Drawer } from "@base-ui/react/drawer";
import { Tooltip } from "@base-ui/react/tooltip";
import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, animate, motion, spring, useMotionValue } from "motion/react";
import { cn } from "../../../lib/utils";
import { AccentSwitcher } from "../../AccentSwitcher";
import { Button, buttonVariants } from "../../ui/button";
import { useDraftSelector, useDraftStore, usePublicOrigin } from "../draft/context";
import { SettledIssuesProvider, useSettledIssues } from "../draft/use-settled-issues";
import { REDUCED, SPRING_MOVE } from "../motion";

import { SECTION_GROUPS, SECTIONS } from "../sections/registry";
import {
	ActivityIcon,
	AlertTriangleIcon,
	AnalyticsIcon,
	CloseIcon,
	ExternalArrowIcon,
	HistoryIcon,
	MediaLibraryIcon,
	OverviewIcon,
	ReleaseChangesIcon,
	SectionIcon,
	SidebarToggleIcon,
} from "./cms-icons";
import { CommandBar } from "./CommandBar";
import { ConflictDialog, PublishConfirmDialog } from "./Dialogs";
import { draftActionAvailability, saveDraftIfAvailable } from "./draft-actions";
import { MobileActionBar, PipelineBar, useSaveFeedback } from "./PipelineBar";
import { RAIL_STORAGE_KEY, type RailMode } from "./rail-preference";
import { RailPulseSlot } from "./RailPulseSlot";
import { RailRouterLink } from "./RailRouterLink";
import { RailTooltip } from "./RailTooltip";
import { useLiveReducedMotion } from "./use-live-reduced-motion";

const RAIL_PILL_FADE = { duration: 0.16, ease: [0.22, 1, 0.36, 1] } as const;

/** Near-critically damped; physics options so the release velocity carries over. */
const DRAWER_SPRING = { stiffness: 300, damping: 34 } as const;

/**
 * The active-link pill of one rail region (the scrolling nav, or the pinned
 * Release group). It slides between links of its own region and fades out or
 * in when the active link moves to the other region, so it never has to cross
 * two clipping scroll containers.
 *
 * Its position is the link's `offsetTop` inside the region, which neither the
 * window scroll (reset by the router on navigation) nor the nav's own scroll
 * changes. Shared-layout (`layoutId`) measurement mixed the pre- and
 * post-navigation window scroll and started the slide from the wrong place.
 */
function RailIndicator({ active }: { active: string }) {
	const ref = useRef<HTMLSpanElement>(null);
	const y = useMotionValue(0);
	const opacity = useMotionValue(0);
	const shown = useRef(false);
	const reduce = useLiveReducedMotion();

	useLayoutEffect(() => {
		const indicator = ref.current;
		const region = indicator?.parentElement;
		if (!indicator || !region) return;
		const link = region.querySelector<HTMLElement>('.cms-rail-link[aria-current="page"]');
		region.dataset.indicator = "";
		if (!link) {
			if (shown.current) animate(opacity, 0, reduce ? REDUCED : RAIL_PILL_FADE);
			shown.current = false;
			return;
		}
		indicator.style.height = `${link.offsetHeight}px`;
		if (shown.current && !reduce) {
			animate(y, link.offsetTop, SPRING_MOVE);
		} else {
			y.jump(link.offsetTop);
			animate(opacity, 1, reduce ? REDUCED : RAIL_PILL_FADE);
		}
		shown.current = true;
	}, [active, opacity, reduce, y]);

	// Link heights change with the pointer type; keep the pill on its link.
	useEffect(() => {
		const indicator = ref.current;
		const region = indicator?.parentElement;
		if (!indicator || !region) return;
		let size = "";
		const observer = new ResizeObserver(() => {
			const next = `${region.offsetWidth}x${region.offsetHeight}`;
			if (next === size) return;
			const first = size === "";
			size = next;
			const link = region.querySelector<HTMLElement>('.cms-rail-link[aria-current="page"]');
			if (first || !link) return;
			indicator.style.height = `${link.offsetHeight}px`;
			y.jump(link.offsetTop);
		});
		observer.observe(region);
		return () => observer.disconnect();
	}, [y]);

	return (
		<motion.span
			ref={ref}
			aria-hidden="true"
			className="cms-rail-pill pointer-events-none absolute inset-x-0 top-0 rounded-[10px]"
			style={{ y, opacity }}
		/>
	);
}

export { RailPulseSlot };

/** Element id of the Changes page's publish gate. See the file comment. */
export const RELEASE_GATE_ID = "release-gate";

export const CMS_NAV = {
	signals: [
		{ to: "/cms", label: "Overview" },
		{ to: "/cms/analytics", label: "Analytics" },
	],
	assets: [{ to: "/cms/library", label: "Media library" }],
	release: [
		{ to: "/cms/release", label: "Changes" },
		{ to: "/cms/history", label: "History" },
		{ to: "/cms/activity", label: "Activity" },
	],
} as const;

function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	const tag = target.tagName;
	if (tag === "TEXTAREA" || tag === "SELECT") return true;
	if (tag !== "INPUT") return false;
	const type = (target as HTMLInputElement).type;
	return !["button", "checkbox", "radio", "range", "reset", "submit", "color", "file"].includes(
		type,
	);
}

function NavIconFor({ to }: { to: string }) {
	switch (to) {
		case "/cms":
			return <OverviewIcon />;
		case "/cms/analytics":
			return <AnalyticsIcon />;
		case "/cms/library":
			return <MediaLibraryIcon />;
		case "/cms/release":
			return <ReleaseChangesIcon />;
		case "/cms/history":
			return <HistoryIcon />;
		case "/cms/activity":
			return <ActivityIcon />;
		default:
			return <OverviewIcon />;
	}
}

function RailLink({
	to,
	params,
	icon,
	label,
	badge,
	compactBadge,
	badgeLabel,
	active,
	pending,
	layoutScope,
	onNavigate,
}: {
	to: string;
	params?: Record<string, string>;
	icon: ReactNode;
	label: string;
	badge?: ReactNode;
	compactBadge?: ReactNode;
	badgeLabel?: string;
	active: boolean;
	pending?: boolean;
	layoutScope: "desktop" | "drawer";
	onNavigate?: () => void;
}) {
	return (
		<RailTooltip
			disabled={layoutScope === "drawer"}
			label={badgeLabel ? `${label} · ${badgeLabel}` : label}
			showExpanded={to === "/cms/release" && !!badgeLabel}
		>
			<RailRouterLink
				to={to}
				params={params}
				preload="intent"
				viewTransition={layoutScope === "drawer" ? false : undefined}
				currentPage={active}
				aria-label={badgeLabel ? `${label}, ${badgeLabel}` : label}
				aria-busy={pending || undefined}
				data-pending={pending || undefined}
				onClick={(event) => {
					if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
						onNavigate?.();
					}
				}}
				className="cms-rail-link cms-chrome-control cms-press relative flex min-h-9 items-center rounded-[10px] px-3 text-[13px] text-ink-soft no-underline pointer-coarse:min-h-11"
			>
				<span className="cms-rail-icon relative z-[1] grid size-4 shrink-0 place-items-center">
					{icon}
					{compactBadge ? (
						<span className="cms-rail-badge-dot pointer-events-none absolute -top-1 -right-2">
							{compactBadge}
						</span>
					) : null}
				</span>
				<span className="cms-rail-label relative z-[1] ml-2.5 whitespace-nowrap">{label}</span>
				{badge ? <span className="cms-rail-badge-full absolute right-2 z-[1]">{badge}</span> : null}
			</RailRouterLink>
		</RailTooltip>
	);
}

function useSectionState(paths: readonly string[]) {
	const issues = useSettledIssues();
	const errors = paths.reduce((total, path) => total + issues.under(path).length, 0);
	const changed = useDraftSelector((state, store) =>
		paths.some((path) => store.changedAt(path, state)),
	);
	return { errors, changed };
}

function SectionRailItem({
	id,
	label,
	paths,
	active,
	pending,
	layoutScope,
	onNavigate,
}: {
	id: string;
	label: string;
	paths: readonly string[];
	active: boolean;
	pending: boolean;
	layoutScope: "desktop" | "drawer";
	onNavigate?: () => void;
}) {
	const { errors, changed } = useSectionState(paths);
	const badge = errors ? (
		<span className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-destructive/45 bg-destructive/10 px-1.5 py-0.5 font-mono text-[10.5px] leading-none text-destructive">
			<span aria-hidden="true">!</span>
			<span key={errors} className="cms-count-tick tabular-nums">
				{errors}
			</span>
			<span className="sr-only"> {errors === 1 ? "error" : "errors"}</span>
		</span>
	) : changed ? (
		<span className="inline-flex items-center rounded-full border border-primary-line bg-primary-soft px-1.5 py-0.5 font-mono text-[10.5px] leading-none text-primary-text">
			<span aria-hidden="true">Δ</span>
			<span className="sr-only"> changed</span>
		</span>
	) : null;

	const compactBadge = errors ? (
		<span
			aria-hidden="true"
			className="grid size-3.5 place-items-center rounded-full bg-destructive font-mono text-[9px] font-bold text-destructive-foreground"
		>
			!
		</span>
	) : changed ? (
		<span
			aria-hidden="true"
			className="grid size-3.5 place-items-center rounded-full bg-primary font-mono text-[9px] font-bold text-primary-foreground"
		>
			Δ
		</span>
	) : null;

	return (
		<RailLink
			to="/cms/content/$section"
			params={{ section: id }}
			icon={<SectionIcon id={id} />}
			label={label}
			badge={badge}
			compactBadge={compactBadge}
			active={active}
			pending={pending}
			badgeLabel={
				errors
					? `${errors} validation ${errors === 1 ? "error" : "errors"}`
					: changed
						? "Draft changed"
						: undefined
			}
			layoutScope={layoutScope}
			onNavigate={onNavigate}
		/>
	);
}

function ChangesRailBadge({ changedCount }: { changedCount: number }) {
	if (changedCount === 0) return null;
	return (
		<span
			aria-hidden="true"
			className="inline-flex items-center gap-0.5 rounded-full border border-primary-line bg-primary-soft px-1.5 py-0.5 font-mono text-[10.5px] leading-none text-primary-text tabular-nums"
		>
			<span aria-hidden="true">Δ</span>
			<span key={changedCount} className="cms-count-tick">
				{changedCount}
			</span>
		</span>
	);
}

function ChangesCompactBadge() {
	const aheadOrDirty = useDraftSelector((state) => state.ahead || state.dirty);
	if (!aheadOrDirty) return null;
	return (
		<span
			aria-hidden="true"
			className="grid size-3.5 place-items-center rounded-full bg-primary font-mono text-[9px] font-bold text-primary-foreground"
		>
			Δ
		</span>
	);
}

function RailHeading({ children }: { children: ReactNode }) {
	return (
		<p className="cms-rail-heading relative px-3 text-[11px] leading-5 font-medium text-muted-foreground">
			<span>{children}</span>
		</p>
	);
}

function LayerRailContent({
	layoutScope,
	pulseSlot,
	collapsed,
	onToggleRail,
	onNavigate,
}: {
	layoutScope: "desktop" | "drawer";
	pulseSlot?: ReactNode;
	collapsed?: boolean;
	onToggleRail?: () => void;
	onNavigate?: () => void;
}) {
	const pathname = useCommittedPathname();
	const pendingPath = useRouterState({
		select: (state) => (state.isLoading ? state.location.pathname.replace(/\/+$/u, "") : null),
	});
	const normalized = pathname;
	const publicOrigin = usePublicOrigin();
	const railScroll = useRef<HTMLElement>(null);
	const changedCount = useDraftSelector((state, store) =>
		SECTIONS.reduce(
			(count, section) =>
				count + (section.paths.some((path) => store.changedAt(path, state)) ? 1 : 0),
			0,
		),
	);

	useLayoutEffect(() => {
		const nav = railScroll.current;
		const link = nav?.querySelector<HTMLElement>('.cms-rail-link[aria-current="page"]');
		if (!nav || !link) return;
		const reveal = () => {
			if (!nav.clientHeight) return;
			const viewport = nav.getBoundingClientRect();
			const item = link.getBoundingClientRect();
			if (item.top < viewport.top) nav.scrollTop += item.top - viewport.top;
			else if (item.bottom > viewport.bottom) nav.scrollTop += item.bottom - viewport.bottom;
		};
		reveal();
		// Also reveal when a previously hidden desktop rail gains a viewport.
		const observer = new ResizeObserver(reveal);
		observer.observe(nav);
		return () => observer.disconnect();
	}, [pathname]);

	const isPathActive = (to: string) => {
		if (to === "/cms") return normalized === "/cms" || normalized === "/";
		const stripped = to.replace(/^\/cms/u, "");
		return normalized === to || normalized === stripped;
	};

	const isPending = (to: string) =>
		!isPathActive(to) && (pendingPath === to || pendingPath === to.replace(/^\/cms/u, ""));

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="cms-rail-header grid shrink-0 grid-cols-1 gap-2 px-2 pt-3 pb-1">
				<div className="cms-rail-top-row relative flex min-h-11 min-w-0 items-center pl-1.5">
					<span className="cms-rail-brand flex items-center gap-2.5 whitespace-nowrap">
						<span
							aria-hidden="true"
							className="grid size-8 shrink-0 place-items-center rounded-[10px] border border-primary-line bg-primary-soft font-mono text-[11px] font-semibold text-primary-text"
						>
							SI
						</span>
						<span className="text-[14px] font-semibold tracking-[-0.02em]">Control plane</span>
					</span>
					{onToggleRail ? (
						<RailTooltip
							label={`${collapsed ? "Expand" : "Collapse"} sidebar (⌘\\ / Ctrl+\\)`}
							showExpanded
						>
							<button
								type="button"
								onClick={onToggleRail}
								aria-keyshortcuts={"Meta+\\ Control+\\"}
								aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
								aria-expanded={!collapsed}
								className="cms-rail-toggle cms-chrome-control cms-press absolute grid size-8 place-items-center rounded-[9px] text-muted-foreground pointer-coarse:size-11"
							>
								<SidebarToggleIcon className="cms-rail-toggle-expanded col-start-1 row-start-1" />
								<SidebarToggleIcon
									collapsed
									className="cms-rail-toggle-collapsed col-start-1 row-start-1"
								/>
							</button>
						</RailTooltip>
					) : null}
				</div>
				{pulseSlot ?? <RailPulseSlot onNavigate={onNavigate} />}
			</div>

			{/* Scrollable middle sections */}
			<nav
				ref={railScroll}
				aria-label="CMS"
				className="cms-rail-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3"
			>
				<div className="cms-rail-region relative">
					<RailIndicator active={pathname} />
					<RailHeading>Signals</RailHeading>
					<div className="grid grid-cols-1 gap-0.5">
						{CMS_NAV.signals.map((item) => (
							<RailLink
								key={item.to}
								to={item.to}
								icon={<NavIconFor to={item.to} />}
								label={item.label}
								active={isPathActive(item.to)}
								pending={isPending(item.to)}
								layoutScope={layoutScope}
								onNavigate={onNavigate}
							/>
						))}
					</div>

					{SECTION_GROUPS.map((group) => (
						<div key={group.id} className="grid grid-cols-1 gap-0.5">
							<RailHeading>{group.label}</RailHeading>
							{SECTIONS.filter((section) => section.group === group.id).map((section) => (
								<SectionRailItem
									key={section.id}
									id={section.id}
									label={section.label}
									paths={section.paths}
									active={isPathActive(`/cms/content/${section.id}`)}
									pending={isPending(`/cms/content/${section.id}`)}
									layoutScope={layoutScope}
									onNavigate={onNavigate}
								/>
							))}
						</div>
					))}

					<RailHeading>Assets</RailHeading>
					<div className="grid grid-cols-1 gap-0.5">
						{CMS_NAV.assets.map((item) => (
							<RailLink
								key={item.to}
								to={item.to}
								icon={<NavIconFor to={item.to} />}
								label={item.label}
								active={isPathActive(item.to)}
								pending={isPending(item.to)}
								layoutScope={layoutScope}
								onNavigate={onNavigate}
							/>
						))}
					</div>
				</div>
			</nav>

			{/* Bottom pinned Release zone + Appearance & Live site */}
			<div className="cms-rail-footer shrink-0 border-t border-line px-2 pb-2.5">
				<RailHeading>Release</RailHeading>
				<div className="cms-rail-region relative grid grid-cols-1 gap-0.5">
					<RailIndicator active={pathname} />
					{CMS_NAV.release.map((item) => (
						<RailLink
							key={item.to}
							to={item.to}
							icon={<NavIconFor to={item.to} />}
							label={item.label}
							badge={
								item.to === "/cms/release" ? (
									<ChangesRailBadge changedCount={changedCount} />
								) : undefined
							}
							badgeLabel={
								item.to === "/cms/release" && changedCount > 0
									? `${changedCount} ${changedCount === 1 ? "section" : "sections"} changed`
									: undefined
							}
							compactBadge={item.to === "/cms/release" ? <ChangesCompactBadge /> : undefined}
							active={isPathActive(item.to)}
							pending={isPending(item.to)}
							layoutScope={layoutScope}
							onNavigate={onNavigate}
						/>
					))}
				</div>

				<div className="cms-rail-footer-row mt-2.5 flex items-center justify-between gap-1.5 border-t border-line pt-2 lg:grid">
					<RailTooltip label="Appearance" showExpanded disabled={layoutScope === "drawer"}>
						<span className="grid w-fit">
							<AccentSwitcher className="cms-rail-appearance cms-chrome-control size-9 pointer-coarse:size-11" />
						</span>
					</RailTooltip>
					<RailTooltip label="Open live site" disabled={layoutScope === "drawer"}>
						<a
							href={publicOrigin}
							target="_blank"
							rel="noreferrer"
							aria-label="Open live site"
							className="cms-rail-live cms-press cms-chrome-control grid min-h-9 items-center overflow-hidden rounded-[10px] text-[12px] text-ink-soft no-underline pointer-coarse:min-h-11"
						>
							<ExternalArrowIcon className="size-3.5 justify-self-center" />
							<span className="cms-rail-footer-label whitespace-nowrap">Live site</span>
						</a>
					</RailTooltip>
				</div>
			</div>
		</div>
	);
}

/** Save state in words, never color alone. */
export function useStatusLine(): { label: string; tone: "ok" | "busy" | "warn" | "error" } {
	return useDraftSelector((state) => {
		if (state.authExpired) return SIGNED_OUT;
		if (state.status === "conflict") return CONFLICT;
		if (state.status === "error") return ERROR;
		if (state.status === "saving") return SAVING;
		if (state.status === "publishing") return PUBLISHING;
		if (state.issues.all.length) return INVALID;
		if (state.dirty) return UNSAVED;
		if (state.ahead) return AHEAD;
		return LIVE;
	});
}

const SIGNED_OUT = { label: "Signed out", tone: "error" } as const;
const CONFLICT = { label: "Conflict: changed elsewhere", tone: "error" } as const;
const ERROR = { label: "Not saved", tone: "error" } as const;
const SAVING = { label: "Saving…", tone: "busy" } as const;
const PUBLISHING = { label: "Publishing…", tone: "busy" } as const;
const INVALID = { label: "Unsaved · fix errors", tone: "warn" } as const;
const UNSAVED = { label: "Unsaved changes", tone: "busy" } as const;
const AHEAD = { label: "Draft ahead of live", tone: "warn" } as const;
const LIVE = { label: "Live is up to date", tone: "ok" } as const;

type SessionNotice = { kind: "expired" } | { kind: "publish" } | { kind: "save"; message: string };

/**
 * Save, publish, and expired-session notices: an in-flow strip under the top
 * bar, inside its content width, so it never covers page controls. It opens
 * and closes with a height spring (a fade under reduced motion). Save and
 * publish notices can be dismissed; the status pill keeps the state.
 */
function SessionBanners({
	publishFailed,
	publishDialogOpen,
	onRetryPublish,
}: {
	publishFailed: boolean;
	publishDialogOpen: boolean;
	onRetryPublish: () => void;
}) {
	const store = useDraftStore();
	const reduce = useLiveReducedMotion();
	const authExpired = useDraftSelector((state) => state.authExpired);
	const status = useDraftSelector((state) => state.status);
	const error = useDraftSelector((state) => state.error);
	const dirty = useDraftSelector((state) => state.dirty);
	const [dismissed, setDismissed] = useState<string | null>(null);
	const [signInOpened, setSignInOpened] = useState(false);
	const strip = useRef<HTMLDivElement>(null);
	const retryRef = useRef<HTMLButtonElement>(null);

	const notice: SessionNotice | null = authExpired
		? { kind: "expired" }
		: status === "error" && error && !publishDialogOpen
			? publishFailed
				? { kind: "publish" }
				: { kind: "save", message: error }
			: null;
	const key = notice ? (notice.kind === "save" ? `save:${notice.message}` : notice.kind) : null;
	const visible = notice !== null && key !== dismissed;
	// Keep the last notice on screen while the strip closes.
	const shown = useRef<SessionNotice | null>(null);
	if (notice && visible) shown.current = notice;
	const content = shown.current;

	useEffect(() => {
		if (key === null) setDismissed(null);
		if (!authExpired) setSignInOpened(false);
	}, [authExpired, key]);

	useLayoutEffect(() => {
		if (signInOpened) retryRef.current?.focus({ preventScroll: true });
	}, [signInOpened]);

	useLayoutEffect(() => {
		if (!visible && strip.current?.contains(document.activeElement)) {
			document.querySelector<HTMLElement>(".cms-status-pill")?.focus({ preventScroll: true });
		}
	}, [visible]);

	// Scroll targets and the route transition clip sit below the taller bar.
	useEffect(() => {
		const body = strip.current?.firstElementChild;
		const root = document.documentElement;
		if (!visible || !(body instanceof HTMLElement)) return;
		const observer = new ResizeObserver(() => {
			root.style.setProperty("--cms-topbar-extra", `${body.offsetHeight}px`);
		});
		observer.observe(body);
		return () => {
			observer.disconnect();
			root.style.removeProperty("--cms-topbar-extra");
		};
	}, [visible]);

	const focusPill = (button: HTMLElement) => {
		if (document.activeElement === button) {
			document.querySelector<HTMLElement>(".cms-status-pill")?.focus({ preventScroll: true });
		}
	};

	const retryAfterSignIn = () => {
		const retryPublish = publishFailed && !dirty;
		setSignInOpened(false);
		void store.resumeAfterSignIn().then((ok) => {
			if (ok && retryPublish) onRetryPublish();
		});
	};

	return (
		<AnimatePresence initial={false}>
			{visible && content ? (
				<motion.div
					ref={strip}
					key="session-notice"
					className="overflow-hidden"
					initial={{ height: 0, opacity: 0 }}
					animate={{ height: "auto", opacity: 1 }}
					exit={{ height: 0, opacity: 0 }}
					transition={
						reduce
							? { height: { duration: 0 }, opacity: REDUCED }
							: { height: SPRING_MOVE, opacity: RAIL_PILL_FADE }
					}
				>
					<div className="cms-topbar-inner mx-auto pb-2.5">
						<div
							role="alert"
							data-slot={
								content.kind === "expired" ? "cms-auth-expired-banner" : "cms-error-banner"
							}
							className="cms-session-banner flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[12px] py-2 pr-2 pl-3 text-[13px] text-foreground"
						>
							<span className="flex min-w-0 flex-[1_0_min(240px,100%)] items-center gap-2">
								<AlertTriangleIcon className="size-4 shrink-0 text-destructive" />
								<span>
									{content.kind === "expired"
										? signInOpened
											? "Signed in again? Retry to save your edits from this tab."
											: "You were signed out. Sign in again in a new tab; your edits stay in this one."
										: content.kind === "publish"
											? "The draft could not be published. Check your connection."
											: content.message}
								</span>
							</span>
							<span className="flex shrink-0 items-center gap-1.5">
								{content.kind === "expired" ? (
									<>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => window.location.reload()}
											className="pointer-coarse:min-h-11"
										>
											Reload console
										</Button>
										{signInOpened ? (
											<Button
												ref={retryRef}
												size="sm"
												onClick={retryAfterSignIn}
												className="pointer-coarse:min-h-11"
											>
												{publishFailed && !dirty ? "Retry publish" : "Retry save"}
											</Button>
										) : (
											<a
												href={new URL("/", window.location.origin).href}
												target="_blank"
												rel="noopener"
												onClick={() => setSignInOpened(true)}
												className={buttonVariants({
													size: "sm",
													className: "cms-press no-underline pointer-coarse:min-h-11",
												})}
											>
												Sign in again <ExternalArrowIcon className="size-3.5" />
											</a>
										)}
									</>
								) : (
									<>
										<Button
											variant="outline"
											size="sm"
											onClick={(event) => {
												if (content.kind === "publish") {
													onRetryPublish();
													return;
												}
												focusPill(event.currentTarget);
												saveDraftIfAvailable(store);
											}}
											className="pointer-coarse:min-h-11"
										>
											{content.kind === "publish" ? "Retry publish" : "Retry save"}
										</Button>
										<button
											type="button"
											aria-label="Dismiss"
											onClick={(event) => {
												focusPill(event.currentTarget);
												setDismissed(key);
											}}
											className="cms-chrome-control cms-press grid size-8 place-items-center rounded-[8px] text-muted-foreground pointer-coarse:size-11"
										>
											<CloseIcon className="size-3.5" />
										</button>
									</>
								)}
							</span>
						</div>
					</div>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}

export function useCommittedPathname() {
	return useRouterState({
		select: (state) => state.matches.at(-1)?.pathname.replace(/\/+$/u, "") || "/",
	});
}

export function CmsShell(props: { children: ReactNode; pulseSlot?: ReactNode }) {
	return (
		<SettledIssuesProvider>
			<CmsShellLayout {...props} />
		</SettledIssuesProvider>
	);
}

function CmsShellLayout({ children, pulseSlot }: { children: ReactNode; pulseSlot?: ReactNode }) {
	const store = useDraftStore();
	const saveFeedback = useSaveFeedback();
	const [railMode, setRailMode] = useState<RailMode>("auto");
	const [railReady, setRailReady] = useState(false);
	const [wide, setWide] = useState(false);
	useLayoutEffect(() => {
		const query = window.matchMedia("(min-width: 1280px)");
		const sync = () => setWide(query.matches);
		sync();
		query.addEventListener("change", sync);
		try {
			const saved = localStorage.getItem(RAIL_STORAGE_KEY);
			if (saved === "collapsed" || saved === "expanded") setRailMode(saved);
		} catch {
			// The rail still works when storage is unavailable.
		}
		setRailReady(true);
		return () => query.removeEventListener("change", sync);
	}, []);
	useEffect(() => {
		if (railMode === "auto") return;
		try {
			localStorage.setItem(RAIL_STORAGE_KEY, railMode);
		} catch {
			// Keep the in-memory preference.
		}
	}, [railMode]);
	const [commandOpen, setCommandOpen] = useState(false);
	const commandOpener = useRef<HTMLElement | null>(null);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const drawer = useRef<HTMLDivElement>(null);
	const drawerScrim = useRef<HTMLDivElement>(null);
	const drawerFrame = useRef(0);
	const interruptedSettle = useRef(false);
	const drawerDismissSettling = useRef(false);
	const swipe = useRef<{ x: number; time: number }[]>([]);
	const release = useRef<{ x: number; velocity: number; time: number } | null>(null);

	const clearDrawerStyles = useCallback(() => {
		cancelAnimationFrame(drawerFrame.current);
		drawerFrame.current = 0;
		interruptedSettle.current = false;
		drawer.current?.style.removeProperty("transform");
		drawer.current?.style.removeProperty("transition");
		drawerScrim.current?.style.removeProperty("opacity");
		drawerScrim.current?.style.removeProperty("transition");
	}, []);

	useEffect(() => {
		const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
		const onChange = () => {
			release.current = null;
			clearDrawerStyles();
			if (drawerDismissSettling.current) {
				drawerDismissSettling.current = false;
				setDrawerOpen(false);
			}
		};
		preference.addEventListener("change", onChange);
		return () => {
			preference.removeEventListener("change", onChange);
			cancelAnimationFrame(drawerFrame.current);
		};
	}, [clearDrawerStyles]);

	const setDrawerVisible = (open: boolean) => {
		drawerDismissSettling.current = false;
		release.current = null;
		clearDrawerStyles();
		setDrawerOpen(open);
	};

	/**
	 * After a swipe, Motion carries the drawer from where the finger left it,
	 * starting at the finger's speed, so release never jumps or stalls. Used for
	 * both outcomes: dismissed (to off-screen) and not dismissed (back to 0).
	 */
	const settleDrawer = (
		{ x: from, velocity, time }: NonNullable<typeof release.current>,
		to: number,
		onComplete: () => void,
	) => {
		const popup = drawer.current;
		if (!popup) return;
		const scrim = drawerScrim.current;
		const width = popup.offsetWidth;
		cancelAnimationFrame(drawerFrame.current);
		popup.style.transition = "none";
		if (scrim) scrim.style.transition = "none";
		const place = (value: number) => {
			const x = Math.min(0, value);
			popup.style.transform = `translateX(${x}px)`;
			if (scrim) scrim.style.opacity = String(Math.max(0, 1 + x / width));
		};
		const trajectory = spring({ ...DRAWER_SPRING, keyframes: [from, to], velocity });
		const tick = () => {
			const { value, done } = trajectory.next(performance.now() - time);
			place(value);
			if (done) {
				drawerFrame.current = 0;
				onComplete();
			} else {
				drawerFrame.current = requestAnimationFrame(tick);
			}
		};
		// Sample now, then before each paint. The first frame uses elapsed time
		// since release and the measured velocity, even if Base UI took a beat.
		tick();
	};

	useEffect(() => {
		if (!drawerOpen) return;
		const trackSwipe = (event: globalThis.TouchEvent) => {
			const touch = event.touches[0];
			if (!touch || !(event.target instanceof Node) || !drawer.current?.contains(event.target)) {
				return;
			}
			if (event.type === "touchstart") {
				swipe.current = [];
				if (drawerFrame.current !== 0 || release.current) {
					// Base UI reads the current transform when the next drag starts.
					// Leave the drawer at that position and stop writing to it.
					cancelAnimationFrame(drawerFrame.current);
					drawerFrame.current = 0;
					drawerDismissSettling.current = false;
					interruptedSettle.current = true;
				}
			}
			const samples = swipe.current;
			samples.push({ x: touch.clientX, time: event.timeStamp });
			// Velocity over the last ~100ms of movement, not just the last event pair.
			while (samples.length > 2 && event.timeStamp - (samples[0]?.time ?? 0) > 100) samples.shift();
			release.current = null;
		};
		// Base UI claims touchmove in document capture. Sample on the window
		// before it stops propagation to the drawer's React handlers.
		window.addEventListener("touchstart", trackSwipe, { capture: true, passive: true });
		window.addEventListener("touchmove", trackSwipe, { capture: true, passive: true });
		return () => {
			window.removeEventListener("touchstart", trackSwipe, true);
			window.removeEventListener("touchmove", trackSwipe, true);
		};
	}, [drawerOpen]);

	const finishSwipe = (event: TouchEvent) => {
		const interrupted = interruptedSettle.current;
		interruptedSettle.current = false;
		const popup = drawer.current;
		const samples = swipe.current;
		swipe.current = [];
		release.current = null;
		if (
			!popup ||
			(!popup.hasAttribute("data-swiping") && !interrupted) ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
			return;
		}
		const first = samples[0];
		const last = samples.at(-1);
		const velocity =
			event.type !== "touchcancel" &&
			first &&
			last &&
			last.time > first.time &&
			event.timeStamp - last.time < 100
				? (1000 * (last.x - first.x)) / (last.time - first.time)
				: 0;
		const position = { x: popup.getBoundingClientRect().x, velocity, time: performance.now() };
		release.current = position;
		// Hold the drawer where the finger left it while Base UI decides, in this
		// same touchend, whether the swipe dismisses it (see changeDrawerOpen).
		popup.style.transition = "none";
		popup.style.transform = `translateX(${position.x}px)`;
		requestAnimationFrame(() => {
			if (release.current !== position) return;
			release.current = null;
			settleDrawer(position, 0, clearDrawerStyles);
		});
	};

	const changeDrawerOpen = (open: boolean, details: Drawer.Root.ChangeEventDetails) => {
		const position = release.current;
		release.current = null;
		if (!open && details.reason === "swipe" && position && drawer.current) {
			// Keep Base UI's gesture handlers and modal active until the drawer
			// is offscreen so a new touch can still take over the spring.
			details.cancel();
			drawerDismissSettling.current = true;
			settleDrawer(position, -drawer.current.offsetWidth, () => {
				drawerDismissSettling.current = false;
				setDrawerOpen(false);
			});
			return;
		}
		setDrawerVisible(open);
	};
	// The drawer is hidden by CSS at `lg`, but an open Base UI dialog would
	// keep its scroll lock and focus trap. Close it when the viewport grows.
	useEffect(() => {
		if (!drawerOpen) return;
		const desktop = window.matchMedia("(min-width: 1024px)");
		const close = () => {
			if (!desktop.matches) return;
			drawerDismissSettling.current = false;
			release.current = null;
			clearDrawerStyles();
			setDrawerOpen(false);
		};
		close();
		desktop.addEventListener("change", close);
		return () => desktop.removeEventListener("change", close);
	}, [clearDrawerStyles, drawerOpen]);
	const [publishDialogOpen, setPublishDialogOpen] = useState(false);
	const [publishFailed, setPublishFailed] = useState(false);
	useEffect(() => {
		// Observe the serialized operation before the store replaces its busy
		// status with the generic error status. This also covers the release gate.
		let previous = store.getState().status;
		return store.subscribe(() => {
			const { status } = store.getState();
			if (status === previous) return;
			setPublishFailed(status === "error" && previous === "publishing");
			previous = status;
		});
	}, [store]);
	const pathname = useCommittedPathname();
	const reduceMotion = useLiveReducedMotion();
	const releaseGate = () =>
		pathname === "/cms/release" || pathname === "/release"
			? document.getElementById(RELEASE_GATE_ID)
			: null;

	const focusReleaseGate = (gate: HTMLElement) => {
		if (!gate.matches("a[href], button, input, select, textarea, [tabindex]")) gate.tabIndex = -1;
		gate.scrollIntoView({ block: "start", behavior: reduceMotion ? "instant" : "smooth" });
		gate.focus({ preventScroll: true });
	};

	const requestPublish = () => {
		if (!draftActionAvailability(store.getState()).canPublish) return;
		const gate = releaseGate();
		if (gate) focusReleaseGate(gate);
		else setPublishDialogOpen(true);
	};
	const conflict = useDraftSelector((state) => state.conflict);
	const [dismissedConflict, setDismissedConflict] = useState<typeof conflict>(null);
	const conflictOpen = conflict !== null && dismissedConflict !== conflict;
	const [publishSweepKey, setPublishSweepKey] = useState(0);
	const publishedRevision = useDraftSelector((state) => state.publishedRevision);
	const prevPublishedRev = useRef(publishedRevision);
	// On Changes the page's release gate owns Publish and error status, so the
	// phone action bar only appears there while there is something to save.
	const onReleasePage = useCommittedPathname() === "/cms/release";
	const mobileActionVisible = useDraftSelector(
		(state) =>
			state.dirty ||
			state.status === "saving" ||
			(!onReleasePage &&
				(state.ahead || state.issues.all.length > 0 || state.status === "publishing")),
	);

	// Trigger a single trace sweep across the pipeline bar whenever a new revision publishes.
	useEffect(() => {
		if (publishedRevision > prevPublishedRev.current) {
			setPublishSweepKey((count) => count + 1);
		}
		prevPublishedRev.current = publishedRevision;
	}, [publishedRevision]);

	const toggleRail = useCallback(() => {
		setRailMode((current) => {
			if (current === "collapsed") return "expanded";
			if (current === "expanded") return "collapsed";
			// In `auto` mode, resolve against the current viewport breakpoint (xl = 1280px).
			const isWide =
				typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches;
			return isWide ? "collapsed" : "expanded";
		});
	}, []);

	// Global CMS shortcuts for the command bar, save, and desktop rail.
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented || event.isComposing) return;
			const key = event.key.toLowerCase();
			if (key === "k" && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
				event.preventDefault();
				if (drawerOpen || publishDialogOpen || conflictOpen) return;
				if (!commandOpen && document.activeElement instanceof HTMLElement) {
					commandOpener.current = document.activeElement;
				}
				setCommandOpen(!commandOpen);
				return;
			}
			if (key === "s" && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
				event.preventDefault();
				saveDraftIfAvailable(store);
				return;
			}
			if (
				event.key === "\\" &&
				(event.metaKey || event.ctrlKey) &&
				!event.altKey &&
				!event.shiftKey &&
				!event.repeat &&
				window.matchMedia("(min-width: 1024px)").matches &&
				!commandOpen &&
				!drawerOpen &&
				!publishDialogOpen &&
				!conflictOpen &&
				!isEditableTarget(event.target)
			) {
				event.preventDefault();
				toggleRail();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [commandOpen, conflictOpen, drawerOpen, publishDialogOpen, store, toggleRail]);

	const collapsed = railMode === "collapsed" || (railMode === "auto" && !wide);

	return (
		<div className="cms-root min-h-svh">
			<a
				href="#main-content"
				className="fixed top-2 left-2 z-(--z-skip) min-h-11 -translate-y-[200%] rounded-full bg-foreground px-4 py-2.5 text-[13px] font-semibold text-background no-underline transition-transform duration-200 ease-trace focus-visible:translate-y-0 focus-visible:shadow-float focus-visible:transition-none"
			>
				Skip to content
			</a>

			<div
				data-slot="cms-layout"
				data-rail={railMode}
				data-rail-ready={railReady ? "" : undefined}
				className="cms-layout"
			>
				<aside
					aria-label="Workspace navigation"
					className="cms-rail-desktop sticky top-0 h-dvh min-h-0 min-w-0 flex-col"
				>
					<Tooltip.Provider delay={450} closeDelay={0}>
						<LayerRailContent
							layoutScope="desktop"
							pulseSlot={pulseSlot}
							collapsed={collapsed}
							onToggleRail={toggleRail}
						/>
					</Tooltip.Provider>
				</aside>

				<div className="flex min-w-0 flex-col">
					<PipelineBar
						onOpenCommandBar={(trigger) => {
							commandOpener.current = trigger;
							setCommandOpen(true);
						}}
						onOpenDrawer={() => setDrawerVisible(true)}
						onResolveConflict={() => setDismissedConflict(null)}
						onRequestPublish={requestPublish}
						onReviewRelease={() => {
							const gate = releaseGate();
							if (!gate) return false;
							focusReleaseGate(gate);
							return true;
						}}
						publishFailed={publishFailed}
						publishSweepKey={publishSweepKey}
						saveFeedback={saveFeedback}
					>
						<SessionBanners
							publishFailed={publishFailed}
							publishDialogOpen={publishDialogOpen}
							onRetryPublish={requestPublish}
						/>
					</PipelineBar>
					<main
						id="main-content"
						tabIndex={-1}
						className={cn(
							"min-w-0 flex-1 px-4 py-6 outline-hidden lg:px-8 lg:py-7",
							mobileActionVisible && "max-lg:pb-24",
						)}
					>
						<div className="cms-content-frame mx-auto">{children}</div>
					</main>
				</div>
			</div>

			{/* Phone & tablet navigation drawer */}
			<Drawer.Root open={drawerOpen} onOpenChange={changeDrawerOpen} swipeDirection="left">
				<Drawer.Portal>
					<Drawer.Backdrop
						ref={drawerScrim}
						className="cms-backdrop cms-drawer-scrim fixed inset-0 z-(--z-palette) lg:hidden"
					/>
					<Drawer.Viewport className="pointer-events-none fixed inset-0 z-(--z-palette) lg:hidden">
						<Drawer.Popup
							ref={drawer}
							onTouchEndCapture={finishSwipe}
							onTouchCancelCapture={finishSwipe}
							data-slot="cms-mobile-drawer"
							className="cms-drawer-popup cms-overlay cms-glass pointer-events-auto fixed inset-y-0 left-0 z-(--z-palette) flex w-[min(288px,86vw)] flex-col border-r pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-foreground outline-hidden lg:hidden"
						>
							<Drawer.Title className="sr-only">Control plane navigation</Drawer.Title>
							<Drawer.Description className="sr-only">
								Navigate CMS signals, content sections, assets, and release tools.
							</Drawer.Description>
							<div className="absolute top-[calc(12px+env(safe-area-inset-top))] right-3 z-10">
								<Drawer.Close
									aria-label="Close navigation menu"
									className="cms-press cms-chrome-control grid size-11 place-items-center rounded-full text-muted-foreground"
								>
									<CloseIcon className="size-4" />
								</Drawer.Close>
							</div>
							<LayerRailContent
								layoutScope="drawer"
								pulseSlot={pulseSlot}
								onNavigate={() => setDrawerVisible(false)}
							/>
						</Drawer.Popup>
					</Drawer.Viewport>
				</Drawer.Portal>
			</Drawer.Root>

			<MobileActionBar
				onRequestPublish={requestPublish}
				saveFeedback={saveFeedback}
				visible={mobileActionVisible}
			/>

			<CommandBar
				opener={commandOpener}
				open={commandOpen}
				onOpenChange={setCommandOpen}
				onRequestPublish={requestPublish}
				onToggleRail={toggleRail}
			/>

			<PublishConfirmDialog
				open={publishDialogOpen}
				onOpenChange={setPublishDialogOpen}
				publishFailed={publishFailed}
			/>

			<ConflictDialog
				open={conflictOpen}
				onOpenChange={(next) => setDismissedConflict(next ? null : conflict)}
			/>
		</div>
	);
}
