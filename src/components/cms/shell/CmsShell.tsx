/**
 * Control Plane CMS Shell:
 * - Skip link + exactly one `<main id="main-content" tabIndex={-1}>`
 * - Responsive Layer Rail (248px at >=1280px, 56px icon rail at 1024-1279px,
 *   collapsible via `[`, slide-over glass drawer on phones/tablets)
 * - Live-pulse slot at the top of the rail (`RailPulseSlot` or `pulseSlot` prop)
 * - Release group pinned to the bottom of the rail + AccentSwitcher + Live site ↗
 * - Sticky 56px five-state Pipeline Bar + phone bottom action bar while dirty
 * - ⌘K Command Bar, ⌘S save shortcut, Conflict AlertDialog, Auth expired banner
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { cn } from "../../../lib/utils";
import { AccentSwitcher } from "../../AccentSwitcher";
import { Button } from "../../ui/button";
import { useDraftSelector, useDraftStore } from "../draft/context";
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
import { MobileActionBar, PipelineBar } from "./PipelineBar";
import { RailPulseSlot } from "./RailPulseSlot";

export { RailPulseSlot };

export const PUBLIC_SITE_ORIGIN = "https://sohelislamimran.com";

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

type RailMode = "auto" | "expanded" | "collapsed";

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
	active,
	layoutScope,
	onNavigate,
}: {
	to: string;
	params?: Record<string, string>;
	icon: ReactNode;
	label: string;
	badge?: ReactNode;
	compactBadge?: ReactNode;
	active: boolean;
	layoutScope: "desktop" | "drawer";
	onNavigate?: () => void;
}) {
	return (
		<Link
			to={to}
			params={params}
			activeOptions={{ exact: to === "/cms" }}
			title={label}
			aria-label={label}
			onClick={onNavigate}
			className={cn(
				"cms-rail-link group/rail relative flex min-h-9 items-center justify-between gap-2 rounded-[10px] px-2.5 text-[13.5px] no-underline transition-colors duration-150 pointer-coarse:min-h-11",
				active
					? "font-medium text-foreground"
					: "text-ink-soft hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)] hover:text-foreground",
			)}
		>
			{active ? (
				<motion.span
					layoutId={`cms-rail-active-${layoutScope}`}
					aria-hidden="true"
					transition={{ type: "spring", duration: 0.28, bounce: 0 }}
					className="pointer-events-none absolute inset-0 rounded-[10px] border border-line bg-surface-solid shadow-[0_1px_2px_var(--theme-shadow-soft),inset_0_1px_var(--theme-highlight)]"
				>
					<span className="absolute top-2 bottom-2 left-0 w-[2.5px] rounded-r-full bg-primary" />
				</motion.span>
			) : null}
			<span className="relative z-[1] flex min-w-0 items-center gap-2.5">
				<span
					className={cn(
						"shrink-0 transition-colors duration-150",
						active ? "text-primary-text" : "text-muted-foreground group-hover/rail:text-foreground",
					)}
				>
					{icon}
				</span>
				<span className="cms-rail-label truncate">{label}</span>
			</span>
			{badge ? <span className="cms-rail-badge-full relative z-[1] shrink-0">{badge}</span> : null}
			{compactBadge ? (
				<span className="cms-rail-badge-dot pointer-events-none absolute top-1 right-1 z-[1] hidden">
					{compactBadge}
				</span>
			) : null}
		</Link>
	);
}

function useSectionState(paths: readonly string[]) {
	const errors = useDraftSelector((state) =>
		paths.reduce((total, path) => total + state.issues.under(path).length, 0),
	);
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
	layoutScope,
	onNavigate,
}: {
	id: string;
	label: string;
	paths: readonly string[];
	active: boolean;
	layoutScope: "desktop" | "drawer";
	onNavigate?: () => void;
}) {
	const { errors, changed } = useSectionState(paths);
	const badge = errors ? (
		<span className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-destructive/45 bg-destructive/10 px-1.5 py-0.5 font-mono text-[10.5px] leading-none text-destructive">
			<span aria-hidden="true">!</span>
			{errors}
			<span className="sr-only"> errors</span>
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
			layoutScope={layoutScope}
			onNavigate={onNavigate}
		/>
	);
}

function ChangesRailBadge() {
	const changedCount = useDraftSelector((state, store) =>
		SECTIONS.reduce(
			(count, section) =>
				count + (section.paths.some((path) => store.changedAt(path, state)) ? 1 : 0),
			0,
		),
	);
	if (changedCount === 0) return null;
	return (
		<span className="inline-flex items-center gap-0.5 rounded-full border border-primary-line bg-primary-soft px-1.5 py-0.5 font-mono text-[10.5px] leading-none text-primary-text tabular-nums">
			<span aria-hidden="true">Δ</span>
			{changedCount}
			<span className="sr-only"> sections changed</span>
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
		<p className="cms-rail-heading mono-label m-0 mt-3.5 mb-1 px-2.5 text-[10px] text-muted-foreground">
			{children}
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
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const normalized = pathname.replace(/\/+$/u, "") || "/";

	const isPathActive = (to: string) => {
		if (to === "/cms") return normalized === "/cms" || normalized === "/";
		const stripped = to.replace(/^\/cms/u, "");
		return normalized === to || normalized === stripped;
	};

	const isSectionActive = (sectionId: string) =>
		normalized === `/cms/content/${sectionId}` || normalized === `/content/${sectionId}`;

	return (
		<div className="flex h-full min-h-0 flex-col">
			{/* Top brand + collapse toggle + live pulse slot */}
			<div className="cms-rail-header grid shrink-0 gap-2.5 px-2.5 pt-3 pb-2.5">
				<div className="cms-rail-top-row flex min-h-9 items-center justify-between gap-2">
					<Link
						to="/cms"
						onClick={onNavigate}
						className="flex min-w-0 items-center gap-2 text-foreground no-underline"
					>
						<span
							aria-hidden="true"
							className="grid size-7 shrink-0 place-items-center rounded-[9px] border border-primary-line bg-primary-soft font-mono text-[11px] font-semibold tracking-tight text-primary-text"
						>
							SI
						</span>
						<span className="cms-rail-brand-text min-w-0">
							<span className="mono-label block truncate text-[10.5px] text-foreground">
								Control plane
							</span>
							<span className="block truncate font-mono text-[10px] text-muted-foreground">
								Trace CMS
							</span>
						</span>
					</Link>
					{onToggleRail ? (
						<button
							type="button"
							onClick={onToggleRail}
							title={collapsed ? "Expand sidebar ([)" : "Collapse sidebar ([)"}
							aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
							className="pressable grid size-8 shrink-0 place-items-center rounded-[8px] text-muted-foreground transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)] hover:text-foreground"
						>
							<SidebarToggleIcon collapsed={collapsed} />
						</button>
					) : null}
				</div>
				{pulseSlot ?? <RailPulseSlot />}
			</div>

			{/* Scrollable middle sections */}
			<nav aria-label="CMS" className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
				<RailHeading>Signals</RailHeading>
				<div className="grid gap-0.5">
					{CMS_NAV.signals.map((item) => (
						<RailLink
							key={item.to}
							to={item.to}
							icon={<NavIconFor to={item.to} />}
							label={item.label}
							active={isPathActive(item.to)}
							layoutScope={layoutScope}
							onNavigate={onNavigate}
						/>
					))}
				</div>

				{SECTION_GROUPS.map((group) => (
					<div key={group.id} className="grid gap-0.5">
						<RailHeading>{group.label}</RailHeading>
						{SECTIONS.filter((section) => section.group === group.id).map((section) => (
							<SectionRailItem
								key={section.id}
								id={section.id}
								label={section.label}
								paths={section.paths}
								active={isSectionActive(section.id)}
								layoutScope={layoutScope}
								onNavigate={onNavigate}
							/>
						))}
					</div>
				))}

				<RailHeading>Assets</RailHeading>
				<div className="grid gap-0.5">
					{CMS_NAV.assets.map((item) => (
						<RailLink
							key={item.to}
							to={item.to}
							icon={<NavIconFor to={item.to} />}
							label={item.label}
							active={isPathActive(item.to)}
							layoutScope={layoutScope}
							onNavigate={onNavigate}
						/>
					))}
				</div>
			</nav>

			{/* Bottom pinned Release zone + Appearance & Live site */}
			<div className="shrink-0 border-t border-line bg-[color-mix(in_srgb,var(--theme-ink)_1.5%,transparent)] px-2 pt-2 pb-2.5">
				<p className="cms-rail-heading mono-label m-0 mb-1 px-2.5 text-[10px] text-muted-foreground">
					Release
				</p>
				<div className="grid gap-0.5">
					{CMS_NAV.release.map((item) => (
						<RailLink
							key={item.to}
							to={item.to}
							icon={<NavIconFor to={item.to} />}
							label={item.label}
							badge={item.to === "/cms/release" ? <ChangesRailBadge /> : undefined}
							compactBadge={item.to === "/cms/release" ? <ChangesCompactBadge /> : undefined}
							active={isPathActive(item.to)}
							layoutScope={layoutScope}
							onNavigate={onNavigate}
						/>
					))}
				</div>

				<div className="cms-rail-footer-row mt-2.5 flex items-center justify-between gap-1.5 border-t border-line pt-2">
					<AccentSwitcher className="size-9 pointer-coarse:size-11" />
					<a
						href={PUBLIC_SITE_ORIGIN}
						target="_blank"
						rel="noreferrer"
						title="Open live site"
						aria-label="Open live site"
						className="pressable inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface-solid px-2.5 font-mono text-[11px] text-ink-soft no-underline transition-colors duration-150 hover:border-line-strong hover:text-foreground pointer-coarse:min-h-11"
					>
						<span className="cms-rail-footer-label">Live site</span>
						<ExternalArrowIcon className="size-3.5" />
					</a>
				</div>
			</div>
		</div>
	);
}

