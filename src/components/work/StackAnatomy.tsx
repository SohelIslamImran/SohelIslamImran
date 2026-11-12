import { useId, useRef, useState, type CSSProperties } from "react";
import type { ProjectContent } from "../../types/content";
import { cn } from "../../lib/utils";
import { useOffscreenPause } from "../motion";
import { markTerms, projectAnatomy, type AnatomyLayerId } from "./anatomy";
import { nonEmpty } from "./project-utils";

const ROW = 56;

const anatomyStyles = String.raw`
[data-anatomy-stack] .anatomy-plane {
	translate: -50% -50%;
	transform: rotateX(58deg) rotateZ(-45deg);
	transition: transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease, background-color 300ms ease, border-color 300ms ease;
}
[data-anatomy-stack] .anatomy-plane[data-active] {
	transform: rotateX(58deg) rotateZ(-45deg) translateZ(22px) scale(1.06);
}
@media (prefers-reduced-motion: no-preference) {
	[data-anatomy-stack] .anatomy-pulse {
		animation: anatomy-pulse 3.2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
	}
}
[data-anatomy-stack][data-paused] .anatomy-pulse { animation-play-state: paused; }
@keyframes anatomy-pulse {
	0% { translate: 0 0; opacity: 0; }
	12% { opacity: 1; }
	88% { opacity: 1; }
	100% { translate: 0 var(--len, 0px); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
	[data-anatomy-stack] .anatomy-plane { transition: none; }
}
`;

/**
 * The project's anatomy: the six layers a request crosses, as an exploded 3D
 * stack. Layers that this project's own notes or tools mention are solid; the
 * rest are outlines. It shows what the content mentions, not a full inventory. Choosing a layer lifts its plane, underlines the words that lit
 * it, and dims the notes that do not touch it.
 *
 * Without JS every note is listed with its layers; the buttons only filter.
 */
