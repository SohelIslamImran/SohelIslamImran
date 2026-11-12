import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import type { ProjectCategory, ProjectContent } from "../types/content";
import { cn } from "../lib/utils";
import { FilterStrip } from "./FilterStrip";
import { ProjectCard } from "./ProjectCard";
import { Stagger } from "./motion";
import { Button } from "./ui/button";
import { EmptyState } from "./ui/portfolio";
import {
	linkableProjects,
	workGroupDescriptions,
	workGroupLabels,
	workGroups,
	type WorkGroup,
} from "./work/project-utils";

export { workGroups, type WorkGroup } from "./work/project-utils";

const sections: { category: ProjectCategory; index: string; layout: "feature" | "lab" }[] = [
	{ category: "product", index: "01", layout: "feature" },
	{ category: "open-source", index: "02", layout: "feature" },
	{ category: "experiment", index: "03", layout: "lab" },
];

const spring = { type: "spring", stiffness: 380, damping: 38, mass: 0.9 } as const;

function countLabel(count: number) {
	return `${String(count).padStart(2, "0")} ${count === 1 ? "project" : "projects"}`;
}

const WorkSection = forwardRef<
	HTMLElement,
	{
		category: ProjectCategory;
		index: string;
		layout: "feature" | "lab";
		items: ProjectContent[];
		reduceMotion: boolean;
	}
>(function WorkSection({ category, index, layout, items, reduceMotion }, ref) {
	const titleId = `work-${category}`;
	return (
		<motion.section
			ref={ref}
			layout="position"
			aria-labelledby={titleId}
			className="min-w-0"
			initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{
				opacity: 0,
				y: reduceMotion ? 0 : -10,
				transition: { duration: reduceMotion ? 0 : 0.18 },
			}}
			transition={{
				layout: reduceMotion ? { duration: 0 } : spring,
				y: reduceMotion ? { duration: 0 } : spring,
				opacity: { duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] },
			}}
		>
			<header className="mb-6 flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-2 border-t border-line pt-6 md:mb-8">
				<div className="min-w-0">
					<h2 id={titleId} className="m-0 flex items-baseline gap-3 text-headline">
						<span aria-hidden="true" className="mono-label text-primary-text">
							{index}
						</span>
						{workGroupLabels[category]}
					</h2>
					<p className="m-0 mt-1.5 text-small text-muted-foreground">
						{workGroupDescriptions[category]}
					</p>
				</div>
				<p className="mono-label m-0 text-muted-foreground">{countLabel(items.length)}</p>
			</header>
			{layout === "lab" ? (
				<Stagger as="ul" className="m-0 grid min-w-0 list-none gap-4 p-0 sm:grid-cols-2 sm:gap-5">
					{items.map((project) => (
						<li key={project.id} className="min-w-0">
							<ProjectCard project={project} variant="compact" />
						</li>
					))}
				</Stagger>
			) : (
				<Stagger as="ul" className="m-0 grid min-w-0 list-none gap-4 p-0 md:grid-cols-2 md:gap-5">
					{items.map((project, position) => {
						// An odd count leads with one wide card so the grid never ends on a gap.
						const wide = items.length % 2 === 1 && position === 0;
						return (
							<li key={project.id} className={cn("min-w-0", wide && "md:col-span-2")}>
								<ProjectCard project={project} variant={wide ? "split" : "feature"} />
							</li>
						);
					})}
				</Stagger>
			)}
		</motion.section>
	);
});

/**
 * The /work index: a URL-backed group filter over products, open source, and
 * experiments. Groups that leave fade out of the flow while the rest glide
 * into place, and the list height follows smoothly.
 */
