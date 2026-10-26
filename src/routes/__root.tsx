import {
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
	type ReactNode,
	type RefObject,
} from "react";
import {
	HeadContent,
	Link,
	Outlet,
	Scripts,
	createRootRoute,
	useRouterState,
} from "@tanstack/react-router";
import {
	AnimatePresence,
	MotionConfig,
	motion,
	useIsPresent,
	useReducedMotion,
} from "motion/react";
import { AccentSwitcher, accentBootScript } from "../components/AccentSwitcher";
import { buttonVariants } from "../components/ui/button";
import { MenuIndicator, MenuSurface } from "../components/ui/portfolio";
import { resolveCommittedRouteKey } from "../lib/route-focus";
import { cn } from "../lib/utils";
import "../styles/tailwind.css";

// Flipped from a client effect once the root route has hydrated. Module scope is
// safe because it is never written during SSR, and unlike context it stays
// readable from the not-found and error pages, which render in place of this
// component when a client navigation fails.
let hasHydratedRootRoute = false;

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
	const search = useRouterState({ select: (state) => state.location.searchStr });
	const committedMatchId = useRouterState({
		select: (state) => resolveCommittedRouteKey(state.matches, state.location.pathname),
	});
	const focusOnClientNavigation = hasHydratedRootRoute;
	const [menuOpen, setMenuOpen] = useState(false);
	const [accentOpen, setAccentOpen] = useState(false);
	const menuButtonRef = useRef<HTMLButtonElement>(null);
	const navigationRef = useRef<HTMLElement>(null);
	const desktopNavigationRef = useRef<HTMLElement>(null);
	const closeMenu = useCallback((restoreFocus = false) => {
		setMenuOpen(false);
		if (restoreFocus) menuButtonRef.current?.focus({ preventScroll: true });
	}, []);

	useEffect(() => {
		hasHydratedRootRoute = true;
	}, []);

	useEffect(() => {
		setMenuOpen(false);
		setAccentOpen(false);
	}, [pathname, search]);

	useEffect(() => {
		const desktopQuery = window.matchMedia("(min-width: 801px)");
		const reconcile = () => {
			if (!desktopQuery.matches) return;
			// The trigger itself is hidden above this breakpoint, so focus parked on
			// it would fall to <body>; hand it to the desktop nav instead.
			const focusWasInMenu =
				navigationRef.current?.contains(document.activeElement) ||
				menuButtonRef.current?.contains(document.activeElement);
			setMenuOpen(false);
			setAccentOpen(false);
			if (focusWasInMenu) {
				const activeLink =
					desktopNavigationRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
				(activeLink ?? desktopNavigationRef.current?.querySelector<HTMLElement>("a"))?.focus();
			}
		};
		desktopQuery.addEventListener("change", reconcile);
		return () => desktopQuery.removeEventListener("change", reconcile);
	}, []);

	useEffect(() => {
		if (!menuOpen) return;
		const activeLink =
			navigationRef.current?.querySelector<HTMLAnchorElement>('[aria-current="page"]');
		(activeLink ?? navigationRef.current?.querySelector<HTMLAnchorElement>("a"))?.focus();
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			closeMenu(true);
		};
		const onFocusIn = (event: FocusEvent) => {
			const target = event.target as Node | null;
			if (
				target &&
				(navigationRef.current?.contains(target) || menuButtonRef.current?.contains(target))
			)
				return;
			closeMenu();
		};
		const onFocusOut = (event: FocusEvent) => {
			const target = event.relatedTarget as Node | null;
			if (
				!target ||
				(!navigationRef.current?.contains(target) && !menuButtonRef.current?.contains(target))
			)
				closeMenu();
		};
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Node;
			if (navigationRef.current?.contains(target) || menuButtonRef.current?.contains(target))
				return;
			const focusWasInMenu = navigationRef.current?.contains(document.activeElement);
			const outsideFocusTarget =
				target instanceof Element
					? target.closest(
							'a, button, input, select, textarea, [contenteditable="true"], [role="button"], [tabindex]:not([tabindex="-1"])',
						)
					: null;
			closeMenu(Boolean(focusWasInMenu && !outsideFocusTarget));
		};
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("focusin", onFocusIn);
		window.addEventListener("focusout", onFocusOut);
		window.addEventListener("pointerdown", onPointerDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("focusin", onFocusIn);
			window.removeEventListener("focusout", onFocusOut);
			window.removeEventListener("pointerdown", onPointerDown);
		};
	}, [closeMenu, menuOpen]);

	return (
		<MotionConfig reducedMotion="user">
			<RootDocument>
				<a
					data-slot="skip-link"
					className="fixed z-[100] -translate-y-[180%] min-h-11 rounded-full bg-foreground px-4 py-2.5 text-[13px] font-[750] text-background no-underline transition-transform duration-200 ease-route focus-visible:translate-y-0 focus-visible:transition-none"
					href="#main-content"
					aria-controls="main-content"
				>
					Skip to content
				</a>
				<header
					data-slot="site-header"
					data-material="glass"
					className="site-shell sticky top-0 z-20 flex min-w-0 max-w-full items-center justify-between gap-3 rounded-b-shell border-x border-b border-[color-mix(in_srgb,var(--theme-surface-solid)_78%,transparent)] bg-[color-mix(in_srgb,var(--theme-paper)_74%,transparent)] py-4 shadow-[0_12px_38px_var(--theme-shadow)] backdrop-blur-2xl backdrop-saturate-150 max-[800px]:gap-2 max-[800px]:py-3"
				>
					<Link
						className="inline-flex min-h-11 min-w-0 flex-1 items-center gap-2.5 text-sm font-[780] tracking-[-0.02em] text-inherit no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
						to="/"
						aria-label="Sohel Islam Imran home"
					>
						<span
							className="grid size-[30px] shrink-0 place-items-center rounded-[10px] bg-foreground text-[10px] tracking-[0.04em] text-background max-[800px]:size-8"
							aria-hidden="true"
						>
							SI
						</span>
						<span className="min-w-0 max-w-[96px] truncate whitespace-nowrap leading-[1.15] max-[430px]:max-w-[128px] max-[360px]:sr-only min-[801px]:max-w-[150px] min-[1000px]:max-w-none">
							Sohel Islam Imran
						</span>
					</Link>
					<nav
						ref={desktopNavigationRef}
						className="ml-auto hidden items-center gap-1 min-[801px]:flex"
						aria-label="Primary navigation"
					>
						<NavigationLinks pathname={pathname} variant="desktop" />
					</nav>
					<div className="flex shrink-0 items-center gap-2">
						<AccentSwitcher
							open={accentOpen}
							onOpenChange={(open) => {
								setAccentOpen(open);
								if (open) setMenuOpen(false);
							}}
						/>
						<button
							ref={menuButtonRef}
							data-material="glass"
							className="inline-flex min-h-11 items-center gap-[9px] rounded-full border border-control-border bg-[color-mix(in_srgb,var(--theme-surface-solid)_92%,transparent)] px-[13px] text-xs font-[750] text-foreground shadow-[0_5px_16px_var(--theme-shadow)] backdrop-blur-xl transition-[transform,translate,scale,rotate,background-color,border-color,box-shadow] duration-200 ease-route motion-safe:pointer-fine:hover:-translate-y-px motion-safe:active:scale-[.97] motion-reduce:scale-100 focus-visible:translate-y-0 min-[801px]:hidden"
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
				<div className="grid min-w-0">
					<RouteOutlet key={committedMatchId} focusOnClientNavigation={focusOnClientNavigation} />
				</div>
				<footer
					data-slot="site-footer"
					className="site-footer-shell grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] gap-5 border-t border-border py-10 pb-[max(3rem,env(safe-area-inset-bottom))] text-[13px] text-muted-foreground max-[800px]:grid-cols-1 max-[800px]:gap-2.5"
				>
					<p className="min-w-0 break-words [overflow-wrap:anywhere]">
						© {new Date().getUTCFullYear()} Sohel Islam Imran
					</p>
					<p className="min-w-0 max-w-[62ch] break-words text-pretty [overflow-wrap:anywhere]">
						Built with TanStack Start, served from Cloudflare Workers.{" "}
						<a
							className="inline-flex min-h-11 items-center font-bold text-primary-text no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
							href="https://github.com/SohelIslamImran/SohelIslamImran"
							target="_blank"
							rel="noreferrer"
						>
							Source
							<span className="sr-only">, opens in a new tab</span>
						</a>
						.
					</p>
					<div className="flex min-w-0 flex-wrap justify-self-end gap-x-5 gap-y-1 max-[800px]:justify-self-start">
						<Link
							className="inline-flex min-h-11 min-w-0 max-w-full items-center no-underline hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
							to="/field-notes"
						>
							Field notes
						</Link>
						<Link
							className="inline-flex min-h-11 min-w-0 max-w-full items-center font-bold text-primary-text no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
							to="/links"
							search={{ kind: "all" }}
						>
							Curated links <span aria-hidden="true">→</span>
						</Link>
					</div>
				</footer>
			</RootDocument>
		</MotionConfig>
	);
}

