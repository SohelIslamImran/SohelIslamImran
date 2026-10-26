import { Link } from "@tanstack/react-router";
import type { ProjectContent } from "../types/content";
import { ProjectCard } from "./ProjectCard";
import { EmptyState, SectionIntro } from "./ui/portfolio";

/**
 * The home-page cut: one lead case study plus the two other projects worth a
 * stranger's attention. Everything else lives on /work.
 */
export function SelectedWork({ projects }: { projects: ProjectContent[] }) {
	const [lead, ...rest] = [...projects]
		.sort((a, b) => Number(b.featured === true) - Number(a.featured === true))
		.slice(0, 3);

	return (
		<section
			className="w-full min-w-0 py-[clamp(56px,7vw,84px)]"
			aria-labelledby="selected-work-title"
		>
			<SectionIntro
				eyebrow="Selected work"
				title={<span id="selected-work-title">Systems I have helped shape</span>}
				description="A small selection across product engineering, independent open source, and native work."
				className="mb-[clamp(34px,5vw,52px)] [&_h2]:text-[clamp(1.9rem,3.4vw,3rem)] [&_h2]:leading-[1.04]"
			/>
			{lead ? (
				<>
					<div className="grid min-w-0 grid-cols-12 items-start gap-4 max-[900px]:grid-cols-1">
						<ProjectCard
							project={lead}
							variant="featured"
							className={`${rest.length > 0 ? "col-span-7" : "col-span-12"} w-full max-[900px]:col-span-1`}
						/>
						{rest.length > 0 ? (
							<div className="col-span-5 grid min-w-0 w-full auto-rows-min gap-4 max-[900px]:col-span-full max-[900px]:grid-cols-1">
								{rest.map((project) => (
									<ProjectCard key={project.id} project={project} />
								))}
							</div>
						) : null}
					</div>
					<Link
						className="mt-8 inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 text-sm font-[750] text-primary-text no-underline transition-[color,transform,translate,scale,rotate] duration-200 ease-route hover:translate-x-0.5 hover:underline focus-visible:outline-2 focus-visible:outline-ring [overflow-wrap:anywhere]"
						to="/work"
						search={{ group: "all" }}
					>
						See all {projects.length} projects <span aria-hidden="true">→</span>
					</Link>
				</>
			) : (
				<EmptyState
					level={2}
					title="Selected work is being updated."
					description="Projects will reappear here once their public details are verified."
				/>
			)}
		</section>
	);
}
