import { useId, useRef, useState, type CSSProperties } from "react";
import type { ProjectContent } from "../../types/content";
import { cn } from "../../lib/utils";
import { LayerMini } from "../home/hero/LayerMinis";
import { useOffscreenPause, usePointerFine } from "../motion";
import { markTerms, projectAnatomy, type AnatomyLayer, type AnatomyLayerId } from "./anatomy";
import { nonEmpty } from "./project-utils";

const ROW = 60;

/*
 * The plane glyphs are the hero's LayerMini drawings. Their `.mi-*` classes are
 * styled here under `[data-anatomy-stack]` with our own keyframe names, so the
 * case study does not depend on the home page's stylesheet being loaded.
 * Every glyph rests on a still pose; it only moves on the chosen plane.
 */
const anatomyStyles = String.raw`
[data-anatomy-stack] { --an-ease: cubic-bezier(0.22, 1, 0.36, 1); }
[data-anatomy-stack] .anatomy-plane {
	translate: -50% -50%;
	transform: rotateX(56deg) rotateZ(-45deg);
	transition: transform 520ms var(--an-ease), opacity 300ms ease, background-color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
}
[data-anatomy-stack] .anatomy-plane[data-active] {
	transform: rotateX(56deg) rotateZ(-45deg) translateZ(26px) scale(1.08);
}
[data-anatomy-stack] .anatomy-glyph { display: block; width: 100%; height: 100%; overflow: visible; }
[data-anatomy-stack] .anatomy-glow {
	position: absolute; inset: -6% -12%; pointer-events: none;
	background:
		radial-gradient(40% 42% at 50% 50%, color-mix(in srgb, var(--theme-accent) 10%, transparent), transparent 75%),
		radial-gradient(circle at 1px 1px, var(--theme-line-strong) 1px, transparent 1.3px) 0 0 / 16px 16px;
	-webkit-mask-image: radial-gradient(closest-side, #000 30%, transparent);
	mask-image: radial-gradient(closest-side, #000 30%, transparent);
	opacity: 0.55;
}
[data-anatomy-stack] .mi-press, [data-anatomy-stack] .mi-srv, [data-anatomy-stack] .mi-req, [data-anatomy-stack] .mi-res, [data-anatomy-stack] .mi-write-bg, [data-anatomy-stack] .mi-node { fill: var(--theme-accent-line); }
[data-anatomy-stack] :is(.mi-press, .mi-srv, .mi-req, .mi-res, .mi-write-bg, .mi-node, .mi-cursor, .mi-ver-new) { opacity: 0; }
[data-anatomy-stack] :is(.mi-check, .mi-pass) { opacity: 1; transform-box: fill-box; transform-origin: 50% 50%; }
[data-anatomy-stack] .anatomy-plane:not([data-touched]) .anatomy-glyph { opacity: 0.7; }
[data-anatomy-stack] .anatomy-plane:not([data-touched]) :is(.mi-check, .mi-pass) circle { fill: currentColor; }
[data-anatomy-stack] .mi-write { fill: currentColor; opacity: 0.4; transform-box: fill-box; transform-origin: 0 50%; }
[data-anatomy-stack] .mi-ver { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.02em; text-anchor: middle; fill: currentColor; }
[data-anatomy-stack] .mi-cursor { transform: translate(64px, 84px); }
@keyframes anatomy-excerpt-in {
	from { opacity: 0; translate: 0 8px; }
}
@media (prefers-reduced-motion: no-preference) {
	.anatomy-excerpt { animation: anatomy-excerpt-in 220ms var(--theme-ease); }
	[data-anatomy-stack] .anatomy-pulse { animation: an-pulse 3.2s cubic-bezier(0.65, 0, 0.35, 1) infinite; }
	[data-anatomy-stack] [data-active] .mi-cursor { animation: an-mi-cursor 2.8s var(--an-ease) infinite; }
	[data-anatomy-stack] [data-active] .mi-press { animation: an-mi-press 2.8s var(--an-ease) infinite; }
	[data-anatomy-stack] [data-active] .mi-req { animation: an-mi-req 2.4s var(--an-ease) infinite; }
	[data-anatomy-stack] [data-active] .mi-srv { animation: an-mi-srv 2.4s var(--an-ease) infinite; }
	[data-anatomy-stack] [data-active] .mi-res { animation: an-mi-res 2.4s var(--an-ease) infinite; }
	[data-anatomy-stack] [data-active] .mi-write { animation: an-mi-write 2.8s var(--an-ease) infinite; }
	[data-anatomy-stack] [data-active] .mi-write-late { animation-delay: 0.25s; }
	[data-anatomy-stack] [data-active] .mi-write-bg { animation: an-mi-flash 2.8s var(--an-ease) infinite; }
	[data-anatomy-stack] [data-active] .mi-shackle { animation: an-mi-shackle 2.8s var(--an-ease) infinite; }
	[data-anatomy-stack] [data-active] .mi-check { animation: an-mi-pop 2.8s var(--an-ease) infinite; }
	[data-anatomy-stack] [data-active] .mi-node { animation: an-mi-node 1.8s var(--an-ease) infinite; }
	[data-anatomy-stack] [data-active] .mi-pass { animation: an-mi-pop 2.8s var(--an-ease) infinite; }
	[data-anatomy-stack] [data-active] .mi-ver-old { animation: an-mi-ver-old 2.8s var(--an-ease) infinite; }
	[data-anatomy-stack] [data-active] .mi-ver-new { animation: an-mi-ver-new 2.8s var(--an-ease) infinite; }
	[data-anatomy-stack][data-paused] :is(.anatomy-pulse, [class^="mi-"]) { animation-play-state: paused; }
}
@media (prefers-reduced-motion: reduce) {
	[data-anatomy-stack] .anatomy-plane { transition: none; }
}
@keyframes an-pulse {
	0% { translate: 0 0; opacity: 0; }
	12% { opacity: 1; }
	88% { opacity: 1; }
	100% { translate: 0 var(--len, 0px); opacity: 0; }
}
@keyframes an-mi-cursor {
	0% { transform: translate(64px, 84px); opacity: 0; }
	15% { opacity: 1; }
	42%, 62% { transform: translate(40px, 66px); opacity: 1; }
	50% { transform: translate(40px, 66px) scale(0.86); }
	88%, 100% { transform: translate(64px, 84px); opacity: 0; }
}
@keyframes an-mi-press { 0%, 46% { opacity: 0; } 54%, 76% { opacity: 1; } 92%, 100% { opacity: 0; } }
@keyframes an-mi-req {
	0%, 6% { transform: translateX(0); opacity: 0; }
	12% { opacity: 1; }
	40% { transform: translateX(28px); opacity: 1; }
	46%, 100% { transform: translateX(28px); opacity: 0; }
}
@keyframes an-mi-srv { 0%, 38% { opacity: 0; } 46% { opacity: 0.35; } 62%, 100% { opacity: 0; } }
@keyframes an-mi-res {
	0%, 48% { transform: translateX(0); opacity: 0; }
	54% { opacity: 1; }
	82% { transform: translateX(-28px); opacity: 1; }
	90%, 100% { transform: translateX(-28px); opacity: 0; }
}
@keyframes an-mi-write {
	0%, 4% { transform: scaleX(1); opacity: 0.4; }
	8% { transform: scaleX(0); opacity: 0.9; }
	34% { transform: scaleX(1); opacity: 0.9; }
	70%, 100% { transform: scaleX(1); opacity: 0.4; }
}
@keyframes an-mi-flash { 0%, 30% { opacity: 0; } 40% { opacity: 0.22; } 75%, 100% { opacity: 0; } }
@keyframes an-mi-shackle {
	0%, 6% { transform: translateY(0); }
	16%, 30% { transform: translateY(-6px); }
	40%, 100% { transform: translateY(0); }
}
@keyframes an-mi-pop {
	0%, 6% { transform: scale(1); opacity: 1; }
	14% { transform: scale(0.4); opacity: 0; }
	30% { transform: scale(1.1); opacity: 1; }
	38%, 100% { transform: scale(1); opacity: 1; }
}
@keyframes an-mi-node { 0% { opacity: 0; } 18% { opacity: 1; } 55%, 100% { opacity: 0; } }
@keyframes an-mi-ver-old {
	0%, 52% { transform: translateY(0); opacity: 1; }
	60% { transform: translateY(-5px); opacity: 0; }
	92% { transform: translateY(5px); opacity: 0; }
	100% { transform: translateY(0); opacity: 1; }
}
@keyframes an-mi-ver-new {
	0%, 52% { transform: translateY(5px); opacity: 0; }
	60%, 86% { transform: translateY(0); opacity: 1; }
	94%, 100% { transform: translateY(-5px); opacity: 0; }
}
`;

