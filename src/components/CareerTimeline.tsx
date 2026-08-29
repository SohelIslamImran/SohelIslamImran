import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { ExperienceContent } from "../types/content";

interface CareerTimelineProps {
	experience: ExperienceContent[];
	sectionNumber?: "01" | "02";
}

export function CareerTimeline({ experience, sectionNumber = "01" }: CareerTimelineProps) {
	const titleId = useId();
	const reducedMotion = useReducedMotion();
	return (
		<section className="timeline" id="experience" aria-labelledby={titleId}>
			<div className="section-intro">
				<p className="kicker section-intro-kicker">{sectionNumber} · Experience</p>
				<h2 className="section-intro-title" id={titleId}>
					Experience, with Kuno first.
				</h2>
				<p className="section-intro-copy">
					I grew from mobile engineering into leading product architecture, delivery, and the full
					stack around them.
				</p>
			</div>
			<div className="timeline-list">
				{experience.map((item, index) => (
					<motion.article
						className="timeline-item"
						key={item.id}
						layout
						whileHover={reducedMotion ? undefined : { x: 3 }}
						whileTap={reducedMotion ? undefined : { scale: 0.997 }}
						transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
					>
						<div className="timeline-date">
							<time className="timeline-date-text">{item.period}</time>
							<i aria-hidden="true" />
						</div>
						<div className="timeline-body">
							<div className="timeline-heading">
								<p className="timeline-company">{item.company}</p>
								{item.current && <span className="current">Current</span>}
							</div>
							<h3 className="timeline-title">{item.role}</h3>
							<p className="timeline-summary">{item.summary}</p>
							<ul className="timeline-list-copy">
								{item.highlights.slice(0, 2).map((highlight) => (
									<li key={highlight}>{highlight}</li>
								))}
							</ul>
							<div className="tags">
								{item.technologies.slice(0, 5).map((technology) => (
									<span className="tag" key={technology}>
										{technology}
									</span>
								))}
							</div>
						</div>
						{index < experience.length - 1 && (
							<div className="timeline-connector" aria-hidden="true" />
						)}
					</motion.article>
				))}
			</div>
		</section>
	);
}
