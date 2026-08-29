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
	const links = c.profileLinks.filter((l) => kind === "all" || l.kind === kind);
	const navigate = useNavigate({ from: "/links" });
	const reducedMotion = useReducedMotion();
	return (
		<main className="page">
			<header className="page-intro">
				<p className="eyebrow">Link desk</p>
				<h1 className="page-title">Find Sohel Islam Imran across the web.</h1>
				<p className="lede">Profiles, open-source work, contact details, and the longer story.</p>
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
			<motion.section id="link-results" className="link-list" aria-label="Public links" layout>
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
								className="link-item"
								to="/links/$linkId"
								params={{ linkId: l.id }}
								search={{ kind }}
							>
								<LinkIcon platform={l.platform} />
								<span className="link-copy">
									<span className="link-platform">{l.platform}</span>
									<strong className="link-label">{l.label}</strong>
									<small className="link-description">
										{l.description ?? l.handle ?? "Open profile"}
									</small>
								</span>
								<i className="link-arrow" aria-hidden="true">
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
