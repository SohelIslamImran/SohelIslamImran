import type { ReactNode } from "react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { jsonLd, pageHead } from "../lib/seo";
import { mediaHref } from "../lib/media";
import { cn } from "../lib/utils";
import { EMPTY_PORTFOLIO_CONTENT, type ProjectContent } from "../types/content";
import { ProjectExternalLinks, ProjectStatus } from "../components/ProjectCard";
import { ArrowRightIcon } from "../components/chrome/icons";
import { CountUp, Reveal } from "../components/motion";
import { PageShell, TagList } from "../components/ui/portfolio";
import { LayerStrip } from "../components/work/LayerStrip";
import { ProjectPoster } from "../components/work/ProjectPoster";
import { StackAnatomy } from "../components/work/StackAnatomy";
import { primeWorkTransition } from "../components/work/view-transition";
import {
	adjacentProjects,
	categoryLabels,
	findProjectBySlug,
	linkableProjects,
	nonEmpty,
	projectLinks,
	projectMetrics,
	projectSlug,
} from "../components/work/project-utils";

/*
 * `work_.$slug` (trailing underscore) keeps this page out of the /work route's
 * layout: /work renders no <Outlet />, so the detail page must not be its child.
 * The public URL is still /work/<slug>.
 */
export const Route = createFileRoute("/work_/$slug")({
	loader: async ({ params }) => {
		const content = await getPublishedContent();
		if (!findProjectBySlug(content.projects, params.slug)) throw notFound();
		return content;
	},
	head: ({ loaderData, params }) => {
		const c = loaderData ?? EMPTY_PORTFOLIO_CONTENT;
		const name = c.identity.name.trim() || "Sohel Islam Imran";
		const project = findProjectBySlug(c.projects, params.slug);
		if (!project) {
			return {
				meta: [{ title: `Project not found — ${name}` }, { name: "robots", content: "noindex" }],
			};
		}
		const title = project.title.trim();
		const path = `/work/${encodeURIComponent(projectSlug(project))}`;
		const description =
			project.summary.trim() ||
			`${title}, a ${categoryLabels[project.category].toLowerCase()} by ${name}.`;
		const image = mediaHref(project.cover) ?? "/images/social-work.png";
		const repository = project.repository?.trim();
		const site = project.href?.trim();
		return pageHead(c, `${title} — ${name}`, description, path, image, [
			{
				...jsonLd(c, repository ? "SoftwareSourceCode" : "CreativeWork", title, path),
				description,
				genre: categoryLabels[project.category],
				keywords: nonEmpty(project.tags).join(", ") || undefined,
				...(repository ? { codeRepository: repository } : {}),
				...(site && /^https?:\/\//i.test(site) ? { sameAs: [site] } : {}),
			},
		]);
	},
	component: ProjectPage,
});

function ProjectPage() {
	const content = Route.useLoaderData();
	const { slug } = Route.useParams();
	const project = findProjectBySlug(content.projects, slug);
	// The loader already 404s unknown slugs; this only guards a stale client cache.
	if (!project) return null;
	// Keyed by slug so moving between projects mounts a fresh page (and a fresh hero for the poster transition).
	return <ProjectDetail key={projectSlug(project)} project={project} projects={content.projects} />;
}

function position(projects: ProjectContent[], project: ProjectContent) {
	const list = linkableProjects(projects);
	const index = list.findIndex((item) => projectSlug(item) === projectSlug(project));
	return index === -1
		? null
		: `${String(index + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")}`;
}

function ProjectDetail({
	project,
	projects,
}: {
	project: ProjectContent;
	projects: ProjectContent[];
}) {
	const title = project.title.trim();
	const summary = project.summary.trim();
	const description = project.description
		.split(/\n{2,}/)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean);
	const metrics = projectMetrics(project);
	const tags = nonEmpty(project.tags);
	const links = projectLinks(project);
	const { previous, next } = adjacentProjects(projects, projectSlug(project));
	const place = position(projects, project);
	const facts = [
		{ label: "My role", value: project.role.trim() },
		{ label: "Period", value: project.year.trim() },
	].filter((fact) => fact.value);
	const status = project.status.trim();

	const blocks: { id: string; title: string; lead?: string; body: ReactNode }[] = [];
	if (description.length > 0) {
		blocks.push({
			id: "overview",
			title: "Overview",
			body: (
				<div className="grid gap-5">
					{description.map((paragraph) => (
						<p key={paragraph} className="m-0 max-w-prose text-body text-ink-soft">
							{paragraph}
						</p>
					))}
				</div>
			),
		});
	}
	blocks.push({
		id: "anatomy",
		title: "From the interface down",
		lead: "Which layers of the stack this project's notes and tools mention, from the interface down to release.",
		body: <StackAnatomy project={project} />,
	});
	if (metrics.length > 0) {
		blocks.push({
			id: "numbers",
			title: "By the numbers",
			body: (
				<dl className="m-0 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{metrics.map((metric) => (
						<div
							key={metric.label}
							className="flex min-w-0 flex-col gap-2 rounded-inner border border-line bg-[color-mix(in_srgb,var(--theme-ink)_2.5%,transparent)] p-5"
						>
							<dt className="order-2 text-caption text-muted-foreground">{metric.label}</dt>
							<dd className="order-1 m-0 text-[clamp(2rem,4vw,2.75rem)] leading-none font-[620] tracking-[-0.04em] text-foreground">
								<CountUp value={metric.value} />
							</dd>
						</div>
					))}
				</dl>
			),
		});
	}

	return (
		<PageShell data-page="project" aria-label={`${title} project`} spacing="compact">
			<nav aria-label="Breadcrumb" className="mb-8 md:mb-10">
				<Link
					to="/work"
					search={{ group: "all" }}
					className="pressable group/back -ml-3 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-small font-medium text-ink-soft no-underline hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)] hover:text-foreground"
				>
					<ArrowRightIcon
						aria-hidden="true"
						className="size-4 rotate-180 transition-transform duration-300 ease-trace group-hover/back:-translate-x-0.5"
					/>
					All work
				</Link>
			</nav>

			<header className="grid min-w-0 gap-6 md:gap-7">
				<p className="mono-label m-0 flex flex-wrap items-center gap-x-3 gap-y-1">
					<span className="text-primary-text">{categoryLabels[project.category]}</span>
					{place ? (
						<>
							<span aria-hidden="true" className="h-px w-6 bg-line-strong" />
							<span className="text-muted-foreground">
								<span className="sr-only">Project </span>
								{place}
							</span>
						</>
					) : null}
				</p>
				<h1 className="m-0 max-w-[16ch] min-w-0 break-words text-display [overflow-wrap:anywhere]">
					{title}
				</h1>
				{summary ? (
					<p className="m-0 max-w-[40ch] text-lead text-ink-soft md:text-[1.5rem] md:leading-[1.4]">
						{summary}
					</p>
				) : null}
			</header>

			<figure className="m-0 mt-10 md:mt-14">
				<div
					data-poster-host=""
					data-vt-hero=""
					className="overflow-hidden rounded-tile shadow-surface"
				>
					<ProjectPoster project={project} size="hero" depth="hero" priority />
				</div>
				<figcaption className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
					<LayerStrip project={project} />
					<span aria-hidden="true" className="mono-label text-muted-foreground max-sm:hidden">
						Tilt to see the layers
					</span>
				</figcaption>
			</figure>

			<div className="mt-[clamp(48px,7vw,96px)] grid min-w-0 gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
				<aside
					aria-labelledby="project-facts-title"
					className="min-w-0 lg:sticky lg:top-[calc(var(--dock-space-top)+24px)] lg:self-start"
				>
					<div className="surface-card grid min-w-0 gap-6 p-6">
						<h2 id="project-facts-title" className="mono-label m-0 text-muted-foreground">
							At a glance
						</h2>
						{facts.length > 0 || status ? (
							<dl className="m-0 grid min-w-0 gap-4">
								{facts.map((fact) => (
									<div key={fact.label} className="grid min-w-0 gap-1">
										<dt className="text-caption text-muted-foreground">{fact.label}</dt>
										<dd className="m-0 text-[17px] leading-snug font-medium text-foreground">
											{fact.value}
										</dd>
									</div>
								))}
								{status ? (
									<div className="grid min-w-0 justify-items-start gap-1.5">
										<dt className="text-caption text-muted-foreground">Status</dt>
										<dd className="m-0">
											<ProjectStatus status={status} />
										</dd>
									</div>
								) : null}
							</dl>
						) : null}
						{tags.length > 0 ? (
							<div className="grid min-w-0 gap-2.5 border-t border-line pt-5">
								<h3 className="m-0 text-caption font-normal text-muted-foreground">Built with</h3>
								<TagList items={tags} />
							</div>
						) : null}
						{links.length > 0 ? (
							<div className="border-t border-line pt-5">
								<ProjectExternalLinks project={project} links={links} size="page" />
							</div>
						) : null}
					</div>
				</aside>

				<div className="grid min-w-0">
					{blocks.map((block, index) => (
						<Reveal
							as="section"
							key={block.id}
							aria-labelledby={`project-${block.id}`}
							className={cn(
								"grid min-w-0 gap-6 py-10 first:pt-0 md:py-12",
								index > 0 && "border-t border-line",
							)}
						>
							<div className="grid gap-2">
								<h2
									id={`project-${block.id}`}
									className="m-0 flex items-baseline gap-3 text-headline"
								>
									<span aria-hidden="true" className="mono-label text-primary-text">
										{String(index + 1).padStart(2, "0")}
									</span>
									{block.title}
								</h2>
								{block.lead ? (
									<p className="m-0 max-w-prose text-small text-muted-foreground">{block.lead}</p>
								) : null}
							</div>
							<div className="min-w-0">{block.body}</div>
						</Reveal>
					))}
				</div>
			</div>

			{next || previous ? (
				<nav
					aria-label="More projects"
					className="mt-[clamp(40px,6vw,80px)] grid min-w-0 gap-4 border-t border-line pt-10 md:pt-14"
				>
					{next ? <NextProject project={next} place={position(projects, next)} /> : null}
					<div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
						{previous && previous !== next ? (
							<Link
								to="/work/$slug"
								params={{ slug: projectSlug(previous) }}
								viewTransition
								className="pressable group/prev -ml-3 inline-flex min-h-11 min-w-0 items-center gap-2 rounded-full px-3 text-small text-ink-soft no-underline hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)] hover:text-foreground"
							>
								<ArrowRightIcon
									aria-hidden="true"
									className="size-4 shrink-0 rotate-180 transition-transform duration-300 ease-trace group-hover/prev:-translate-x-0.5"
								/>
								<span className="text-muted-foreground">Previous</span>
								<span className="min-w-0 truncate font-medium text-foreground">
									{previous.title.trim()}
								</span>
							</Link>
						) : (
							<span />
						)}
						<Link
							to="/work"
							search={{ group: "all" }}
							className="pressable -mr-3 inline-flex min-h-11 items-center rounded-full px-3 text-small font-medium text-primary-text no-underline hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)]"
						>
							All work
						</Link>
					</div>
				</nav>
			) : null}
		</PageShell>
	);
}

