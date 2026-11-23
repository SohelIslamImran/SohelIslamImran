import { Link } from "@tanstack/react-router";
import type { ProjectContent } from "../types/content";
import { cn } from "../lib/utils";
import { ArrowRightIcon, ExternalIcon } from "./chrome/icons";
import { CountUp, SpotlightCard } from "./motion";
import { buttonVariants } from "./ui/button";
import { DatedLabel, StatusBadge, Tag } from "./ui/portfolio";
import { LayerStrip, type LayerStripCaption } from "./work/LayerStrip";
import { ProjectPoster } from "./work/ProjectPoster";
import { primeWorkTransition } from "./work/view-transition";
import {
	categoryLabels,
	nonEmpty,
	projectLinkName,
	projectLinks,
	projectMetrics,
	projectSlug,
	statusTone,
	type ProjectLink,
	type WorkGroup,
} from "./work/project-utils";

export type ProjectCardVariant = "feature" | "split" | "compact";

/**
 * Secondary destinations (site, package, source). They sit above the card's
 * stretched link, so the card stays one big target without nesting links.
 */
export function ProjectExternalLinks({
	project,
	links = projectLinks(project),
	className,
	size = "card",
}: {
	project: ProjectContent;
	links?: ProjectLink[];
	className?: string;
	size?: "card" | "page";
}) {
	if (links.length === 0) return null;
	return (
		<ul className={cn("relative z-[3] m-0 flex min-w-0 list-none flex-wrap gap-2 p-0", className)}>
			{links.map((link, index) => (
				<li key={link.href} className="min-w-0">
					<a
						href={link.href}
						target={link.external ? "_blank" : undefined}
						rel={link.external ? "noopener noreferrer" : undefined}
						aria-label={projectLinkName(link, project.title)}
						className={cn(
							size === "page"
								? buttonVariants({ variant: index === 0 ? "default" : "outline" })
								: cn(
										buttonVariants({ variant: "outline", size: "default" }),
										"gap-1.5 px-4 text-[14px] pointer-fine:min-h-9 pointer-fine:px-3.5 pointer-fine:text-[13px]",
									),
							"no-underline",
						)}
					>
						<span>{link.label}</span>
						<ExternalIcon aria-hidden="true" className="size-3.5 opacity-70" />
					</a>
				</li>
			))}
		</ul>
	);
}

export function ProjectStatus({ status, className }: { status: string; className?: string }) {
	const text = status.trim();
	if (!text) return null;
	const tone = statusTone(text);
	return (
		<StatusBadge tone={tone === "neutral" ? "neutral" : tone} className={cn("shrink-0", className)}>
			{tone !== "neutral" ? (
				<span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-80" />
			) : null}
			{text}
		</StatusBadge>
	);
}

function CardTags({ tags, max = tags.length }: { tags: string[]; max?: number }) {
	if (tags.length === 0) return null;
	const shown = tags.slice(0, max);
	const hidden = tags.length - shown.length;
	return (
		<ul aria-label="Built with" className="m-0 flex min-w-0 list-none flex-wrap gap-1.5 p-0">
			{shown.map((tag) => (
				<li key={tag} className="min-w-0">
					<Tag>{tag}</Tag>
				</li>
			))}
			{hidden > 0 ? (
				<li className="min-w-0">
					<Tag className="text-muted-foreground">
						+{hidden}
						<span className="sr-only"> more</span>
					</Tag>
				</li>
			) : null}
		</ul>
	);
}

function CardMetrics({ project, compact }: { project: ProjectContent; compact: boolean }) {
	const metrics = projectMetrics(project);
	if (metrics.length === 0) return null;
	if (compact) {
		const [first] = metrics;
		return (
			<p className="m-0 flex min-w-0 flex-wrap items-baseline gap-x-2 text-caption text-muted-foreground">
				<CountUp value={first.value} className="text-[15px] font-semibold text-foreground" />
				<span className="min-w-0">
					<DatedLabel label={first.label} />
				</span>
			</p>
		);
	}
	return (
		<dl
			className={cn(
				"m-0 grid min-w-0 gap-x-4 gap-y-3 rounded-inner bg-[color-mix(in_srgb,var(--theme-ink)_3%,transparent)] px-4 py-3.5",
				metrics.length >= 3 ? "grid-cols-1 min-[420px]:grid-cols-3" : "grid-cols-2",
			)}
		>
			{metrics.map((metric) => (
				<div
					key={metric.label}
					className="flex min-w-0 flex-col gap-1 max-[419px]:flex-row max-[419px]:items-baseline max-[419px]:gap-2"
				>
					<dt className="order-2 min-w-0 text-[12px] leading-[1.35] text-muted-foreground">
						<DatedLabel label={metric.label} />
					</dt>
					<dd className="order-1 m-0 text-[1.375rem] leading-none font-semibold tracking-[-0.03em] text-foreground">
						<CountUp value={metric.value} />
					</dd>
				</div>
			))}
		</dl>
	);
}

/**
 * A project as an Apple-style card: generated poster, title, one sentence,
 * role · period · status, a few tools, dated metrics, and a clear way in.
 *
 * - `feature`: poster on top. Used in two-column grids.
 * - `split`: poster beside the copy on large screens. Used for a lead project.
 * - `compact`: the tighter "lab" card for experiments.
 *
 * The project link stretches over the whole card (one target, one name); the
 * external links sit above it, so nothing interactive is nested.
 */
