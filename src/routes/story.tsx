import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { articleJsonLd, pageHead } from "../lib/seo";
import {
	EMPTY_PORTFOLIO_CONTENT,
	type IdentityContent,
	type StoryChapterContent,
	type StoryContent,
	type WritingContent,
} from "../types/content";
import { PortfolioImage } from "../components/PortfolioImage";
import { useScrollEdges } from "../components/useScrollEdges";
import { mediaHref } from "../lib/media";
import { EmptyState, Eyebrow, PageShell, Rule } from "../components/ui/portfolio";

const storyDateFormatter = new Intl.DateTimeFormat("en-US", {
	day: "numeric",
	month: "long",
	timeZone: "UTC",
	year: "numeric",
});

function formatVisibleDate(value: string | undefined) {
	const trimmed = value?.trim();
	if (!trimmed) return "";
	const date = new Date(trimmed);
	return Number.isNaN(date.getTime()) ? trimmed : storyDateFormatter.format(date);
}

type StoryChapterItem = StoryChapterContent & {
	domId: string;
	label: string;
	titleId: string;
};

function fragmentToken(value: string) {
	return value
		.normalize("NFKD")
		.toLowerCase()
		.replace(/[^\p{Letter}\p{Number}\p{M}]+/gu, "-")
		.replace(/^-+|-+$/g, "");
}

function chapterItems(chapters: StoryContent["chapters"]): StoryChapterItem[] {
	const usedTokens = new Set<string>();
	return chapters.map((chapter, index) => {
		const eyebrow = chapter.eyebrow.trim();
		const title = chapter.title.trim();
		const baseToken = fragmentToken(chapter.id) || "section";
		let token = baseToken;
		let suffix = 2;
		while (usedTokens.has(token)) token = `${baseToken}-${suffix++}`;
		usedTokens.add(token);
		const domId = `chapter-${token}`;
		return {
			...chapter,
			domId,
			label: title || eyebrow || `Chapter ${index + 1}`,
			titleId: `${domId}-title`,
		};
	});
}

function closestChapterId(elements: HTMLElement[]) {
	if (elements.length === 0) return "";
	const readingLine = window.innerHeight * 0.28;
	let closest = elements[0];
	let closestDistance = Number.POSITIVE_INFINITY;
	for (const element of elements) {
		const { top, bottom } = element.getBoundingClientRect();
		const distance =
			top <= readingLine && bottom >= readingLine
				? 0
				: top > readingLine
					? top - readingLine
					: readingLine - bottom;
		if (distance < closestDistance) {
			closest = element;
			closestDistance = distance;
		}
	}
	return closest.id;
}

function hashId() {
	const hash = window.location.hash.slice(1);
	try {
		return decodeURIComponent(hash);
	} catch {
		return hash;
	}
}

function useStoryProgress(chapterIds: string[]) {
	const firstId = chapterIds[0] ?? "";
	const [activeId, setActiveId] = useState(firstId);

	useEffect(() => {
		setActiveId((current) => (chapterIds.includes(current) ? current : firstId));
	}, [chapterIds, firstId]);

	useEffect(() => {
		if (chapterIds.length === 0) return;
		const elements = Array.from(
			new Set(
				chapterIds
					.map((id) => document.getElementById(id))
					.filter((element): element is HTMLElement => element !== null),
			),
		);
		if (elements.length === 0) return;

		let frame: number | null = null;
		let observer: IntersectionObserver | undefined;
		const update = () => {
			const nextId = closestChapterId(elements);
			setActiveId((current) => (current === nextId ? current : nextId));
		};
		const schedule = () => {
			if (frame !== null) return;
			frame = requestAnimationFrame(() => {
				frame = null;
				update();
			});
		};
		const syncHash = () => {
			const id = hashId();
			if (id && chapterIds.includes(id)) setActiveId(id);
			else schedule();
		};

		syncHash();
		window.addEventListener("hashchange", syncHash);
		window.addEventListener("resize", schedule);
		if (typeof IntersectionObserver === "undefined") {
			schedule();
			window.addEventListener("scroll", schedule, { passive: true });
		} else {
			observer = new IntersectionObserver(schedule, {
				rootMargin: "-18% 0px -62%",
				threshold: 0,
			});
			for (const element of elements) observer.observe(element);
			schedule();
		}

		return () => {
			window.removeEventListener("hashchange", syncHash);
			window.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", schedule);
			observer?.disconnect();
			if (frame !== null) window.cancelAnimationFrame(frame);
		};
	}, [chapterIds]);

	return [chapterIds.includes(activeId) ? activeId : firstId, setActiveId] as const;
}

