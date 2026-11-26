import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
	HeadContent,
	Link,
	Outlet,
	Scripts,
	createRootRoute,
	useRouter,
	useRouterState,
} from "@tanstack/react-router";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import { Beacon } from "../components/analytics/Beacon";
import { railBootScript } from "../components/cms/shell/rail-preference";
import { accentBootScript, themeColors } from "../components/AccentSwitcher";
import { CommandPaletteProvider, useCommandPalette } from "../components/chrome/CommandPalette";
import { NavDock } from "../components/chrome/NavDock";
import { RouteProgress } from "../components/chrome/RouteProgress";
import { SiteFooter } from "../components/chrome/SiteFooter";
import { NotFoundPrompt } from "../components/chrome/NotFoundPrompt";
import { suggestDestinations } from "../components/chrome/lost-routes";
import { usePublicContent } from "../components/chrome/public-content";
import { TraceStack, type TraceStackLayer } from "../components/chrome/StatusScene";
import { buttonVariants } from "../components/ui/button";
import { Kbd } from "../components/ui/portfolio";
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
			// Fallbacks for routes without their own head; public pages override them.
			{
				name: "description",
				content:
					"Sohel Islam Imran, lead full-stack engineer: web and mobile interfaces, APIs, databases and migrations, single sign-on, and permissions.",
			},
			{ name: "application-name", content: "Sohel Islam Imran" },
			{ name: "apple-mobile-web-app-title", content: "Sohel" },
			{ name: "theme-color", content: themeColors.light },
			{ name: "color-scheme", content: "light dark" },
			{ name: "format-detection", content: "telephone=no" },
		],
		links: [
			{ rel: "icon", href: "/favicon.ico", sizes: "32x32" },
			{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
			{ rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
			{ rel: "manifest", href: "/site.webmanifest" },
			{
				rel: "alternate",
				type: "application/rss+xml",
				href: "/rss.xml",
				title: "Sohel Islam Imran — Writing",
			},
		],
	}),
	notFoundComponent: NotFoundPage,
	errorComponent: RootErrorPage,
	component: RootComponent,
});

function RootComponent() {
	const committedMatchId = useRouterState({
		select: (state) => resolveCommittedRouteKey(state.matches, state.location.pathname),
	});
	const focusOnClientNavigation = hasHydratedRootRoute;

	// The CMS (`/cms/*`, served at the root of the CMS host) brings its own
	// dashboard shell. It skips the public dock, footer, and command palette.
	const isCmsRoute = useRouterState({
		select: (state) => state.matches.some((match) => match.routeId.startsWith("/cms")),
	});

	useEffect(() => {
		hasHydratedRootRoute = true;
	}, []);
	useRouteViewTransitions();

	if (isCmsRoute) {
		return (
			<MotionConfig reducedMotion="user">
				<RootDocument cms>
					<Outlet />
				</RootDocument>
			</MotionConfig>
		);
	}

	return (
		<MotionConfig reducedMotion="user">
			<RootDocument>
				<Beacon />
				<CommandPaletteProvider>
					<a
						data-slot="skip-link"
						className="fixed z-(--z-skip) min-h-11 -translate-y-[200%] rounded-full bg-foreground px-4 py-2.5 text-[13px] font-semibold text-background no-underline shadow-float transition-transform duration-200 ease-trace focus-visible:translate-y-0 focus-visible:transition-none"
						href="#main-content"
						aria-controls="main-content"
					>
						Skip to content
					</a>
					<RouteProgress />
					<NavDock />
					<div data-slot="app-frame" className="grid min-w-0 pt-(--dock-space-top)">
						<RouteOutlet key={committedMatchId} focusOnClientNavigation={focusOnClientNavigation} />
					</div>
					<SiteFooter />
				</CommandPaletteProvider>
			</RootDocument>
		</MotionConfig>
	);
}

/**
 * Route changes as View Transitions, where supported and motion is allowed.
 *
 * The router's `defaultViewTransition` is decided per navigation, just before
 * it starts: only when the path changes (search-param filters and hash jumps
 * stay instant, so the Work and Links filters keep their own animation). Links
 * that ask for a transition themselves (the work poster hand-off) are left as
 * they are. `html[data-route-vt]` scopes the CSS ("depth pass: chrome") so the
 * theme reveal and the poster transition keep their own styles: the old page
 * recedes, the new one rises, the dock stays put. Back/forward reverses it.
 */