export function ProjectCard({
	project,
	variant = "feature",
	headingLevel = 3,
	reverse = false,
	layerCaption,
	fromGroup,
	className,
}: {
	project: ProjectContent;
	variant?: ProjectCardVariant;
	headingLevel?: 2 | 3 | 4;
	/** `split` only: put the poster on the right on large screens. */
	reverse?: boolean;
	/** What follows the layer ticks. Defaults to names, or a count on compact cards. */
	layerCaption?: LayerStripCaption;
	fromGroup?: WorkGroup;
	className?: string;
}) {
	const Heading = `h${headingLevel}` as "h3";
	const title = project.title.trim() || "Untitled project";
	const slug = projectSlug(project);
	const summary = project.summary.trim();
	const role = project.role.trim();
	const year = project.year.trim();
	const tags = nonEmpty(project.tags);
	const compact = variant === "compact";
	const split = variant === "split";

	return (
		<SpotlightCard
			as="article"
			data-slot="project-card"
			data-variant={variant}
			data-poster-host=""
			className={cn(
				"group/card relative flex h-full min-w-0 flex-col p-2 transition-[box-shadow,border-color] duration-500 ease-trace",
				"pointer-fine:hover:shadow-surface",
				"has-[[data-card-link]:focus-visible]:outline-2 has-[[data-card-link]:focus-visible]:outline-offset-4 has-[[data-card-link]:focus-visible]:outline-ring",
				split && "lg:grid lg:grid-cols-[minmax(0,1.18fr)_minmax(0,1fr)] lg:gap-2",
				split &&
					reverse &&
					"lg:grid-cols-[minmax(0,1fr)_minmax(0,1.18fr)] lg:[&>[data-slot=project-poster]]:order-2",
				className,
			)}
		>
			<ProjectPoster
				project={project}
				transition
				size={split ? "feature" : compact ? "compact" : "feature"}
				className={cn(
					"shrink-0 rounded-[20px]",
					split && "lg:aspect-auto lg:h-full lg:min-h-[400px]",
				)}
			/>
			<div
				className={cn(
					"flex min-w-0 flex-1 flex-col",
					compact
						? "gap-3 px-3 pt-5 pb-3 sm:px-4 sm:pb-4"
						: "gap-4 px-3 pt-5 pb-3 sm:px-5 sm:pt-6 sm:pb-5",
					split && "lg:justify-center lg:px-8 lg:py-8",
				)}
			>
				<div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
					<p className="mono-label m-0 min-w-0 text-primary-text">
						{categoryLabels[project.category]}
					</p>
					<ProjectStatus status={project.status} />
				</div>
				<div className="grid min-w-0 gap-2">
					<Heading
						className={cn(
							"m-0 min-w-0 break-words text-balance [overflow-wrap:anywhere]",
							compact
								? "text-[1.25rem] leading-[1.2] font-semibold tracking-[-0.02em]"
								: split
									? "text-[clamp(1.6rem,3vw,2.375rem)] leading-[1.06] font-[620] tracking-[-0.035em]"
									: "text-headline",
						)}
					>
						{title}
					</Heading>
					{summary ? (
						<p
							className={cn(
								"m-0 min-w-0 max-w-[58ch] break-words text-ink-soft [overflow-wrap:anywhere]",
								compact
									? "text-[15px] leading-[1.5]"
									: "text-small sm:text-[17px] sm:leading-[1.5]",
								split && "lg:text-lead",
							)}
						>
							{summary}
						</p>
					) : null}
					{role || year ? (
						<p className="mono-label m-0 mt-1 min-w-0 text-muted-foreground [overflow-wrap:anywhere]">
							{role}
							{role && year ? " " : null}
							{year ? (
								<span className="inline-block max-w-full">
									{role ? <span aria-hidden="true">· </span> : null}
									{year}
								</span>
							) : null}
						</p>
					) : null}
				</div>
				<LayerStrip project={project} caption={layerCaption ?? (compact ? "count" : "names")} />
				<CardMetrics project={project} compact={compact} />
				{compact ? null : <CardTags tags={tags} max={split ? undefined : 4} />}
				<div
					className={cn(
						"mt-auto flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-3",
						compact ? "pt-1" : "pt-2",
					)}
				>
					{slug ? (
						<Link
							to="/work/$slug"
							params={{ slug }}
							state={fromGroup === undefined ? undefined : { workGroup: fromGroup }}
							data-card-link=""
							viewTransition
							onClick={primeWorkTransition}
							className="inline-flex min-h-11 items-center gap-1.5 rounded-sm text-[15px] font-medium text-primary-text no-underline after:absolute after:inset-0 after:z-[1] after:rounded-card after:content-[''] pointer-fine:min-h-9"
						>
							View project
							<span className="sr-only">, {title}</span>
							<ArrowRightIcon
								aria-hidden="true"
								className="size-4 transition-transform duration-300 ease-trace motion-safe:group-hover/card:translate-x-1"
							/>
						</Link>
					) : null}
					<ProjectExternalLinks project={project} />
				</div>
			</div>
		</SpotlightCard>
	);
}