export const Route = createFileRoute("/story")({
	loader: getPublishedContent,
	head: ({ loaderData }) => {
		const c = loaderData ?? EMPTY_PORTFOLIO_CONTENT;
		const name = c.identity.name.trim() || "Sohel Islam Imran";
		const title = c.story.title.trim() || "Career story";
		const description = c.story.intro.trim() || "A public account of the work behind the work.";
		const writing = c.writing.find((item) => item.href === "/story");
		return pageHead(c, `${name} — ${title}`, description, "/story", "/images/social-story.png", [
			articleJsonLd(c, title, description, "/story", writing?.publishedAt),
		]);
	},
	component: Story,
});

function Story() {
	const content = Route.useLoaderData();
	const chapters = useMemo(() => chapterItems(content.story.chapters), [content.story.chapters]);
	const chapterIds = useMemo(() => chapters.map((chapter) => chapter.domId), [chapters]);
	const [activeId, setActiveId] = useStoryProgress(chapterIds);
	const writing = content.writing.find((item) => item.href === "/story");
	const activeIndex = chapterIds.indexOf(activeId);
	const progress =
		activeIndex >= 0 && chapterIds.length > 0 ? ((activeIndex + 1) / chapterIds.length) * 100 : 0;
	const progressText =
		activeIndex >= 0 ? `Chapter ${activeIndex + 1} of ${chapterIds.length}` : "Story progress";
	const quote = content.story.quote.trim();
	const sourceHref = content.story.sourceHref.trim();
	const hasSource = Boolean(sourceHref && sourceHref !== "/story");
	const source = classifySource(sourceHref);

	return (
		<PageShell width="default" data-page="story">
			<article
				className="min-w-0 [overflow-wrap:anywhere]"
				data-slot="story-article"
				aria-labelledby="story-title"
			>
				<StoryHeader identity={content.identity} story={content.story} writing={writing} />
				{chapters.length > 0 ? (
					<ChapterNavigation
						activeId={activeId}
						chapters={chapters}
						onSelect={setActiveId}
						progress={progress}
						progressText={progressText}
						variant="compact"
					/>
				) : null}
				<div className="grid min-w-0 max-w-full grid-cols-1 gap-[clamp(42px,7vw,92px)] min-[960px]:grid-cols-[minmax(0,1fr)_180px]">
					<div className="min-w-0 max-w-[720px]">
						{quote ? (
							<blockquote className="m-0 mb-[clamp(48px,7vw,76px)] max-w-[30ch] border-l-2 border-primary pl-5 text-[clamp(1.25rem,2.6vw,1.85rem)] font-[650] leading-[1.25] tracking-[-0.035em] [overflow-wrap:anywhere]">
								{quote}
							</blockquote>
						) : null}
						{chapters.length > 0 ? (
							<div className="grid min-w-0 max-w-full">
								{chapters.map((chapter) => {
									const { domId: id, titleId } = chapter;
									const eyebrow = chapter.eyebrow.trim();
									const title = chapter.title.trim();
									const paragraphs = chapter.paragraphs.filter(
										(paragraph) => paragraph.trim().length > 0,
									);
									const artifact = chapter.artifact?.trim();

									return (
										<section
											className="min-w-0 scroll-mt-24 py-9 focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-ring"
											id={id}
											key={id}
											tabIndex={-1}
											aria-labelledby={titleId}
										>
											<Rule />
											{eyebrow && title ? (
												<p className="mb-3.5 mt-9 break-words text-xs font-extrabold uppercase tracking-[0.11em] text-primary-text [overflow-wrap:anywhere]">
													{eyebrow}
												</p>
											) : null}
											<h2
												className={[
													"mb-4 max-w-[28ch] break-words text-[clamp(1.75rem,4vw,2.8rem)] font-[760] leading-[1] tracking-[-0.055em] [overflow-wrap:anywhere]",
													title ? "mt-0" : "mt-9",
												].join(" ")}
												id={titleId}
											>
												{chapter.label}
											</h2>
											{paragraphs.length > 0 ? (
												<div className="mt-7 grid min-w-0 max-w-[68ch] gap-6">
													{paragraphs.map((paragraph, paragraphIndex) => (
														<p
															className="m-0 text-[1.05rem] leading-[1.7] text-muted-foreground [overflow-wrap:anywhere]"
															key={`${id}-${paragraphIndex}`}
														>
															{paragraph}
														</p>
													))}
												</div>
											) : null}
											{artifact ? (
												<p className="mt-7 max-w-[68ch] border-l-2 border-primary pl-4 text-sm font-semibold leading-[1.55] text-primary-text [overflow-wrap:anywhere]">
													{artifact}
												</p>
											) : null}
										</section>
									);
								})}
							</div>
						) : (
							<EmptyState
								level={2}
								title="This story is being revised."
								description="The next chapter will appear when it is ready to share."
							/>
						)}
						{hasSource ? (
							<a
								className="mt-7 inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 text-sm font-bold text-primary-text underline-offset-4 [overflow-wrap:anywhere] hover:underline focus-visible:outline-2 focus-visible:outline-ring"
								href={sourceHref}
								target={source.external ? "_blank" : undefined}
								rel={source.external ? "noopener noreferrer" : undefined}
							>
								{content.story.sourceLabel.trim() || "Read the source"}{" "}
								<span aria-hidden="true">{source.arrow}</span>
								{source.external ? <span className="sr-only">, opens in a new tab</span> : null}
							</a>
						) : null}
						<a
							className="mt-10 inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 text-sm font-bold text-muted-foreground no-underline [overflow-wrap:anywhere] hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
							href="#main-content"
						>
							Back to top <span aria-hidden="true">↑</span>
						</a>
					</div>
					{chapters.length > 0 ? (
						<ChapterNavigation
							activeId={activeId}
							chapters={chapters}
							onSelect={setActiveId}
							progress={progress}
							progressText={progressText}
							variant="sidebar"
						/>
					) : null}
				</div>
			</article>
		</PageShell>
	);
}

