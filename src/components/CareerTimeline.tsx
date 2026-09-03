import { useId } from "react";
import type { ExperienceContent } from "../types/content";
import { EmptyState, Rule, SectionIntro, StatusBadge, TagList } from "./ui/portfolio";
import { cn } from "../lib/utils";

interface CareerTimelineProps {
	experience: ExperienceContent[];
	sectionNumber?: "01" | "02";
	className?: string;
}

export function CareerTimeline({
	experience,
	sectionNumber = "01",
	className,
}: CareerTimelineProps) {
	const titleId = useId();
	return (
		<section
			className={cn("w-full py-[clamp(68px,8vw,96px)]", className)}
			id="experience"
			aria-labelledby={titleId}
		>
			<SectionIntro
				eyebrow={`${sectionNumber} · Experience`}
				title={<span id={titleId}>Experience, with Kuno first.</span>}
				description="I grew from mobile engineering into leading product architecture, delivery, and the full stack around them."
			/>
			{experience.length > 0 ? (
				<div className="grid">
					<Rule />
					{experience.map((item, index) => (
						<article
							className="relative grid min-w-0 grid-cols-[minmax(150px,180px)_minmax(0,1fr)] gap-10 border-b border-border py-10 max-[800px]:grid-cols-1 max-[800px]:gap-3.5 max-[800px]:py-8 max-[800px]:pl-7"
							key={item.id}
						>
							<div className="relative grid min-w-0 content-start pt-0.5 text-sm font-bold text-primary-text">
								<time className="block max-w-[150px] leading-[1.4] [font-variant-numeric:tabular-nums] [text-wrap:pretty] max-[800px]:max-w-[220px]">
									{item.period}
								</time>
								<i
									className="absolute right-[-46px] top-1 z-[1] size-3 rounded-full border-[3px] border-canvas bg-primary shadow-[0_0_0_1px_var(--theme-accent)] max-[800px]:left-[-31px] max-[800px]:right-auto"
									aria-hidden="true"
								/>
							</div>
							<div className="min-w-0 pl-7 max-[800px]:pl-0">
								<div className="flex flex-wrap items-center gap-2.5">
									<p className="m-0 font-[750] text-foreground">{item.company}</p>
									{item.current ? <StatusBadge>Current</StatusBadge> : null}
								</div>
								<h3 className="my-2.5 text-[clamp(1.45rem,3vw,2.25rem)] font-[760] tracking-[-0.045em]">
									{item.role}
								</h3>
								<p className="m-0 max-w-[680px] text-[1.05rem] leading-[1.55] text-muted-foreground">
									{item.summary}
								</p>
								{item.highlights.length > 0 ? (
									<ul className="my-5 grid gap-2 pl-[18px] text-[15px] leading-[1.5] text-muted-foreground">
										{item.highlights.slice(0, 2).map((highlight) => (
											<li key={highlight}>{highlight}</li>
										))}
									</ul>
								) : null}
								<TagList items={item.technologies.slice(0, 5)} />
							</div>
							{index < experience.length - 1 ? (
								<div
									className="absolute bottom-0 left-[220px] top-0 w-px bg-gradient-to-b from-primary to-border max-[800px]:left-0"
									aria-hidden="true"
								/>
							) : null}
						</article>
					))}
				</div>
			) : (
				<EmptyState
					title="Experience is being updated."
					description="The public timeline will return when there is a verified role to share."
				/>
			)}
		</section>
	);
}
