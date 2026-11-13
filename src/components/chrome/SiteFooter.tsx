import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { CopyButton } from "../motion/CopyButton";
import { useLocalTime } from "../motion/LocalTime";
import { TraceLine } from "../motion/TraceLine";
import { Kbd, MonoLabel, StatusDot } from "../ui/portfolio";
import { buttonVariants } from "../ui/button";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "./CommandPalette";
import { ArrowRightIcon } from "./icons";
import { useRoutePublicContent } from "./public-content";
import { TraceStack } from "./StatusScene";

const footerLinkClassName =
	"inline-flex min-h-11 items-center text-[15px] text-ink-soft no-underline transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:min-h-9";

/** The layers the site's hero names, front to back. UI copy, not facts. */
const END_LAYERS = [
	{ label: "Interface" },
	{ label: "API" },
	{ label: "Data" },
	{ label: "Access" },
	{ label: "Cloud" },
	{ label: "Release", note: "end of trace", tone: "accent" as const },
];

const SOURCE_HREF = "https://github.com/SohelIslamImran/SohelIslamImran";

function isExternal(href: string) {
	return /^https?:\/\//iu.test(href);
}

/**
 * Closing scene on every page: "end of trace". The request that started at the
 * interface arrives at the last layer; the stack spreads apart when you hover or
 * focus the contact block. Then the site map, an oversized wordmark with an
 * outline layer behind it, and a meta row with live local time.
 */
