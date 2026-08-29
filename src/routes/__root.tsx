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
import { cn } from "../lib/utils";
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
			<a
				className="skip-link fixed left-3 top-2.5 z-[100] -translate-y-[180%] rounded-full bg-ink px-3.5 py-2.5 text-[13px] font-[750] text-white no-underline transition-transform duration-180 ease-route focus:translate-y-0"
				href="#main-content"
			>
				Skip to content
			</a>
			<header className="shell sticky top-0 z-20 mx-auto flex w-[min(1240px,calc(100%-40px))] items-center justify-between gap-6 rounded-b-[22px] border border-[color-mix(in_srgb,var(--theme-surface-solid)_78%,transparent)] bg-[color-mix(in_srgb,var(--theme-paper)_74%,transparent)] px-[18px] py-4 shadow-[0_12px_38px_#284b890b,inset_0_1px_color-mix(in_srgb,var(--theme-surface-solid)_80%,transparent)] backdrop-blur-[22px] backdrop-saturate-[150%] max-[800px]:w-[calc(100%-24px)] max-[800px]:px-[14px] max-[800px]:py-3">
				<Link
					className="shell-brand inline-flex items-center gap-2.5 text-sm font-[780] tracking-[-0.02em] text-inherit no-underline"
					to="/"
					aria-label="Sohel Islam Imran home"
				>
					<span
						className="shell-mark grid size-[30px] place-items-center rounded-[10px] bg-ink text-[10px] tracking-[0.04em] text-white max-[800px]:size-8"
						aria-hidden="true"
					>
						SI
					</span>
					<span>Sohel Islam Imran</span>
				</Link>
				<nav
					ref={navigationRef}
					id="primary-navigation"
					className={cn(
						"shell-nav ml-auto flex items-center gap-1 transition-[max-height,padding,border-color,opacity,transform,visibility] duration-220 ease-route max-[800px]:absolute max-[800px]:left-0 max-[800px]:right-0 max-[800px]:top-[calc(100%+8px)] max-[800px]:ml-0 max-[800px]:grid max-[800px]:max-h-0 max-[800px]:origin-top max-[800px]:gap-1 max-[800px]:overflow-hidden max-[800px]:rounded-[18px] max-[800px]:border max-[800px]:border-transparent max-[800px]:bg-[color-mix(in_srgb,var(--theme-surface-solid)_96%,transparent)] max-[800px]:px-2 max-[800px]:py-0 max-[800px]:opacity-0 max-[800px]:shadow-[0_22px_60px_var(--theme-shadow)] max-[800px]:backdrop-blur-[26px] max-[800px]:backdrop-saturate-[160%]",
						menuOpen &&
							"max-[800px]:pointer-events-auto max-[800px]:max-h-[360px] max-[800px]:border-[color-mix(in_srgb,var(--theme-surface-solid)_88%,transparent)] max-[800px]:py-2 max-[800px]:opacity-100 max-[800px]:translate-y-0",
						!menuOpen && "max-[800px]:pointer-events-none max-[800px]:-translate-y-1.5",
					)}
					data-open={menuOpen || undefined}
					aria-label="Primary navigation"
				>
					<Link
						className="shell-link rounded-full px-3 py-[9px] text-[13px] text-muted no-underline transition-[color,background-color,transform,box-shadow] duration-180 ease-route hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-primary max-[800px]:px-[13px] max-[800px]:py-3 max-[800px]:text-sm"
						to="/work"
						search={{ focus: "identity" }}
						activeProps={{ className: "is-active" }}
					>
						Work
					</Link>
					<Link
						className="shell-link rounded-full px-3 py-[9px] text-[13px] text-muted no-underline transition-[color,background-color,transform,box-shadow] duration-180 ease-route hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-primary max-[800px]:px-[13px] max-[800px]:py-3 max-[800px]:text-sm"
						to="/story"
						activeProps={{ className: "is-active" }}
					>
						Story
					</Link>
					<Link
						className="shell-link rounded-full px-3 py-[9px] text-[13px] text-muted no-underline transition-[color,background-color,transform,box-shadow] duration-180 ease-route hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-primary max-[800px]:px-[13px] max-[800px]:py-3 max-[800px]:text-sm"
						to="/field-notes"
						activeProps={{ className: "is-active" }}
					>
						Field notes
					</Link>
					<Link
						className="shell-link rounded-full px-3 py-[9px] text-[13px] text-muted no-underline transition-[color,background-color,transform,box-shadow] duration-180 ease-route hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-primary max-[800px]:px-[13px] max-[800px]:py-3 max-[800px]:text-sm"
						to="/resume"
						activeProps={{ className: "is-active" }}
					>
						Résumé
					</Link>
					<Link
						className="shell-link shell-links rounded-full px-3 py-[9px] text-[13px] text-primary no-underline transition-[color,background-color,transform,box-shadow] duration-180 ease-route hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-primary max-[800px]:px-[13px] max-[800px]:py-3 max-[800px]:text-sm"
						to="/links"
						search={{ kind: "all" }}
						activeProps={{ className: "is-active" }}
					>
						Links <span aria-hidden="true">↗</span>
					</Link>
				</nav>
				<div className="shell-actions flex items-center gap-2">
					<AccentSwitcher
						open={accentOpen}
						onOpenChange={(open) => {
							setAccentOpen(open);
							if (open) setMenuOpen(false);
						}}
					/>
					<button
						ref={menuButtonRef}
						className="shell-menu hidden min-h-9 items-center gap-[9px] rounded-full border border-line bg-[color-mix(in_srgb,var(--theme-surface-solid)_92%,transparent)] px-[13px] text-xs font-[750] text-ink shadow-[0_5px_16px_var(--theme-shadow)] backdrop-blur-[18px] transition-transform duration-180 ease-route hover:-translate-y-px active:scale-[.97] max-[800px]:inline-flex"
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
			<footer className="footer mx-auto grid w-[min(1180px,calc(100%-40px))] grid-cols-[1fr_1.4fr_auto] gap-5 border-t border-line py-10 pb-[54px] text-[13px] text-muted max-[800px]:grid-cols-1 max-[800px]:gap-2.5">
				<p>© {new Date().getUTCFullYear()} Sohel Islam Imran</p>
				<p>Full-stack product engineering from Dhaka, for teams everywhere.</p>
				<Link
					className="footer-link font-bold text-primary no-underline"
					to="/links"
					search={{ kind: "all" }}
				>
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
		<main className="page status-page mx-auto grid min-h-[calc(100svh-170px)] w-[min(1080px,calc(100%-40px))] content-center justify-items-start py-[clamp(58px,9vw,120px)]">
			<title>Page not found — Sohel Islam Imran</title>
			<meta name="robots" content="noindex, nofollow" />
			<p className="eyebrow">404 · Route not found</p>
			<h1 className="mb-[22px] mt-2.5 max-w-[880px] text-[clamp(3rem,6vw,5.5rem)] font-[760] leading-[.97] tracking-[-.06em]">
				That route drifted off the map.
			</h1>
			<p className="lede m-0 max-w-[650px] text-[clamp(17px,2vw,21px)] leading-[1.55] text-muted">
				The page may have moved, or the link may be incomplete.
			</p>
			<Link
				className="button button-primary mt-[30px] inline-flex min-h-12 items-center gap-[15px] rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground no-underline shadow-[0_10px_24px_var(--theme-accent-glow)] transition-[transform,background-color,box-shadow] duration-180 ease-route hover:-translate-y-0.5"
				to="/"
			>
				Return home <span aria-hidden="true">↗</span>
			</Link>
		</main>
	);
}

