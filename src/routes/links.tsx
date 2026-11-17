import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import { AnimatePresence, LayoutGroup, motion, useIsPresent } from "motion/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { usePrefersReducedMotion } from "../components/motion/hooks";
import { CopyButton } from "../components/motion/CopyButton";
import { LinkIcon } from "../components/LinkIcon";
import { LinksFilter, linkKindLabels, linkKinds, type LinkKind } from "../components/LinksFilter";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { linksSearchSchema } from "../lib/search";
import { EMPTY_PORTFOLIO_CONTENT, type ProfileLinkContent } from "../types/content";
import { EmptyState, PageShell } from "../components/ui/portfolio";
import { buttonVariants } from "../components/ui/button";
import { cn } from "../lib/utils";
import { ProfileCard } from "../components/pages/links/ProfileCard";
import { FeaturedTiles } from "../components/pages/links/FeaturedTiles";
import {
	classifyDestination,
	copyValue,
	destinationArrows,
	displayValue,
	linkTitles,
} from "../components/pages/links/link-utils";

export const Route = createFileRoute("/links")({
	validateSearch: linksSearchSchema,
	loader: getPublishedContent,
	head: ({ loaderData }) => {
		const c = loaderData ?? EMPTY_PORTFOLIO_CONTENT;
		const name = c.identity.name.trim() || "Sohel Islam Imran";
		return pageHead(
			c,
			`${name} — Links`,
			"A curated set of public destinations for Sohel Islam Imran.",
			"/links",
			"/images/social-links.png",
		);
	},
	component: Links,
});

const spring = { type: "spring", stiffness: 420, damping: 36, mass: 0.8 } as const;

function LinkListItem({
	ref,
	link,
	kind,
	index,
	siteUrl,
	onCopied,
}: {
	ref?: Ref<HTMLLIElement>;
	link: ProfileLinkContent;
	kind: LinkKind;
	index: number;
	siteUrl?: string;
	onCopied: (value: string) => void;
}) {
	const isPresent = useIsPresent();
	const reducedMotion = usePrefersReducedMotion();
	const destination = classifyDestination(link.href);
	const opensNewTab = destination === "web";
	const { platform, title, detail } = linkTitles(link);
	const description = link.description?.trim();
	const value = copyValue(link, siteUrl);
	const isAddress = destination === "mailto" || destination === "tel";
	const delay = Math.min(index * 0.025, 0.12);

	return (
		<motion.li
			ref={ref}
			className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)]"
			layout="position"
			initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
			transition={{
				layout: spring,
				opacity: { duration: 0.22, delay },
				y: { ...spring, delay },
			}}
			inert={!isPresent}
			aria-hidden={!isPresent || undefined}
		>
			<article data-slot="link-row" className="group">
				<LinkIcon platform={platform} />
				<div className="min-w-0">
					<h3 className="m-0 flex min-w-0 items-baseline gap-2 text-[16px] font-semibold leading-snug tracking-[-0.01em]">
						<Link
							data-slot="link-item"
							to="/links/$linkId"
							params={{ linkId: link.id }}
							search={{ kind }}
							target={opensNewTab ? "_blank" : undefined}
							rel={opensNewTab ? "noopener noreferrer" : undefined}
							tabIndex={isPresent ? undefined : -1}
							aria-describedby={description ? `${link.id}-description` : undefined}
							className="min-w-0 truncate rounded-[inherit] after:absolute after:inset-0 after:z-[1] after:rounded-[inherit] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
						>
							{title}
							{opensNewTab ? <span className="sr-only">, opens in a new tab</span> : null}
						</Link>
						{detail ? (
							<span className="hidden min-w-0 truncate font-mono text-[11.5px] font-normal text-muted-foreground sm:inline">
								{detail}
							</span>
						) : null}
					</h3>
					{detail ? (
						<p className="m-0 truncate font-mono text-[11.5px] text-muted-foreground sm:hidden">
							{detail}
						</p>
					) : null}
					{description ? (
						<p
							id={`${link.id}-description`}
							className="m-0 mt-0.5 line-clamp-2 text-caption leading-snug text-muted-foreground sm:line-clamp-1"
						>
							{description}
						</p>
					) : null}
				</div>
				<div className="relative z-[2] flex items-center gap-0.5">
					{value ? (
						<CopyButton
							value={value}
							label={null}
							aria-label={`Copy ${platform} ${isAddress ? "address" : "link"}`}
							announcement={`${platform} ${isAddress ? "address" : "link"} copied.`}
							variant="ghost"
							size="icon"
							onCopied={() => onCopied(value)}
							className="text-muted-foreground hover:text-foreground"
						/>
					) : null}
					<span
						aria-hidden="true"
						data-row-arrow=""
						className="grid w-6 place-items-center text-lg text-primary-text"
					>
						{destinationArrows[destination]}
					</span>
				</div>
			</article>
		</motion.li>
	);
}