export function WorkIndex({
	projects,
	group,
	onGroupChange,
}: {
	projects: ProjectContent[];
	group: WorkGroup;
	onGroupChange: (group: WorkGroup) => void;
}) {
	const reduceMotion = useReducedMotion() === true;
	const listed = linkableProjects(projects);
	const visible = sections
		.filter((section) => group === "all" || section.category === group)
		.map((section) => ({
			...section,
			items: listed.filter((project) => project.category === section.category),
		}))
		.filter((section) => section.items.length > 0);
	const total = visible.reduce((count, section) => count + section.items.length, 0);
	const countFor = (option: WorkGroup) =>
		option === "all"
			? listed.length
			: listed.filter((project) => project.category === option).length;

	const listRef = useRef<HTMLDivElement>(null);
	const [listHeight, setListHeight] = useState<number | null>(null);
	useLayoutEffect(() => {
		const list = listRef.current;
		if (!list || typeof ResizeObserver === "undefined") return;
		const update = () => {
			const next = list.getBoundingClientRect().height;
			setListHeight((current) => (current === next ? current : next));
		};
		update();
		const observer = new ResizeObserver(update);
		observer.observe(list);
		return () => observer.disconnect();
	}, []);

	const labels = Object.fromEntries(
		workGroups.map((option) => [option, workGroupLabels[option]]),
	) as Record<WorkGroup, string>;

	return (
		<div className="min-w-0">
			<div className="mb-[clamp(48px,7vw,88px)] grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
				<FilterStrip
					className="w-full min-w-0 max-w-[560px]"
					labelId="work-filter-label"
					hintId="work-filter-hint"
					label="Filter by project type"
					options={workGroups}
					labels={labels}
					value={group}
					onChange={onGroupChange}
					resultsId="work-results"
				/>
				<div className="grid min-w-0 gap-2 px-1 md:justify-items-end md:pb-3 md:text-right">
					<p className="m-0 text-small text-muted-foreground">
						<span className="mono-label mr-2 text-foreground">
							{String(countFor(group)).padStart(2, "0")}
						</span>
						{workGroupDescriptions[group]}
					</p>
					<p className="mono-label m-0 flex min-w-0 items-center gap-2.5 text-muted-foreground">
						<svg
							aria-hidden="true"
							viewBox="0 0 20 16"
							className="size-[18px] shrink-0 text-primary-text"
							fill="none"
							stroke="currentColor"
							strokeWidth={1.5}
						>
							<rect x={1.5} y={1.5} width={17} height={13} rx={2.5} />
							<path d="M1.5 5.5h17" />
							<circle cx={4.5} cy={3.5} r={0.6} fill="currentColor" />
							<circle cx={6.8} cy={3.5} r={0.6} fill="currentColor" />
						</svg>
						<span className="min-w-0">
							Layers: Interface → API → Data → Access → Infrastructure → Release
						</span>
					</p>
				</div>
			</div>
			<p className="sr-only" role="status" aria-live="polite">
				Showing {total} {total === 1 ? "project" : "projects"} in {workGroupLabels[group]}.
			</p>
			<motion.div
				id="work-results"
				className="min-w-0"
				initial={false}
				animate={{ height: listHeight ?? "auto" }}
				transition={{ height: reduceMotion ? { duration: 0 } : spring }}
			>
				<div ref={listRef} className="relative grid min-w-0 gap-[clamp(64px,9vw,120px)]">
					<LayoutGroup id="work-results">
						<AnimatePresence mode="popLayout" initial={false}>
							{visible.length > 0 ? (
								visible.map((section) => (
									<WorkSection
										key={section.category}
										category={section.category}
										index={section.index}
										layout={section.layout}
										items={section.items}
										reduceMotion={reduceMotion}
									/>
								))
							) : (
								<motion.div
									key="empty"
									layout="position"
									transition={reduceMotion ? { duration: 0 } : undefined}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
								>
									<EmptyState
										title="No projects in this view yet."
										description="Try another group to see more of my work."
									>
										{group !== "all" ? (
											<Button type="button" size="lg" onClick={() => onGroupChange("all")}>
												Show all work
											</Button>
										) : null}
									</EmptyState>
								</motion.div>
							)}
						</AnimatePresence>
					</LayoutGroup>
				</div>
			</motion.div>
		</div>
	);
}
