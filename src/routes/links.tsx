import { useLayoutEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { LinkIcon } from "../components/LinkIcon";
import { LinksFilter, linkKinds, type LinkKind } from "../components/LinksFilter";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { linksSearchSchema } from "../lib/search";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { ButtonLink, EmptyState, PageHeader, PageShell } from "../components/ui/portfolio";

export const Route = createFileRoute("/links")({
	validateSearch: linksSearchSchema,
	loader: getPublishedContent,
	head: ({ loaderData }) => {
		const c = loaderData ?? EMPTY_PORTFOLIO_CONTENT;
		return pageHead(
			c,
			`${c.identity.name} — Links`,
			"Every public link for Sohel Islam Imran.",
			"/links",
			"/images/social-links.png",
		);
	},
	component: Links,
});

function Links() {
	const content = Route.useLoaderData();
	const { kind: requestedKind } = Route.useSearch();
	const kind = (requestedKind ?? "all") as LinkKind;
	const links = content.profileLinks.filter(
		(link) => kind === "all" || (link.kind ?? "other") === kind,
	);
	const navigate = useNavigate({ from: "/links" });
	const listRef = useRef<HTMLDivElement>(null);
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
		<PageShell className="max-w-[1144px]">
			<PageHeader
				eyebrow="Link desk"
				title="Find Sohel Islam Imran across the web."
				description="Profiles, open-source work, contact details, and the longer story."
			/>
			<LinksFilter
				value={kind}
				onChange={(next) => {
					if (!linkKinds.includes(next)) return;
					void navigate({ search: { kind: next }, replace: true, resetScroll: false });
				}}
			/>
			<p className="sr-only" aria-live="polite">
				Showing {links.length} {kind === "all" ? "links" : `${kind} links`}.
			</p>
			<section aria-label="Public links" id="link-results">
				{links.length > 0 ? (
					<LayoutGroup id="links-results">
						<motion.div
							className="overflow-visible"
							animate={{ height: listHeight ?? "auto" }}
							transition={{ height: { type: "spring", stiffness: 420, damping: 36, mass: 0.8 } }}
						>
							<div ref={listRef} className="grid gap-2.5">
								<AnimatePresence mode="popLayout">
									{links.map((link, index) => (
										<motion.div
											key={link.id}
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
										>
											<Link
												className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[17px] rounded-[22px] border border-border/60 bg-[color-mix(in_srgb,var(--theme-surface-solid)_96%,var(--theme-paper))] px-[22px] py-5 text-inherit no-underline transition-[transform,translate,scale,rotate,box-shadow,border-color,background-color] duration-220 ease-route will-change-transform hover:-translate-y-[3px] hover:border-primary/20 hover:shadow-[0_22px_45px_var(--theme-accent-shadow)] focus-visible:outline-2 focus-visible:outline-ring max-[560px]:gap-3 max-[560px]:px-4 max-[560px]:py-[18px]"
												to="/links/$linkId"
												params={{ linkId: link.id }}
												search={{ kind }}
											>
												<LinkIcon platform={link.platform} />
												<span className="grid min-w-0 gap-1">
													<span className="text-xs font-extrabold uppercase tracking-[0.1em] text-primary-text">
														{link.platform}
													</span>
													<strong className="min-w-0 truncate text-[17px]">{link.label}</strong>
													<span className="truncate text-sm text-muted-foreground">
														{link.description ?? link.handle ?? "Open profile"}
													</span>
												</span>
												<span
													className="text-xl text-primary-text transition-transform duration-200 ease-route group-hover:translate-x-[3px] group-hover:-translate-y-[3px]"
													aria-hidden="true"
												>
													↗
												</span>
											</Link>
										</motion.div>
									))}
								</AnimatePresence>
							</div>
						</motion.div>
					</LayoutGroup>
				) : (
					<EmptyState
						title={`No ${kind} links yet.`}
						description="This category is ready for another public link when there is one worth adding."
					>
						<ButtonLink href="/links?kind=all" size="lg">
							Show all links
						</ButtonLink>
					</EmptyState>
				)}
			</section>
		</PageShell>
	);
}
