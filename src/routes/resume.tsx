import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { mediaHref } from "../lib/media";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { PortfolioImage } from "../components/PortfolioImage";
import { CopyButton } from "../components/motion/CopyButton";
import { PageShell, StatusDot } from "../components/ui/portfolio";
import { buttonVariants } from "../components/ui/button";
import { cn } from "../lib/utils";
import { buildSkillIndex } from "../components/pages/resume/skill-map";
import { SkillLayers, SkillProvider } from "../components/pages/resume/skills";
import { PrintButton, ResumeDesk } from "../components/pages/resume/desk";
import { FitSticky } from "../components/pages/resume/FitSticky";
import {
	CoursesSection,
	ExperienceSection,
	ProjectsSection,
	ReferenceSection,
	SectionTitle,
} from "../components/pages/resume/sections";

const updatedDateFormatter = new Intl.DateTimeFormat("en-US", {
	day: "numeric",
	month: "long",
	timeZone: "UTC",
	year: "numeric",
});

function formatUpdatedDate(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : updatedDateFormatter.format(date);
}

export const Route = createFileRoute("/resume")({
	loader: getPublishedContent,
	head: ({ loaderData }) => {
		const c = loaderData ?? EMPTY_PORTFOLIO_CONTENT;
		const name = c.identity.name.trim() || "Sohel Islam Imran";
		const role = c.identity.role.trim() || "Product engineer";
		const employer = c.experience.find((item) => item.current)?.company.trim() || undefined;
		return pageHead(
			c,
			`${name} — Résumé`,
			`${role}. Experience, selected projects, and how I work.`,
			"/resume",
			"/images/social-resume.png",
			[
				{
					"@context": "https://schema.org",
					"@type": "ProfilePage",
					name: `${name} résumé`,
					mainEntity: {
						"@type": "Person",
						name,
						jobTitle: role,
						...(employer ? { worksFor: { "@type": "Organization", name: employer } } : {}),
					},
				},
			],
		);
	},
	component: Resume,
});

