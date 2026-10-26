import { PROJECT_CATEGORIES, type ProjectCategory, type ProjectContent } from "../types/content";
import { ProjectCard, ProjectRow } from "./ProjectCard";
import { Button } from "./ui/button";
import { EmptyState } from "./ui/portfolio";
import { FilterStrip } from "./FilterStrip";

export const workGroups = ["all", ...PROJECT_CATEGORIES] as const;
export type WorkGroup = (typeof workGroups)[number];

const groupLabels: Record<WorkGroup, string> = {
	all: "Everything",
	product: "Product Systems",
	"open-source": "Open Source",
	experiment: "Experiments",
};

const sections: {
	category: ProjectCategory;
	title: string;
	description: string;
	layout: "cards" | "rows";
}[] = [
	{
		category: "product",
		title: "Product systems",
		description:
			"Production software built for real-world users and organizational teams. Because enterprise codebases are proprietary, details emphasize architectural design, domain models, and delivered outcomes.",
		layout: "cards",
	},
	{
		category: "open-source",
		title: "Open source",
		description:
			"Publicly published, versioned, and maintained modules with verifiable real-world adoption, community usage, and open codebases.",
		layout: "cards",
	},
	{
		category: "experiment",
		title: "Experiments & prototypes",
		description:
			"Exploratory tools, platform experiments, and native utilities. Built to test specific OS capabilities, developer ergonomics, and system boundaries.",
		layout: "rows",
	},
];

export function WorkIndex({
	projects,
	group,
	onGroupChange,
}: {
	projects: ProjectContent[];
	group: WorkGroup;
	onGroupChange: (group: WorkGroup) => void;
}) {
	const visible = sections
		.filter((section) => group === "all" || section.category === group)
		.map((section) => ({
			...section,
			items: projects.filter((project) => project.category === section.category),
		}))
		.filter((section) => section.items.length > 0);
	const total = visible.reduce((count, section) => count + section.items.length, 0);

	return (
		<div>
			<FilterStrip
				className="mb-[clamp(32px,5vw,48px)] w-full max-w-[560px]"
				labelId="work-filter-label"
				hintId="work-filter-hint"
				label="Filter by project type"
				options={workGroups}
				labels={groupLabels}
				value={group}
				onChange={onGroupChange}
				resultsId="work-results"
			/>
			<p className="sr-only" role="status">
				Showing {total} {total === 1 ? "project" : "projects"} in {groupLabels[group]}.
			</p>
			<section
				className="grid gap-[clamp(48px,7vw,80px)]"
				id="work-results"
				aria-label="Project results"
			>
				{visible.length > 0 ? (
					visible.map((section) => (
						<section key={section.category} aria-labelledby={`work-${section.category}`}>
							<header className="mb-7 grid gap-2">
								<div className="flex items-baseline justify-between gap-4">
									<h2
										className="m-0 min-w-0 break-words text-sm font-semibold leading-tight tracking-[-0.01em] text-muted-foreground [overflow-wrap:anywhere]"
										id={`work-${section.category}`}
									>
										{section.title}
									</h2>
									<span className="shrink-0 text-xs font-bold text-muted-foreground [font-variant-numeric:tabular-nums]">
										{String(section.items.length).padStart(2, "0")}
										<span className="sr-only"> {section.items.length} projects</span>
									</span>
								</div>
								<p className="m-0 min-w-0 max-w-[60ch] break-words text-pretty text-[15px] leading-[1.55] text-muted-foreground [overflow-wrap:anywhere]">
									{section.description}
								</p>
							</header>
							{section.layout === "rows" ? (
								<ul
									aria-label={`${section.title} projects`}
									className="m-0 grid list-none border-t border-border p-0"
								>
									{section.items.map((project) => (
										<li key={project.id} className="min-w-0">
											<ProjectRow project={project} />
										</li>
									))}
								</ul>
							) : (
								<ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 max-[900px]:grid-cols-1">
									{section.items.map((project, index) => (
										<li
											key={project.id}
											className={
												index === 0 || (index === section.items.length - 1 && index % 2 === 1)
													? "col-span-2 min-w-0 max-[900px]:col-span-1"
													: "min-w-0"
											}
										>
											<ProjectCard
												project={project}
												variant={index === 0 ? "featured" : "compact"}
											/>
										</li>
									))}
								</ul>
							)}
						</section>
					))
				) : (
					<EmptyState
						title={group === "all" ? "No projects yet." : `No ${groupLabels[group]} projects yet.`}
						description="Choose another category or view the full work index."
					>
						{group !== "all" ? (
							<Button type="button" size="lg" onClick={() => onGroupChange("all")}>
								Show all projects <span aria-hidden="true">→</span>
							</Button>
						) : null}
					</EmptyState>
				)}
			</section>
		</div>
	);
}