function useRouteViewTransitions() {
	const router = useRouter();
	useEffect(() => {
		const root = document.documentElement;
		const supported = typeof document.startViewTransition === "function";
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
		let clearTimer: number | undefined;
		let cmsTransition:
			| { view: ViewTransition; skipped: boolean; outgoing: HTMLElement | null }
			| undefined;
		const startRouterTransition = router.startViewTransition;
		const skipCmsTransition = () => {
			if (!cmsTransition) return;
			cmsTransition.skipped = true;
			cmsTransition.view.skipTransition();
		};
		const sectionSelector = '[data-slot="cms-section"]';
		const cmsOverlaySelector =
			'[data-slot="cms-mobile-drawer"], [data-slot="cms-command-bar"], [data-slot="cms-publish-dialog"], [data-slot="cms-conflict-dialog"], .cms-issues-popover, .appearance-pop';
		let navigateWithOverlay = false;
		const isCmsPath = (path?: string) => path === "/cms" || path?.startsWith("/cms/");
		const indexOf = (state: unknown) =>
			typeof (state as { __TSR_index?: unknown } | undefined)?.__TSR_index === "number"
				? (state as { __TSR_index: number }).__TSR_index
				: null;
		const direction = (fromState: unknown, toState: unknown) => {
			const from = indexOf(fromState);
			const to = indexOf(toState);
			return from !== null && to !== null && to < from ? "back" : "forward";
		};
		const onMotionChange = () => {
			if (reduced.matches) skipCmsTransition();
		};
		reduced.addEventListener("change", onMotionChange);

		// Router internals (pinned: @tanstack/react-router 1.170.46 with
		// @tanstack/router-core 1.171.39). This wraps the router instance's
		// `startViewTransition(fn)` and reads and clears `shouldViewTransition`,
		// which `navigate()` sets from the link's `viewTransition` option; it
		// also reads `stores.resolvedLocation` and `latestLocation`. None of these
		// are documented API. On a router upgrade, check that `load()` still calls
		// `router.startViewTransition(fn)` with the commit as `fn`, and that
		// `src/components/cms/shell/router-internals.test.ts` still passes.
		//
		// CMS navigations: the router's update callback commits the route and
		// restores (or resets) scroll with `scrollRestorationBehavior: "instant"`,
		// so the incoming snapshot is captured at its final scroll position and
		// only the content fade moves. A newer navigation skips the running
		// transition; that rejects `ready` (and can reject `finished`) with an
		// AbortError, which is normal cancellation, not a failure.
		router.startViewTransition = async (update) => {
			const from = router.stores.resolvedLocation.get();
			const to = router.latestLocation;
			if (!isCmsPath(from?.pathname) || !isCmsPath(to.pathname)) {
				return startRouterTransition(update);
			}
			const requested = router.shouldViewTransition ?? true;
			router.shouldViewTransition = undefined;
			// A search-only update (an editor selecting its first item) commits
			// without a snapshot and leaves a running content fade alone.
			if (reduced.matches || from?.pathname === to.pathname) {
				return update();
			}
			const outgoing = document.querySelector<HTMLElement>(sectionSelector);
			if (!requested || navigateWithOverlay || document.querySelector(cmsOverlaySelector)) {
				// Leave the closing layer in the live paint tree, above the page.
				await update();
				if (router.stores.resolvedLocation.get()?.pathname === to.pathname) {
					const incoming = document.querySelector<HTMLElement>(sectionSelector);
					if (incoming && incoming !== outgoing) incoming.dataset.cmsFade = "";
				}
				return;
			}
			if (!supported) return update();
			const types =
				typeof requested === "object" &&
				window.CSS?.supports?.("selector(:active-view-transition-type(a))")
					? typeof requested.types === "function"
						? requested.types({
								fromLocation: from,
								toLocation: to,
								pathChanged: from?.pathname !== to.pathname,
								hrefChanged: from?.href !== to.href,
								hashChanged: from?.hash !== to.hash,
							})
						: requested.types
					: undefined;
			if (types === false) return update();

			root.dataset.routeVt = direction(from?.state, to.state);
			// Give the keyed sections separate groups so each keeps the viewport
			// position captured on its side of scroll restoration.
			if (outgoing) outgoing.style.viewTransitionName = "cms-section-out";
			// The section snapshot owns the entry rise. Opt the page's own
			// `.cms-enter` rises out, both those in the first paint (tagged
			// before the new snapshot is captured) and rows that mount while
			// the snapshot still rises, so the content rises once. The tag
			// stays on those elements (removing it would replay the animation);
			// rows that mount after the transition keep their own enter.
			let entering: MutationObserver | undefined;
			const commit = async () => {
				await update();
				const incoming = document.querySelector<HTMLElement>(sectionSelector);
				if (!incoming || incoming === outgoing) return;
				const tag = (scope: Element) => {
					for (const element of scope.querySelectorAll<HTMLElement>(".cms-enter")) {
						element.dataset.cmsVtEnter = "";
					}
					if (scope instanceof HTMLElement && scope.classList.contains("cms-enter")) {
						scope.dataset.cmsVtEnter = "";
					}
				};
				tag(incoming);
				entering = new MutationObserver((records) => {
					for (const record of records) {
						for (const node of record.addedNodes) if (node instanceof Element) tag(node);
					}
				});
				entering.observe(incoming, { childList: true, subtree: true });
			};
			const view = document.startViewTransition(types ? { update: commit, types } : commit);
			const transition = { view, skipped: false, outgoing };
			cmsTransition = transition;
			const reportTransitionError = (error: unknown) => {
				if (
					error instanceof DOMException &&
					(error.name === "AbortError" ||
						(transition.skipped && error.name === "InvalidStateError"))
				) {
					return;
				}
				if (import.meta.env.DEV) console.error("CMS view transition failed", error);
			};
			void view.ready.catch(reportTransitionError);
			const finish = () => {
				entering?.disconnect();
				if (cmsTransition === transition || cmsTransition?.outgoing !== outgoing) {
					outgoing?.style.removeProperty("view-transition-name");
				}
				if (cmsTransition !== transition) return;
				cmsTransition = undefined;
				delete root.dataset.routeVt;
			};
			void view.finished.then(finish, (error: unknown) => {
				finish();
				reportTransitionError(error);
			});
			await view.updateCallbackDone;
		};
		const unsubscribeStart = router.subscribe("onBeforeNavigate", (event) => {
			if (isCmsPath(event.fromLocation?.pathname) && isCmsPath(event.toLocation.pathname)) {
				if (event.pathChanged) {
					navigateWithOverlay = document.querySelector(cmsOverlaySelector) !== null;
					skipCmsTransition();
					window.clearTimeout(clearTimer);
					if (!cmsTransition) delete root.dataset.routeVt;
				}
				return;
			}
			skipCmsTransition();
			cmsTransition = undefined;
			const animate = supported && !reduced.matches && event.pathChanged;
			router.options.defaultViewTransition = animate;
			window.clearTimeout(clearTimer);
			routeViewTransitionPending = animate;
			if (animate) {
				root.dataset.routeVt = direction(event.fromLocation?.state, event.toLocation.state);
			} else {
				delete root.dataset.routeVt;
			}
		});
		const unsubscribeEnd = router.subscribe("onResolved", (event) => {
			routeViewTransitionPending = false;
			if (isCmsPath(event.fromLocation?.pathname) && isCmsPath(event.toLocation.pathname)) {
				return;
			}
			window.clearTimeout(clearTimer);
			// The transition's animations run after the router resolves.
			clearTimer = window.setTimeout(() => delete root.dataset.routeVt, 700);
		});
		return () => {
			skipCmsTransition();
			reduced.removeEventListener("change", onMotionChange);
			router.startViewTransition = startRouterTransition;
			unsubscribeStart();
			unsubscribeEnd();
			window.clearTimeout(clearTimer);
			delete root.dataset.routeVt;
			router.options.defaultViewTransition = false;
		};
	}, [router]);
}

