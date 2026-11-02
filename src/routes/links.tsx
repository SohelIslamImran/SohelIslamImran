import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useIsPresent } from "motion/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LinkIcon } from "../components/LinkIcon";
import { LinksFilter, linkKindLabels, linkKinds, type LinkKind } from "../components/LinksFilter";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { linksSearchSchema } from "../lib/search";
import { EMPTY_PORTFOLIO_CONTENT, type ProfileLinkContent } from "../types/content";
import { EmptyState, PageHeader, PageShell } from "../components/ui/portfolio";
import { buttonVariants } from "../components/ui/button";
import { cn } from "../lib/utils";

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

const destinationDetails = {
	web: { arrow: "↗", label: "External destination, opens in a new tab" },
	internal: { arrow: "→", label: "Internal destination" },
	hash: { arrow: "↓", label: "Page section" },
	mailto: { arrow: "@", label: "Email destination" },
	tel: { arrow: "☎", label: "Phone destination" },
} as const;

type DestinationKind = keyof typeof destinationDetails;

function classifyDestination(href: string): DestinationKind {
	const value = href.trim();
	if (/^(?:https?:)?\/\//iu.test(value)) return "web";
	if (value.startsWith("#")) return "hash";

	const protocol = value.match(/^([a-z][a-z\d+.-]*):/iu)?.[1].toLowerCase();
	if (protocol === "mailto") return "mailto";
	if (protocol === "tel") return "tel";
	if (protocol) return "web";
	return "internal";
}

function LinkListItem({
	link,
	kind,
	index,
}: {
	link: ProfileLinkContent;
	kind: LinkKind;
	index: number;
}) {
	const isPresent = useIsPresent();
	const destinationKind = classifyDestination(link.href);
	const destination = destinationDetails[destinationKind];
	const platform = link.platform.trim() || "Link";
	const label = link.label.trim() || "Untitled link";
	const description = link.description?.trim() || link.handle?.trim() || "Open profile";
	const opensNewTab = destinationKind === "web";

	return (
		<motion.li
			className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)]"
			layout="position"
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -8 }}
			transition={{
				layout: { type: "spring", stiffness: 420, damping: 36, mass: 0.8 },
				opacity: { duration: 0.22, delay: Math.min(index * 0.025, 0.12) },
				y: {
					type: "spring",
					stiffness: 420,
					damping: 36,
					mass: 0.8,
					delay: Math.min(index * 0.025, 0.12),
				},
			}}
			inert={!isPresent}
			aria-hidden={!isPresent || undefined}
		>
			<article className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)]">
				<Link
					data-slot="link-item"
					aria-labelledby={`${link.id}-platform ${link.id}-name`}
					aria-describedby={`${link.id}-description`}
					className="group grid min-w-0 max-w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[17px] rounded-[22px] border border-border/60 bg-[color-mix(in_srgb,var(--theme-surface-solid)_96%,var(--theme-paper))] px-[22px] py-5 text-inherit no-underline transition-[transform,translate,scale,rotate,box-shadow,border-color,background-color] duration-200 ease-route hover:border-primary/20 hover:shadow-[0_22px_45px_var(--theme-accent-shadow)] focus-visible:translate-y-0 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none motion-safe:pointer-fine:hover:-translate-y-[3px] max-[800px]:grid-cols-[minmax(0,1fr)] max-[800px]:items-start max-[800px]:gap-3 max-[800px]:px-4 max-[800px]:py-[18px]"
					to="/links/$linkId"
					params={{ linkId: link.id }}
					search={{ kind }}
					target={opensNewTab ? "_blank" : undefined}
					rel={opensNewTab ? "noopener noreferrer" : undefined}
					tabIndex={isPresent ? undefined : -1}
				>
					<LinkIcon className="max-[800px]:row-start-1" platform={platform} />
					<span className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-1 max-[800px]:col-start-1 max-[800px]:row-start-2">
						<span
							className="break-words text-xs font-extrabold uppercase tracking-[0.1em] text-primary-text [overflow-wrap:anywhere]"
							id={`${link.id}-platform`}
						>
							{platform}
						</span>
						<h3
							className="m-0 min-w-0 text-[17px] font-bold leading-snug text-pretty [overflow-wrap:anywhere]"
							id={`${link.id}-name`}
						>
							{label}
						</h3>
						<span
							className="break-words text-sm leading-relaxed text-pretty text-muted-foreground [overflow-wrap:anywhere]"
							id={`${link.id}-description`}
						>
							{description}
						</span>
					</span>
					<span className="min-w-0 text-xl text-primary-text transition-transform duration-200 ease-route group-focus-visible:translate-x-0 group-focus-visible:translate-y-0 motion-reduce:transition-none motion-safe:pointer-fine:group-hover:translate-x-[3px] motion-safe:pointer-fine:group-hover:-translate-y-[3px] max-[800px]:col-start-1 max-[800px]:row-start-3 max-[800px]:mt-1 max-[800px]:justify-self-start">
						<span aria-hidden="true">{destination.arrow}</span>
						{opensNewTab ? <span className="sr-only">, opens in a new tab</span> : null}
					</span>
				</Link>
			</article>
		</motion.li>
	);
}