function RouteOutlet({ focusOnClientNavigation }: { focusOnClientNavigation: boolean }) {
	const routeRef = useRef<HTMLDivElement>(null);
	// This component is keyed on the committed match, so it mounts only once the
	// incoming route has resolved and painted. A layout effect therefore always
	// observes the entering <main>, never the outgoing one.
	useLayoutEffect(() => {
		if (!focusOnClientNavigation) return;
		routeRef.current
			?.querySelector<HTMLElement>("main#main-content")
			?.focus({ preventScroll: true });
	}, []);
	return (
		<motion.div
			ref={routeRef}
			className="col-start-1 row-start-1 min-w-0 will-change-[opacity,transform]"
			initial={{ opacity: 0, y: 5 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
		>
			<Outlet />
		</motion.div>
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
	const reduceMotion = useReducedMotion() === true;
	const menuMotion = reduceMotion
		? {
				initial: { opacity: 0 },
				animate: { opacity: 1 },
				exit: { opacity: 0 },
			}
		: {
				initial: { opacity: 0, y: -6, scale: 0.98 },
				animate: { opacity: 1, y: 0, scale: 1 },
				exit: { opacity: 0, y: -4, scale: 0.99 },
			};
	return (
		<motion.nav
			ref={navigationRef}
			id="primary-navigation"
			className="absolute left-[max(0px,env(safe-area-inset-left))] right-[max(0px,env(safe-area-inset-right))] top-[calc(100%+0.5rem)] origin-top-right min-[801px]:hidden"
			aria-label="Primary navigation"
			aria-hidden={!isPresent}
			inert={!isPresent || undefined}
			initial={menuMotion.initial}
			animate={menuMotion.animate}
			exit={menuMotion.exit}
			transition={
				reduceMotion
					? { duration: 0 }
					: { duration: isPresent ? 0.26 : 0.19, ease: [0.22, 1, 0.36, 1] }
			}
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

type NavigationLinkKey = "work" | "story" | "resume" | "links";

function navigationKey(pathname: string): NavigationLinkKey | null {
	if (pathname.startsWith("/work")) return "work";
	if (pathname.startsWith("/story")) return "story";
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
			"relative z-[1] inline-flex min-h-11 min-w-0 max-w-full items-center justify-center rounded-full px-3 py-2 text-[13px] text-muted-foreground no-underline transition-[color,background-color,box-shadow] duration-200 ease-route hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
			key === current && "text-foreground",
			linkClassName,
		),
		"aria-current": key === current ? ("page" as const) : undefined,
		tabIndex,
	});

	return (
		<div
			ref={groupRef}
			className={cn(
				"relative flex min-w-0 items-center gap-1",
				variant === "mobile" && "grid gap-1",
			)}
			onPointerLeave={() => {
				if (!groupRef.current?.contains(document.activeElement)) setHovered(null);
			}}
			onBlurCapture={(event) => {
				if (!groupRef.current?.contains(event.relatedTarget as Node | null)) setHovered(null);
			}}
		>
			<Link {...linkProps("work")} to="/work" search={{ group: "all" }}>
				{showIndicator("work")}
				<span className="relative z-[1]">Work</span>
			</Link>
			<Link {...linkProps("story")} to="/story">
				{showIndicator("story")}
				<span className="relative z-[1]">Story</span>
			</Link>
			<Link {...linkProps("resume")} to="/resume">
				{showIndicator("resume")}
				<span className="relative z-[1]">Résumé</span>
			</Link>
			<Link {...linkProps("links")} to="/links" search={{ kind: "all" }}>
				{showIndicator("links")}
				<span className="relative z-[1]">
					Links <span aria-hidden="true">→</span>
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

function useFocusOnMount<T extends HTMLElement>() {
	const ref = useRef<T>(null);
	useLayoutEffect(() => {
		if (hasHydratedRootRoute) ref.current?.focus({ preventScroll: true });
	}, []);
	return ref;
}

const statusPageClassName =
	"mx-auto grid min-h-[calc(100svh-170px)] w-full min-w-0 max-w-[1200px] content-center justify-items-start px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pt-[max(clamp(58px,9vw,120px),env(safe-area-inset-top))] pb-[max(clamp(58px,9vw,120px),env(safe-area-inset-bottom))] sm:px-[max(2rem,env(safe-area-inset-left))] sm:pr-[max(2rem,env(safe-area-inset-right))]";
const statusTitleClassName =
	"mb-5 mt-0 min-w-0 max-w-full break-words text-[clamp(2.5rem,12vw,5.5rem)] font-[760] leading-[0.94] tracking-[-0.065em] [overflow-wrap:anywhere]";
const statusBodyClassName =
	"m-0 min-w-0 max-w-[650px] break-words text-[clamp(1.05rem,2vw,1.3rem)] leading-[1.55] text-muted-foreground [overflow-wrap:anywhere]";
const statusActionClassName =
	"w-full max-w-full justify-start whitespace-normal text-left [overflow-wrap:anywhere] sm:w-auto sm:justify-center";

/** Shared landmark for the not-found and route-error screens. */
function StatusPage({
	documentTitle,
	eyebrow,
	title,
	body,
	children,
}: {
	documentTitle: string;
	eyebrow: string;
	title: string;
	body: string;
	children: ReactNode;
}) {
	const mainRef = useFocusOnMount<HTMLElement>();
	const titleId = useId();
	return (
		<>
			{/*
				React hoists these into <head> during SSR, which a route-level `head`
				cannot do for the not-found and error screens because they render in
				place of the root component. They must also stay out of search results.
			*/}
			<title>{documentTitle}</title>
			<meta name="robots" content="noindex, nofollow" />
			<main
				ref={mainRef}
				id="main-content"
				tabIndex={-1}
				aria-labelledby={titleId}
				className={statusPageClassName}
			>
				<p className="mb-3.5 text-xs font-extrabold uppercase tracking-[0.11em] text-primary-text">
					{eyebrow}
				</p>
				<h1 id={titleId} className={statusTitleClassName}>
					{title}
				</h1>
				<p className={statusBodyClassName}>{body}</p>
				{children}
			</main>
		</>
	);
}

function NotFoundPage() {
	return (
		<StatusPage
			documentTitle="Page not found — Sohel Islam Imran"
			eyebrow="404 · Route not found"
			title="That route drifted off the map."
			body="The page may have moved, or the link may be incomplete."
		>
			<Link className={cn(buttonVariants({ size: "lg" }), "mt-7", statusActionClassName)} to="/">
				Return home <span aria-hidden="true">→</span>
			</Link>
		</StatusPage>
	);
}

function RootErrorPage() {
	return (
		<StatusPage
			documentTitle="Page interrupted — Sohel Islam Imran"
			eyebrow="A small interruption"
			title="The route needs another try."
			body="The page could not finish loading. Try it once more; if it keeps happening, return to the public site."
		>
			<div className="mt-7 flex w-full min-w-0 max-w-full flex-wrap gap-2.5">
				<button
					type="button"
					className={cn(buttonVariants({ size: "lg" }), statusActionClassName)}
					onClick={() => window.location.reload()}
				>
					Try again <span aria-hidden="true">↻</span>
				</button>
				<Link
					className={cn(buttonVariants({ variant: "outline", size: "lg" }), statusActionClassName)}
					to="/"
				>
					Return home <span aria-hidden="true">→</span>
				</Link>
			</div>
		</StatusPage>
	);
}