/** True between a navigation's start and its resolve when a View Transition animates it. */
let routeViewTransitionPending = false;

/**
 * Keyed on the committed match, so it mounts only once the incoming route has
 * resolved and painted. The layout effect therefore always observes the
 * entering <main>, never the outgoing one. Without a View Transition, the
 * enter motion is a short rise and fade that never blocks input.
 */
function RouteOutlet({ focusOnClientNavigation }: { focusOnClientNavigation: boolean }) {
	const routeRef = useRef<HTMLDivElement>(null);
	const reduceMotion = useReducedMotion() === true;
	// Read once at mount, and only after hydration, so server and client agree.
	const [animateIn] = useState(() => focusOnClientNavigation && !routeViewTransitionPending);
	useLayoutEffect(() => {
		if (!focusOnClientNavigation) return;
		routeRef.current
			?.querySelector<HTMLElement>("main#main-content")
			?.focus({ preventScroll: true });
	}, []);
	return (
		<motion.div
			ref={routeRef}
			data-slot="route-outlet"
			className="col-start-1 row-start-1 min-w-0"
			initial={animateIn ? { opacity: 0, y: reduceMotion ? 0 : 8 } : false}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: reduceMotion ? 0.12 : 0.32, ease: [0.22, 1, 0.36, 1] }}
		>
			<Outlet />
		</motion.div>
	);
}

