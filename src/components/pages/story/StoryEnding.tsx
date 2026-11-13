import { Link } from "@tanstack/react-router";
import { CopyButton } from "../../motion/CopyButton";
import { SpotlightCard } from "../../motion/SpotlightCard";
import { buttonVariants } from "../../ui/button";
import type { PortfolioContent } from "../../../types/content";
import { classifySource, formatVisibleDate } from "./chapters";

/**
 * The bottom of the descent. The site's own line closes the story, then it
 * hands the reader on: to the work, the
 * résumé, or a conversation. Nothing here is a new claim; the counts and
 * dates are read from content.
 */
export function StoryEnding({ content }: { content: PortfolioContent }) {
	const line = content.hero.title.trim();
	const email = (content.contact.email || content.identity.email).trim();
	const projectCount = content.projects.length;
	const resumeUpdated = formatVisibleDate(content.resume.updatedAt ?? undefined);
	const contactTitle = content.contact.title.trim() || "Let's talk.";
	const contactIntro = content.contact.intro.trim();
	const sourceHref = content.story.sourceHref.trim();
	const hasSource = Boolean(sourceHref && sourceHref !== "/story");
	const source = classifySource(sourceHref);

	return (
		<section className="sd-end" aria-labelledby="story-end-title">
			<div className="sd-end-plane">
				<p className="mono-label m-0 text-muted-foreground">End of the story</p>
				<h2 id="story-end-title" className="mt-5 mb-0 max-w-[18ch] text-title">
					{line || "Thanks for reading."}
				</h2>
				<p className="mt-5 mb-0 max-w-[48ch] text-lead text-ink-soft">
					That is the path so far. The work shows the rest, layer by layer.
				</p>
				{hasSource ? (
					<a
						className="sd-source mt-8"
						href={sourceHref}
						target={source.external ? "_blank" : undefined}
						rel={source.external ? "noopener noreferrer" : undefined}
					>
						<span className="mono-label text-muted-foreground">Source</span>
						<span className="min-w-0 [overflow-wrap:anywhere]">
							{content.story.sourceLabel.trim() || "Read the source"}
							<span aria-hidden="true">&nbsp;{source.arrow}</span>
						</span>
						{source.external ? <span className="sr-only">, opens in a new tab</span> : null}
					</a>
				) : null}
			</div>

			<ul className="sd-handoff" aria-label="Where to go next">
				<li>
					<SpotlightCard as="article" className="sd-handoff-card">
						<span className="mono-label text-muted-foreground">
							Next · Work{projectCount > 0 ? ` · ${projectCount} projects` : ""}
						</span>
						<h3 className="text-headline">
							<Link
								to="/work"
								search={{ group: "all" }}
								className="sd-handoff-link after:absolute after:inset-0 after:rounded-[inherit]"
							>
								See what I built
							</Link>
						</h3>
						<p>Interfaces, services, and the parts behind them, project by project.</p>
						<span aria-hidden="true" className="sd-handoff-arrow">
							→
						</span>
					</SpotlightCard>
				</li>
				<li>
					<SpotlightCard as="article" className="sd-handoff-card">
						<span className="mono-label text-muted-foreground">
							Résumé{resumeUpdated ? ` · updated ${resumeUpdated}` : ""}
						</span>
						<h3 className="text-headline">
							<Link
								to="/resume"
								className="sd-handoff-link after:absolute after:inset-0 after:rounded-[inherit]"
							>
								The short version
							</Link>
						</h3>
						<p>Roles, tools, and dates on one page you can print.</p>
						<span aria-hidden="true" className="sd-handoff-arrow">
							→
						</span>
					</SpotlightCard>
				</li>
				<li>
					<SpotlightCard as="article" className="sd-handoff-card sd-handoff-contact">
						<span className="mono-label text-muted-foreground">Contact</span>
						<h3 className="text-headline">{contactTitle}</h3>
						{contactIntro ? <p>{contactIntro}</p> : null}
						{email ? (
							<div className="relative z-[1] mt-auto flex flex-wrap items-center gap-2 pt-5">
								<a className={buttonVariants()} href={`mailto:${email}`}>
									Email me
								</a>
								<CopyButton
									value={email}
									label="Copy address"
									copiedLabel="Copied"
									announcement="Email address copied"
									variant="ghost"
								/>
							</div>
						) : null}
					</SpotlightCard>
				</li>
			</ul>

			<a className="sd-top pressable" href="#main-content">
				<span aria-hidden="true">↑</span> Back to the surface
			</a>
		</section>
	);
}
