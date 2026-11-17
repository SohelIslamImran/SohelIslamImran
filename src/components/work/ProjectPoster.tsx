import { useId, useRef, type CSSProperties } from "react";
import type { ProjectContent } from "../../types/content";
import { mediaHref } from "../../lib/media";
import { cn } from "../../lib/utils";
import { PortfolioImage } from "../PortfolioImage";
import { useOffscreenPause } from "../motion";
import { POSTER_HEIGHT, POSTER_WIDTH, posterLayers } from "./poster-art";
import { posterStyles } from "./poster-styles";
import { hashString, projectSlug } from "./project-utils";
import { useDepthTilt } from "./useDepthTilt";

export type PosterSize = "feature" | "compact" | "hero" | "fill";
/** `card` and `hero` separate their planes in 3D; `flat` stays a still picture (small thumbnails). */
export type PosterDepth = "card" | "hero" | "flat";

const sizeClasses: Record<PosterSize, string> = {
	feature: "aspect-[16/10]",
	compact: "aspect-[16/9]",
	hero: "aspect-[4/3] sm:aspect-[16/9] lg:aspect-[2.25/1]",
	fill: "h-full min-h-0",
};

const planes = ["back", "mid", "front"] as const;

/**
 * The visual for a project card or detail page. A published cover image wins;
 * otherwise the project's generated artwork (keyed by id, with a seeded
 * fallback for projects added later in the CMS), drawn as three planes that
 * separate in 3D when the card is tilted, hovered, or focused.
 *
 * Decorative: the card or page title already names the project. Loops pause
 * off-screen and hold still under reduced motion.
 */
export function ProjectPoster({
	project,
	size = "feature",
	depth = "card",
	className,
	priority = false,
	transition = false,
}: {
	project: ProjectContent;
	size?: PosterSize;
	depth?: PosterDepth;
	className?: string;
	/** Load a cover image eagerly (detail hero). */
	priority?: boolean;
	/** Takes part in the card → case-study view transition. */
	transition?: boolean;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const uid = `wp${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
	const cover = project.cover;
	const coverSrc = mediaHref(cover);
	useOffscreenPause(ref, !coverSrc);
	useDepthTilt(ref, !coverSrc && depth !== "flat");
	const vtSlug = transition ? projectSlug(project) || undefined : undefined;

	if (cover && coverSrc) {
		return (
			<div
				data-slot="project-poster"
				data-vt-poster={vtSlug}
				className={cn(
					"relative isolate overflow-hidden bg-muted shadow-[inset_0_0_0_1px_var(--theme-line)]",
					sizeClasses[size],
					className,
				)}
			>
				<PortfolioImage
					src={coverSrc}
					alt=""
					width={cover.width ?? 1600}
					height={cover.height ?? 1000}
					loading={priority ? "eager" : "lazy"}
					fetchPriority={priority ? "high" : undefined}
					sizes={
						size === "hero"
							? "(min-width: 1280px) 1200px, 100vw"
							: "(min-width: 1024px) 600px, 100vw"
					}
					className="absolute inset-0 size-full rounded-none object-cover transition-[scale] duration-700 ease-trace pointer-fine:group-hover/card:scale-[1.03] motion-reduce:transition-none"
				/>
			</div>
		);
	}

	const seed = hashString(`${project.id}:${project.title}`);
	const style = {
		"--wp-glow-x": `${18 + (seed % 64)}%`,
		"--wp-glow-y": `${(seed >>> 8) % 24}%`,
	} as CSSProperties;
	const layers = posterLayers({ uid, id: project.id, title: project.title });

	return (
		<div
			ref={ref}
			data-slot="project-poster"
			data-poster={project.id}
			data-depth={depth}
			data-vt-poster={vtSlug}
			aria-hidden="true"
			className={cn(sizeClasses[size], className)}
			style={style}
		>
			<style href="trace-work-posters" precedence="default">
				{posterStyles}
			</style>
			<div data-poster-stage="">
				{planes.map((plane) => (
					<svg
						key={plane}
						data-plane={plane}
						viewBox={`0 0 ${POSTER_WIDTH} ${POSTER_HEIGHT}`}
						preserveAspectRatio="xMidYMid meet"
						focusable="false"
						role="presentation"
					>
						{layers[plane]}
					</svg>
				))}
			</div>
			<div data-poster-light="" />
		</div>
	);
}