function RootDocument({ children, cms }: Readonly<{ children: ReactNode; cms?: boolean }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				<script dangerouslySetInnerHTML={{ __html: accentBootScript }} />
				{cms ? <script dangerouslySetInnerHTML={{ __html: railBootScript }} /> : null}
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

interface TraceLogLine {
	mark: string;
	layer: string;
	text: string;
	tone?: "ok" | "error" | "accent";
}

/**
 * Shared landmark for the not-found and route-error screens: the copy and
 * ways back on one side; on the other, the request itself, drawn as the
 * stack it was travelling through, with a short trace log.
 */
function StatusPage({
	documentTitle,
	eyebrow,
	title,
	body,
	layers,
	lostAt,
	pausedAt,
	log,
	rerouting = false,
	children,
	aside,
	prompt,
}: {
	documentTitle: string;
	eyebrow: string;
	title: string;
	body: string;
	layers: readonly TraceStackLayer[];
	lostAt?: number;
	pausedAt?: number;
	log: readonly TraceLogLine[];
	rerouting?: boolean;
	children: ReactNode;
	aside?: ReactNode;
	prompt?: ReactNode;
}) {
	const mainRef = useFocusOnMount<HTMLElement>();
	const titleId = useId();
	const pathname = useRouterState({ select: (state) => state.location.pathname });
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
				data-slot="page-shell"
				data-page="status"
				className="shell grid min-h-[calc(100svh-var(--dock-space-top)-var(--dock-space-bottom))] content-center items-center gap-x-[clamp(32px,6vw,96px)] gap-y-6 py-[clamp(40px,8vw,112px)] md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
			>
				<div className="order-2 min-w-0 overflow-x-clip">
					<TraceStack
						layers={layers}
						lostAt={lostAt}
						pausedAt={pausedAt}
						rerouting={rerouting}
						open={rerouting}
						className="trace-stack--status h-[220px] w-full sm:h-[260px] md:h-[400px]"
					/>
					<div
						data-slot="status-trace-log"
						className="mx-auto mt-2 w-full max-w-[400px] rounded-inner border border-line bg-surface-solid px-4 py-3.5 font-mono text-[12px] leading-[1.7] shadow-raised"
					>
						<p className="m-0 truncate text-foreground">
							<span className="text-primary-text">GET</span> {pathname}
						</p>
						{log.map((line) => (
							<p key={line.layer} className="m-0 flex min-w-0 gap-3">
								<span
									aria-hidden="true"
									className={cn(
										"w-3 shrink-0",
										line.tone === "ok" && "text-success",
										line.tone === "error" && "text-destructive",
										line.tone === "accent" && "text-primary-text",
									)}
								>
									{line.mark}
								</span>
								<span className="w-[9ch] shrink-0 text-muted-foreground">{line.layer}</span>
								<span className="min-w-0 truncate text-ink-soft">{line.text}</span>
							</p>
						))}
						{prompt}
					</div>
				</div>
				<div className="order-1 min-w-0">
					<p className="mono-label m-0 mb-5 text-primary-text">{eyebrow}</p>
					<h1 id={titleId} className="m-0 max-w-[14ch] text-display text-balance">
						{title}
					</h1>
					<p className="mt-6 mb-0 max-w-[46ch] text-lead text-muted-foreground">{body}</p>
					<div className="mt-9 flex w-full min-w-0 flex-wrap gap-3">{children}</div>
					{aside}
				</div>
			</main>
		</>
	);
}

function SearchSiteButton() {
	const palette = useCommandPalette();
	if (!palette) return null;
	return (
		<button
			type="button"
			className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "gap-3")}
			onClick={() => palette.open()}
		>
			Search the site
			<Kbd aria-hidden="true">/</Kbd>
		</button>
	);
}

