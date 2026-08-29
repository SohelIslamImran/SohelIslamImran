import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { dateTimeFromPeriod } from "../lib/content-dates";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
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
	const reducedMotion = useReducedMotion();
	const publicExperience = content.experience;
	const proof = content.projects
		.filter((project) => project.repository || project.href)
		.slice(0, 4);

	return (
		<main className="resume">
			<motion.header
				className="resume-header glass"
				whileHover={reducedMotion ? undefined : { y: -3 }}
				transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
			>
				<div className="resume-header-copy">
					<p className="eyebrow">{content.identity.role} · Kuno</p>
					<h1 className="resume-title">{content.identity.name}</h1>
					<p className="resume-summary">{content.resume.summary ?? content.about.paragraphs[0]}</p>
					<div className="resume-meta">
						<span>{content.identity.location}</span>
						<span>{content.identity.timezone}</span>
						<a className="resume-meta-link" href={`mailto:${content.identity.email}`}>
							{content.identity.email}
						</a>
					</div>
					<div className="resume-actions">
						<button
							className="button button-primary resume-action"
							type="button"
							onClick={() => window.print()}
						>
							Print / save PDF <span aria-hidden="true">↗</span>
						</button>
						<Link
							className="button button-quiet resume-action"
							to="/links"
							search={{ kind: "all" }}
						>
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
					fetchPriority="high"
					sizes="(max-width: 800px) 128px, 180px"
					srcSet="/images/sohel-linkedin-400.webp 400w, /images/sohel-linkedin-800.webp 800w"
					className="resume-portrait"
				/>
			</motion.header>

			<div className="resume-layout">
				<section className="resume-main" aria-labelledby="resume-experience-title">
					<div className="resume-section-heading">
						<p className="eyebrow">Experience</p>
						<h2 className="resume-section-title" id="resume-experience-title">
							Product work across teams and platforms.
						</h2>
					</div>
					{publicExperience.map((item) => (
						<motion.article
							className="resume-entry"
							key={item.id}
							whileHover={reducedMotion ? undefined : { x: 3 }}
							whileTap={reducedMotion ? undefined : { scale: 0.998 }}
							transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
						>
							<time className="resume-entry-date" dateTime={dateTimeFromPeriod(item.period)}>
								{item.period}
							</time>
							<div className="resume-entry-body">
								<div className="resume-entry-company">
									<strong>{item.company}</strong>
									{item.current && <span className="current">Current</span>}
								</div>
								<h3 className="resume-entry-title">{item.role}</h3>
								<p className="resume-entry-copy">{item.summary}</p>
								<ul className="resume-entry-list">
									{item.highlights.map((highlight) => (
										<li key={highlight}>{highlight}</li>
									))}
								</ul>
								<div className="tags">
									{item.technologies.slice(0, 6).map((technology) => (
										<span className="tag" key={technology}>
											{technology}
										</span>
									))}
								</div>
							</div>
						</motion.article>
					))}
				</section>

				<aside className="resume-side">
					<section aria-labelledby="resume-capabilities-title">
						<p className="eyebrow">Core systems</p>
						<h2 className="resume-section-title" id="resume-capabilities-title">
							How I contribute.
						</h2>
						<div className="resume-capability-list">
							{content.capabilities.map((capability) => (
								<motion.article
									className="resume-capability"
									key={capability.id}
									whileHover={reducedMotion ? undefined : { x: 3 }}
									transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
								>
									<h3 className="resume-capability-title">{capability.title}</h3>
									<p className="resume-capability-copy">{capability.description}</p>
									<div className="tags">
										{capability.tools.map((tool) => (
											<span className="tag" key={tool}>
												{tool}
											</span>
										))}
									</div>
								</motion.article>
							))}
						</div>
					</section>
					<section aria-labelledby="resume-proof-title">
						<p className="eyebrow">Public proof</p>
						<h2 className="resume-section-title" id="resume-proof-title">
							Selected builds.
						</h2>
						<div className="resume-proof">
							{proof.map((project) => (
								<a
									className="resume-proof-link"
									key={project.id}
									href={project.repository ?? project.href}
									target="_blank"
									rel="noreferrer"
								>
									<strong className="resume-proof-title">{project.title}</strong>
									<span className="resume-proof-meta">{project.role}</span>
								</a>
							))}
						</div>
					</section>
					<section className="resume-note" aria-label="Availability">
						<p className="eyebrow">Next route</p>
						<p className="resume-note-copy">
							{content.identity.availability}. I am building toward a remote life with room for
							meaningful travel.
						</p>
					</section>
				</aside>
			</div>
		</main>
	);
}
