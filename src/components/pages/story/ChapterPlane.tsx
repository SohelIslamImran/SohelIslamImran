import { layerLabels, type StoryChapterItem } from "./chapters";

/**
 * One chapter. Its heading sits on a plane that is pushed in from a little
 * further back as it scrolls into view (CSS scroll-driven 3D; static where
 * unsupported or under reduced motion), so reading on reads as going deeper.
 * The layer stack lives once, in the rail; on narrow screens the plane names
 * the layers this chapter reaches, in words. The reading copy never moves.
 */
export function ChapterPlane({ chapter }: { chapter: StoryChapterItem }) {
	const eyebrow = chapter.eyebrow.trim();
	const title = chapter.title.trim();
	const artifact = chapter.artifact?.trim();
	const named = layerLabels(chapter.layers);

	return (
		<section
			id={chapter.domId}
			tabIndex={-1}
			aria-labelledby={chapter.titleId}
			className="sd-chapter"
		>
			<div className="sd-plane-wrap">
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
						{named.length > 0 ? (
							<p className="sd-layers mono-label">
								<span className="sr-only">Layers named in this chapter: </span>
								{named.join(" · ")}
							</p>
						) : null}
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
