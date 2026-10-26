import type { ProjectContent } from "../types/content";
import { cn } from "../lib/utils";
import { mediaHref } from "../lib/media";
import { CardContent, CardFooter, CardHeader } from "./ui/card";
import { PortfolioImage } from "./PortfolioImage";
import { StatusBadge, Surface, TagList } from "./ui/portfolio";

function isInternalHref(href: string) {
	return !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href);
}

function isWebHref(href: string) {
	return /^(?:https?:)?\/\//i.test(href);
}

function OpenLink({ project, className }: { project: ProjectContent; className?: string }) {
	const href = project.repository ?? project.href;
	if (!href) return null;
	const external = !isInternalHref(href);
	const opensNewTab = isWebHref(href);
	const label = project.repository
		? "Read the source"
		: opensNewTab
			? "Visit the site"
			: external
				? "Open link"
				: "View project";
	const destination = external ? "external destination" : "internal destination";
	return (
		<a
			aria-label={`${label} for ${project.title}, ${destination}${opensNewTab ? ", opens in a new tab" : ""}`}
			className={cn(
				"inline-flex min-h-11 max-w-full min-w-0 items-center gap-2 text-left text-sm font-bold text-primary-text no-underline transition-colors duration-150 ease-route hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transition-none",
				className,
			)}
			href={href}
			target={opensNewTab ? "_blank" : undefined}
			rel={opensNewTab ? "noopener noreferrer" : undefined}
		>
			<span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
			<span aria-hidden="true">{external ? "↗" : "→"}</span>
		</a>
	);
}

const categoryLabels = {
	product: "Product work",
	"open-source": "Open source",
	experiment: "Experiment",
} as const;

const cautionaryStatusPattern =
	/\b(?:archived|deprecated|discontinued|draft|experimental|inactive|prototype|unmaintained|unstable)\b/i;

function ProjectStatus({ status, className }: { status: string; className?: string }) {
	return (
		<StatusBadge
			className={cn(
				"h-auto min-h-5 min-w-0 max-w-full whitespace-normal [overflow-wrap:anywhere]",
				cautionaryStatusPattern.test(status)
					? "bg-signal/15 text-signal"
					: "bg-muted text-foreground",
				className,
			)}
		>
			{status}
		</StatusBadge>
	);
}

function ProjectMeta({
	project,
	showYear = true,
	className,
}: {
	project: ProjectContent;
	showYear?: boolean;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs font-semibold text-muted-foreground",
				className,
			)}
		>
			<span className="inline-flex min-w-0 flex-wrap items-center gap-2 [overflow-wrap:anywhere]">
				<span>{categoryLabels[project.category]}</span>
				{showYear ? (
					<>
						<span aria-hidden="true">·</span>
						<span className="[font-variant-numeric:tabular-nums]">{project.year}</span>
					</>
				) : null}
			</span>
			{project.status ? <ProjectStatus status={project.status} /> : null}
		</div>
	);
}

function ProjectMetrics({ project }: { project: ProjectContent }) {
	if (!project.metrics?.length) return null;
	return (
		<dl className="grid min-w-0 grid-cols-[repeat(3,minmax(0,1fr))] gap-3 rounded-[16px] border border-border/70 bg-background/55 px-4 py-3 max-[400px]:grid-cols-[minmax(0,1fr)] max-[400px]:gap-1.5">
			{project.metrics.map((metric) => (
				<div
					className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-0.5 max-[400px]:flex max-[400px]:items-baseline max-[400px]:gap-2"
					key={metric.label}
				>
					<dt className="order-2 min-w-0 break-words text-[11px] leading-[1.3] text-muted-foreground [overflow-wrap:anywhere]">
						{metric.label}
					</dt>
					<dd className="m-0 order-1 min-w-0 break-words text-lg font-[760] leading-none tracking-[-0.04em] text-foreground [font-variant-numeric:tabular-nums] [overflow-wrap:anywhere]">
						{metric.value}
					</dd>
				</div>
			))}
		</dl>
	);
}

function ProjectCaseStudy({
	project,
	showIntro = false,
}: {
	project: ProjectContent;
	showIntro?: boolean;
}) {
	const description = project.description.trim();
	const highlights = project.highlights.filter((highlight) => highlight.trim().length > 0);
	const hasDetails = showIntro
		? highlights.length > 0
		: Boolean(description) || highlights.length > 0;
	if (!hasDetails) return null;
	const caseStudyLabel = showIntro
		? `See engineering notes for ${project.title}`
		: `Read case study for ${project.title}`;

	return (
		<details className="group/case-study grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] border-t border-border/80 pt-3">
			<summary
				aria-label={caseStudyLabel}
				className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-[750] text-primary-text transition-colors duration-150 marker:hidden hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transition-none"
			>
				<span className="min-w-0 break-words [overflow-wrap:anywhere]">{caseStudyLabel}</span>
				<span
					className="grid size-7 shrink-0 place-items-center rounded-full border border-border text-base leading-none transition-transform duration-150 ease-route group-open/case-study:rotate-45 motion-reduce:transition-none"
					aria-hidden="true"
				>
					+
				</span>
			</summary>
			<div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 pb-1 pt-2 text-sm leading-[1.6] text-muted-foreground">
				{!showIntro && description ? (
					<p className="m-0 min-w-0 break-words [overflow-wrap:anywhere]">{description}</p>
				) : null}
				{highlights.length > 0 ? (
					<div className="min-w-0">
						<p className="mb-2 mt-0 text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
							Contribution notes
						</p>
						<ul className="m-0 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1.5 pl-4">
							{highlights.map((highlight) => (
								<li key={highlight} className="min-w-0 break-words [overflow-wrap:anywhere]">
									{highlight}
								</li>
							))}
						</ul>
					</div>
				) : null}
			</div>
		</details>
	);
}