export function StackAnatomy({ project }: { project: ProjectContent }) {
	const anatomy = projectAnatomy(project);
	const highlights = nonEmpty(project.highlights);
	const [selected, setSelected] = useState<AnatomyLayerId | null>(null);
	const [preview, setPreview] = useState<AnatomyLayerId | null>(null);
	const active = preview ?? selected;
	const activeLayer = anatomy.layers.find((layer) => layer.id === active) ?? null;
	const stackRef = useRef<HTMLDivElement>(null);
	useOffscreenPause(stackRef);
	const captionId = `anatomy-caption-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
	const touchedIndexes = anatomy.layers.flatMap((layer, index) => (layer.touched ? [index] : []));
	const first = touchedIndexes[0] ?? 0;
	const last = touchedIndexes[touchedIndexes.length - 1] ?? 0;
	const nameOf = (id: AnatomyLayerId) =>
		anatomy.layers.find((layer) => layer.id === id)?.name ?? id;

	let caption: string;
	if (!activeLayer) {
		caption = `Its notes and tools mention ${anatomy.touchedCount} of 6 layers. Choose a layer to see where.`;
	} else if (!activeLayer.touched) {
		caption = `${activeLayer.name}: ${activeLayer.meaning} Not mentioned in this project's notes or tools.`;
	} else {
		const noteCount = activeLayer.notes.length;
		const notes =
			highlights.length > 0
				? ` ${noteCount} of ${highlights.length} ${highlights.length === 1 ? "note" : "notes"} ${noteCount === 1 ? "mentions" : "mention"} it.`
				: "";
		caption = `${activeLayer.name}: ${activeLayer.meaning}${notes} Mentioned as: ${activeLayer.terms.slice(0, 5).join(", ")}.`;
	}

	return (
		<div data-slot="stack-anatomy" className="grid min-w-0 gap-8 md:gap-10">
			<style href="trace-work-anatomy" precedence="default">
				{anatomyStyles}
			</style>
			<div className="grid min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] items-start gap-3 sm:gap-6">
				{/* Exploded stack (decorative; the buttons beside it carry the meaning) */}
				<div
					ref={stackRef}
					aria-hidden="true"
					data-anatomy-stack=""
					className="relative min-w-0 [perspective:1000px]"
					style={{ height: ROW * 6 }}
				>
					{touchedIndexes.length > 1 ? (
						<span
							className="absolute left-1/2 w-px -translate-x-1/2 bg-primary-line opacity-60"
							style={{ top: first * ROW + ROW / 2, height: (last - first) * ROW }}
						>
							<span
								className="anatomy-pulse absolute -top-[3px] -left-[3px] size-[7px] rounded-full bg-primary shadow-[0_0_0_4px_var(--theme-accent-soft)]"
								style={{ "--len": `${(last - first) * ROW}px` } as CSSProperties}
							/>
						</span>
					) : null}
					{anatomy.layers.map((layer, index) => {
						const isActive = active === layer.id;
						return (
							<span
								key={layer.id}
								className="absolute left-1/2 block"
								style={{ top: index * ROW + ROW / 2, zIndex: 10 - index }}
							>
								<span
									data-active={isActive || undefined}
									data-touched={layer.touched || undefined}
									className={cn(
										"anatomy-plane absolute block size-[clamp(78px,15vw,124px)] rounded-[18%] border",
										layer.touched
											? "border-[color-mix(in_srgb,var(--theme-accent-line)_60%,var(--theme-line-strong))] bg-[color-mix(in_srgb,var(--theme-accent)_9%,var(--theme-surface-solid))] shadow-[0_18px_30px_-18px_var(--theme-shadow-strong)]"
											: "border-dashed border-line-strong bg-[color-mix(in_srgb,var(--theme-ink)_2%,transparent)]",
										isActive &&
											"border-primary-line bg-[color-mix(in_srgb,var(--theme-accent)_26%,var(--theme-surface-solid))]",
										activeLayer && !isActive && "opacity-45",
									)}
								/>
							</span>
						);
					})}
				</div>

				{/* Layer controls, aligned row for row with the planes */}
				<ul
					aria-label="Layers of the stack"
					aria-describedby={captionId}
					className="m-0 grid min-w-0 list-none p-0"
				>
					{anatomy.layers.map((layer) => {
						const isSelected = selected === layer.id;
						return (
							<li key={layer.id} className="min-w-0" style={{ height: ROW }}>
								<button
									type="button"
									aria-pressed={isSelected}
									onClick={() => setSelected(isSelected ? null : layer.id)}
									onPointerEnter={(event) => {
										if (event.pointerType === "mouse") setPreview(layer.id);
									}}
									onPointerLeave={() => setPreview(null)}
									onBlur={() => setPreview(null)}
									className={cn(
										"pressable group/layer flex h-full w-full min-w-0 items-center justify-between gap-3 rounded-inner-sm px-3 text-left",
										"transition-[background-color,color,scale] duration-200 ease-trace",
										"pointer-fine:hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)]",
										isSelected && "bg-primary-soft pointer-fine:hover:bg-primary-soft",
									)}
								>
									<span className="grid min-w-0 gap-0.5">
										<span
											className={cn(
												"truncate text-[15px] leading-tight font-semibold tracking-[-0.01em]",
												layer.touched ? "text-foreground" : "text-muted-foreground",
												isSelected && "text-primary-text",
											)}
										>
											{layer.name}
										</span>
										<span className="mono-label truncate text-muted-foreground">
											{layer.touched
												? layer.notes.length > 0
													? `${layer.notes.length} ${layer.notes.length === 1 ? "note" : "notes"}`
													: "in its tools"
												: "not mentioned"}
										</span>
									</span>
									<span
										aria-hidden="true"
										className={cn(
											"size-2 shrink-0 rounded-full",
											layer.touched
												? "bg-primary"
												: "border border-dashed border-line-strong bg-transparent",
										)}
									/>
								</button>
							</li>
						);
					})}
				</ul>
			</div>

			<p
				id={captionId}
				aria-live="polite"
				className="m-0 min-h-[3.1em] max-w-prose rounded-inner border border-line bg-[color-mix(in_srgb,var(--theme-ink)_2.5%,transparent)] px-4 py-3 text-small text-ink-soft"
			>
				{caption}
			</p>

			{highlights.length > 0 ? (
				<ol className="m-0 grid min-w-0 list-none gap-3 p-0">
					{highlights.map((highlight, index) => {
						const layers = anatomy.highlightLayers[index] ?? [];
						const lit = !!active && layers.includes(active);
						const dim = !!active && !lit;
						return (
							<li
								key={highlight}
								className={cn(
									"relative grid min-w-0 grid-cols-[32px_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-inner border border-line bg-surface-solid p-4 transition-[opacity,border-color,translate] duration-300 ease-trace sm:grid-cols-[40px_minmax(0,1fr)] sm:p-5",
									lit && "border-primary-line motion-safe:translate-x-1",
									dim && "opacity-45",
								)}
							>
								<span
									aria-hidden="true"
									className={cn(
										"mono-label grid size-8 place-items-center rounded-full border border-line-strong text-foreground sm:size-10",
										lit && "border-primary-line text-primary-text",
									)}
								>
									{String(index + 1).padStart(2, "0")}
								</span>
								<div className="grid min-w-0 gap-2.5">
									<p className="m-0 max-w-prose text-[16px] leading-[1.55] text-ink-soft sm:text-body">
										{markTerms(highlight, lit ? active : null).map((part, partIndex) =>
											part.marked ? (
												<mark
													key={partIndex}
													className="rounded-[3px] bg-transparent text-foreground underline decoration-primary-line decoration-2 underline-offset-[3px]"
												>
													{part.text}
												</mark>
											) : (
												<span key={partIndex}>{part.text}</span>
											),
										)}
									</p>
									{layers.length > 0 ? (
										<p className="mono-label m-0 flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-muted-foreground">
											<span className="sr-only">Layers: </span>
											{layers.map((id, layerIndex) => (
												<span key={id} className={cn(active === id && "text-primary-text")}>
													{nameOf(id)}
													{layerIndex < layers.length - 1 ? (
														<span aria-hidden="true"> ·</span>
													) : null}
												</span>
											))}
										</p>
									) : null}
								</div>
							</li>
						);
					})}
				</ol>
			) : null}
		</div>
	);
}
