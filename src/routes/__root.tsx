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
import "../styles/tailwind.css";

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
			<header className="shell">
				<Link className="shell-brand" to="/" aria-label="Sohel Islam Imran home">
					<span className="shell-mark" aria-hidden="true">
						SI
					</span>
					<span>Sohel Islam Imran</span>
				</Link>
				<nav
					ref={navigationRef}
					id="primary-navigation"
					className="shell-nav"
					data-open={menuOpen || undefined}
					aria-label="Primary navigation"
				>
					<Link
						className="shell-link"
						to="/work"
						search={{ focus: "identity" }}
						activeProps={{ className: "is-active" }}
					>
						Work
					</Link>
					<Link className="shell-link" to="/story" activeProps={{ className: "is-active" }}>
						Story
					</Link>
					<Link className="shell-link" to="/field-notes" activeProps={{ className: "is-active" }}>
						Field notes
					</Link>
					<Link className="shell-link" to="/resume" activeProps={{ className: "is-active" }}>
						Résumé
					</Link>
					<Link
						className="shell-link shell-links"
						to="/links"
						search={{ kind: "all" }}
						activeProps={{ className: "is-active" }}
					>
						Links <span aria-hidden="true">↗</span>
					</Link>
				</nav>
				<div className="shell-actions">
					<AccentSwitcher
						open={accentOpen}
						onOpenChange={(open) => {
							setAccentOpen(open);
							if (open) setMenuOpen(false);
						}}
					/>
					<button
						ref={menuButtonRef}
						className="shell-menu"
						type="button"
						aria-controls="primary-navigation"
						aria-expanded={menuOpen}
						onClick={() => {
							setMenuOpen((open) => !open);
							setAccentOpen(false);
						}}
					>
						<span>{menuOpen ? "Close" : "Menu"}</span>
						<span className="shell-menu-symbol" aria-hidden="true">
							{menuOpen ? "×" : "＋"}
						</span>
					</button>
				</div>
			</header>
			<div id="main-content" tabIndex={-1}>
				<Outlet />
			</div>
			<footer className="footer">
				<p>© {new Date().getUTCFullYear()} Sohel Islam Imran</p>
				<p>Full-stack product engineering from Dhaka, for teams everywhere.</p>
				<Link className="footer-link" to="/links" search={{ kind: "all" }}>
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
			<body className="font-sans">
				{children}
				<Scripts />
			</body>
		</html>
	);
}

function NotFoundPage() {
	return (
		<main className="page status-page">
			<title>Page not found — Sohel Islam Imran</title>
			<meta name="robots" content="noindex, nofollow" />
			<p className="eyebrow">404 · Route not found</p>
			<h1>That route drifted off the map.</h1>
			<p className="lede">The page may have moved, or the link may be incomplete.</p>
			<Link className="button button-primary" to="/">
				Return home <span aria-hidden="true">↗</span>
			</Link>
		</main>
	);
}

function RootErrorPage() {
	return (
		<main className="page status-page">
			<title>Page interrupted — Sohel Islam Imran</title>
			<meta name="robots" content="noindex, nofollow" />
			<p className="eyebrow">A small interruption</p>
			<h1>The route needs another try.</h1>
			<p className="lede">
				The page could not finish loading. Try it once more; if it keeps happening, return to the
				public site.
			</p>
			<div className="status-actions">
				<button
					type="button"
					className="button button-primary"
					onClick={() => window.location.reload()}
				>
					Try again <span aria-hidden="true">↻</span>
				</button>
				<Link className="button button-quiet" to="/">
					Return home <span aria-hidden="true">↗</span>
				</Link>
			</div>
		</main>
	);
}