function plural(count: number, word: string) {
	return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** The short line under a layer's name: what in this project puts it there. */
function layerEvidence(layer: AnatomyLayer) {
	if (!layer.touched) return "Not described here";
	if (layer.notes.length > 0) return plural(layer.notes.length, "highlight");
	if (layer.tags.length > 0) {
		// On the narrowest phones the tool name alone keeps the label to two lines.
		return (
			<>
				<span className="max-[359px]:hidden">Built with </span>
				{layer.tags[0]}
			</>
		);
	}
	return "In the overview";
}

/**
 * Where a project sits in the stack: the six layers a request crosses, as an
 * exploded 3D stack with a small living drawing on each plane. Layers the
 * project's own highlights, tools, or overview point at are solid; the rest
 * are outlines. Choosing a layer lifts its plane, plays its drawing,
 * underlines the words that put it there, and dims the highlights that do not.
 *
 * Without JS every highlight is listed with its layers; the buttons only filter.
 */
export function StackAnatomy({ project }: { project: ProjectContent }) {
	const anatomy = projectAnatomy(project);
	const highlights = nonEmpty(project.highlights);
	const [selected, setSelected] = useState<AnatomyLayerId | null>(null);
	const [preview, setPreview] = useState<AnatomyLayerId | null>(null);
	const pointerFine = usePointerFine();
	const active = preview ?? selected;
	const selectedLayer = anatomy.layers.find((layer) => layer.id === selected);
	const firstMatch = selectedLayer?.notes[0];
	const activeLayer = anatomy.layers.find((layer) => layer.id === active) ?? null;
	const stackRef = useRef<HTMLDivElement>(null);
	useOffscreenPause(stackRef);
	const prefix = `anatomy-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
	const captionId = `${prefix}-caption`;
	const touchedIndexes = anatomy.layers.flatMap((layer, index) => (layer.touched ? [index] : []));
	const first = touchedIndexes[0] ?? 0;
	const last = touchedIndexes[touchedIndexes.length - 1] ?? 0;

	let caption: string;
	const lead = activeLayer
		? `${activeLayer.name}: ${activeLayer.meaning.charAt(0).toLowerCase()}${activeLayer.meaning.slice(1)}`
		: "";
	if (!activeLayer) {
		caption = `${anatomy.touchedCount} of 6 layers documented. Pick one to see the work.`;
	} else if (!activeLayer.touched) {
		caption = `${lead} Not described for this project.`;
	} else if (activeLayer.notes.length > 0) {
		caption = `${lead} ${activeLayer.notes.length} of ${plural(highlights.length, "highlight")} below.`;
	} else if (activeLayer.tags.length > 0) {
		caption = `${lead} Built with ${activeLayer.tags.join(", ")}.`;
	} else {
		caption = `${lead} Named in the overview.`;
	}

	return (
		<div data-slot="stack-anatomy" className="grid min-w-0 gap-8 md:gap-10">
			<style href="trace-work-anatomy" precedence="default">
				{anatomyStyles}
			</style>
			<div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-start gap-2 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
				{/* Exploded stack (decorative; the buttons beside it carry the meaning) */}
				<div
					ref={stackRef}
					aria-hidden="true"
					data-anatomy-stack=""
					className="relative min-w-0 [perspective:1000px]"
					style={{ height: ROW * 6 }}
				>
					<span className="anatomy-glow" />
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
										"anatomy-plane absolute block size-[clamp(76px,13vw,112px)] rounded-[18%] border p-[14%]",
										layer.touched
											? "border-[color-mix(in_srgb,var(--theme-accent-line)_55%,var(--theme-line-strong))] bg-[color-mix(in_srgb,var(--theme-accent)_8%,var(--theme-surface-solid))] text-primary-text shadow-[0_18px_30px_-18px_var(--theme-shadow-strong)]"
											: "border-dashed border-line-strong bg-[color-mix(in_srgb,var(--theme-surface-solid)_70%,transparent)] text-[color-mix(in_srgb,var(--theme-muted)_55%,transparent)]",
										isActive &&
											"border-primary-line bg-[color-mix(in_srgb,var(--theme-accent)_20%,var(--theme-surface-solid))] shadow-[0_26px_40px_-18px_var(--theme-shadow-strong)]",
										activeLayer && !isActive && "opacity-40",
									)}
								>
									<svg viewBox="0 0 100 100" className="anatomy-glyph">
										<LayerMini id={layer.id} />
									</svg>
								</span>
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
						const isActive = active === layer.id;
						return (
							<li key={layer.id} className="min-w-0" style={{ height: ROW }}>
								<button
									type="button"
									aria-pressed={isSelected}
									onClick={() => {
										setSelected(isSelected ? null : layer.id);
										setPreview(null);
									}}
									onPointerEnter={(event) => {
										if (pointerFine && event.pointerType === "mouse") setPreview(layer.id);
									}}
									onPointerLeave={() => setPreview(null)}
									onBlur={() => setPreview(null)}
									className={cn(
										"pressable group/layer flex h-full w-full min-w-0 items-center gap-3 rounded-inner-sm px-2.5 text-left sm:px-3",
										"transition-[background-color,color,scale] duration-200 ease-trace",
										"pointer-fine:hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)]",
										isSelected && "bg-primary-soft pointer-fine:hover:bg-primary-soft",
									)}
								>
									<span
										aria-hidden="true"
										className={cn(
											"size-2 shrink-0 rounded-full transition-[scale,background-color] duration-300 ease-trace",
											layer.touched
												? "bg-primary"
												: "border border-dashed border-line-strong bg-transparent",
											isActive && "scale-150",
										)}
									/>
									<span className="grid min-w-0 flex-1 gap-0.5">
										<span
											className={cn(
												"truncate text-[15px] leading-tight font-semibold tracking-[-0.01em]",
												layer.touched ? "text-foreground" : "text-muted-foreground",
												isSelected && "text-primary-text",
											)}
										>
											{layer.name}
										</span>
										<span className="text-caption leading-[1.3] text-balance text-muted-foreground">
											{layerEvidence(layer)}
										</span>
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			</div>

			<div className="grid gap-3">
				<p
					id={captionId}
					aria-live="polite"
					className="m-0 min-h-[3.1em] max-w-prose rounded-inner border border-line bg-[color-mix(in_srgb,var(--theme-ink)_2.5%,transparent)] px-4 py-3 text-small text-ink-soft"
				>
					{caption}
				</p>
				{selectedLayer && firstMatch !== undefined ? (
					<div
						key={selectedLayer.id}
						className="anatomy-excerpt grid max-w-prose gap-1 rounded-inner border border-primary-line bg-surface-solid p-4 text-small"
					>
						<HighlightText text={highlights[firstMatch]} layer={selectedLayer.id} />
						{selectedLayer.notes.length > 1 ? (
							<a
								href={`#${prefix}-highlight-${firstMatch}`}
								className="inline-flex min-h-11 w-fit items-center text-small font-medium text-primary-text underline underline-offset-4"
							>
								{selectedLayer.notes.length === 2
									? "See both matching highlights"
									: `See all ${selectedLayer.notes.length} matching highlights`}
							</a>
						) : null}
					</div>
				) : null}
			</div>

			<HighlightList highlights={highlights} anatomy={anatomy} active={active} prefix={prefix} />
		</div>
	);
}

