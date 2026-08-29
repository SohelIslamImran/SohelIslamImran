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
		<section className="prism-timeline" id="experience" aria-labelledby={titleId}>
			<div className="prism-section-intro">
				<p className="prism-kicker">{sectionNumber} · Experience</p>
				<h2 id={titleId}>Experience, with Kuno first.</h2>
				<p>
					I grew from mobile engineering into leading product architecture, delivery, and the full
					stack around them.
				</p>
			</div>
			<div className="prism-timeline__list">
				{experience.map((item, index) => (
					<motion.article
						className="prism-timeline__item"
						key={item.id}
						layout
						whileHover={reducedMotion ? undefined : { x: 3 }}
						whileTap={reducedMotion ? undefined : { scale: 0.997 }}
						transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
					>
						<div className="prism-timeline__date">
							<time>{item.period}</time>
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
					</motion.article>
				))}
			</div>
		</section>
	);
}
