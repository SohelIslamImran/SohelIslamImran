import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { linksSearchSchema } from "../lib/search";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { LinkIcon, LinksFilter, linkKinds, type LinkKind } from "../components";
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
	const c = Route.useLoaderData();
	const { kind: requestedKind } = Route.useSearch();
	const kind = (requestedKind ?? "all") as LinkKind;
	const links = c.profileLinks.filter((l) => kind === "all" || (l.kind ?? "other") === kind);
	const navigate = useNavigate({ from: "/links" });
	const reducedMotion = useReducedMotion();
	return (
		<main className="page mx-auto min-h-[calc(100svh-150px)] w-[min(1080px,calc(100%-40px))] py-[clamp(58px,9vw,120px)]">
			<header className="page-intro mb-16 max-w-[960px] max-[800px]:mb-12">
				<p className="eyebrow">Link desk</p>
				<h1 className="page-title mb-[22px] mt-0 max-w-[960px] text-[clamp(3rem,5vw,4.8rem)] font-[760] leading-[.98] tracking-[-.06em] [text-wrap:balance]">
					Find Sohel Islam Imran across the web.
				</h1>
				<p className="lede m-0 max-w-[650px] text-[clamp(17px,2vw,21px)] leading-[1.55] text-muted">
					Profiles, open-source work, contact details, and the longer story.
				</p>
			</header>
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
			<motion.section
				id="link-results"
				className="link-list grid gap-2.5"
				aria-label="Public links"
				layout
			>
				<AnimatePresence initial={false} mode="popLayout">
					{links.map((l, index) => (
						<motion.div
							key={l.id}
							layout="position"
							initial={false}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
							transition={{
								duration: reducedMotion ? 0 : 0.22,
								delay: reducedMotion ? 0 : index * 0.025,
								ease: [0.22, 1, 0.36, 1],
							}}
						>
							<Link
								className="link-item grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[17px] rounded-[22px] border border-line bg-[color-mix(in_srgb,var(--theme-surface-solid)_96%,var(--theme-paper))] px-[22px] py-5 text-inherit no-underline transition-[transform,box-shadow,border-color] duration-220 ease-route max-[560px]:gap-3 max-[560px]:px-4 max-[560px]:py-[18px]"
								to="/links/$linkId"
								params={{ linkId: l.id }}
								search={{ kind }}
							>
								<LinkIcon platform={l.platform} />
								<span className="link-copy grid min-w-0 gap-[3px]">
									<span className="link-platform text-xs font-extrabold uppercase tracking-[.1em] text-primary">
										{l.platform}
									</span>
									<strong className="link-label min-w-0 overflow-hidden text-ellipsis text-[17px]">
										{l.label}
									</strong>
									<small className="link-description overflow-hidden text-ellipsis text-muted max-[800px]:whitespace-nowrap">
										{l.description ?? l.handle ?? "Open profile"}
									</small>
								</span>
								<i className="link-arrow text-xl not-italic text-primary" aria-hidden="true">
									↗
								</i>
							</Link>
						</motion.div>
					))}
				</AnimatePresence>
			</motion.section>
		</main>
	);
}