function ChapterNavigation({
	activeId,
	chapters,
	onSelect,
	progress,
	progressText,
	variant,
}: {
	activeId: string;
	chapters: StoryChapterItem[];
	onSelect: (id: string) => void;
	progress: number;
	progressText: string;
	variant: "compact" | "sidebar";
}) {
	const isSidebar = variant === "sidebar";
	const compactListRef = useRef<HTMLOListElement>(null);
	const chapterEdges = useScrollEdges(compactListRef);

	useEffect(() => {
		if (isSidebar) return;
		const revealActiveChapter = () => {
			const list = compactListRef.current;
			const activeItem = list?.querySelector<HTMLElement>('[aria-current="location"]');
			if (!list || !activeItem || list.clientWidth === 0) return;
			const listRect = list.getBoundingClientRect();
			const itemRect = activeItem.getBoundingClientRect();
			if (itemRect.left >= listRect.left && itemRect.right <= listRect.right) return;
			list.scrollTo({
				left:
					list.scrollLeft + itemRect.left - listRect.left - (list.clientWidth - itemRect.width) / 2,
			});
		};
		revealActiveChapter();
		window.addEventListener("resize", revealActiveChapter);
		return () => window.removeEventListener("resize", revealActiveChapter);
	}, [activeId, isSidebar]);

	const navigationClass = [
		"min-w-0 max-w-full",
		isSidebar
			? "hidden min-[960px]:sticky min-[960px]:top-28 min-[960px]:block min-[960px]:self-start"
			: "mb-[clamp(30px,5vw,54px)] min-[960px]:hidden",
	].join(" ");
	const fillScale = Math.max(0, Math.min(1, progress / 100));

	return (
		<nav className={navigationClass} aria-label="On this page">
			<p
				className={
					isSidebar
						? "mb-3 text-xs font-extrabold uppercase tracking-[0.11em] text-muted-foreground"
						: "mb-2 text-xs font-extrabold uppercase tracking-[0.11em] text-muted-foreground"
				}
			>
				On this page
			</p>
			<div>
				{chapterEdges.overflows && !isSidebar ? (
					<span className="mb-1.5 hidden justify-end text-[11px] font-semibold text-primary-text max-[960px]:flex">
						Scroll to see all <span aria-hidden="true">→</span>
					</span>
				) : null}
				{isSidebar ? null : (
					// The fades must be scoped to the scroller itself; spanning the hint
					// row too would wash out the arrow.
					<div className="relative">
						{chapterEdges.canScrollLeft ? (
							<div
								aria-hidden="true"
								className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-[linear-gradient(to_right,var(--theme-paper),transparent)]"
							/>
						) : null}
						{chapterEdges.canScrollRight ? (
							<div
								aria-hidden="true"
								className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-[linear-gradient(to_left,var(--theme-paper),transparent)]"
							/>
						) : null}
						<ol
							ref={isSidebar ? undefined : compactListRef}
							className={
								isSidebar
									? "m-0 grid min-w-0 max-w-full list-none gap-1 border-l border-border pl-3 text-sm"
									: "m-0 flex min-w-0 max-w-full list-none snap-x snap-proximity gap-2 overflow-x-auto overscroll-x-contain pb-1 text-sm"
							}
						>
							{chapters.map((chapter) => {
								const { domId: id, label } = chapter;
								const isActive = activeId === id;
								return (
									<li className={isSidebar ? "min-w-0" : "shrink-0 snap-start"} key={id}>
										<a
											aria-current={isActive ? "location" : undefined}
											className={[
												"block min-h-11 min-w-0 max-w-full break-words [overflow-wrap:anywhere] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
												isSidebar
													? isActive
														? "font-bold text-primary-text"
														: "text-muted-foreground hover:text-foreground"
													: isActive
														? "inline-flex max-w-[min(78vw,22rem)] items-center rounded-full border border-primary bg-primary-soft px-3 font-bold text-primary-text"
														: "inline-flex max-w-[min(78vw,22rem)] items-center rounded-full border border-border px-3 text-muted-foreground hover:border-primary/40 hover:text-foreground",
											].join(" ")}
											href={`#${id}`}
											onClick={() => onSelect(id)}
										>
											<span
												className={[
													"min-w-0 max-w-full break-words leading-tight [overflow-wrap:anywhere]",
													!isSidebar ? "line-clamp-2" : "",
												].join(" ")}
											>
												{label}
											</span>
										</a>
									</li>
								);
							})}
						</ol>
					</div>
				)}
			</div>
			<div
				aria-label="Story chapter progress"
				aria-valuemax={100}
				aria-valuemin={0}
				aria-valuenow={Math.round(progress)}
				aria-valuetext={progressText}
				className={
					isSidebar
						? "mt-6 h-1.5 overflow-hidden rounded-full bg-muted"
						: "mt-4 h-1.5 overflow-hidden rounded-full bg-muted"
				}
				role="progressbar"
			>
				<div
					aria-hidden="true"
					className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-200 ease-route"
					style={{ transform: `scaleX(${fillScale})` }}
				/>
			</div>
		</nav>
	);
}

