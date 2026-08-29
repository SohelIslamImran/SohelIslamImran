import { useEffect, useRef, useState, type ReactNode } from "react";
import {
	HeadContent,
	Link,
	Outlet,
	Scripts,
	createRootRoute,
	useRouterState,
} from "@tanstack/react-router";
import { AccentSwitcher, accentBootScript } from "../components";
import "../styles/prism-route.css";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Sohel Islam Imran" },
			{ name: "theme-color", content: "#f7f9fc", media: "(prefers-color-scheme: light)" },
			{ name: "theme-color", content: "#08111f", media: "(prefers-color-scheme: dark)" },
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
		navigationRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			setMenuOpen(false);
			menuButtonRef.current?.focus();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [menuOpen]);

	return (
		<RootDocument>
			<a className="skip-link" href="#main-content">
				Skip to content
			</a>
			<header className="site-shell">
				<Link className="site-shell__brand" to="/" aria-label="Sohel Islam Imran home">
					<span className="site-shell__mark" aria-hidden="true">
						SI
					</span>
					<span>Sohel Islam Imran</span>
				</Link>
				<nav
					ref={navigationRef}
					id="primary-navigation"
					className="site-shell__nav"
					data-open={menuOpen || undefined}
					aria-label="Primary navigation"
				>
					<Link to="/work" search={{ focus: "identity" }} activeProps={{ className: "is-active" }}>
						Work
					</Link>
					<Link to="/story" activeProps={{ className: "is-active" }}>
						Story
					</Link>
					<Link to="/field-notes" activeProps={{ className: "is-active" }}>
						Field notes
					</Link>
					<Link to="/resume" activeProps={{ className: "is-active" }}>
						Résumé
					</Link>
					<Link
						className="site-shell__links"
						to="/links"
						search={{ kind: "all" }}
						activeProps={{ className: "is-active" }}
					>
						Links <span aria-hidden="true">↗</span>
					</Link>
				</nav>
				<div className="site-shell__actions">
					<AccentSwitcher
						open={accentOpen}
						onOpenChange={(open) => {
							setAccentOpen(open);
							if (open) setMenuOpen(false);
						}}
					/>
					<button
						ref={menuButtonRef}
						className="site-shell__menu"
						type="button"
						aria-controls="primary-navigation"
						aria-expanded={menuOpen}
						onClick={() => {
							setMenuOpen((open) => !open);
							setAccentOpen(false);
						}}
					>
						<span>{menuOpen ? "Close" : "Menu"}</span>
						<span aria-hidden="true">{menuOpen ? "×" : "＋"}</span>
					</button>
				</div>
			</header>
			<div id="main-content" tabIndex={-1}>
				<Outlet />
			</div>
			<footer className="site-footer">
				<p>© {new Date().getUTCFullYear()} Sohel Islam Imran</p>
				<p>Full-stack product engineering from Dhaka, for teams everywhere.</p>
				<Link to="/links" search={{ kind: "all" }}>
					Find every link <span aria-hidden="true">↗</span>
				</Link>
			</footer>
		</RootDocument>
	);
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				<script dangerouslySetInnerHTML={{ __html: accentBootScript }} />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}

function NotFoundPage() {
	return (
		<main className="prism-page status-page">
			<title>Page not found — Sohel Islam Imran</title>
			<meta name="robots" content="noindex, nofollow" />
			<p className="eyebrow">404 · Route not found</p>
			<h1>That route drifted off the map.</h1>
			<p className="lede">The page may have moved, or the link may be incomplete.</p>
			<Link className="prism-button prism-button--primary" to="/">
				Return home <span aria-hidden="true">↗</span>
			</Link>
		</main>
	);
}

function RootErrorPage() {
	return (
		<main className="prism-page status-page">
			<title>Page interrupted — Sohel Islam Imran</title>
			<meta name="robots" content="noindex, nofollow" />
			<p className="eyebrow">A small interruption</p>
			<h1>The route needs another try.</h1>
			<p className="lede">
				The page could not finish loading. Try it once more; if it keeps happening, return to the
				public site.
			</p>
			<div className="status-page__actions">
				<button
					type="button"
					className="prism-button prism-button--primary"
					onClick={() => window.location.reload()}
				>
					Try again <span aria-hidden="true">↻</span>
				</button>
				<Link className="prism-button prism-button--quiet" to="/">
					Return home <span aria-hidden="true">↗</span>
				</Link>
			</div>
		</main>
	);
}
