import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { layerEntries, layerLabels, STORY_LAYERS, type StoryChapterItem } from "./chapters";

interface RailProps {
	chapters: StoryChapterItem[];
	activeId: string;
	onSelect: (id: string) => void;
}

function activeChapter(chapters: StoryChapterItem[], activeId: string) {
	const index = Math.max(
		0,
		chapters.findIndex((chapter) => chapter.domId === activeId),
	);
	return { index, chapter: chapters[index] };
}

/** "3 of 6 layers reached" — counts the planes that are lit, so the two always agree. */
export function depthText(chapter: StoryChapterItem | undefined) {
	if (!chapter || chapter.reached.length === 0) return "Before the stack";
	return `${chapter.reached.length} of ${STORY_LAYERS.length} layers reached`;
}

function layerState(
	chapter: StoryChapterItem | undefined,
	id: (typeof STORY_LAYERS)[number]["id"],
) {
	if (chapter?.layers.includes(id)) return "here";
	if (chapter?.reached.includes(id)) return "reached";
	return undefined;
}

/**
 * The one stack on the page: six planes, interface in front, release at the
 * back. Planes light cumulatively as chapters reach them (the ones the
 * current chapter names are pulled forward). A trace dot follows real scroll
 * progress down through the stack. Each reached plane is a link to the
 * chapter where that layer first appears.
 */
function LayerStack({
	chapters,
	active,
	onSelect,
	trackRef,
}: {
	chapters: StoryChapterItem[];
	active: StoryChapterItem | undefined;
	onSelect: (id: string) => void;
	trackRef: RefObject<HTMLElement | null>;
}) {
	const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start 40%", "end 70%"] });
	const y = useTransform(scrollYProgress, (value) => `${Math.min(1, Math.max(0, value)) * 100}%`);
	const entries = layerEntries(chapters);

	return (
		<div className="sd-depth">
			<div className="sd-depth-stack">
				<span aria-hidden="true" className="sd-depth-line" />
				<motion.span aria-hidden="true" className="sd-depth-dot-track" style={{ y }}>
					<span className="sd-depth-dot" />
				</motion.span>
				<ol className="sd-depth-list" aria-label="Layers of the stack">
					{entries.map((entry, index) => {
						const state = layerState(active, entry.id);
						const inner = (
							<>
								<span aria-hidden="true" className="sd-depth-plane-box">
									<span className="sd-depth-plane" />
								</span>
								<span className="sd-depth-label">{entry.label}</span>
								{entry.chapter ? (
									<span className="sd-depth-chapter" aria-hidden="true">
										{entry.chapter.numeral}
									</span>
								) : null}
								<span className="sr-only">
									{entry.chapter
										? `, first named in chapter ${entry.chapter.numeral}, ${entry.chapter.label}${state ? ", reached" : ""}`
										: ", not named in this story"}
								</span>
							</>
						);
						return (
							<li
								key={entry.id}
								className="sd-depth-row"
								data-state={state}
								style={{ "--i": index } as CSSProperties}
							>
								{entry.chapter ? (
									<a
										href={`#${entry.chapter.domId}`}
										className="sd-depth-link"
										onClick={() => entry.chapter && onSelect(entry.chapter.domId)}
									>
										{inner}
									</a>
								) : (
									<span className="sd-depth-link">{inner}</span>
								)}
							</li>
						);
					})}
				</ol>
			</div>
			<p className="m-0 mt-4 text-caption text-muted-foreground" aria-live="polite">
				<span className="sr-only">At this chapter: </span>
				{depthText(active)}
				{active && active.layers.length > 0 ? (
					<span className="sr-only">
						. This chapter names {layerLabels(active.layers).join(", ")}.
					</span>
				) : null}
			</p>
		</div>
	);
}

/**
 * Wide screens: a sticky rail beside the reading column. The layer stack on
 * top carries the depth; the chapter list under it is plain anchor links
 * (they work without JavaScript).
 */
export function DepthRail({
	chapters,
	activeId,
	onSelect,
	trackRef,
}: RailProps & { trackRef: RefObject<HTMLElement | null> }) {
	const { index: activeIndex, chapter: active } = activeChapter(chapters, activeId);
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
			<LayerStack chapters={chapters} active={active} onSelect={onSelect} trackRef={trackRef} />
			<ol className="sd-rail-list">
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

/** Six tiny stacked planes for the narrow bar; lit cumulatively. */
function MiniStack({ chapter }: { chapter: StoryChapterItem | undefined }) {
	return (
		<svg aria-hidden="true" viewBox="0 0 20 26" className="sd-mini-stack" focusable="false">
			{STORY_LAYERS.map((layer, index) => {
				const y = 3 + index * 4;
				return (
					<path
						key={layer.id}
						d={`M10 ${y - 2.6} L18.5 ${y} L10 ${y + 2.6} L1.5 ${y} Z`}
						data-state={layerState(chapter, layer.id)}
					/>
				);
			})}
		</svg>
	);
}

/**
 * Narrow screens: a slim bar pinned to the top (the dock lives at the bottom
 * there). It shows the chapter being read, a compact layer stack, and the
 * reading progress; opening it lists every chapter and every layer. A native
 * <details>, so it works without JS.
 */
export function DepthBar({ chapters, activeId, onSelect }: RailProps) {
	const detailsRef = useRef<HTMLDetailsElement>(null);
	const { index: activeIndex, chapter: active } = activeChapter(chapters, activeId);
	const fill = chapters.length > 0 ? (activeIndex + 1) / chapters.length : 0;
	const entries = layerEntries(chapters);
	const close = () => {
		if (detailsRef.current) detailsRef.current.open = false;
	};

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
					<MiniStack chapter={active} />
					<span className="sr-only">. {depthText(active)}.</span>
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
									close();
								}}
							>
								<span className="sd-rail-num">{chapter.numeral}</span>
								<span className="min-w-0">{chapter.label}</span>
							</a>
						</li>
					))}
				</ol>
				<div className="sd-bar-layers">
					<p className="mono-label m-0 text-muted-foreground">{depthText(active)}</p>
					<ul aria-label="Jump to the chapter where a layer first appears">
						{entries.map((entry) => (
							<li key={entry.id} data-state={layerState(active, entry.id)}>
								{entry.chapter ? (
									<a
										href={`#${entry.chapter.domId}`}
										onClick={() => {
											if (entry.chapter) onSelect(entry.chapter.domId);
											close();
										}}
									>
										{entry.label}
										<span className="sr-only">, chapter {entry.chapter.numeral}</span>
									</a>
								) : (
									<span>{entry.label}</span>
								)}
							</li>
						))}
					</ul>
				</div>
			</details>
		</nav>
	);
}
