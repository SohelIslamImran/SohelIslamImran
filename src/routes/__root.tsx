import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
	HeadContent,
	Link,
	Outlet,
	Scripts,
	createRootRoute,
	useRouterState,
} from "@tanstack/react-router";
import { AnimatePresence, MotionConfig, motion, useIsPresent } from "motion/react";
import { AccentSwitcher, accentBootScript } from "../components/AccentSwitcher";
import { buttonVariants } from "../components/ui/button";
import { MenuIndicator, MenuSurface } from "../components/ui/portfolio";
import { cn } from "../lib/utils";
import "../styles/tailwind.css";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
			{ title: "Sohel Islam Imran" },
			{ name: "theme-color", content: "#f7f9fc" },
			{ name: "color-scheme", content: "light dark" },
			{ name: "format-detection", content: "telephone=no" },
		],
		links: [
			{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
			{
				rel: "alternate",
				type: "application/rss+xml",
				href: "/rss.xml",
				title: "Sohel Islam Imran — writing",
			},
		],
	}),
	notFoundComponent: NotFoundPage,
	errorComponent: RootErrorPage,
	component: RootComponent,
});

function RootComponent() {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const [menuOpen, setMenuOpen] = useState(false);
	const [accentOpen, setAccentOpen] = useState(false);
	const menuButtonRef = useRef<HTMLButtonElement>(null);
	const navigationRef = useRef<HTMLElement>(null);

	useEffect(() => {
		setMenuOpen(false);
		setAccentOpen(false);
	}, [pathname]);

	useEffect(() => {
		if (!menuOpen) return;
		const activeLink =
			navigationRef.current?.querySelector<HTMLAnchorElement>('[aria-current="page"]');
		(activeLink ?? navigationRef.current?.querySelector<HTMLAnchorElement>("a"))?.focus();
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			setMenuOpen(false);
			menuButtonRef.current?.focus();
		};
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Node;
			if (navigationRef.current?.contains(target) || menuButtonRef.current?.contains(target))
				return;
			setMenuOpen(false);
		};
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("pointerdown", onPointerDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("pointerdown", onPointerDown);
		};
	}, [menuOpen]);

	return (
		<MotionConfig reducedMotion="user">
			<RootDocument>
				<a
					data-slot="skip-link"
					className="fixed left-3 top-2.5 z-[100] -translate-y-[180%] rounded-full bg-foreground px-3.5 py-2.5 text-[13px] font-[750] text-background no-underline transition-transform duration-180 ease-route focus:translate-y-0"
					href="#main-content"
				>
					Skip to content
				</a>
				<header
					data-slot="site-header"
					data-material="glass"
					className="sticky top-0 z-20 mx-auto flex w-[min(1240px,calc(100%-40px))] items-center justify-between gap-6 rounded-b-shell border border-[color-mix(in_srgb,var(--theme-surface-solid)_78%,transparent)] bg-[color-mix(in_srgb,var(--theme-paper)_74%,transparent)] px-[18px] py-4 shadow-[0_12px_38px_var(--theme-shadow),inset_0_1px_var(--theme-highlight)] backdrop-blur-2xl backdrop-saturate-150 max-[800px]:w-[calc(100%-24px)] max-[800px]:gap-4 max-[800px]:px-3.5 max-[800px]:py-3"
				>
					<Link
						className="inline-flex min-w-0 items-center gap-2.5 text-sm font-[780] tracking-[-0.02em] text-inherit no-underline"
						to="/"
						aria-label="Sohel Islam Imran home"
					>
						<span
							className="grid size-[30px] shrink-0 place-items-center rounded-[10px] bg-foreground text-[10px] tracking-[0.04em] text-background max-[800px]:size-8"
							aria-hidden="true"
						>
							SI
						</span>
						<span className="max-w-[130px] leading-[1.15] sm:max-w-none sm:truncate">
							Sohel Islam Imran
						</span>
					</Link>
					<nav
						className="ml-auto hidden items-center gap-1 min-[801px]:flex"
						aria-label="Primary navigation"
					>
						<NavigationLinks pathname={pathname} variant="desktop" />
					</nav>
					<div className="flex items-center gap-2">
						<AccentSwitcher
							open={accentOpen}
							onOpenChange={(open) => {
								setAccentOpen(open);
								if (open) setMenuOpen(false);
							}}
						/>
						<button
							ref={menuButtonRef}
							className="inline-flex min-h-9 items-center gap-[9px] rounded-full border border-border bg-[color-mix(in_srgb,var(--theme-surface-solid)_92%,transparent)] px-[13px] text-xs font-[750] text-foreground shadow-[0_5px_16px_var(--theme-shadow)] backdrop-blur-xl transition-[transform,translate,scale,rotate,background-color,border-color,box-shadow] duration-220 ease-route hover:-translate-y-px active:scale-[.97] min-[801px]:hidden"
							type="button"
							aria-controls="primary-navigation"
							aria-expanded={menuOpen}
							onClick={() => {
								setMenuOpen((open) => !open);
								setAccentOpen(false);
							}}
						>
							<span>{menuOpen ? "Close" : "Menu"}</span>
							<span className="text-primary-text" aria-hidden="true">
								{menuOpen ? "×" : "+"}
							</span>
						</button>
					</div>
					<AnimatePresence initial={false}>
						{menuOpen ? (
							<MobileNavigation navigationRef={navigationRef} pathname={pathname} />
						) : null}
					</AnimatePresence>
				</header>
				<div id="main-content" tabIndex={-1}>
					<div className="grid">
						<AnimatePresence initial={false} mode="sync">
							<motion.div
								key={pathname}
								className="col-start-1 row-start-1 min-w-0 will-change-[opacity,transform]"
								initial={{ opacity: 0, y: 5 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -5 }}
								transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
							>
								<Outlet />
							</motion.div>
						</AnimatePresence>
					</div>
				</div>
				<footer
					data-slot="site-footer"
					className="mx-auto grid w-[calc(100%-40px)] max-w-[1200px] grid-cols-[1fr_1.4fr_auto] gap-5 border-t border-border py-10 pb-[max(3rem,env(safe-area-inset-bottom))] text-[13px] text-muted-foreground max-[800px]:grid-cols-1 max-[800px]:gap-2.5"
				>
					<p>© {new Date().getUTCFullYear()} Sohel Islam Imran</p>
					<p>Full-stack product engineering for teams everywhere.</p>
					<Link
						className="font-bold text-primary-text no-underline"
						to="/links"
						search={{ kind: "all" }}
					>
						Find every link <span aria-hidden="true">↗</span>
					</Link>
				</footer>
			</RootDocument>
		</MotionConfig>
	);
}

