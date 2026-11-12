import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AccentSwitcher } from "../AccentSwitcher";
import { useMediaQuery } from "../motion/hooks";
import { Kbd, MenuIndicator } from "../ui/portfolio";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "./CommandPalette";
import {
	HomeIcon,
	LinksIcon,
	Monogram,
	ResumeIcon,
	SearchIcon,
	StoryIcon,
	WorkIcon,
} from "./icons";

type DockKey = "home" | "work" | "story" | "resume" | "links";

export function dockKeyForPath(pathname: string): DockKey | null {
	if (pathname === "/") return "home";
	if (pathname.startsWith("/work")) return "work";
	if (pathname.startsWith("/story")) return "story";
	if (pathname.startsWith("/resume")) return "resume";
	if (pathname.startsWith("/links")) return "links";
	return null;
}

const DESKTOP_QUERY = "(min-width: 768px)";

/**
 * Floating glass navigation. Desktop: centered pill at the top. Below 768px:
 * a thumb-reach dock at the bottom (icons + labels). One `<nav>` serves both,
 * so there are no duplicate landmarks and no disclosure to manage.
 */
export function NavDock() {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const current = dockKeyForPath(pathname);
	const isDesktop = useMediaQuery(DESKTOP_QUERY);
	const palette = useCommandPalette();
	const navRef = useRef<HTMLElement>(null);
	const [hovered, setHovered] = useState<DockKey | null>(null);
	const [shortcut, setShortcut] = useState("⌘K");
	const indicatorKey = hovered ?? current;

	useEffect(() => {
		const platform =
			(navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
				?.platform ?? navigator.platform;
		if (!/mac|iphone|ipad|ipod/iu.test(platform)) setShortcut("Ctrl K");
	}, []);

	// Condense once the page scrolls, note the direction (the mobile dock eases
	// down a touch while reading), and feed the progress trace. Attributes and a
	// custom property only: no React re-render per frame.
	useEffect(() => {
		const nav = navRef.current;
		if (!nav) return;
		let frame = 0;
		let lastY = window.scrollY;
		const update = () => {
			frame = 0;
			const y = window.scrollY;
			nav.toggleAttribute("data-condensed", y > 12);
			if (Math.abs(y - lastY) > 6) {
				nav.dataset.scrollDir = y > lastY && y > 120 ? "down" : "up";
				lastY = y;
			}
			const distance = document.documentElement.scrollHeight - window.innerHeight;
			nav.style.setProperty(
				"--dock-progress",
				String(distance > 0 ? Math.min(1, Math.max(0, y / distance)) : 0),
			);
		};
		const onScroll = () => {
			if (!frame) frame = window.requestAnimationFrame(update);
		};
		update();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
			if (frame) window.cancelAnimationFrame(frame);
		};
	}, []);

	useEffect(() => {
		const nav = navRef.current;
		if (nav) nav.dataset.scrollDir = "up";
	}, [pathname]);

	// Some controls exist only at one size. If the breakpoint flips while one of
	// them has focus, hand focus to the current page link instead of <body>.
	useEffect(() => {
		const query = window.matchMedia(DESKTOP_QUERY);
		const reconcile = () => {
			window.requestAnimationFrame(() => {
				const nav = navRef.current;
				const active = document.activeElement;
				if (!nav || !(active instanceof HTMLElement) || !nav.contains(active)) return;
				const visible = active.checkVisibility
					? active.checkVisibility()
					: active.offsetParent !== null;
				if (visible) return;
				const fallback =
					nav.querySelector<HTMLElement>('[aria-current="page"]') ??
					nav.querySelector<HTMLElement>("a");
				fallback?.focus({ preventScroll: true });
			});
		};
		query.addEventListener("change", reconcile);
		return () => query.removeEventListener("change", reconcile);
	}, []);

	useEffect(() => setHovered(null), [pathname]);

	const indicator = (key: DockKey) =>
		indicatorKey === key && !(key === "home" && isDesktop) ? (
			<MenuIndicator
				layoutId="dock-indicator"
				className={cn(
					"max-md:rounded-[18px]",
					key === "home" && "md:hidden",
					key === current
						? "bg-[color-mix(in_srgb,var(--theme-surface-solid)_80%,transparent)] shadow-[0_1px_2px_var(--theme-shadow-soft),0_4px_14px_var(--theme-shadow-soft),inset_0_1px_var(--theme-highlight),inset_0_0_0_0.5px_var(--theme-line-strong)] dark:bg-[color-mix(in_srgb,var(--theme-ink)_10%,transparent)]"
						: "bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)]",
				)}
				transition={{ type: "spring", duration: 0.36, bounce: 0.12 }}
			/>
		) : null;

	const linkClassName = (key: DockKey) =>
		cn(
			"pressable group/link relative isolate flex min-h-11 min-w-0 items-center justify-center rounded-full whitespace-nowrap text-ink-soft no-underline [overflow-wrap:normal] outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=page]:text-foreground",
			"max-md:min-h-[52px] max-md:w-full max-md:flex-col max-md:gap-[3px] max-md:rounded-[18px] max-md:px-1",
			"md:px-4 md:text-[14px] md:font-medium md:tracking-[-0.01em]",
			key === current && "max-md:text-primary-text",
		);

	const hoverProps = (key: DockKey) => ({
		onPointerEnter: (event: React.PointerEvent) => {
			if (event.pointerType === "mouse") setHovered(key);
		},
		onFocus: () => setHovered(key),
	});

	const item = (key: DockKey, label: string, icon: ReactNode, content: ReactNode) => (
		<>
			{indicator(key)}
			<span className="relative z-[1] grid place-items-center md:hidden" aria-hidden="true">
				{icon}
			</span>
			<span className="relative z-[1] text-[10.5px] leading-none font-medium tracking-[0.005em] transition-transform duration-200 ease-trace md:text-[length:inherit] md:leading-[inherit] md:tracking-[inherit] pointer-fine:group-hover/link:-translate-y-px">
				{content ?? label}
			</span>
		</>
	);

	return (
		<nav
			ref={navRef}
			data-slot="nav-dock"
			aria-label="Primary"
			className={cn(
				"group/dock fixed left-1/2 z-(--z-dock) -translate-x-1/2",
				"max-md:bottom-(--dock-inset-bottom) max-md:w-[min(calc(100%-20px-env(safe-area-inset-left)-env(safe-area-inset-right)),440px)]",
				"md:top-(--dock-inset-top)",
			)}
			onPointerLeave={() => {
				if (!navRef.current?.contains(document.activeElement)) setHovered(null);
			}}
			onBlurCapture={(event) => {
				if (!navRef.current?.contains(event.relatedTarget as Node | null)) setHovered(null);
			}}
		>
			<div
				data-material="glass"
				data-slot="dock-surface"
				onPointerMove={(event) => {
					if (event.pointerType !== "mouse") return;
					const rect = event.currentTarget.getBoundingClientRect();
					event.currentTarget.style.setProperty("--dock-x", `${event.clientX - rect.left}px`);
				}}
				className={cn(
					"glass relative flex items-center rounded-full p-1 transition-[box-shadow,background-color,scale,translate] duration-300 ease-trace",
					"max-md:h-(--dock-height-mobile) max-md:gap-0.5 max-md:rounded-[24px] max-md:p-[5px]",
					"max-md:group-data-[scroll-dir=down]/dock:translate-y-1 max-md:group-data-[scroll-dir=down]/dock:scale-[.96]",
					"md:h-(--dock-height) md:gap-0.5",
					"md:group-data-[condensed]/dock:scale-[.97] md:group-data-[condensed]/dock:shadow-[0_1px_1px_var(--theme-shadow-soft),0_16px_44px_var(--theme-shadow-strong),inset_0_1px_var(--theme-highlight),inset_0_0_0_1px_var(--theme-glass-border)]",
				)}
			>
				{/* Specular light that follows the pointer across the glass. */}
				<span
					aria-hidden="true"
					data-slot="dock-light"
					className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 ease-trace max-md:hidden pointer-fine:group-hover/dock:opacity-100"
				/>
				{/* Reading progress: a trace with a lit head along the dock's edge. */}
				<span
					aria-hidden="true"
					data-slot="dock-progress"
					className="pointer-events-none absolute inset-x-6 bottom-[2px] h-[5px] overflow-hidden rounded-full opacity-0 transition-opacity duration-500 ease-trace group-data-[condensed]/dock:opacity-100 max-md:top-[2px] max-md:bottom-auto max-md:inset-x-8"
				>
					<span className="absolute inset-0 translate-x-[calc((var(--dock-progress,0)-1)*100%)] motion-reduce:translate-x-0 motion-reduce:scale-x-(--dock-progress,0) motion-reduce:origin-left">
						<span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[linear-gradient(90deg,transparent,var(--theme-accent-line))] opacity-70" />
						<span className="absolute top-1/2 right-0 size-[5px] -translate-y-1/2 rounded-full bg-primary-line shadow-[0_0_8px_var(--theme-accent-glow)] motion-reduce:hidden" />
					</span>
				</span>
				<Link
					to="/"
					aria-label="Home"
					aria-current={current === "home" ? "page" : undefined}
					className={cn(
						linkClassName("home"),
						"group/mark max-md:w-auto max-md:flex-1 md:size-11 md:px-0",
					)}
					{...hoverProps("home")}
				>
					{indicator("home")}
					<span className="relative z-[1] grid place-items-center md:hidden" aria-hidden="true">
						<HomeIcon />
					</span>
					<span
						className="relative z-[1] text-[10.5px] leading-none font-medium md:hidden"
						aria-hidden="true"
					>
						Home
					</span>
					<span className="relative grid place-items-center max-md:hidden" aria-hidden="true">
						<span className="absolute inset-0 rounded-full bg-primary opacity-0 transition-[translate,opacity] duration-300 ease-trace group-hover/mark:translate-x-[3px] group-hover/mark:translate-y-[2px] group-hover/mark:opacity-60 group-focus-visible/mark:translate-x-[3px] group-focus-visible/mark:translate-y-[2px] group-focus-visible/mark:opacity-60" />
						<Monogram className="transition-transform duration-300 ease-trace group-hover/mark:-translate-x-px group-hover/mark:-translate-y-px" />
					</span>
				</Link>
				<span aria-hidden="true" className="mx-1.5 h-5 w-px bg-line-strong max-md:hidden" />
				<ul className="m-0 flex min-w-0 flex-[4] list-none items-center gap-0.5 p-0 md:flex-none">
					<li className="min-w-0 flex-1 md:flex-none">
						<Link
							to="/work"
							search={{ group: "all" }}
							aria-current={current === "work" ? "page" : undefined}
							className={linkClassName("work")}
							{...hoverProps("work")}
						>
							{item("work", "Work", <WorkIcon />, null)}
						</Link>
					</li>
					<li className="min-w-0 flex-1 md:flex-none">
						<Link
							to="/story"
							aria-current={current === "story" ? "page" : undefined}
							className={linkClassName("story")}
							{...hoverProps("story")}
						>
							{item("story", "Story", <StoryIcon />, null)}
						</Link>
					</li>
					<li className="min-w-0 flex-1 md:flex-none">
						<Link
							to="/resume"
							aria-current={current === "resume" ? "page" : undefined}
							className={linkClassName("resume")}
							{...hoverProps("resume")}
						>
							{item("resume", "Résumé", <ResumeIcon />, null)}
						</Link>
					</li>
					<li className="min-w-0 flex-1 md:flex-none">
						<Link
							to="/links"
							search={{ kind: "all" }}
							aria-current={current === "links" ? "page" : undefined}
							className={linkClassName("links")}
							{...hoverProps("links")}
						>
							{item("links", "Links", <LinksIcon />, null)}
						</Link>
					</li>
				</ul>
				<span aria-hidden="true" className="mx-1.5 h-5 w-px bg-line-strong max-md:hidden" />
				<button
					type="button"
					aria-haspopup="dialog"
					aria-expanded={palette?.isOpen ?? false}
					aria-keyshortcuts="Meta+K Control+K /"
					aria-label="Search"
					onClick={() => palette?.open()}
					className={cn(
						"pressable relative flex min-h-11 min-w-0 shrink-0 items-center justify-center rounded-full whitespace-nowrap border-0 bg-transparent text-ink-soft outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
						"max-md:min-h-[52px] max-md:flex-1 max-md:flex-col max-md:gap-[3px] max-md:rounded-[18px] max-md:px-1",
						"md:gap-2 md:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)] md:pr-2 md:pl-3 md:hover:bg-[color-mix(in_srgb,var(--theme-ink)_8%,transparent)]",
					)}
				>
					<SearchIcon className="md:size-4" />
					<span className="text-[10.5px] leading-none font-medium md:hidden">Search</span>
					<span className="hidden text-[13px] text-muted-foreground lg:inline" aria-hidden="true">
						Search
					</span>
					<Kbd className="max-md:hidden" aria-hidden="true">
						{shortcut}
					</Kbd>
				</button>
				<AccentSwitcher className="ml-0.5 max-md:hidden" />
			</div>
		</nav>
	);
}
