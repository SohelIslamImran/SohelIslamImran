import { Link } from "@tanstack/react-router";
import type { PortfolioContent } from "../../../types/content";
import { DraftStack } from "./DraftStack";

const HEADLINE = "The first note is still ahead.";

function Arrow() {
	return (
		<span aria-hidden="true" className="fn-way-arrow">
			→
		</span>
	);
}

/**
 * No published notes yet. Says so plainly, shows a draft that is visibly
 * still a draft, and offers three real ways onward.
 */
export function NotesEmpty({
	content,
	eyebrow,
	title,
	intro,
	origin,
}: {
	content: PortfolioContent;
	eyebrow: string;
	title: string;
	intro: string;
	origin: string;
}) {
	const storyTitle = content.story.title.trim();
	const storyWriting = content.writing.find((item) => item.href === "/story");
	const readingTime = storyWriting?.readingTime?.trim();
	const projectCount = content.projects.length;
	const linkCount = content.profileLinks.length;

	return (
		<div className="fn-empty">
			<div className="fn-empty-copy min-w-0">
				<p className="mono-label m-0 flex flex-wrap items-center gap-x-3 gap-y-1">
					<span className="text-primary-text">{eyebrow}</span>
					<span className="text-muted-foreground">0 published</span>
				</p>
				<h1 className="mt-6 mb-0 max-w-[14ch] text-display [overflow-wrap:anywhere]">{title}</h1>
				<p className="mt-7 mb-0 max-w-[48ch] text-lead text-ink-soft [overflow-wrap:anywhere]">
					{intro}
				</p>

				<section aria-labelledby="fn-onward-title" className="mt-12">
					<h2 id="fn-onward-title" className="m-0 text-headline">
						{HEADLINE}
					</h2>
					<p className="mt-2 mb-0 text-small text-muted-foreground">Until it lands, start here.</p>
					<ul className="fn-ways">
						<li>
							<Link to="/story" className="fn-way">
								<span className="fn-way-text">
									<span className="fn-way-title">Read my story</span>
									<span className="fn-way-meta">
										{[storyTitle, readingTime ? `${readingTime} read` : ""]
											.filter(Boolean)
											.join(" · ")}
									</span>
								</span>
								<Arrow />
							</Link>
						</li>
						<li>
							<Link to="/work" search={{ group: "all" }} className="fn-way">
								<span className="fn-way-text">
									<span className="fn-way-title">See the work</span>
									<span className="fn-way-meta">
										{projectCount > 0 ? `${projectCount} projects` : "Projects and case studies"}
									</span>
								</span>
								<Arrow />
							</Link>
						</li>
						<li>
							<Link to="/links" search={{ kind: "all" }} className="fn-way">
								<span className="fn-way-text">
									<span className="fn-way-title">Find me elsewhere</span>
									<span className="fn-way-meta">
										{linkCount > 0 ? `${linkCount} links` : "Profiles and contact"}
									</span>
								</span>
								<Arrow />
							</Link>
						</li>
					</ul>
				</section>
			</div>
			<DraftStack headline={HEADLINE} origin={origin} published={0} />
		</div>
	);
}
