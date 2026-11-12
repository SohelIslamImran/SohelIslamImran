import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { useScroll } from "motion/react";
import { TraceLine } from "../../motion/TraceLine";
import { STORY_LAYERS, layerLabels, type StoryChapterItem } from "./chapters";

interface RailProps {
	chapters: StoryChapterItem[];
	activeId: string;
	onSelect: (id: string) => void;
}

/**
 * Six cells, interface at the top and release at the bottom. Cells for layers
 * reached earlier in the story stay softly lit; layers this chapter names are
 * fully lit. Text alternative in the caption next to it.
 */
function LayerGauge({ chapter }: { chapter: StoryChapterItem | undefined }) {
	const reached = chapter?.reached ?? [];
	const here = chapter?.layers ?? [];
	return (
		<div className="sd-gauge" aria-hidden="true">
			{STORY_LAYERS.map((layer, index) => (
				<span
					key={layer.id}
					className="sd-gauge-cell"
					data-state={
						here.includes(layer.id) ? "here" : reached.includes(layer.id) ? "reached" : undefined
					}
					style={{ "--i": index } as CSSProperties}
				>
					<span className="sd-gauge-label">{layer.label}</span>
				</span>
			))}
		</div>
	);
}

function gaugeText(chapter: StoryChapterItem | undefined) {
	if (!chapter) return "";
	if (chapter.reached.length === 0) return "Before the stack";
	return `${chapter.reached.length} of ${STORY_LAYERS.length} layers reached`;
}

/**
 * Wide screens: a sticky rail beside the reading column. The trace line fills
 * with real scroll progress through the chapters; chapter nodes are anchor
 * links (they work without JavaScript); the gauge under them shows how far
 * behind the interface the story has reached at the chapter being read.
 */
export function DepthRail({
	chapters,
	activeId,
	onSelect,
	trackRef,
}: RailProps & { trackRef: RefObject<HTMLElement | null> }) {
	const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start 40%", "end 70%"] });
	const activeIndex = Math.max(
		0,
		chapters.findIndex((chapter) => chapter.domId === activeId),
	);
	const active = chapters[activeIndex];
	const progress = chapters.length > 0 ? ((activeIndex + 1) / chapters.length) * 100 : 0;

	return (
		<nav className="sd-rail" aria-label="Story chapters">
			<div className="sd-rail-head">
				<span className="mono-label text-muted-foreground">Depth</span>
				<span className="sd-rail-count" data-numeric="">
					<span className="text-foreground">{active?.numeral ?? "00"}</span>
					<span className="text-muted-foreground"> / {chapters.at(-1)?.numeral ?? "00"}</span>
				</span>
			</div>
			<div className="relative mt-5 pl-7">
				<TraceLine progress={scrollYProgress} className="absolute top-2 bottom-2 left-0" />
				<ol className="m-0 grid list-none gap-1 p-0">
					{chapters.map((chapter, index) => {
						const isActive = chapter.domId === activeId;
						return (
							<li key={chapter.domId}>
								<a
									href={`#${chapter.domId}`}
									onClick={() => onSelect(chapter.domId)}
									aria-current={isActive ? "location" : undefined}
									data-passed={index < activeIndex ? "" : undefined}
									className="sd-rail-link"
								>
									<span className="sd-rail-num">{chapter.numeral}</span>
									<span className="min-w-0">
										<span className="sd-rail-title">{chapter.label}</span>
										{chapter.eyebrow.trim() ? (
											<span className="sd-rail-eyebrow">{chapter.eyebrow.trim()}</span>
										) : null}
									</span>
								</a>
							</li>
						);
					})}
				</ol>
			</div>
			<div className="sd-rail-gauge">
				<LayerGauge chapter={active} />
				<p className="m-0 mt-3 text-caption text-muted-foreground">
					<span className="sr-only">At this chapter: </span>
					{gaugeText(active)}
					{active && active.layers.length > 0 ? (
						<span className="sr-only">
							. This chapter names {layerLabels(active.layers).join(", ")}.
						</span>
					) : null}
				</p>
			</div>
			<div
				role="progressbar"
				aria-label="Story progress"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(progress)}
				aria-valuetext={`Chapter ${activeIndex + 1} of ${chapters.length}`}
				className="sr-only"
			/>
		</nav>
	);
}

/**
 * Narrow screens: a slim bar pinned to the top (the dock lives at the bottom
 * there). It shows the chapter being read and the reading progress; opening
 * it lists every chapter. A native <details>, so it works without JS.
 */
export function DepthBar({ chapters, activeId, onSelect }: RailProps) {
	const detailsRef = useRef<HTMLDetailsElement>(null);
	const activeIndex = Math.max(
		0,
		chapters.findIndex((chapter) => chapter.domId === activeId),
	);
	const active = chapters[activeIndex];
	const fill = chapters.length > 0 ? (activeIndex + 1) / chapters.length : 0;

	// Reading on to a new chapter folds the list away so it never covers the text.
	useEffect(() => {
		if (detailsRef.current) detailsRef.current.open = false;
	}, [activeId]);

	return (
		<nav className="sd-bar" aria-label="Story chapters">
			<details ref={detailsRef} className="sd-bar-details group/bar">
				<summary className="sd-bar-summary">
					<span className="sd-bar-num" data-numeric="">
						{active?.numeral ?? "00"}
					</span>
					<span className="min-w-0 flex-1 truncate text-[15px] font-medium">
						<span className="sr-only">
							Chapter {activeIndex + 1} of {chapters.length}:{" "}
						</span>
						{active?.label}
					</span>
					<span className="mono-label shrink-0 text-muted-foreground">
						/ {chapters.at(-1)?.numeral ?? "00"}
					</span>
					<svg
						viewBox="0 0 16 16"
						aria-hidden="true"
						className="size-4 shrink-0 text-muted-foreground transition-[rotate] duration-300 ease-trace group-open/bar:rotate-180"
					>
						<path
							d="m4.5 6.25 3.5 3.5 3.5-3.5"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.6"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					<span
						aria-hidden="true"
						className="sd-bar-fill"
						style={{ transform: `scaleX(${fill})` }}
					/>
				</summary>
				<ol className="sd-bar-list">
					{chapters.map((chapter) => (
						<li key={chapter.domId}>
							<a
								href={`#${chapter.domId}`}
								aria-current={chapter.domId === activeId ? "location" : undefined}
								className="sd-bar-link"
								onClick={() => {
									onSelect(chapter.domId);
									if (detailsRef.current) detailsRef.current.open = false;
								}}
							>
								<span className="sd-rail-num">{chapter.numeral}</span>
								<span className="min-w-0">{chapter.label}</span>
							</a>
						</li>
					))}
				</ol>
			</details>
		</nav>
	);
}
