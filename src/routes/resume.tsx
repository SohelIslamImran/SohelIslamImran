import { createFileRoute, Link } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { EMPTY_PORTFOLIO_CONTENT } from "../../app/types/content";
import { PrismImage } from "../components";

export const Route = createFileRoute("/resume")({
	loader: getPublishedContent,
	head: ({ loaderData }) => {
		const c = loaderData ?? EMPTY_PORTFOLIO_CONTENT;
		return pageHead(
			c,
			`${c.identity.name} — Résumé`,
			`${c.identity.role} at Kuno. Experience, projects, and capabilities.`,
			"/resume",
			"/images/social-resume.png",
			[
				{
					"@context": "https://schema.org",
					"@type": "ProfilePage",
					name: `${c.identity.name} résumé`,
					mainEntity: {
						"@type": "Person",
						name: c.identity.name,
						jobTitle: c.identity.role,
						worksFor: { "@type": "Organization", name: "Kuno" },
					},
				},
			],
		);
	},
	component: Resume,
});

function Resume() {
	const content = Route.useLoaderData();
	const publicExperience = content.experience;
	const proof = content.projects
		.filter((project) => project.repository || project.href)
		.slice(0, 4);

	return (
		<main className="resume-page">
			<header className="resume-header">
				<div className="resume-header__copy">
					<p className="eyebrow">{content.identity.role} · Kuno</p>
					<h1>{content.identity.name}</h1>
					<p className="resume-header__summary">
						{content.resume.summary ?? content.about.paragraphs[0]}
					</p>
					<div className="resume-header__meta">
						<span>{content.identity.location}</span>
						<span>{content.identity.timezone}</span>
						<a href={`mailto:${content.identity.email}`}>{content.identity.email}</a>
					</div>
					<div className="resume-header__actions">
						<button
							className="prism-button prism-button--primary"
							type="button"
							onClick={() => window.print()}
						>
							Print / save PDF <span aria-hidden="true">↗</span>
						</button>
						<Link className="prism-button prism-button--quiet" to="/links" search={{ kind: "all" }}>
							All links <span aria-hidden="true">↗</span>
						</Link>
					</div>
				</div>
				<PrismImage
					src="/images/sohel-linkedin-800.webp"
					alt="Portrait of Sohel Islam Imran"
					width={800}
					height={800}
					loading="eager"
					className="resume-header__portrait"
				/>
			</header>

			<div className="resume-layout">
				<section className="resume-main" aria-labelledby="resume-experience-title">
					<div className="resume-section-heading">
						<p className="eyebrow">Experience</p>
						<h2 id="resume-experience-title">A Kuno-first career timeline.</h2>
					</div>
					{publicExperience.map((item) => (
						<article className="resume-entry" key={item.id}>
							<time dateTime={item.period}>{item.period}</time>
							<div className="resume-entry__body">
								<div className="resume-entry__company">
									<strong>{item.company}</strong>
									{item.current && <span className="prism-current">Current</span>}
								</div>
								<h3>{item.role}</h3>
								<p>{item.summary}</p>
								<ul>
									{item.highlights.map((highlight) => (
										<li key={highlight}>{highlight}</li>
									))}
								</ul>
								<div className="prism-tags">
									{item.technologies.slice(0, 6).map((technology) => (
										<span key={technology}>{technology}</span>
									))}
								</div>
							</div>
						</article>
					))}
				</section>

				<aside className="resume-side">
					<section aria-labelledby="resume-capabilities-title">
						<p className="eyebrow">Capabilities</p>
						<h2 id="resume-capabilities-title">How I contribute.</h2>
						{content.capabilities.map((capability) => (
							<article className="resume-capability" key={capability.id}>
								<h3>{capability.title}</h3>
								<p>{capability.description}</p>
								<div className="prism-tags">
									{capability.tools.map((tool) => (
										<span key={tool}>{tool}</span>
									))}
								</div>
							</article>
						))}
					</section>
					<section aria-labelledby="resume-proof-title">
						<p className="eyebrow">Public proof</p>
						<h2 id="resume-proof-title">Selected builds.</h2>
						<div className="resume-proof-list">
							{proof.map((project) => (
								<a
									key={project.id}
									href={project.repository ?? project.href}
									target="_blank"
									rel="noreferrer"
								>
									<strong>{project.title}</strong>
									<span>{project.role}</span>
								</a>
							))}
						</div>
					</section>
					<section className="resume-side__note" aria-label="Availability">
						<p className="eyebrow">Next route</p>
						<p>
							{content.identity.availability}. I am building toward a remote life with room for
							meaningful travel.
						</p>
					</section>
				</aside>
			</div>
		</main>
	);
}
