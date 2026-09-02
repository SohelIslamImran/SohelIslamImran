import { createFileRoute, Link } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { dateTimeFromPeriod } from "../lib/content-dates";
import { mediaHref } from "../lib/media";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { PortfolioImage } from "../components/PortfolioImage";
import {
	EmptyState,
	PageHeader,
	PageShell,
	StatusBadge,
	Surface,
	TagList,
} from "../components/ui/portfolio";
import { Button, buttonVariants } from "../components/ui/button";
import { cn } from "../lib/utils";

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
	const proof = content.projects
		.filter((project) => project.repository || project.href)
		.slice(0, 4);

	return (
		<PageShell width="default" data-page="resume" className="max-w-[1160px]">
			<Surface
				data-slot="resume-header"
				className="grid overflow-visible grid-cols-[minmax(0,1fr)_168px] items-center gap-[clamp(30px,6vw,72px)] p-[clamp(28px,4vw,48px)] max-[800px]:grid-cols-1 max-[800px]:gap-6"
			>
				<PageHeader
					eyebrow={`${content.identity.role} · Kuno`}
					title={<span data-slot="resume-title">{content.identity.name}</span>}
					description={content.resume.summary ?? content.about.paragraphs[0]}
					className="mb-0 min-w-0"
				>
					<div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
						<span>{content.identity.location}</span>
						<span>{content.identity.timezone}</span>
						<a
							className="min-w-0 break-words font-bold text-primary-text no-underline"
							href={`mailto:${content.identity.email}`}
						>
							{content.identity.email}
						</a>
						{content.resume.updatedAt ? (
							<time dateTime={content.resume.updatedAt}>Updated {content.resume.updatedAt}</time>
						) : null}
					</div>
					<div data-slot="resume-actions" className="mt-7 flex flex-wrap gap-2.5">
						<Button size="lg" type="button" onClick={() => window.print()}>
							Print / save PDF{" "}
							<span data-icon="inline-end" aria-hidden="true">
								↗
							</span>
						</Button>
						<Link
							className={cn(
								buttonVariants({ variant: "outline", size: "lg" }),
								"border-[color-mix(in_srgb,var(--theme-accent)_14%,var(--theme-line))]",
							)}
							to="/links"
							search={{ kind: "all" }}
						>
							All links <span aria-hidden="true">↗</span>
						</Link>
					</div>
				</PageHeader>
				<div
					data-slot="resume-portrait"
					className="block h-[200px] w-[168px] rotate-2 rounded-[24px] border-[7px] border-surface-solid shadow-float max-[800px]:order-[-1] max-[800px]:size-32 print:order-none print:rotate-0"
				>
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
						className="block size-full rounded-[17px] object-cover object-[center_16%]"
					/>
				</div>
			</Surface>

			<div
				data-slot="resume-layout"
				className="grid grid-cols-[minmax(0,1fr)_minmax(250px,310px)] gap-[clamp(40px,6vw,72px)] pt-16 max-[800px]:grid-cols-1 max-[800px]:gap-14"
			>
				<section className="min-w-0" aria-labelledby="resume-experience-title">
					<PageHeader
						eyebrow="Experience"
						title={
							<span id="resume-experience-title">Product work across teams and platforms.</span>
						}
						level={2}
						className="mb-5"
					/>
					{content.experience.length > 0 ? (
						content.experience.map((item) => (
							<article
								data-slot="resume-entry"
								className="grid grid-cols-[minmax(120px,150px)_minmax(0,1fr)] gap-6 border-t border-border py-7 max-[800px]:grid-cols-1 max-[800px]:gap-2.5"
								key={item.id}
							>
								<time
									className="block max-w-[140px] text-[13px] font-[750] leading-[1.4] text-primary-text max-[800px]:max-w-none"
									dateTime={dateTimeFromPeriod(item.period)}
								>
									{item.period}
								</time>
								<div className="min-w-0">
									<div className="flex flex-wrap items-center gap-2.5 text-[15px] text-foreground">
										<strong>{item.company}</strong>
										{item.current ? <StatusBadge>Current</StatusBadge> : null}
									</div>
									<h3 className="mb-2.5 mt-2 text-[clamp(1.35rem,2.5vw,1.8rem)] font-[760] tracking-[-0.04em]">
										{item.role}
									</h3>
									<p className="m-0 text-[15px] leading-[1.55] text-muted-foreground">
										{item.summary}
									</p>
									{item.highlights.length > 0 ? (
										<ul className="my-4 grid gap-2 pl-[18px] text-[15px] leading-[1.55] text-muted-foreground">
											{item.highlights.map((highlight) => (
												<li key={highlight}>{highlight}</li>
											))}
										</ul>
									) : null}
									<TagList items={item.technologies.slice(0, 6)} />
								</div>
							</article>
						))
					) : (
						<EmptyState
							title="Experience is being updated."
							description="The public résumé will return when there is a verified role to share."
						/>
					)}
				</section>

				<aside
					data-slot="resume-side"
					className="grid min-w-0 content-start gap-10 border-l border-border pl-8 max-[800px]:border-l-0 max-[800px]:border-t max-[800px]:pl-0 max-[800px]:pt-8"
				>
					<section aria-labelledby="resume-capabilities-title">
						<PageHeader
							eyebrow="Core systems"
							title={<span id="resume-capabilities-title">How I contribute.</span>}
							level={2}
							className="mb-5"
						/>
						{content.capabilities.length > 0 ? (
							content.capabilities.map((capability) => (
								<article className="border-t border-border py-5" key={capability.id}>
									<h3 className="mb-1.5 mt-0 text-base font-[760] tracking-[-0.02em]">
										{capability.title}
									</h3>
									<p className="mb-3 mt-0 text-sm leading-[1.55] text-muted-foreground">
										{capability.description}
									</p>
									<TagList items={capability.tools} />
								</article>
							))
						) : (
							<EmptyState
								title="Capabilities are being updated."
								description="The next version of the résumé will include the current systems I work on."
							/>
						)}
					</section>
					<section aria-labelledby="resume-proof-title">
						<PageHeader
							eyebrow="Public proof"
							title={<span id="resume-proof-title">Selected builds.</span>}
							level={2}
							className="mb-5"
						/>
						{proof.length > 0 ? (
							<div className="grid">
								{proof.map((project) => (
									<a
										className="grid gap-1 border-t border-border py-3.5 text-primary-text no-underline focus-visible:outline-2 focus-visible:outline-ring"
										key={project.id}
										href={project.repository ?? project.href}
										target="_blank"
										rel="noreferrer"
									>
										<strong className="text-sm text-foreground">{project.title}</strong>
										<span className="text-xs text-muted-foreground">
											{project.role}
											<span className="sr-only">, opens in a new tab</span>
										</span>
									</a>
								))}
							</div>
						) : (
							<EmptyState
								title="Public proof is being updated."
								description="Selected builds will return when their public links are verified."
							/>
						)}
					</section>
					<div
						className="rounded-[18px] border border-signal/40 bg-signal/10 p-[18px]"
						aria-label="Availability"
					>
						<p className="mb-2 text-xs font-extrabold uppercase tracking-[0.11em] text-signal">
							Next route
						</p>
						<p className="m-0 text-sm leading-[1.55] text-muted-foreground">
							{content.identity.availability}. I am building toward a remote life with room for
							meaningful travel.
						</p>
					</div>
				</aside>
			</div>
		</PageShell>
	);
}