function shortUrl(href: string) {
	return href
		.trim()
		.replace(/^[a-z]+:\/\//iu, "")
		.replace(/^www\./iu, "")
		.replace(/\/$/u, "");
}

function Resume() {
	const content = Route.useLoaderData();
	const name = content.identity.name.trim() || "Sohel Islam Imran";
	const role = content.identity.role.trim() || "Product engineer";
	const current = content.experience.find((item) => item.current);
	const employer = current?.company.trim() || undefined;
	const projects = useMemo(() => {
		const featured = content.projects.filter((project) => project.featured);
		return featured.length
			? featured
			: content.projects.filter((project) => project.category !== "experiment");
	}, [content.projects]);
	const testimonial = content.testimonials.find((item) => item.quote.trim().length > 0);
	const summary =
		content.resume.summary?.trim() ||
		content.about.paragraphs.find((paragraph) => paragraph.trim()) ||
		"Experience, selected projects, and how I work.";
	const availability = content.identity.availability.trim();
	const updatedAt = content.resume.updatedAt?.trim() || null;
	const email = content.identity.email.trim();
	const location = content.identity.location.trim();
	const timezone = content.about.facts
		.find((fact) => /time\s*zone/iu.test(fact.label))
		?.value.trim();
	const profiles = content.social.filter(
		(link) => /github|linkedin|portfolio/iu.test(link.platform) && link.href.trim(),
	);
	const years = content.experience
		.flatMap((item) => item.period.match(/\b(?:19|20)\d{2}\b/gu) ?? [])
		.map(Number);
	const since = years.length ? Math.min(...years) : null;
	const companies = new Set(content.experience.map((item) => item.company.trim().toLowerCase()))
		.size;
	const index = useMemo(
		() => buildSkillIndex(content.capabilities, content.experience, projects),
		[content.capabilities, content.experience, projects],
	);

	const glance = [
		current ? { label: "Now", value: current.role.trim(), detail: current.company.trim() } : null,
		since
			? {
					label: "Shipping since",
					value: String(since),
					detail: `${content.experience.length} roles · ${companies} ${companies === 1 ? "company" : "companies"}`,
				}
			: null,
		location
			? { label: "Based in", value: location.split(",")[0], detail: timezone ?? location }
			: null,
		availability ? { label: "Status", value: availability, detail: null } : null,
	].filter((item) => item !== null);

	return (
		<PageShell
			width="default"
			data-page="resume"
			className="min-w-0 max-w-[1140px] overflow-x-clip"
		>
			<div
				data-slot="resume-actions"
				className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 md:mb-8"
			>
				<div className="min-w-0">
					<p className="mono-label m-0 text-primary-text">Résumé · A4</p>
					{updatedAt ? (
						<p className="m-0 mt-1 text-caption text-muted-foreground">
							Updated <time dateTime={updatedAt}>{formatUpdatedDate(updatedAt)}</time>
						</p>
					) : null}
				</div>
				<div className="flex flex-wrap items-center gap-2.5 max-sm:w-full max-sm:*:flex-1">
					{email ? (
						<CopyButton
							value={email}
							variant="outline"
							size="lg"
							label="Copy email"
							announcement="Email copied. Talk soon."
						/>
					) : null}
					<Link
						className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "max-sm:hidden")}
						to="/work"
						search={{ group: "all" }}
					>
						View work <span aria-hidden="true">→</span>
					</Link>
					<PrintButton />
				</div>
				<p id="resume-print-note" className="sr-only">
					Opens the print dialog. Choose Save as PDF for a clean, black-on-white A4 copy.
				</p>
			</div>

			<ResumeDesk>
				<header
					data-slot="resume-header"
					className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-6 gap-y-5 max-sm:grid-cols-1"
				>
					<div className="min-w-0 [overflow-wrap:anywhere]">
						<p data-slot="eyebrow" className="mono-label m-0 text-primary-text">
							{employer ? `${role} · ${employer}` : role}
						</p>
						<h1
							data-slot="resume-title"
							className="m-0 mt-3 text-[clamp(2.4rem,5.4vw,4.25rem)] font-[640] leading-[0.98] tracking-[-0.045em]"
						>
							{name}
						</h1>
						<p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed text-ink-soft">{summary}</p>
						<ul
							data-slot="resume-contact"
							className="m-0 mt-4 flex list-none flex-wrap items-center gap-x-1 gap-y-1 p-0 text-small"
						>
							{email ? (
								<li>
									<a
										href={`mailto:${email}`}
										className="pressable inline-flex min-h-11 items-center rounded-full px-2 -ml-2 font-semibold text-primary-text print:ml-0 print:min-h-0 print:px-0"
									>
										{email}
									</a>
								</li>
							) : null}
							{profiles.map((link) => (
								<li key={link.platform} className="flex items-center">
									<span aria-hidden="true" className="px-1 text-line-strong">
										·
									</span>
									<a
										href={link.href.trim()}
										target="_blank"
										rel="noopener noreferrer"
										className="pressable inline-flex min-h-11 items-center rounded-full px-2 text-ink-soft hover:text-foreground print:min-h-0 print:px-0"
									>
										<span className="print:hidden">{link.platform}</span>
										<span className="hidden print:inline">{shortUrl(link.href)}</span>
										<span className="sr-only">, opens in a new tab</span>
									</a>
								</li>
							))}
						</ul>
					</div>
					<div
						data-slot="resume-portrait"
						className="aspect-square w-[148px] overflow-hidden rounded-[22px] border border-line bg-muted max-lg:w-[120px] max-sm:row-start-1 max-sm:w-[84px] max-sm:rounded-[18px]"
					>
						<PortfolioImage
							src={mediaHref(content.identity.avatar) ?? "/images/sohel-linkedin-800.webp"}
							alt={content.identity.avatar?.alt ?? "Portrait of Sohel Islam Imran"}
							width={800}
							height={800}
							loading="eager"
							fetchPriority="high"
							sizes="(max-width: 640px) 84px, 148px"
							srcSet={
								content.identity.avatar
									? undefined
									: "/images/sohel-linkedin-400.webp 400w, /images/sohel-linkedin-800.webp 800w"
							}
							className="block size-full object-cover object-[center_16%]"
						/>
					</div>
				</header>

				{glance.length ? (
					<dl
						data-slot="resume-glance"
						className="m-0 mt-8 grid grid-cols-2 overflow-hidden rounded-inner border border-line lg:grid-cols-4"
					>
						{glance.map((item) => (
							<div
								key={item.label}
								className="min-w-0 border-line p-4 [overflow-wrap:anywhere] max-lg:nth-[n+3]:border-t lg:not-first:border-l max-lg:even:border-l"
							>
								<dt className="mono-label text-muted-foreground">{item.label}</dt>
								<dd className="m-0 mt-1.5 text-[15px] font-semibold leading-snug text-foreground">
									{item.label === "Status" ? (
										<span className="inline-flex items-baseline gap-2">
											<StatusDot className="translate-y-[-1px]" />
											{item.value}
										</span>
									) : (
										item.value
									)}
								</dd>
								{item.detail ? (
									<dd className="m-0 mt-0.5 text-caption text-muted-foreground">{item.detail}</dd>
								) : null}
							</div>
						))}
					</dl>
				) : null}

				<nav
					aria-label="Résumé sections"
					className="mt-5 flex flex-wrap gap-2 lg:hidden print:hidden"
				>
					{[
						["#experience", "Experience"],
						projects.length ? ["#projects", "Projects"] : null,
						content.capabilities.length ? ["#skills", "Skills"] : null,
					]
						.filter((item) => item !== null)
						.map(([href, label]) => (
							<a
								key={href}
								href={href}
								className="pressable inline-flex min-h-11 items-center rounded-full border border-line px-4 text-small font-medium text-ink-soft"
							>
								{label}
							</a>
						))}
				</nav>

				<SkillProvider index={index}>
					<div
						data-slot="resume-layout"
						className="mt-10 grid min-w-0 grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14"
					>
						<div data-slot="resume-main" className="grid min-w-0 content-start gap-12">
							<ExperienceSection experience={content.experience} />
							<ProjectsSection projects={projects} />
							{testimonial ? <ReferenceSection testimonial={testimonial} /> : null}
							<CoursesSection credentials={content.credentials} />
						</div>
						<aside
							aria-label="Skills"
							data-slot="resume-side"
							className="grid min-w-0 content-start"
						>
							{index.groups.length ? (
								<FitSticky
									aria-labelledby="resume-skills-title"
									id="skills"
									data-slot="resume-skills"
									className="min-w-0 lg:sticky lg:top-[var(--fit-top,calc(var(--dock-space-top)+16px))]"
								>
									<SectionTitle id="resume-skills-title" index="04">
										Skills by layer
									</SectionTitle>
									<SkillLayers titleId="resume-skills" />
								</FitSticky>
							) : null}
						</aside>
					</div>
				</SkillProvider>
			</ResumeDesk>
		</PageShell>
	);
}
