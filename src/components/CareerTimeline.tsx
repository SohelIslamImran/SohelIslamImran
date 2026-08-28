import { useId } from "react";
import type { ExperienceContent } from "../../app/types/content";

export function CareerTimeline({ experience }: { experience: ExperienceContent[] }) {
	const titleId = useId();
	return (
		<section className="prism-timeline" id="experience" aria-labelledby={titleId}>
			<div className="prism-section-intro">
				<p className="prism-kicker">01 · Experience</p>
				<h2 id={titleId}>The work behind the work.</h2>
				<p>
					Roles are chapters in one continuous practice: turning complicated systems into calm,
					useful product experiences.
				</p>
			</div>
			<div className="prism-timeline__list">
				{experience.map((item, index) => (
					<article className="prism-timeline__item" key={item.id}>
						<div className="prism-timeline__date">
							<span>{item.period}</span>
							<i aria-hidden="true" />
						</div>
						<div className="prism-timeline__body">
							<div className="prism-timeline__heading">
								<p>{item.company}</p>
								{item.current && <span className="prism-current">Current</span>}
							</div>
							<h3>{item.role}</h3>
							<p>{item.summary}</p>
							<ul>
								{item.highlights.slice(0, 2).map((highlight) => (
									<li key={highlight}>{highlight}</li>
								))}
							</ul>
							<div className="prism-tags">
								{item.technologies.slice(0, 5).map((technology) => (
									<span key={technology}>{technology}</span>
								))}
							</div>
						</div>
						{index < experience.length - 1 && (
							<div className="prism-timeline__connector" aria-hidden="true" />
						)}
					</article>
				))}
			</div>
		</section>
	);
}