function Links() {
	const content = Route.useLoaderData();
	const { kind: requestedKind } = Route.useSearch();
	const kind = (requestedKind ?? "all") as LinkKind;
	const links = content.profileLinks.filter(
		(link) => kind === "all" || (link.kind ?? "other") === kind,
	);
	const navigate = useNavigate({ from: "/links" });
	const listRef = useRef<HTMLUListElement>(null);
	const [listHeight, setListHeight] = useState<number | null>(null);
	const filterLabel = linkKindLabels[kind];
	const resultNoun =
		kind === "all"
			? links.length === 1
				? "curated link"
				: "curated links"
			: `${filterLabel.toLowerCase()} ${links.length === 1 ? "link" : "links"}`;

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
		<PageShell className="min-w-0 max-w-full max-w-[1144px]">
			<PageHeader
				eyebrow="Links"
				title="A curated set of destinations."
				description="Profiles, published packages, contact details, and the longer story — everything I am reachable at, in one place."
			/>
			<LinksFilter
				value={kind}
				onChange={(next) => {
					if (!linkKinds.includes(next)) return;
					void navigate({ search: { kind: next }, replace: true, resetScroll: false });
				}}
			/>
			<section
				aria-labelledby="link-results-title"
				id="link-results"
				className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)]"
			>
				<div className="mb-4 flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
					<h2
						id="link-results-title"
						className="m-0 min-w-0 break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]"
					>
						Curated links
					</h2>
					<p
						className="m-0 min-w-0 break-words text-sm text-muted-foreground [font-variant-numeric:tabular-nums] [overflow-wrap:anywhere]"
						role="status"
						aria-atomic="true"
					>
						Showing {links.length} {resultNoun}
					</p>
				</div>
				{links.length > 0 ? (
					<LayoutGroup id="links-results">
						<motion.div
							className="overflow-visible"
							animate={{ height: listHeight ?? "auto" }}
							transition={{
								height: { type: "spring", stiffness: 420, damping: 36, mass: 0.8 },
							}}
						>
							<ul
								ref={listRef}
								className="m-0 grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] list-none gap-2.5 p-0"
							>
								<AnimatePresence mode="popLayout">
									{links.map((link, index) => (
										<LinkListItem key={link.id} link={link} kind={kind} index={index} />
									))}
								</AnimatePresence>
							</ul>
						</motion.div>
					</LayoutGroup>
				) : (
					<EmptyState
						title={
							kind === "all"
								? "No curated links yet."
								: `No curated ${filterLabel.toLowerCase()} links yet.`
						}
						description={
							kind === "all"
								? "There are no curated links to browse right now. Return home for the rest of the portfolio."
								: `There are no curated ${filterLabel.toLowerCase()} links in this view yet. Show all links to browse the full curated list.`
						}
					>
						{kind === "all" ? (
							<Link
								className={cn(
									buttonVariants({ size: "lg" }),
									"min-w-0 max-w-full whitespace-normal text-left [overflow-wrap:anywhere]",
								)}
								to="/"
							>
								Return home <span aria-hidden="true">→</span>
							</Link>
						) : (
							<Link
								className={cn(
									buttonVariants({ size: "lg" }),
									"min-w-0 max-w-full whitespace-normal text-left [overflow-wrap:anywhere]",
								)}
								to="/links"
								search={{ kind: "all" }}
							>
								Show all curated links <span aria-hidden="true">→</span>
							</Link>
						)}
					</EmptyState>
				)}
			</section>
		</PageShell>
	);
}