export function ProjectCard({
	project,
	variant = "compact",
	className,
}: {
	project: ProjectContent;
	variant?: "featured" | "compact";
	className?: string;
}) {
	const featured = variant === "featured";

	return (
		<article
			data-slot="project-card"
			className={cn("grid h-full w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)]", className)}
		>
			<Surface className="h-full w-full min-w-0 max-w-full gap-0 p-0 transition-none">
				<CardHeader
					className={cn(
						"min-w-0 gap-3 p-6 pb-0 max-[560px]:p-5 max-[560px]:pb-0",
						featured && "md:p-8 md:pb-0",
					)}
				>
					{project.cover ? (
						<div className="mb-1 min-w-0 overflow-hidden rounded-[18px] border border-border/70">
							<PortfolioImage
								src={mediaHref(project.cover)}
								alt={project.cover.alt || `${project.title} cover`}
								width={project.cover.width ?? 1200}
								height={project.cover.height ?? 675}
								className="aspect-[16/9] w-full object-cover"
							/>
						</div>
					) : null}
					<ProjectMeta project={project} />
					<h3
						className={cn(
							"m-0 min-w-0 break-words text-balance [overflow-wrap:anywhere] font-[760] tracking-[-0.045em]",
							featured
								? "text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.02]"
								: "text-[1.4rem] leading-[1.1]",
						)}
					>
						{project.title}
					</h3>
					<p
						className={cn(
							"m-0 min-w-0 break-words text-pretty leading-[1.55] text-muted-foreground [overflow-wrap:anywhere]",
							featured ? "max-w-[54ch] text-[1.05rem]" : "text-[15px]",
						)}
					>
						{project.summary}
					</p>
				</CardHeader>
				<CardContent
					className={cn(
						"grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 p-6 max-[560px]:p-5",
						featured && "md:gap-5 md:p-8",
					)}
				>
					{featured ? <ProjectMetrics project={project} /> : null}
					{featured && project.description ? (
						<p className="m-0 min-w-0 max-w-[58ch] break-words text-pretty text-[15px] leading-[1.6] text-muted-foreground [overflow-wrap:anywhere]">
							{project.description}
						</p>
					) : null}
					<ProjectCaseStudy project={project} showIntro={featured} />
					<TagList
						items={project.tags}
						className="min-w-0 max-w-full [&>*]:min-w-0 [&>*]:max-w-full [&>*]:whitespace-normal [&>*]:[overflow-wrap:anywhere]"
					/>
				</CardContent>
				<CardFooter
					className={cn(
						"mt-auto min-w-0 max-w-full flex-wrap items-end justify-between gap-x-4 gap-y-1 border-0 bg-transparent px-6 pb-6 pt-0 max-[560px]:px-5 max-[560px]:pb-5",
						featured && "md:px-8 md:pb-8",
					)}
				>
					<span className="min-w-0 max-w-full break-words text-sm font-medium text-muted-foreground [overflow-wrap:anywhere]">
						{project.role}
					</span>
					<OpenLink project={project} />
				</CardFooter>
			</Surface>
		</article>
	);
}

export function ProjectRow({ project }: { project: ProjectContent }) {
	return (
		<article className="grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1 border-b border-border py-5 max-[800px]:grid-cols-1">
			<div className="min-w-0">
				<h3 className="m-0 min-w-0 break-words text-base font-[760] tracking-[-0.02em] [overflow-wrap:anywhere]">
					{project.title}
				</h3>
				<ProjectMeta project={project} showYear={false} className="mt-2 justify-start" />
				<p className="m-0 mt-1 min-w-0 max-w-[62ch] break-words text-pretty text-sm leading-[1.5] text-muted-foreground [overflow-wrap:anywhere]">
					{project.summary}
				</p>
				<ProjectCaseStudy project={project} />
			</div>
			<div className="flex min-w-0 items-baseline gap-4 text-sm max-[800px]:mt-1 max-[800px]:flex-wrap">
				<span className="shrink-0 text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
					{project.year}
				</span>
				<OpenLink project={project} className="text-[13px]" />
			</div>
		</article>
	);
}