function RootErrorPage() {
	return (
		<main className="page status-page mx-auto grid min-h-[calc(100svh-170px)] w-[min(1080px,calc(100%-40px))] content-center justify-items-start py-[clamp(58px,9vw,120px)]">
			<title>Page interrupted — Sohel Islam Imran</title>
			<meta name="robots" content="noindex, nofollow" />
			<p className="eyebrow">A small interruption</p>
			<h1 className="mb-[22px] mt-2.5 max-w-[880px] text-[clamp(3rem,6vw,5.5rem)] font-[760] leading-[.97] tracking-[-.06em]">
				The route needs another try.
			</h1>
			<p className="lede m-0 max-w-[650px] text-[clamp(17px,2vw,21px)] leading-[1.55] text-muted">
				The page could not finish loading. Try it once more; if it keeps happening, return to the
				public site.
			</p>
			<div className="status-actions mt-[30px] flex flex-wrap gap-2.5">
				<button
					type="button"
					className="button button-primary inline-flex min-h-12 items-center gap-[15px] rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground no-underline shadow-[0_10px_24px_var(--theme-accent-glow)] transition-[transform,background-color,box-shadow] duration-180 ease-route hover:-translate-y-0.5"
					onClick={() => window.location.reload()}
				>
					Try again <span aria-hidden="true">↻</span>
				</button>
				<Link
					className="button button-quiet inline-flex min-h-12 items-center gap-[15px] rounded-full border border-line bg-surface-solid px-5 text-sm font-bold text-ink no-underline transition-[transform,background-color,box-shadow] duration-180 ease-route hover:-translate-y-0.5"
					to="/"
				>
					Return home <span aria-hidden="true">↗</span>
				</Link>
			</div>
		</main>
	);
}