function MobileNavigation({
	navigationRef,
	pathname,
}: {
	navigationRef: RefObject<HTMLElement | null>;
	pathname: string;
}) {
	const isPresent = useIsPresent();
	return (
		<motion.nav
			ref={navigationRef}
			id="primary-navigation"
			className="absolute left-0 right-0 top-[calc(100%+0.5rem)] origin-top-right min-[801px]:hidden"
			aria-label="Primary navigation"
			aria-hidden={!isPresent}
			inert={!isPresent || undefined}
			initial={{ opacity: 0, y: -6, scale: 0.98, filter: "blur(2px)" }}
			animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
			exit={{ opacity: 0, y: -4, scale: 0.99, filter: "blur(1px)" }}
			transition={{ duration: isPresent ? 0.26 : 0.19, ease: [0.22, 1, 0.36, 1] }}
		>
			<MenuSurface className="w-full p-1.5">
				<NavigationLinks
					pathname={pathname}
					variant="mobile"
					linkClassName="min-h-11 px-3.5 text-sm"
					tabIndex={isPresent ? undefined : -1}
				/>
			</MenuSurface>
		</motion.nav>
	);
}

type NavigationLinkKey = "work" | "story" | "field-notes" | "resume" | "links";

function navigationKey(pathname: string): NavigationLinkKey | null {
	if (pathname.startsWith("/work")) return "work";
	if (pathname.startsWith("/story")) return "story";
	if (pathname.startsWith("/field-notes")) return "field-notes";
	if (pathname.startsWith("/resume")) return "resume";
	if (pathname.startsWith("/links")) return "links";
	return null;
}

