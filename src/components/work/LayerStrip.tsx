import type { ProjectContent } from "../../types/content";
import { cn } from "../../lib/utils";
import { projectAnatomy } from "./anatomy";

/**
 * A compact "how deep did this go" reading for a card: six ticks, one per
 * layer from Interface down to Release, lit where the project's own notes
 * or tools mention it. The names of the lit layers follow, so it reads without colour.
 */
export function LayerStrip({
	project,
	className,
	showNames = true,
}: {
	project: ProjectContent;
	className?: string;
	showNames?: boolean;
}) {
	const { layers, touchedCount } = projectAnatomy(project);
	if (touchedCount === 0) return null;
	const touched = layers.filter((layer) => layer.touched).map((layer) => layer.name);
	return (
		<div
			data-slot="layer-strip"
			className={cn("flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5", className)}
		>
			<span aria-hidden="true" className="flex shrink-0 items-end gap-[3px]">
				{layers.map((layer, index) => (
					<span
						key={layer.id}
						className={cn(
							"block w-[5px] rounded-full transition-[background-color,scale] duration-300 ease-trace",
							layer.touched
								? "bg-primary-line"
								: "bg-[color-mix(in_srgb,var(--theme-ink)_12%,transparent)]",
						)}
						style={{ height: `${16 - index * 2}px` }}
					/>
				))}
			</span>
			<p className="mono-label m-0 min-w-0 text-muted-foreground">
				<span className="sr-only">Layers mentioned in this project: </span>
				{showNames ? (
					touched.join(" · ")
				) : (
					<>
						{touchedCount}/6 layers<span className="sr-only">: {touched.join(", ")}</span>
					</>
				)}
			</p>
		</div>
	);
}
