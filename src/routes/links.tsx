import { Link, createFileRoute } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { linksSearchSchema } from "../lib/search";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { LinkIcon } from "../components";
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
	const kind = requestedKind ?? "all";
	const links = c.profileLinks.filter((l) => kind === "all" || l.kind === kind);
	return (
		<main className="prism-page links-page">
			<header className="page-intro">
				<p className="eyebrow">Link desk</p>
				<h1>Find Sohel Islam Imran across the web.</h1>
				<p className="lede">Profiles, open-source work, contact details, and the longer story.</p>
			</header>
			<nav className="segmented" aria-label="Link categories">
				{(["all", "social", "contact", "work", "story", "other"] as const).map((value) => (
					<Link
						key={value}
						to="/links"
						search={{ kind: value }}
						aria-current={kind === value ? "page" : undefined}
					>
						{value}
					</Link>
				))}
			</nav>
			<section className="link-list">
				{links.map((l) => (
					<Link
						key={l.id}
						className="link-list__item"
						to="/links/$linkId"
						params={{ linkId: l.id }}
						search={{ kind }}
					>
						<LinkIcon platform={l.platform} />
						<span className="link-list__copy">
							<span>{l.platform}</span>
							<strong>{l.label}</strong>
							<small>{l.description ?? l.handle ?? "Open profile"}</small>
						</span>
						<i className="link-list__arrow" aria-hidden="true">
							↗
						</i>
					</Link>
				))}
			</section>
		</main>
	);
}