function NextProject({ project, place }: { project: ProjectContent; place: string | null }) {
	const title = project.title.trim();
	const summary = project.summary.trim();
	return (
		<Link
			to="/work/$slug"
			params={{ slug: projectSlug(project) }}
			data-poster-host=""
			viewTransition
			onClick={primeWorkTransition}
			className={cn(
				"group/next surface-card relative grid min-w-0 overflow-hidden p-2 text-foreground no-underline",
				"transition-[box-shadow,translate,scale] duration-500 ease-trace active:scale-[.99]",
				"pointer-fine:hover:-translate-y-1 pointer-fine:hover:shadow-surface",
				"md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-center",
			)}
		>
			<span className="grid min-w-0 gap-3 px-4 pt-5 pb-6 md:order-1 md:px-8 md:py-8">
				<span className="mono-label flex items-center gap-3 text-muted-foreground">
					Next project
					{place ? (
						<>
							<span aria-hidden="true" className="h-px w-6 bg-line-strong" />
							{place}
						</>
					) : null}
				</span>
				<span className="text-[clamp(1.75rem,3.6vw,2.75rem)] leading-[1.04] font-[620] tracking-[-0.035em] break-words [overflow-wrap:anywhere]">
					{title}
				</span>
				{summary ? (
					<span className="max-w-[44ch] text-small text-ink-soft sm:text-[17px] sm:leading-[1.5]">
						{summary}
					</span>
				) : null}
				<span className="mt-2 inline-flex items-center gap-1.5 text-[15px] font-medium text-primary-text">
					Open case study
					<ArrowRightIcon
						aria-hidden="true"
						className="size-4 transition-transform duration-300 ease-trace group-hover/next:translate-x-1"
					/>
				</span>
			</span>
			<ProjectPoster project={project} transition className="rounded-[20px] md:order-2" />
		</Link>
	);
}
