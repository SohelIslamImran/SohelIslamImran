import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { ProjectContent } from "../types/content";
import { CardContent, CardFooter } from "./ui/card";
import { EmptyState, SectionIntro, StatusBadge, Surface, TagList } from "./ui/portfolio";

function projectHref(project: ProjectContent) {
	return project.href ?? project.repository;
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
	return (
		<a
			className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary-text no-underline transition-[color,transform,translate,scale,rotate] duration-180 ease-route hover:translate-x-0.5 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
			href={href}
			target="_blank"
			rel="noreferrer"
		>
			{children} <span aria-hidden="true">↗</span>
			<span className="sr-only">, opens in a new tab</span>
		</a>
	);
}

/**
 * Featured work gets a full card with context and outcomes. Everything else is a
 * compact list, so side projects support the story without competing with it.
 */
export function SelectedWork({
	projects,
	sectionNumber = "01",
	showOtherWork = true,
	showAllLink = false,
}: {
	projects: ProjectContent[];
	sectionNumber?: "01" | "02";
	showOtherWork?: boolean;
	showAllLink?: boolean;
}) {
	const featured = projects.filter((project) => project.featured);
	const other = projects.filter((project) => !project.featured);

	return (
		<section
			className="w-full py-[clamp(68px,8vw,96px)]"
			id="selected-work"
			aria-labelledby="selected-work-title"
		>
			<SectionIntro
				eyebrow={`${sectionNumber} · Selected work`}
				title={<span id="selected-work-title">Work I’d point to first.</span>}
				description="Products I’ve built and kept running, plus the open-source module other teams depend on. Private work is described without internal detail."
			/>
			{featured.length > 0 ? (
				<div className="grid grid-cols-1 gap-3.5 min-[840px]:grid-cols-2">
					{featured.map((project) => {
						const href = projectHref(project);
						return (
							<Surface
								key={project.id}
								className="group min-w-0 p-0 transition-[transform,translate,scale,rotate,box-shadow] duration-200 ease-route hover:-translate-y-1 hover:shadow-[0_30px_60px_var(--theme-accent-shadow),inset_0_1px_var(--theme-highlight)]"
							>
								<CardContent className="grid content-start gap-3 p-7 max-[560px]:p-5">
									<div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-signal">
										<span>{project.year}</span>
										{project.status ? <StatusBadge>{project.status}</StatusBadge> : null}
									</div>
									<h3 className="m-0 text-balance text-2xl font-[760] tracking-[-0.045em]">
										{project.title}
									</h3>
									<p className="m-0 text-sm font-medium text-muted-foreground">{project.role}</p>
									<p className="m-0 leading-[1.55] text-foreground">{project.summary}</p>
									<p className="m-0 text-[15px] leading-[1.55] text-muted-foreground">
										{project.description}
									</p>
									{project.highlights.length > 0 ? (
										<ul className="m-0 grid gap-1 pl-4 text-sm leading-[1.45] text-muted-foreground">
											{project.highlights.slice(0, 3).map((highlight) => (
												<li key={highlight}>{highlight}</li>
											))}
										</ul>
									) : null}
									<TagList items={project.tags.slice(0, 5)} />
								</CardContent>
								{href ? (
									<CardFooter className="border-0 bg-transparent px-7 pb-6 pt-0 max-[560px]:px-5 max-[560px]:pb-5">
										<ExternalLink href={href}>View project</ExternalLink>
									</CardFooter>
								) : null}
							</Surface>
						);
					})}
				</div>
			) : (
				<EmptyState
					title="Selected work is being updated."
					description="Case studies will appear here when they are ready to share."
				/>
			)}
			{showOtherWork && other.length > 0 ? (
				<section className="mt-14" aria-labelledby="other-work-title">
					<h3
						className="mb-1 mt-0 text-xs font-extrabold uppercase tracking-[0.11em] text-primary-text"
						id="other-work-title"
					>
						Smaller builds and experiments
					</h3>
					<p className="mb-5 mt-0 max-w-[620px] text-[15px] leading-[1.55] text-muted-foreground">
						Things I made to scratch an itch or learn a platform. Useful, but not where my main work
						lives.
					</p>
					<ul className="m-0 grid list-none p-0">
						{other.map((project) => {
							const href = projectHref(project);
							return (
								<li
									className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1 border-t border-border py-4 last:border-b max-[640px]:grid-cols-1"
									key={project.id}
								>
									<div className="min-w-0">
										<p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1">
											<strong className="text-base font-[760] tracking-[-0.02em] text-foreground">
												{project.title}
											</strong>
											<span className="text-xs text-muted-foreground">
												{project.year} · {project.status}
											</span>
										</p>
										<p className="mb-0 mt-1 text-[15px] leading-[1.5] text-muted-foreground">
											{project.summary}
										</p>
									</div>
									{href ? <ExternalLink href={href}>Source</ExternalLink> : null}
								</li>
							);
						})}
					</ul>
				</section>
			) : null}
			{showAllLink ? (
				<Link
					className="mt-8 inline-flex min-h-11 items-center gap-2 font-[750] text-primary-text no-underline transition-[color,transform,translate,scale,rotate] duration-180 ease-route hover:underline focus-visible:outline-2 focus-visible:outline-ring"
					to="/work"
				>
					All work and experiments <span aria-hidden="true">↗</span>
				</Link>
			) : null}
		</section>
	);
}
