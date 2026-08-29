import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { dateTimeFromPeriod } from "../lib/content-dates";
import { mediaHref } from "../lib/media";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { Button, PortfolioImage } from "../components";

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
		<main className="resume mx-auto w-[min(1120px,calc(100%-40px))] py-[clamp(58px,8vw,110px)] max-[800px]:w-[calc(100%-40px)]">
			<motion.header
				className="resume-header glass grid grid-cols-[minmax(0,1fr)_168px] items-center gap-[clamp(30px,6vw,72px)] rounded-[32px] border border-[color-mix(in_srgb,var(--theme-line)_72%,transparent)] bg-[radial-gradient(circle_at_88%_18%,var(--theme-blue-soft),transparent_260px),var(--theme-surface)] p-[clamp(28px,4vw,48px)] max-[800px]:grid-cols-1 max-[800px]:gap-6"
				whileHover={reducedMotion ? undefined : { y: -3 }}
				transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
			>
				<div className="resume-header-copy">
					<p className="eyebrow">{content.identity.role} · Kuno</p>
					<h1 className="resume-title mb-4 mt-0 max-w-[780px] text-[clamp(3.2rem,6.4vw,5.8rem)] font-[760] leading-[.96] tracking-[-.065em] [text-wrap:balance]">
						{content.identity.name}
					</h1>
					<p className="resume-summary m-0 max-w-[670px] text-[19px] leading-[1.55] text-muted">
						{content.resume.summary ?? content.about.paragraphs[0]}
					</p>
					<div className="resume-meta mt-[22px] flex flex-wrap gap-x-[18px] gap-y-2 text-[13px] text-muted">
						<span>{content.identity.location}</span>
						<span>{content.identity.timezone}</span>
						<a
							className="resume-meta-link font-bold text-primary no-underline"
							href={`mailto:${content.identity.email}`}
						>
							{content.identity.email}
						</a>
					</div>
					<div className="resume-actions mt-7 flex flex-wrap gap-[9px]">
						<Button
							className="button button-primary resume-action min-h-[42px] px-4 text-[13px]"
							size="lg"
							type="button"
							onClick={() => window.print()}
						>
							Print / save PDF <span aria-hidden="true">↗</span>
						</Button>
						<Link
							className="button button-quiet resume-action inline-flex min-h-[42px] items-center gap-3 rounded-full border border-line bg-surface-solid px-4 text-[13px] font-bold text-ink no-underline"
							to="/links"
							search={{ kind: "all" }}
						>
							All links <span aria-hidden="true">↗</span>
						</Link>
					</div>
				</div>
				<PortfolioImage
					src={mediaHref(content.identity.avatar) ?? "/images/sohel-linkedin-800.webp"}
					alt={content.identity.avatar?.alt ?? "Portrait of Sohel Islam Imran"}
					width={800}
					height={800}
					loading="eager"
					fetchPriority="high"
					sizes="(max-width: 800px) 128px, 180px"
					srcSet={
						content.identity.avatar
							? undefined
							: "/images/sohel-linkedin-400.webp 400w, /images/sohel-linkedin-800.webp 800w"
					}
					className="resume-portrait block h-[200px] w-[168px] rotate-2 rounded-[28px] border-[7px] border-[color-mix(in_srgb,var(--theme-surface-solid)_86%,transparent)] object-cover object-[center_16%] shadow-[0_24px_50px_var(--theme-shadow)] max-[800px]:order-[-1] max-[800px]:size-32"
				/>
			</motion.header>

			<div className="resume-layout grid grid-cols-[minmax(0,1fr)_minmax(250px,310px)] gap-[clamp(40px,6vw,72px)] pt-16 max-[800px]:grid-cols-1 max-[800px]:gap-[54px]">
				<section className="resume-main min-w-0" aria-labelledby="resume-experience-title">
					<div className="resume-section-heading mb-[22px] max-w-[680px]">
						<p className="eyebrow">Experience</p>
						<h2
							className="resume-section-title mb-5 mt-0 text-[clamp(25px,3vw,38px)] font-[760] leading-none tracking-[-.055em]"
							id="resume-experience-title"
						>
							Product work across teams and platforms.
						</h2>
					</div>
					{publicExperience.map((item) => (
						<motion.article
							className="resume-entry grid grid-cols-[minmax(120px,150px)_minmax(0,1fr)] gap-[22px] border-t border-line py-7 [break-inside:avoid] max-[800px]:grid-cols-1 max-[800px]:gap-2"
							key={item.id}
							whileHover={reducedMotion ? undefined : { x: 3 }}
							whileTap={reducedMotion ? undefined : { scale: 0.998 }}
							transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
						>
							<time
								className="resume-entry-date block max-w-[140px] text-[13px] font-[750] leading-[1.4] text-primary max-[800px]:max-w-none"
								dateTime={dateTimeFromPeriod(item.period)}
							>
								{item.period}
							</time>
							<div className="resume-entry-body min-w-0">
								<div className="resume-entry-company flex flex-wrap items-center gap-[9px] text-[15px] text-ink">
									<strong>{item.company}</strong>
									{item.current && <span className="current">Current</span>}
								</div>
								<h3 className="resume-entry-title mb-2.5 mt-2 text-[clamp(21px,2.5vw,29px)] font-[760] tracking-[-.04em]">
									{item.role}
								</h3>
								<p className="resume-entry-copy m-0 text-[15px] leading-[1.55] text-muted">
									{item.summary}
								</p>
								<ul className="resume-entry-list my-[14px] mb-4 pl-[18px] text-[15px] leading-[1.55] text-muted">
									{item.highlights.map((highlight) => (
										<li key={highlight}>{highlight}</li>
									))}
								</ul>
								<div className="tags flex flex-wrap gap-1.5">
									{item.technologies.slice(0, 6).map((technology) => (
										<span
											className="tag rounded-full border border-line px-[9px] py-[5px] text-xs text-muted"
											key={technology}
										>
											{technology}
										</span>
									))}
								</div>
							</div>
						</motion.article>
					))}
				</section>

				<aside className="resume-side grid min-w-0 content-start gap-[42px] border-l border-line pl-[34px] max-[800px]:border-l-0 max-[800px]:border-t max-[800px]:pl-0 max-[800px]:pt-[34px]">
					<section aria-labelledby="resume-capabilities-title">
						<p className="eyebrow">Core systems</p>
						<h2
							className="resume-section-title mb-5 mt-0 text-[clamp(25px,3vw,38px)] font-[760] leading-none tracking-[-.055em]"
							id="resume-capabilities-title"
						>
							How I contribute.
						</h2>
						<div className="resume-capability-list grid">
							{content.capabilities.map((capability) => (
								<motion.article
									className="resume-capability border-t border-line py-[18px] [break-inside:avoid]"
									key={capability.id}
									whileHover={reducedMotion ? undefined : { x: 3 }}
									transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
								>
									<h3 className="resume-capability-title mb-1.5 mt-0 text-base font-[760] tracking-[-.02em]">
										{capability.title}
									</h3>
									<p className="resume-capability-copy mb-3 mt-0 text-sm leading-[1.55] text-muted">
										{capability.description}
									</p>
									<div className="tags flex flex-wrap gap-1.5">
										{capability.tools.map((tool) => (
											<span
												className="tag rounded-full border border-line px-[9px] py-[5px] text-xs text-muted"
												key={tool}
											>
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
						<h2
							className="resume-section-title mb-5 mt-0 text-[clamp(25px,3vw,38px)] font-[760] leading-none tracking-[-.055em]"
							id="resume-proof-title"
						>
							Selected builds.
						</h2>
						<div className="resume-proof grid gap-[9px]">
							{proof.map((project) => (
								<a
									className="resume-proof-link grid gap-[3px] border-t border-line py-[13px] text-primary no-underline transition-transform duration-180 ease-route hover:translate-x-1"
									key={project.id}
									href={project.repository ?? project.href}
									target="_blank"
									rel="noreferrer"
								>
									<strong className="resume-proof-title text-sm text-ink">{project.title}</strong>
									<span className="resume-proof-meta text-xs text-muted">{project.role}</span>
								</a>
							))}
						</div>
					</section>
					<section
						className="resume-note rounded-[18px] border border-[#ff765750] bg-[#fff8f5] p-[18px]"
						aria-label="Availability"
					>
						<p className="eyebrow">Next route</p>
						<p className="resume-note-copy m-0 text-sm leading-[1.55] text-muted">
							{content.identity.availability}. I am building toward a remote life with room for
							meaningful travel.
						</p>
					</section>
				</aside>
			</div>
		</main>
	);
}
