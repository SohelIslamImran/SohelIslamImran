import { useMemo, type CSSProperties } from "react";
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
import { buildSkillIndex, buildSkillTimeline } from "../components/pages/resume/skill-map";
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
	const timeline = useMemo(
		() => buildSkillTimeline(index, content.experience, projects),
		[index, content.experience, projects],
	);
	const hasSkills = index.groups.length > 0;
	// Sections are numbered in reading order: the skills sit beside (and on
	// narrow screens, right after) the experience they summarise.
	const order = [
		"experience",
		hasSkills ? "skills" : null,
		projects.length ? "projects" : null,
		testimonial ? "reference" : null,
		content.credentials.length ? "courses" : null,
	].filter((item) => item !== null);
	const number = (key: string) => String(order.indexOf(key) + 1).padStart(2, "0");
	const leftCount = order.length - (hasSkills ? 1 : 0);

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
	// Two columns on narrow screens: the status line gets a full row, and so
	// does the first cell when the rest would otherwise leave a hole.
	const glanceOdd = glance.filter((item) => item.label !== "Status").length % 2 === 1;

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
							className="m-0 mt-4 flex list-none flex-wrap items-center gap-x-1 gap-y-0 p-0 text-small print:gap-x-[3.6mm]"
						>
							{[
								email
									? {
											key: "email",
											href: `mailto:${email}`,
											external: false,
											screen: email,
											print: email,
										}
									: null,
								...profiles.map((link) => ({
									key: link.platform,
									href: link.href.trim(),
									external: true,
									screen: link.platform,
									print: shortUrl(link.href),
								})),
							]
								.filter((item) => item !== null)
								.map((item, position, all) => (
									<li key={item.key} className="flex items-center whitespace-nowrap">
										<a
											href={item.href}
											target={item.external ? "_blank" : undefined}
											rel={item.external ? "noopener noreferrer" : undefined}
											className={cn(
												"pressable inline-flex min-h-11 items-center rounded-full px-2 print:min-h-0 print:px-0",
												position === 0 && "-ml-2 print:ml-0",
												item.external
													? "text-ink-soft hover:text-foreground"
													: "font-semibold text-primary-text",
											)}
										>
											<span className="print:hidden">{item.screen}</span>
											<span className="hidden print:inline">{item.print}</span>
											{item.external ? <span className="sr-only">, opens in a new tab</span> : null}
										</a>
										{position < all.length - 1 ? (
											<span
												aria-hidden="true"
												className="pl-1 text-line-strong max-sm:hidden print:hidden"
											>
												·
											</span>
										) : null}
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
						className="m-0 mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-inner border border-line bg-line lg:grid-cols-4"
					>
						{glance.map((item, position) => (
							<div
								key={item.label}
								data-wide={
									item.label === "Status" || (glanceOdd && position === 0) ? "" : undefined
								}
								className="min-w-0 bg-surface-solid p-4 break-words max-lg:data-wide:col-span-2"
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
						hasSkills ? ["#skills", "Skills"] : null,
						projects.length ? ["#projects", "Projects"] : null,
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

				<SkillProvider index={index} timeline={timeline}>
					<div
						data-slot="resume-layout"
						className="mt-10 grid min-w-0 grid-cols-1 content-start gap-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-x-14 xl:grid-cols-[minmax(0,1fr)_324px] xl:gap-x-12"
						style={{ "--rows": Math.max(1, leftCount) } as CSSProperties}
					>
						<ExperienceSection
							experience={content.experience}
							number={number("experience")}
							className="min-w-0 lg:col-start-1"
						/>
						{hasSkills ? (
							<aside
								aria-label="Skills"
								data-slot="resume-side"
								className="grid min-w-0 content-start lg:col-start-2 lg:row-start-1 lg:[grid-row-end:span_var(--rows)]"
							>
								<FitSticky
									aria-labelledby="resume-skills-title"
									id="skills"
									data-slot="resume-skills"
									className="min-w-0 lg:sticky lg:top-[var(--fit-top,calc(var(--dock-space-top)+16px))] lg:data-unpinned:static"
								>
									<SectionTitle id="resume-skills-title" index={number("skills")}>
										Skills by layer
									</SectionTitle>
									<SkillLayers titleId="resume-skills" />
								</FitSticky>
							</aside>
						) : null}
						<ProjectsSection
							projects={projects}
							number={number("projects")}
							className="min-w-0 lg:col-start-1"
						/>
						{testimonial ? (
							<ReferenceSection
								testimonial={testimonial}
								number={number("reference")}
								className="lg:col-start-1"
							/>
						) : null}
						<CoursesSection
							credentials={content.credentials}
							number={number("courses")}
							className="lg:col-start-1"
						/>
					</div>
				</SkillProvider>
			</ResumeDesk>
		</PageShell>
	);
}
