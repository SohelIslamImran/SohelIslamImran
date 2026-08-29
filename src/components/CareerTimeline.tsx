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
		<section
			className="timeline mx-auto w-[min(1180px,calc(100%-40px))] py-[88px] max-[800px]:py-[68px]"
			id="experience"
			aria-labelledby={titleId}
		>
			<div className="section-intro mb-16 grid grid-cols-[1fr_1.3fr] gap-x-[60px] gap-y-5 max-[800px]:mb-12 max-[800px]:block">
				<p className="kicker section-intro-kicker">{sectionNumber} · Experience</p>
				<h2
					className="section-intro-title m-0 text-[clamp(2.5rem,4.4vw,4.35rem)] font-[760] leading-none tracking-[-.055em] [text-wrap:balance] max-[800px]:my-[15px]"
					id={titleId}
				>
					Experience, with Kuno first.
				</h2>
				<p className="section-intro-copy max-w-[490px] self-end text-lg leading-[1.55] text-muted max-[800px]:text-base">
					I grew from mobile engineering into leading product architecture, delivery, and the full
					stack around them.
				</p>
			</div>
			<div className="timeline-list border-t border-line">
				{experience.map((item, index) => (
					<motion.article
						className="timeline-item relative grid min-w-0 grid-cols-[minmax(150px,180px)_minmax(0,1fr)] gap-10 border-b border-line py-[42px] max-[800px]:grid-cols-1 max-[800px]:gap-[13px] max-[800px]:py-[30px] max-[800px]:pb-[34px] max-[800px]:pl-[26px]"
						key={item.id}
						layout
						whileHover={reducedMotion ? undefined : { x: 3 }}
						whileTap={reducedMotion ? undefined : { scale: 0.997 }}
						transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
					>
						<div className="timeline-date relative grid min-w-0 content-start pt-[3px] text-sm font-bold text-primary">
							<time className="timeline-date-text block max-w-[150px] leading-[1.4] [font-variant-numeric:tabular-nums] [text-wrap:pretty] max-[800px]:max-w-[220px]">
								{item.period}
							</time>
							<i
								className="absolute right-[-46px] top-1 z-[1] size-[11px] rounded-full border-[3px] border-canvas bg-primary shadow-[0_0_0_1px_var(--theme-blue)] max-[800px]:left-[-31px] max-[800px]:right-auto"
								aria-hidden="true"
							/>
						</div>
						<div className="timeline-body min-w-0 pl-[30px] max-[800px]:pl-0">
							<div className="timeline-heading flex items-center gap-3">
								<p className="timeline-company m-0 font-[750] text-ink">{item.company}</p>
								{item.current && <span className="current">Current</span>}
							</div>
							<h3 className="timeline-title my-2.5 text-[clamp(23px,3vw,36px)] font-[760] tracking-[-.045em]">
								{item.role}
							</h3>
							<p className="timeline-summary m-0 max-w-[650px] text-[17px] leading-[1.55] text-muted">
								{item.summary}
							</p>
							<ul className="timeline-list-copy my-5 grid gap-[7px] pl-[18px] text-[15px] leading-[1.45] text-muted">
								{item.highlights.slice(0, 2).map((highlight) => (
									<li key={highlight}>{highlight}</li>
								))}
							</ul>
							<div className="tags flex flex-wrap gap-1.5">
								{item.technologies.slice(0, 5).map((technology) => (
									<span
										className="tag rounded-full border border-line px-[9px] py-[5px] text-xs text-muted"
										key={technology}
									>
										{technology}
									</span>
								))}
							</div>
						</div>
						{index < experience.length - 1 && (
							<div
								className="timeline-connector absolute bottom-0 left-[220px] top-0 w-px bg-gradient-to-b from-primary to-line max-[800px]:left-0"
								aria-hidden="true"
							/>
						)}
					</motion.article>
				))}
			</div>
		</section>
	);
}
