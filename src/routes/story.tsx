import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { articleJsonLd, pageHead } from "../lib/seo";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { PortfolioImage } from "../components/PortfolioImage";
import { mediaHref } from "../lib/media";
import { EmptyState, PageHeader, PageShell, Rule } from "../components/ui/portfolio";

export const Route = createFileRoute("/story")({
	loader: getPublishedContent,
	head: ({ loaderData }) => {
		const c = loaderData ?? EMPTY_PORTFOLIO_CONTENT;
		return pageHead(
			c,
			`${c.identity.name} — ${c.story.title}`,
			c.story.intro,
			"/story",
			"/images/social-story.png",
			[articleJsonLd(c, c.story.title, c.story.intro, "/story", c.writing[0]?.publishedAt)],
		);
	},
	component: Story,
});

function useStoryProgress(chapterIds: string[]) {
	const [activeId, setActiveId] = useState(chapterIds[0] ?? "");
	useEffect(() => {
		if (chapterIds.length === 0 || typeof IntersectionObserver === "undefined") return;
		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((entry) => entry.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
				if (visible?.target.id) setActiveId(visible.target.id);
			},
			{ rootMargin: "-18% 0px -62%", threshold: 0 },
		);
		for (const id of chapterIds) {
			const chapter = document.getElementById(id);
			if (chapter) observer.observe(chapter);
		}
		return () => observer.disconnect();
	}, [chapterIds]);
	return activeId;
}

function Story() {
	const content = Route.useLoaderData();
	const chapters = content.story.chapters;
	const chapterIds = useMemo(() => chapters.map((chapter) => `chapter-${chapter.id}`), [chapters]);
	const activeId = useStoryProgress(chapterIds);
	const writing = content.writing.find((item) => item.href === "/story") ?? content.writing[0];
	const progress = Math.max(
		1,
		((chapterIds.indexOf(activeId) + 1) / Math.max(1, chapterIds.length)) * 100,
	);

	return (
		<PageShell width="default" data-page="story">
			<PageHeader
				eyebrow={content.story.eyebrow}
				title={content.story.title}
				description={content.story.intro}
			>
				<div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
					{writing?.publishedAt ? (
						<time dateTime={writing.publishedAt}>{writing.publishedAt}</time>
					) : null}
					{writing?.readingTime ? <span>{writing.readingTime} read</span> : null}
				</div>
			</PageHeader>
			<div className="grid grid-cols-1 gap-[clamp(42px,7vw,92px)] min-[960px]:grid-cols-[minmax(0,1fr)_180px]">
				<div className="min-w-0 max-w-[720px]">
					<PortfolioImage
						src={mediaHref(content.identity.avatar) ?? "/images/sohel-linkedin-800.webp"}
						alt={
							content.identity.avatar?.alt ??
							"Sohel Islam Imran at the beginning of his engineering journey"
						}
						width={800}
						height={800}
						loading="eager"
						fetchPriority="high"
						sizes="(max-width: 800px) calc(100vw - 40px), 620px"
						srcSet={
							content.identity.avatar
								? undefined
								: "/images/sohel-linkedin-400.webp 400w, /images/sohel-linkedin-800.webp 800w"
						}
						className="mb-9 block max-h-[420px] w-[min(100%,560px)] rounded-[22px] object-cover shadow-surface"
					/>
					{content.story.quote ? (
						<blockquote className="mb-[clamp(48px,7vw,76px)] rounded-surface border border-border bg-muted/55 p-[clamp(22px,4vw,32px)] text-[clamp(1.5rem,4vw,2.6rem)] font-bold leading-[1.05] tracking-[-0.05em]">
							{content.story.quote}
						</blockquote>
					) : null}
					{chapters.length > 0 ? (
						<div className="grid">
							{chapters.map((chapter) => (
								<section
									className="py-9"
									id={`chapter-${chapter.id}`}
									key={chapter.id}
									aria-labelledby={`chapter-title-${chapter.id}`}
								>
									<Rule />
									<p className="mb-3.5 mt-9 text-xs font-extrabold uppercase tracking-[0.11em] text-primary-text">
										{chapter.eyebrow}
									</p>
									<h2
										className="mb-4 mt-0 text-[clamp(1.75rem,4vw,2.8rem)] font-[760] leading-[1] tracking-[-0.055em]"
										id={`chapter-title-${chapter.id}`}
									>
										{chapter.title}
									</h2>
									{chapter.paragraphs.map((paragraph) => (
										<p
											className="text-[1.05rem] leading-[1.7] text-muted-foreground"
											key={paragraph}
										>
											{paragraph}
										</p>
									))}
									{chapter.artifact ? (
										<p className="mt-6 border-l-2 border-primary pl-4 text-sm font-semibold leading-[1.55] text-primary-text">
											{chapter.artifact}
										</p>
									) : null}
								</section>
							))}
						</div>
					) : (
						<EmptyState
							title="This story is being revised."
							description="The next chapter will appear when it is ready to share."
						/>
					)}
					{content.story.sourceHref ? (
						<a
							className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
							href={content.story.sourceHref}
							target="_blank"
							rel="noreferrer"
						>
							{content.story.sourceLabel || "Read the source"} <span aria-hidden="true">↗</span>
						</a>
					) : null}
					<a
						className="mt-10 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted-foreground no-underline hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
						href="#main-content"
					>
						Back to top <span aria-hidden="true">↑</span>
					</a>
				</div>
				{chapters.length > 0 ? (
					<nav
						className="hidden min-[960px]:sticky min-[960px]:top-28 min-[960px]:block min-[960px]:self-start"
						aria-label="On this page"
					>
						<p className="mb-3 text-xs font-extrabold uppercase tracking-[0.11em] text-muted-foreground">
							On this page
						</p>
						<ol className="m-0 grid list-none gap-1 border-l border-border pl-3 text-sm">
							{chapters.map((chapter) => {
								const id = `chapter-${chapter.id}`;
								return (
									<li key={id}>
										<a
											aria-current={activeId === id ? "location" : undefined}
											className={
												activeId === id
													? "font-bold text-primary-text"
													: "text-muted-foreground hover:text-foreground"
											}
											href={`#${id}`}
										>
											{chapter.eyebrow}
										</a>
									</li>
								);
							})}
						</ol>
						<div
							className="mt-6 h-1.5 overflow-hidden rounded-full bg-muted"
							role="progressbar"
							aria-label="Story progress"
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={progress}
						>
							<div
								className="h-full rounded-full bg-primary transition-[width] duration-200 ease-route"
								style={{
									width: `${progress}%`,
								}}
							/>
						</div>
					</nav>
				) : null}
			</div>
		</PageShell>
	);
}