export function SiteFooter() {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const compact = pathname === "/" || pathname === "/story";
	const content = useRoutePublicContent();
	const palette = useCommandPalette();
	const [spread, setSpread] = useState(false);
	const name = content?.identity.name.trim() || "Sohel Islam Imran";
	const email = (content?.identity.email || content?.contact.email || "").trim();
	const availability = content?.identity.availability.trim() ?? "";
	const timeZone = content?.identity.timezone.trim() || "Asia/Dhaka";
	const city = (content?.identity.location.trim() || "Dhaka").split(",")[0]?.trim() || "Dhaka";
	const clock = useLocalTime(timeZone);
	const elsewhere = (content?.contact.links ?? [])
		.map((link) => ({ label: link.label.trim(), href: link.href.trim() }))
		.filter((link) => link.label && link.href && !link.href.startsWith("#"));

	return (
		<footer
			data-slot="site-footer"
			className="relative mt-section-sm min-w-0 overflow-x-clip pb-[calc(var(--dock-space-bottom)+28px)] md:pb-10"
		>
			<div className="shell">
				<TraceLine orientation="horizontal" duration={5.5} restAt={0.18} className="w-full" />
				{!compact && (
					<div
						className="grid min-w-0 items-center gap-x-10 gap-y-6 pt-[clamp(40px,6vw,80px)] md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]"
						onPointerEnter={(event) => {
							if (event.pointerType === "mouse") setSpread(true);
						}}
						onPointerLeave={() => setSpread(false)}
						onFocus={() => setSpread(true)}
						onBlur={(event) => {
							if (!event.currentTarget.contains(event.relatedTarget as Node | null))
								setSpread(false);
						}}
					>
						<div className="min-w-0">
							<MonoLabel tone="muted" className="flex items-center gap-2.5">
								<StatusDot />
								<span>{availability || "Contact"}</span>
							</MonoLabel>
							<h2 className="mt-5 mb-0 max-w-[16ch] text-title text-balance">
								Let’s talk about what comes next.
							</h2>
							<p className="mt-4 mb-0 max-w-[44ch] text-lead text-muted-foreground">
								Send me an email, or pick any profile on the links page.
							</p>
							<div className="mt-8 flex min-w-0 flex-wrap items-center gap-3">
								{email ? (
									<CopyButton
										value={email}
										label={email}
										copiedLabel="Email copied. Talk soon."
										variant="ink"
										announcement="Email copied. Talk soon."
										className="max-w-full"
									/>
								) : null}
								{elsewhere.map((link) =>
									isExternal(link.href) ? (
										<a
											key={link.href}
											href={link.href}
											target="_blank"
											rel="noreferrer"
											className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
										>
											{link.label}
											<span aria-hidden="true">↗</span>
											<span className="sr-only">, opens in a new tab</span>
										</a>
									) : null,
								)}
							</div>
						</div>
						<div className="relative min-w-0 max-md:-mx-4 max-md:-mb-4">
							<TraceStack
								layers={END_LAYERS}
								open={spread}
								className="trace-stack--footer h-[300px] w-full md:h-[380px]"
							/>
							<p
								aria-hidden="true"
								className="mono-label m-0 -mt-3 text-center text-muted-foreground md:-mt-6"
							>
								6 layers · trace complete
							</p>
						</div>
					</div>
				)}
				<nav
					aria-label="Footer"
					className="mt-[clamp(48px,7vw,88px)] grid min-w-0 grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3"
				>
					<div className="min-w-0">
						<MonoLabel className="mb-3 block">Site</MonoLabel>
						<ul className="m-0 grid list-none p-0">
							<li>
								<Link to="/" className={footerLinkClassName}>
									Home
								</Link>
							</li>
							<li>
								<Link to="/work" search={{ group: "all" }} className={footerLinkClassName}>
									Work
								</Link>
							</li>
							<li>
								<Link to="/story" className={footerLinkClassName}>
									Story
								</Link>
							</li>
							<li>
								<Link to="/resume" className={footerLinkClassName}>
									Résumé
								</Link>
							</li>
						</ul>
					</div>
					<div className="min-w-0">
						<MonoLabel className="mb-3 block">More</MonoLabel>
						<ul className="m-0 grid list-none p-0">
							<li>
								<Link to="/links" search={{ kind: "all" }} className={footerLinkClassName}>
									Links
								</Link>
							</li>
							<li>
								<Link to="/field-notes" className={footerLinkClassName}>
									Field notes
								</Link>
							</li>
							<li>
								<a href="/rss.xml" className={footerLinkClassName}>
									RSS
								</a>
							</li>
							<li>
								<a
									href={SOURCE_HREF}
									target="_blank"
									rel="noreferrer"
									className={footerLinkClassName}
								>
									Source <span aria-hidden="true">&nbsp;↗</span>
									<span className="sr-only">, opens in a new tab</span>
								</a>
							</li>
						</ul>
					</div>
					<div className="min-w-0 max-sm:col-span-2">
						<MonoLabel className="mb-3 block">Local time in {city}</MonoLabel>
						<p className="m-0 flex min-h-11 items-baseline gap-2 md:min-h-9">
							<time
								dateTime={clock.iso ?? undefined}
								className="text-[28px] leading-none font-[600] tracking-[-0.03em] text-foreground tabular-nums"
							>
								{clock.time ?? "--:--"}
							</time>
							<span className="font-mono text-[12px] text-muted-foreground">
								{clock.offset ?? ""}
							</span>
						</p>
						{palette ? (
							<button
								type="button"
								onClick={() => palette.open()}
								className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full border-0 bg-transparent px-0 text-[14px] text-ink-soft outline-hidden hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:min-h-9"
							>
								<span>Search, or type</span>
								<Kbd>&gt;</Kbd>
								<span>for a terminal</span>
								<ArrowRightIcon className="size-4" />
							</button>
						) : null}
					</div>
				</nav>
				<p
					aria-hidden="true"
					data-slot="footer-wordmark"
					className="pointer-events-none relative m-0 mt-[clamp(56px,9vw,120px)] [container-type:inline-size] select-none"
				>
					<span className="footer-wordmark__back absolute inset-0 block text-[clamp(2rem,12.8cqi,14rem)] leading-[0.9] font-[640] tracking-[-0.055em] whitespace-nowrap">
						{name}
					</span>
					<span className="footer-wordmark__front relative block bg-[linear-gradient(180deg,var(--theme-ink)_10%,var(--theme-paper)_92%)] bg-clip-text text-[clamp(2rem,12.8cqi,14rem)] leading-[0.9] font-[640] tracking-[-0.055em] whitespace-nowrap text-transparent">
						{name}
					</span>
				</p>
				<div className="mt-8 flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line pt-6 text-[13px] text-muted-foreground">
					<p className="m-0" suppressHydrationWarning>
						© {new Date().getUTCFullYear()} {name}
					</p>
					<p className="m-0">Built with TanStack Start. Served by Cloudflare Workers.</p>
				</div>
			</div>
		</footer>
	);
}