function NavigationLinks({
	pathname,
	variant,
	linkClassName,
	tabIndex,
}: {
	pathname: string;
	variant: "desktop" | "mobile";
	linkClassName?: string;
	tabIndex?: number;
}) {
	const [hovered, setHovered] = useState<NavigationLinkKey | null>(null);
	const groupRef = useRef<HTMLDivElement>(null);
	const current = navigationKey(pathname);
	const indicator = hovered ?? current;
	const showIndicator = (key: NavigationLinkKey) =>
		indicator === key ? (
			<MenuIndicator
				aria-hidden="true"
				layoutId={`navigation-active-pill-${variant}`}
				transition={{ type: "spring", duration: 0.26, bounce: 0 }}
			/>
		) : null;
	const linkProps = (key: NavigationLinkKey) => ({
		onPointerEnter: () => setHovered(key),
		onFocus: () => setHovered(key),
		className: cn(
			"relative z-[1] inline-flex items-center justify-center rounded-full px-3 py-[9px] text-[13px] text-muted-foreground no-underline transition-[color,background-color,box-shadow] duration-220 ease-route hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent",
			key === current && "text-foreground",
			key === "links" && "text-primary-text",
			linkClassName,
		),
		"aria-current": key === current ? ("page" as const) : undefined,
		tabIndex,
	});

	return (
		<div
			ref={groupRef}
			className={cn("relative flex items-center gap-1", variant === "mobile" && "grid gap-1")}
			onPointerLeave={() => {
				if (!groupRef.current?.contains(document.activeElement)) setHovered(null);
			}}
			onBlurCapture={(event) => {
				if (!groupRef.current?.contains(event.relatedTarget as Node | null)) setHovered(null);
			}}
		>
			<Link {...linkProps("work")} to="/work" search={{ focus: "identity" }}>
				{showIndicator("work")}
				<span className="relative z-[1]">Work</span>
			</Link>
			<Link {...linkProps("story")} to="/story">
				{showIndicator("story")}
				<span className="relative z-[1]">Story</span>
			</Link>
			<Link {...linkProps("field-notes")} to="/field-notes">
				{showIndicator("field-notes")}
				<span className="relative z-[1]">Field notes</span>
			</Link>
			<Link {...linkProps("resume")} to="/resume">
				{showIndicator("resume")}
				<span className="relative z-[1]">Résumé</span>
			</Link>
			<Link {...linkProps("links")} to="/links" search={{ kind: "all" }}>
				{showIndicator("links")}
				<span className="relative z-[1]">
					Links <span aria-hidden="true">↗</span>
				</span>
			</Link>
		</div>
	);
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				<script dangerouslySetInnerHTML={{ __html: accentBootScript }} />
			</head>
			<body className="bg-background font-sans text-foreground">
				{children}
				<Scripts />
			</body>
		</html>
	);
}

function NotFoundPage() {
	return (
		<main className="mx-auto grid min-h-[calc(100svh-170px)] w-full max-w-[1200px] content-center justify-items-start px-5 py-[clamp(58px,9vw,120px)] sm:px-8">
			<title>Page not found — Sohel Islam Imran</title>
			<meta name="robots" content="noindex, nofollow" />
			<p className="mb-3.5 text-xs font-extrabold uppercase tracking-[0.11em] text-primary-text">
				404 · Route not found
			</p>
			<h1 className="mb-5 mt-0 max-w-[880px] text-[clamp(3rem,6vw,5.5rem)] font-[760] leading-[0.94] tracking-[-0.065em]">
				That route drifted off the map.
			</h1>
			<p className="m-0 max-w-[650px] text-[clamp(1.05rem,2vw,1.3rem)] leading-[1.55] text-muted-foreground">
				The page may have moved, or the link may be incomplete.
			</p>
			<Link className={cn(buttonVariants({ size: "lg" }), "mt-7")} to="/">
				Return home <span aria-hidden="true">↗</span>
			</Link>
		</main>
	);
}

function RootErrorPage() {
	return (
		<main className="mx-auto grid min-h-[calc(100svh-170px)] w-full max-w-[1200px] content-center justify-items-start px-5 py-[clamp(58px,9vw,120px)] sm:px-8">
			<title>Page interrupted — Sohel Islam Imran</title>
			<meta name="robots" content="noindex, nofollow" />
			<p className="mb-3.5 text-xs font-extrabold uppercase tracking-[0.11em] text-primary-text">
				A small interruption
			</p>
			<h1 className="mb-5 mt-0 max-w-[880px] text-[clamp(3rem,6vw,5.5rem)] font-[760] leading-[0.94] tracking-[-0.065em]">
				The route needs another try.
			</h1>
			<p className="m-0 max-w-[650px] text-[clamp(1.05rem,2vw,1.3rem)] leading-[1.55] text-muted-foreground">
				The page could not finish loading. Try it once more; if it keeps happening, return to the
				public site.
			</p>
			<div className="mt-7 flex flex-wrap gap-2.5">
				<button
					type="button"
					className={buttonVariants({ size: "lg" })}
					onClick={() => window.location.reload()}
				>
					Try again <span aria-hidden="true">↻</span>
				</button>
				<Link className={buttonVariants({ variant: "outline", size: "lg" })} to="/">
					Return home <span aria-hidden="true">↗</span>
				</Link>
			</div>
		</main>
	);
}
