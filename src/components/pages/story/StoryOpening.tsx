import { useRef, type CSSProperties } from "react";
import { PortfolioImage } from "../../PortfolioImage";
import { useDepthTilt } from "../../work/useDepthTilt";
import { mediaHref } from "../../../lib/media";
import type { IdentityContent, StoryContent, WritingContent } from "../../../types/content";
import { formatVisibleDate, splitStoryTitle, type StoryChapterItem } from "./chapters";

/**
 * The opening: the title on the left, and on the right the story itself as a
 * stack of planes. The portrait is the front plane (the surface); each
 * chapter sits one plane further back. The pointer (or the device, or a
 * gentle scroll tilt on touch) turns the stack so you can look behind it.
 * The stack is decorative; the chapter rail carries the same information.
 */
export function StoryOpening({
	identity,
	story,
	writing,
	chapters,
}: {
	identity: IdentityContent;
	story: StoryContent;
	writing?: WritingContent;
	chapters: StoryChapterItem[];
}) {
	const rigRef = useRef<HTMLDivElement>(null);
	useDepthTilt(rigRef);

	const eyebrow = story.eyebrow.trim() || "The long version";
	const title = story.title.trim() || "Career story";
	const { lead, rest } = splitStoryTitle(title);
	const intro = story.intro.trim();
	const portrait = mediaHref(identity.avatar) ?? "/images/sohel-linkedin-800.webp";
	const portraitAlt =
		identity.avatar?.alt?.trim() ||
		`${identity.name.trim() || "Sohel Islam Imran"}, the author of this story`;
	const publishedAt = writing?.publishedAt?.trim();
	const readingTime = writing?.readingTime?.trim();
	const location = identity.location?.trim();
	// Planes behind the portrait, deepest first so paint order matches depth.
	const behind = chapters.slice(0, 6);

	return (
		<header data-slot="story-header" data-poster-host="" className="sd-opening">
			<div className="sd-opening-copy min-w-0">
				<p className="mono-label m-0 flex items-center gap-3 text-primary-text">
					<span>{eyebrow}</span>
					{chapters.length > 0 ? (
						<span className="text-muted-foreground">
							{chapters.length} chapters · surface to now
						</span>
					) : null}
				</p>
				<h1
					id="story-title"
					className="mt-6 mb-0 max-w-[16ch] text-display [overflow-wrap:anywhere]"
				>
					{lead}
					{rest ? (
						<span className="sd-opening-rest mt-4 block max-w-[20ch] text-[clamp(1.5rem,3.2vw,2.4rem)] leading-[1.1] font-[620] tracking-[-0.04em] text-muted-foreground">
							{rest}
						</span>
					) : null}
				</h1>
				{intro ? (
					<p className="mt-8 mb-0 max-w-[54ch] text-lead text-ink-soft [overflow-wrap:anywhere]">
						{intro}
					</p>
				) : null}
				{publishedAt || readingTime || location ? (
					<dl className="sd-meta mt-8 mb-0">
						{publishedAt ? (
							<div>
								<dt className="mono-label">First published</dt>
								<dd>
									<time dateTime={publishedAt}>{formatVisibleDate(publishedAt)}</time>
								</dd>
							</div>
						) : null}
						{readingTime ? (
							<div>
								<dt className="mono-label">Reading time</dt>
								<dd>{readingTime}</dd>
							</div>
						) : null}
						{location ? (
							<div>
								<dt className="mono-label">From</dt>
								<dd>{location}</dd>
							</div>
						) : null}
					</dl>
				) : null}
				{chapters.length > 0 ? (
					<a href={`#${chapters[0].domId}`} className="sd-begin pressable mt-10">
						<span>Start at the surface</span>
						<span aria-hidden="true" className="sd-begin-arrow">
							↓
						</span>
					</a>
				) : null}
			</div>

			<div className="sd-stack" style={{ "--n": behind.length } as CSSProperties}>
				<div ref={rigRef} className="sd-stack-rig">
					{behind
						.map((chapter, index) => ({ chapter, depth: index + 1 }))
						.reverse()
						.map(({ chapter, depth }) => (
							<div
								key={chapter.domId}
								className="sd-plate sd-plate-back"
								aria-hidden="true"
								style={{ "--d": depth } as CSSProperties}
							>
								<span className="sd-plate-tab">
									<span className="sd-plate-num">{chapter.numeral}</span>
									<span className="sd-plate-eyebrow">
										{chapter.eyebrow.trim() || chapter.label}
									</span>
								</span>
							</div>
						))}
					<div className="sd-plate sd-plate-front" style={{ "--d": 0 } as CSSProperties}>
						<PortfolioImage
							src={portrait}
							alt={portraitAlt}
							width={800}
							height={800}
							loading="eager"
							fetchPriority="high"
							sizes="(max-width: 899px) 240px, 270px"
							srcSet={
								identity.avatar
									? undefined
									: "/images/sohel-linkedin-400.webp 400w, /images/sohel-linkedin-800.webp 800w"
							}
							className="block size-full object-cover object-[center_18%]"
						/>
						<span className="sd-plate-caption mono-label" aria-hidden="true">
							<span>Surface</span>
							<span>{location || "Now"}</span>
						</span>
					</div>
				</div>
			</div>
		</header>
	);
}