function HighlightText({ text, layer }: { text: string; layer: AnatomyLayerId | null }) {
	return (
		<p className="m-0 max-w-prose text-[16px] leading-[1.55] text-ink-soft sm:text-body">
			{markTerms(text, layer).map((part, index) =>
				part.marked ? (
					<mark
						key={index}
						className="rounded-[3px] bg-transparent text-foreground underline decoration-primary-line decoration-2 underline-offset-[3px]"
					>
						{part.text}
					</mark>
				) : (
					part.text
				),
			)}
		</p>
	);
}

export function HighlightList({
	highlights,
	anatomy,
	active = null,
	prefix,
}: {
	highlights: string[];
	anatomy?: ReturnType<typeof projectAnatomy>;
	active?: AnatomyLayerId | null;
	prefix?: string;
}) {
	if (highlights.length === 0) return null;
	return (
		<ol aria-label="Highlights" className="m-0 grid min-w-0 list-none gap-3 p-0">
			{highlights.map((highlight, index) => {
				const layers = anatomy?.highlightLayers[index] ?? [];
				const lit = !!active && layers.includes(active);
				const dim = !!active && !lit;
				return (
					<li
						key={index}
						id={prefix ? `${prefix}-highlight-${index}` : undefined}
						tabIndex={prefix ? -1 : undefined}
						className={cn(
							"relative grid min-w-0 grid-cols-[32px_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-inner border border-line bg-surface-solid p-4 transition-[background-color,border-color,translate] duration-220 ease-trace sm:grid-cols-[40px_minmax(0,1fr)] sm:p-5",
							lit && "border-primary-line motion-safe:translate-x-1",
							dim && "border-transparent bg-transparent",
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
							<HighlightText text={highlight} layer={lit ? active : null} />
							{layers.length > 0 ? (
								<p className="mono-label m-0 flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-muted-foreground">
									<span className="sr-only">Layers: </span>
									{layers.map((id, layerIndex) => (
										<span key={id} className={cn(active === id && "text-primary-text")}>
											{anatomy?.layers.find((layer) => layer.id === id)?.name ?? id}
											{layerIndex < layers.length - 1 ? <span aria-hidden="true"> ·</span> : null}
										</span>
									))}
								</p>
							) : null}
						</div>
					</li>
				);
			})}
		</ol>
	);
}