/** One small, calm confirmation for every copy on the page (screen readers hear the button's own announcement). */
function CopyToast({ toast }: { toast: { id: number; text: string } | null }) {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--dock-space-bottom)+14px)] z-(--z-toast) flex justify-center px-4 md:bottom-7"
		>
			<AnimatePresence>
				{toast ? (
					<motion.div
						key={toast.id}
						initial={{ opacity: 0, y: 12, scale: 0.96 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 6, scale: 0.98 }}
						transition={{ type: "spring", stiffness: 520, damping: 34 }}
						className="glass flex max-w-full items-center gap-2.5 rounded-full border border-glass-border py-2.5 pr-4 pl-3 text-small text-foreground"
					>
						<span className="grid size-5 shrink-0 place-items-center rounded-full bg-success text-[11px] text-white">
							✓
						</span>
						<span className="shrink-0 font-medium">Copied</span>
						<span className="min-w-0 truncate font-mono text-[12px] text-muted-foreground">
							{displayValue(toast.text)}
						</span>
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}

function Links() {
	const content = Route.useLoaderData();
	const reducedMotion = usePrefersReducedMotion();
	const { kind: requestedKind } = Route.useSearch();
	const kind = (requestedKind ?? "all") as LinkKind;
	const navigate = useNavigate({ from: "/links" });
	const siteUrl = content.site.url?.trim() || undefined;
	const allLinks = content.profileLinks.filter((link) => link.href.trim());
	const featured = allLinks.filter((link) => link.featured);
	const counts = Object.fromEntries(
		linkKinds.map((item) => [
			item,
			allLinks.filter((link) => item === "all" || (link.kind ?? "other") === item).length,
		]),
	) as Record<LinkKind, number>;
	// "All" lists what the tiles above do not; a category shows everything in it.
	const links = allLinks.filter((link) =>
		kind === "all" ? !link.featured : (link.kind ?? "other") === kind,
	);
	const filterLabel = linkKindLabels[kind];
	const listTitle =
		kind === "all" ? (featured.length ? "Everywhere else" : "All links") : filterLabel;
	const status =
		kind === "all"
			? featured.length
				? `${links.length} more ${links.length === 1 ? "link" : "links"} · ${featured.length} above`
				: `${links.length} ${links.length === 1 ? "link" : "links"}`
			: `${links.length} ${filterLabel.toLowerCase()} ${links.length === 1 ? "link" : "links"}`;

	const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
	const toastTimer = useRef<number | undefined>(undefined);
	useEffect(() => () => window.clearTimeout(toastTimer.current), []);
	const onCopied = useCallback((text: string) => {
		window.clearTimeout(toastTimer.current);
		setToast({ id: Date.now(), text });
		toastTimer.current = window.setTimeout(() => setToast(null), 2000);
	}, []);

	const listRef = useRef<HTMLUListElement>(null);
	const [listHeight, setListHeight] = useState<number | null>(null);
	useLayoutEffect(() => {
		const list = listRef.current;
		if (!list) return;
		const updateHeight = () => {
			const nextHeight = list.getBoundingClientRect().height;
			setListHeight((currentHeight) => (currentHeight === nextHeight ? currentHeight : nextHeight));
		};
		updateHeight();
		const observer = new ResizeObserver(updateHeight);
		observer.observe(list);
		return () => observer.disconnect();
	}, [kind]);

	return (
		<PageShell data-page="links" className="min-w-0 max-w-[1120px] overflow-x-clip">
			<div className="grid min-w-0 items-start gap-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-14">
				<div className="min-w-0 lg:sticky lg:top-[calc(var(--dock-space-top)+20px)]">
					<ProfileCard content={content} onCopied={onCopied} />
				</div>
				<div className="grid min-w-0 gap-9">
					<FeaturedTiles links={featured} kind={kind} />
					<section
						aria-labelledby="link-results-title"
						id="link-results"
						className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)]"
					>
						<div data-slot="links-filter-bar">
							<LinksFilter
								counts={counts}
								value={kind}
								onChange={(next) => {
									if (!linkKinds.includes(next)) return;
									void navigate({ search: { kind: next }, replace: true, resetScroll: false });
								}}
							/>
						</div>
						<div className="mt-5 mb-3 flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
							<h2 id="link-results-title" className="mono-label m-0 text-muted-foreground">
								{listTitle}
							</h2>
							<p
								className="m-0 text-caption text-muted-foreground tabular-nums"
								role="status"
								aria-atomic="true"
							>
								{status}
							</p>
						</div>

						<LayoutGroup id="links-results">
							<motion.div
								className="overflow-visible"
								animate={{ height: reducedMotion ? "auto" : (listHeight ?? "auto") }}
								transition={{ height: spring }}
							>
								<ul
									ref={listRef}
									className="m-0 grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] list-none gap-2 p-0"
								>
									<AnimatePresence initial={false} mode="popLayout">
										{links.map((link, index) => (
											<LinkListItem
												key={link.id}
												link={link}
												kind={kind}
												index={index}
												siteUrl={siteUrl}
												onCopied={onCopied}
											/>
										))}
										{links.length === 0 ? (
											<motion.li
												key="empty"
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
											>
												<EmptyState
													title={
														kind === "all"
															? featured.length
																? "Those are all the links."
																: "No curated links yet."
															: `No curated ${filterLabel.toLowerCase()} links yet.`
													}
													description={
														kind === "all"
															? "Return home for the rest of the portfolio."
															: "Show all links to browse the full list."
													}
												>
													<Link
														className={cn(
															buttonVariants({ variant: "outline", size: "lg" }),
															"min-w-0 max-w-full whitespace-normal text-left [overflow-wrap:anywhere]",
														)}
														to={kind === "all" ? "/" : "/links"}
														search={kind === "all" ? undefined : { kind: "all" }}
														resetScroll={false}
													>
														{kind === "all" ? "Return home" : "Show all links"}{" "}
														<span aria-hidden="true">→</span>
													</Link>
												</EmptyState>
											</motion.li>
										) : null}
									</AnimatePresence>
								</ul>
							</motion.div>
						</LayoutGroup>
					</section>
				</div>
			</div>
			<CopyToast toast={toast} />
		</PageShell>
	);
}