function NotFoundPage() {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const { content } = usePublicContent(true);
	const [target, setTarget] = useState<string | null>(null);
	const destinations = suggestDestinations(
		pathname,
		(content?.projects ?? []).map((project) => ({ slug: project.slug, title: project.title })),
	);
	const listId = useId();
	const router = useRouter();
	const reroute = (path: string) => {
		setTarget(path);
		window.setTimeout(
			() => router.history.push(path),
			window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 360,
		);
	};
	return (
		<StatusPage
			documentTitle="Page not found — Sohel Islam Imran"
			eyebrow="404 — Route not found"
			title="This trail ends here."
			body="I couldn’t find that page. The request got past the interface and lost its way at the router. Send it somewhere real."
			layers={[
				{ label: "Interface", note: "200" },
				{ label: "Router", note: "404", tone: "error" },
				{ label: "API", tone: "muted" },
				{ label: "Data", tone: "muted" },
			]}
			lostAt={1}
			rerouting={target !== null}
			log={[
				{ mark: "✓", layer: "interface", text: "rendered", tone: "ok" },
				{ mark: "✗", layer: "router", text: "no route matches this path", tone: "error" },
				target
					? { mark: "→", layer: "reroute", text: target, tone: "accent" }
					: { mark: "…", layer: "reroute", text: "waiting for a destination" },
			]}
			prompt={<NotFoundPrompt destinations={destinations} onReroute={reroute} />}
			aside={
				destinations.length ? (
					<nav aria-labelledby={listId} className="mt-10 max-w-[440px]">
						<p id={listId} className="mono-label m-0 mb-2 text-muted-foreground">
							Reroute to
						</p>
						<ul className="m-0 grid list-none gap-1 p-0">
							{destinations.map((destination) => (
								<li key={destination.path}>
									<a
										href={destination.path}
										onClick={(event) => {
											if (
												event.defaultPrevented ||
												event.button !== 0 ||
												event.metaKey ||
												event.ctrlKey ||
												event.shiftKey ||
												event.altKey
											) {
												return;
											}
											event.preventDefault();
											reroute(destination.path);
										}}
										onPointerEnter={() => setTarget(destination.path)}
										onPointerLeave={() => setTarget(null)}
										onFocus={() => setTarget(destination.path)}
										onBlur={() => setTarget(null)}
										className="group/route pressable -mx-3 flex min-h-11 items-center justify-between gap-4 rounded-full px-3 text-[15px] text-ink-soft no-underline hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)] hover:text-foreground focus-visible:text-foreground"
									>
										<span className="font-medium">{destination.label}</span>
										<span className="flex items-center gap-2 font-mono text-[12px] text-muted-foreground">
											{destination.path}
											<span
												aria-hidden="true"
												className="text-primary-text transition-transform duration-200 ease-trace group-hover/route:translate-x-0.5"
											>
												→
											</span>
										</span>
									</a>
								</li>
							))}
						</ul>
					</nav>
				) : null
			}
		>
			<Link className={buttonVariants({ size: "lg" })} to="/">
				Return home
			</Link>
			<Link
				className={buttonVariants({ variant: "outline", size: "lg" })}
				to="/work"
				search={{ group: "all" }}
			>
				Explore work
			</Link>
			<SearchSiteButton />
		</StatusPage>
	);
}

function RootErrorPage() {
	return (
		<StatusPage
			documentTitle="Something went wrong — Sohel Islam Imran"
			eyebrow="Trace paused"
			title="The page needs another try."
			body="Something stopped this page from loading. Try again, or head home."
			layers={[
				{ label: "Interface", note: "200" },
				{ label: "Router", note: "200" },
				{ label: "Loader", note: "paused", tone: "accent" },
				{ label: "Data", tone: "muted" },
			]}
			pausedAt={2}
			log={[
				{ mark: "✓", layer: "interface", text: "rendered", tone: "ok" },
				{ mark: "✓", layer: "router", text: "route matched", tone: "ok" },
				{ mark: "‖", layer: "loader", text: "paused before it finished", tone: "accent" },
			]}
		>
			<button
				type="button"
				className={buttonVariants({ size: "lg" })}
				onClick={() => window.location.reload()}
			>
				Try again
			</button>
			<Link className={buttonVariants({ variant: "outline", size: "lg" })} to="/">
				Return home
			</Link>
		</StatusPage>
	);
}
