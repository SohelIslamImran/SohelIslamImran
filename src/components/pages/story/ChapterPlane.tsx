import type { CSSProperties } from "react";
import { layerLabels, STORY_LAYERS, type StoryChapterItem } from "./chapters";

/**
 * One chapter. Its heading sits on a plane that comes forward out of the page
 * as it scrolls in (CSS scroll-driven 3D; static where unsupported or under
 * reduced motion). The sheets stacked behind the plane grow with each
 * chapter: the further you read, the more layers sit above you. The reading
 * copy itself never moves.
 */
export function ChapterPlane({ chapter, index }: { chapter: StoryChapterItem; index: number }) {
	const eyebrow = chapter.eyebrow.trim();
	const title = chapter.title.trim();
	const artifact = chapter.artifact?.trim();
	const sheets = Math.min(index, 5);
	const named = layerLabels(chapter.layers);

	return (
		<section
			id={chapter.domId}
			tabIndex={-1}
			aria-labelledby={chapter.titleId}
			className="sd-chapter"
			style={{ "--sheets": sheets } as CSSProperties}
		>
			<div className="sd-plane-wrap">
				{Array.from({ length: sheets }, (_, k) => (
					<span
						key={k}
						aria-hidden="true"
						className="sd-sheet"
						style={{ "--k": k + 1 } as CSSProperties}
					/>
				))}
				<header className="sd-plane">
					<span aria-hidden="true" className="sd-numeral">
						{chapter.numeral}
					</span>
					<div className="min-w-0">
						{eyebrow && title ? (
							<p className="mono-label m-0 text-primary-text [overflow-wrap:anywhere]">{eyebrow}</p>
						) : null}
						<h2
							id={chapter.titleId}
							className="mt-3 mb-0 text-[clamp(1.75rem,3.6vw,2.75rem)] leading-[1.04] font-[640] tracking-[-0.04em] [overflow-wrap:anywhere]"
						>
							<span className="sr-only">Chapter {chapter.numeral}: </span>
							{chapter.label}
						</h2>
						<div className="sd-layers">
							<span className="sd-cells" aria-hidden="true">
								{STORY_LAYERS.map((layer) => (
									<span
										key={layer.id}
										data-state={
											chapter.layers.includes(layer.id)
												? "here"
												: chapter.reached.includes(layer.id)
													? "reached"
													: undefined
										}
									/>
								))}
							</span>
							<span className="mono-label text-muted-foreground">
								{named.length > 0 ? named.join(" · ") : "Before the stack"}
							</span>
						</div>
					</div>
				</header>
			</div>

			{chapter.paragraphs.length > 0 ? (
				<div className="sd-body">
					{chapter.paragraphs.map((paragraph, paragraphIndex) => (
						<p key={`${chapter.domId}-${paragraphIndex}`}>{paragraph}</p>
					))}
				</div>
			) : null}

			{artifact ? (
				<figure className="sd-takeaway">
					<figcaption className="mono-label">What stayed with me</figcaption>
					<blockquote>
						<p>{artifact}</p>
					</blockquote>
				</figure>
			) : null}
		</section>
	);
}