/** Save state in words, never color alone. */
export function useStatusLine(): { label: string; tone: "ok" | "busy" | "warn" | "error" } {
	return useDraftSelector((state) => {
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

const CONFLICT = { label: "Conflict: changed elsewhere", tone: "error" } as const;
const ERROR = { label: "Not saved", tone: "error" } as const;
const SAVING = { label: "Saving…", tone: "busy" } as const;
const PUBLISHING = { label: "Publishing…", tone: "busy" } as const;
const INVALID = { label: "Unsaved · fix errors", tone: "warn" } as const;
const UNSAVED = { label: "Unsaved changes", tone: "busy" } as const;
const AHEAD = { label: "Draft ahead of live", tone: "warn" } as const;
const LIVE = { label: "Live is up to date", tone: "ok" } as const;

function SessionBanners() {
	const store = useDraftStore();
	const authExpired = useDraftSelector((state) => state.authExpired);
	const status = useDraftSelector((state) => state.status);
	const error = useDraftSelector((state) => state.error);

	if (authExpired) {
		return (
			<div
				role="alert"
				data-slot="cms-auth-expired-banner"
				className="flex flex-wrap items-center justify-between gap-3 border-b border-destructive/35 bg-destructive/10 px-4 py-2.5 text-[13px] text-foreground lg:px-6"
			>
				<span className="flex items-center gap-2">
					<AlertTriangleIcon className="size-4 shrink-0 text-destructive" />
					<span>
						Your session expired. Reload the console to sign in again — your unsaved edits stay in
						this browser until you reload.
					</span>
				</span>
				<Button
					variant="outline"
					size="sm"
					onClick={() => window.location.reload()}
					className="pointer-coarse:min-h-11"
				>
					Reload console
				</Button>
			</div>
		);
	}

	if (status === "error" && error) {
		return (
			<div
				role="alert"
				data-slot="cms-error-banner"
				className="flex flex-wrap items-center justify-between gap-3 border-b border-destructive/35 bg-destructive/10 px-4 py-2 text-[13px] text-foreground lg:px-6"
			>
				<span className="flex items-center gap-2">
					<AlertTriangleIcon className="size-4 shrink-0 text-destructive" />
					<span>{error}</span>
				</span>
				<Button
					variant="outline"
					size="sm"
					onClick={() => void store.save()}
					className="pointer-coarse:min-h-11"
				>
					Retry save
				</Button>
			</div>
		);
	}

	return null;
}

export function CmsShell({ children, pulseSlot }: { children: ReactNode; pulseSlot?: ReactNode }) {
	const store = useDraftStore();
	const [railMode, setRailMode] = useState<RailMode>("auto");
	const [commandOpen, setCommandOpen] = useState(false);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [publishDialogOpen, setPublishDialogOpen] = useState(false);
	const [publishSweepKey, setPublishSweepKey] = useState(0);
	const publishedRevision = useDraftSelector((state) => state.publishedRevision);
	const prevPublishedRev = useRef(publishedRevision);
	const mobileActionVisible = useDraftSelector(
		(state) =>
			state.dirty ||
			state.issues.all.length > 0 ||
			state.status === "saving" ||
			state.status === "publishing",
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

	// Global CMS shortcuts: ⌘K / Ctrl+K (command bar), ⌘S / Ctrl+S (save), `[` (icon rail).
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented || event.isComposing) return;
			const key = event.key.toLowerCase();
			if (key === "k" && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
				event.preventDefault();
				setCommandOpen((open) => !open);
				return;
			}
			if (key === "s" && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
				event.preventDefault();
				const state = store.getState();
				if (!state.conflict && state.issues.all.length === 0) {
					void store.save();
				}
				return;
			}
			if (
				event.key === "[" &&
				!event.metaKey &&
				!event.ctrlKey &&
				!event.altKey &&
				!commandOpen &&
				!drawerOpen &&
				!isEditableTarget(event.target)
			) {
				event.preventDefault();
				toggleRail();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [commandOpen, drawerOpen, store, toggleRail]);

	const isExplicitlyCollapsed = railMode === "collapsed";

	return (
		<div className="cms-root min-h-svh">
			<a
				href="#main-content"
				className="fixed top-2 left-2 z-(--z-skip) min-h-11 -translate-y-[200%] rounded-full bg-foreground px-4 py-2.5 text-[13px] font-semibold text-background no-underline shadow-float transition-transform duration-200 ease-trace focus-visible:translate-y-0 focus-visible:transition-none"
			>
				Skip to content
			</a>

			<div data-slot="cms-layout" data-rail={railMode} className="cms-layout">
				<aside
					aria-label="Workspace navigation"
					className="cms-rail-desktop sticky top-0 h-svh flex-col border-r border-line bg-[color-mix(in_srgb,var(--theme-surface-solid)_55%,var(--theme-paper))]"
				>
					<LayerRailContent
						layoutScope="desktop"
						pulseSlot={pulseSlot}
						collapsed={isExplicitlyCollapsed}
						onToggleRail={toggleRail}
					/>
				</aside>

				<div className="flex min-w-0 flex-col">
					<PipelineBar
						onOpenCommandBar={() => setCommandOpen(true)}
						onOpenDrawer={() => setDrawerOpen(true)}
						onRequestPublish={() => setPublishDialogOpen(true)}
						publishSweepKey={publishSweepKey}
					/>
					<SessionBanners />
					<main
						id="main-content"
						tabIndex={-1}
						className={cn(
							"min-w-0 flex-1 px-4 py-6 outline-hidden lg:px-8 lg:py-7",
							mobileActionVisible && "max-lg:pb-24",
						)}
					>
						{children}
					</main>
				</div>
			</div>

			{/* Phone & tablet navigation drawer */}
			<Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
				<Dialog.Portal>
					<Dialog.Backdrop className="cms-backdrop fixed inset-0 z-(--z-palette) bg-[rgb(0_0_0/0.35)] dark:bg-[rgb(0_0_0/0.6)] lg:hidden" />
					<Dialog.Popup
						data-slot="cms-mobile-drawer"
						className="cms-drawer-popup cms-glass fixed inset-y-0 left-0 z-(--z-palette) flex w-[min(288px,86vw)] flex-col border-r pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-foreground outline-hidden lg:hidden"
					>
						<Dialog.Title className="sr-only">Control plane navigation</Dialog.Title>
						<Dialog.Description className="sr-only">
							Navigate CMS signals, content sections, assets, and release tools.
						</Dialog.Description>
						<div className="absolute top-3 right-3 z-10">
							<Dialog.Close
								aria-label="Close navigation menu"
								className="pressable grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)] hover:text-foreground"
							>
								<CloseIcon className="size-4" />
							</Dialog.Close>
						</div>
						<LayerRailContent
							layoutScope="drawer"
							pulseSlot={pulseSlot}
							onNavigate={() => setDrawerOpen(false)}
						/>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>

			<MobileActionBar onRequestPublish={() => setPublishDialogOpen(true)} />

			<CommandBar
				open={commandOpen}
				onOpenChange={setCommandOpen}
				onRequestPublish={() => setPublishDialogOpen(true)}
				onToggleRail={toggleRail}
			/>

			<PublishConfirmDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen} />

			<ConflictDialog />
		</div>
	);
}
