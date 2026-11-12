import { useEffect, useRef, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import type { ProjectContent } from "../types/content";
import { cn } from "../lib/utils";
import { ArrowRightIcon } from "./chrome/icons";
import { ProjectCard } from "./ProjectCard";
import { buttonVariants } from "./ui/button";
import { EmptyState, Section, SectionHeading } from "./ui/portfolio";
import { linkableProjects } from "./work/project-utils";

/** Projects whose artwork is a phone. They never open the deck: the work leads with a web product. */
const PHONE_ARTWORK = new Set(["expo-in-app-updates"]);

/** Moves the first project without phone artwork to the front; everything else keeps its order. */
function leadWithInterface(picks: ProjectContent[]): ProjectContent[] {
	const index = picks.findIndex((project) => !PHONE_ARTWORK.has(project.id));
	if (index <= 0) return picks;
	return [picks[index], ...picks.slice(0, index), ...picks.slice(index + 1)];
}

/** Large screens with room for a whole card: the deck sticks and stacks. */
const DECK_QUERY = "(min-width: 1024px) and (min-height: 760px)";

/**
 * While the deck is on screen, each card that the next one slides over sets
 * `--cover` (0–1), and CSS settles it back and dims it. No-op without JS,
 * under reduced motion, and where the deck does not stick.
 */
function useDeckDepth(listRef: React.RefObject<HTMLOListElement | null>) {
	useEffect(() => {
		const list = listRef.current;
		if (!list || typeof IntersectionObserver === "undefined") return;
		const deck = window.matchMedia(DECK_QUERY);
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
		const cards = Array.from(list.querySelectorAll<HTMLElement>("[data-deck-card]"));
		let frame = 0;
		let visible = false;

		const reset = () => cards.forEach((card) => card.style.removeProperty("--cover"));
		const measure = () => {
			frame = 0;
			if (!deck.matches || reduce.matches) {
				reset();
				return;
			}
			cards.forEach((card, index) => {
				const next = cards[index + 1];
				if (!next) return;
				const rect = card.getBoundingClientRect();
				const nextTop = next.getBoundingClientRect().top;
				const cover = Math.min(1, Math.max(0, (rect.bottom - nextTop) / rect.height));
				card.style.setProperty("--cover", cover.toFixed(3));
			});
		};
		const onScroll = () => {
			if (visible && !frame) frame = requestAnimationFrame(measure);
		};
		const observer = new IntersectionObserver(([entry]) => {
			visible = entry?.isIntersecting ?? false;
			if (visible) onScroll();
		});
		observer.observe(list);
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);
		deck.addEventListener("change", measure);
		return () => {
			observer.disconnect();
			cancelAnimationFrame(frame);
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
			deck.removeEventListener("change", measure);
			reset();
		};
	}, [listRef]);
}

/**
 * The home-page cut, as a stacked deck: three featured projects as large
 * cards. On large screens each card sticks under the dock and the next one
 * slides over it, so the projects pile up like layers; covered cards settle
 * back. Elsewhere (and without JS) it is a plain list. Featured projects
 * come first; everything else lives on /work.
 */
export function SelectedWork({
	projects,
	className,
}: {
	projects: ProjectContent[];
	className?: string;
}) {
	const visible = linkableProjects(projects);
	const picks = leadWithInterface(
		[...visible]
			.sort((a, b) => Number(b.featured === true) - Number(a.featured === true))
			.slice(0, 3),
	);
	const listRef = useRef<HTMLOListElement>(null);
	useDeckDepth(listRef);

	return (
		<Section id="work" aria-labelledby="selected-work-title" className={className}>
			<SectionHeading
				id="selected-work-title"
				index="01"
				eyebrow="Work"
				title="A few things I've helped build."
				description="Explore products, open-source tools, and the problems behind them."
				actions={
					visible.length > 0 ? (
						<Link
							to="/work"
							search={{ group: "all" }}
							className={cn(buttonVariants({ variant: "outline" }), "no-underline")}
						>
							All work
							<span className="sr-only">, {visible.length} projects</span>
							<ArrowRightIcon aria-hidden="true" className="size-4" />
						</Link>
					) : null
				}
			/>
			{picks.length > 0 ? (
				<ol
					ref={listRef}
					data-work-deck=""
					aria-label="Selected projects"
					className="m-0 grid min-w-0 list-none gap-4 p-0 md:gap-5 [@media(min-width:1024px)_and_(min-height:760px)]:gap-[14vh]"
				>
					{picks.map((project, index) => (
						<li
							key={project.id}
							data-deck-card=""
							className={cn(
								"relative min-w-0 origin-top [@media(min-width:1024px)_and_(min-height:760px)]:sticky",
								"[scale:calc(1-var(--cover,0)*0.06)] motion-reduce:[scale:1]",
								"after:pointer-events-none after:absolute after:inset-0 after:z-[4] after:rounded-card after:bg-paper after:opacity-[calc(var(--cover,0)*0.45)] after:content-['']",
							)}
							style={
								{
									top: `calc(var(--dock-space-top) + 28px + ${index * 18}px)`,
								} as CSSProperties
							}
						>
							<ProjectCard
								project={project}
								variant="split"
								reverse={index % 2 === 1}
								className="shadow-surface"
							/>
						</li>
					))}
				</ol>
			) : (
				<EmptyState
					level={3}
					title="Selected work is being updated."
					description="Projects will appear here once their public details are ready."
				/>
			)}
		</Section>
	);
}