function splitStoryTitle(title: string) {
	const dot = title.indexOf(". ");
	if (dot === -1) return { lead: title, rest: "" };
	return { lead: title.slice(0, dot + 1), rest: title.slice(dot + 2) };
}

function classifySource(href: string) {
	const value = href.trim();
	if (/^mailto:/iu.test(value)) return { arrow: "@", external: false, label: "Email source" };
	if (/^tel:/iu.test(value)) return { arrow: "☎", external: false, label: "Phone source" };
	if (value.startsWith("#")) return { arrow: "↓", external: false, label: "Page section" };
	const protocol = value.match(/^([a-z][a-z\d+.-]*):/iu)?.[1].toLowerCase();
	if (/^(?:https?:)?\/\//iu.test(value) || protocol) {
		return { arrow: "↗", external: true, label: "External source, opens in a new tab" };
	}
	return { arrow: "→", external: false, label: "Internal source" };
}

function StoryHeader({
	identity,
	story,
	writing,
}: {
	identity: IdentityContent;
	story: StoryContent;
	writing?: WritingContent;
}) {
	const eyebrow = story.eyebrow.trim();
	const title = story.title.trim() || "Career story";
	const { lead, rest } = splitStoryTitle(title);
	const intro = story.intro.trim() || "A public account of the work behind the work.";
	const portrait = mediaHref(identity.avatar) ?? "/images/sohel-linkedin-800.webp";
	const portraitAlt =
		identity.avatar?.alt?.trim() || "Sohel Islam Imran at the beginning of his engineering journey";
	const publishedAt = writing?.publishedAt?.trim();
	const readingTime = writing?.readingTime?.trim();
	const location = identity.location?.trim();

	return (
		<header
			className="mb-[clamp(48px,8vw,92px)] grid min-w-0 grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)] items-start gap-x-[clamp(28px,5vw,64px)] gap-y-7 max-[860px]:grid-cols-1 [overflow-wrap:anywhere]"
			data-slot="story-header"
		>
			<div className="min-w-0">
				<Eyebrow>{eyebrow || "The long version"}</Eyebrow>
				<h1
					className="m-0 min-w-0 max-w-[20ch] break-words text-[clamp(2.7rem,6.4vw,5.2rem)] font-[760] leading-[0.94] tracking-[-0.07em] text-pretty [overflow-wrap:anywhere]"
					id="story-title"
				>
					{lead}
					{rest ? (
						<span className="mt-5 block max-w-[22ch] break-words text-[clamp(1.45rem,3.2vw,2.35rem)] font-[650] leading-[1.12] tracking-[-0.05em] text-pretty [overflow-wrap:anywhere]">
							{rest}
						</span>
					) : null}
				</h1>
				{intro ? (
					<p className="m-0 mt-6 max-w-[58ch] break-words text-[clamp(1.05rem,2vw,1.25rem)] leading-[1.6] text-muted-foreground [overflow-wrap:anywhere]">
						{intro}
					</p>
				) : null}
				<div className="mt-6 flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
					{publishedAt ? (
						// The chapters run past the original publication, so label the
						// date rather than letting a bare year contradict the copy.
						<time
							className="min-w-0 break-words [overflow-wrap:anywhere]"
							dateTime={writing?.publishedAt}
						>
							Originally published {formatVisibleDate(publishedAt)}
						</time>
					) : null}
					{readingTime ? (
						<span className="min-w-0 break-words [overflow-wrap:anywhere]">{readingTime} read</span>
					) : null}
					{location ? (
						<span className="min-w-0 break-words [overflow-wrap:anywhere]">{location}</span>
					) : null}
				</div>
			</div>
			<div className="min-w-0 max-w-full max-[860px]:max-w-[420px]">
				<PortfolioImage
					src={portrait}
					alt={portraitAlt}
					width={800}
					height={800}
					loading="eager"
					fetchPriority="high"
					sizes="(max-width: 860px) min(100vw - 40px, 420px), 380px"
					srcSet={
						identity.avatar
							? undefined
							: "/images/sohel-linkedin-400.webp 400w, /images/sohel-linkedin-800.webp 800w"
					}
					className="block aspect-[4/5] w-full rounded-[24px] object-cover object-[center_18%] shadow-surface max-[860px]:h-[240px] max-[860px]:aspect-auto"
				/>
			</div>
		</header>
	);
}
