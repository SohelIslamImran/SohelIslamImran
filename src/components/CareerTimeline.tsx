import { useId } from "react";
import type { ExperienceContent } from "../types/content";
import { dateTimeFromPeriod } from "../lib/content-dates";
import { groupExperienceByCompany } from "../lib/experience";
import { EmptyState, Rule, SectionIntro, StatusBadge, TagList } from "./ui/portfolio";
import { cn } from "../lib/utils";

interface CareerTimelineProps {
	experience: ExperienceContent[];
	title?: string;
	description?: string;
	className?: string;
}

export function CareerTimeline({
	experience,
	title = "From mobile product work to full-stack systems.",
	description = "A dated progression through React Native, B2B product work, security, infrastructure, and delivery.",
	className,
}: CareerTimelineProps) {
	const titleId = useId();
	const groups = groupExperienceByCompany(experience);

	return (
		<section
			className={cn("w-full py-[clamp(56px,7vw,84px)]", className)}
			id="experience"
			tabIndex={-1}
			aria-labelledby={titleId}
		>
			<SectionIntro
				eyebrow="Experience"
				title={<span id={titleId}>{title}</span>}
				description={description}
				className="mb-[clamp(34px,5vw,52px)] [&_h2]:text-[clamp(1.9rem,3.4vw,3rem)] [&_h2]:leading-[1.04]"
			/>
			{groups.length > 0 ? (
				<div className="grid">
					<Rule />
					{groups.map((group) => {
						const currentRole = group.roles.find((role) => role.current === true);
						const lead = currentRole ?? group.roles[0];
						const previous = group.roles.filter((role) => role.id !== lead?.id);
						return (
							<article
								className="relative grid min-w-0 grid-cols-[minmax(150px,180px)_minmax(0,1fr)] gap-10 border-b border-border py-10 max-[800px]:grid-cols-1 max-[800px]:gap-3.5 max-[800px]:py-8 max-[800px]:pl-7"
								key={`${group.company}-${group.roles.map((role) => role.id).join("-")}`}
							>
								<div className="relative grid min-w-0 content-start pt-0.5 text-sm font-bold text-primary-text">
									<time
										className="block min-w-0 max-w-[150px] break-words leading-[1.4] [font-variant-numeric:tabular-nums] [overflow-wrap:anywhere] [text-wrap:pretty] max-[800px]:max-w-[220px]"
										dateTime={dateTimeFromPeriod(group.period)}
									>
										{group.period}
									</time>
									<i
										className="absolute right-[-46px] top-1 z-[1] size-3 rounded-full border-[3px] border-canvas bg-primary shadow-[0_0_0_1px_var(--theme-accent)] max-[800px]:left-[-31px] max-[800px]:right-auto"
										aria-hidden="true"
									/>
								</div>
								<div className="min-w-0 pl-7 max-[800px]:pl-0">
									<div className="flex flex-wrap items-center gap-2.5">
										<h3 className="m-0 min-w-0 break-words text-[1.45rem] font-[760] tracking-[-0.04em] [overflow-wrap:anywhere]">
											{group.company}
										</h3>
										{group.current ? <StatusBadge>Current</StatusBadge> : null}
									</div>

									{lead ? (
										<div className="mt-3 grid gap-2.5">
											<div className="min-w-0 break-words text-[1.1rem] font-[650] tracking-[-0.02em] text-foreground [overflow-wrap:anywhere]">
												{lead.role}
											</div>
											<p className="m-0 min-w-0 break-words text-pretty text-[15px] leading-[1.55] text-muted-foreground [overflow-wrap:anywhere]">
												{lead.summary}
											</p>
											{lead.highlights.length > 0 ? (
												<ul className="my-2 grid gap-2 pl-4 text-sm leading-[1.55] text-muted-foreground">
													{lead.highlights.map((highlight) => (
														<li
															className="min-w-0 break-words [overflow-wrap:anywhere]"
															key={highlight}
														>
															{highlight}
														</li>
													))}
												</ul>
											) : null}
											<TagList className="[overflow-wrap:anywhere]" items={lead.technologies} />
										</div>
									) : null}

									{previous.length > 0 ? (
										<div className="mt-6 grid gap-6 border-t border-border/70 pt-6">
											{previous.map((role) => (
												<div key={role.id} className="grid min-w-0 gap-2">
													<div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
														<h4 className="m-0 min-w-0 break-words text-sm font-bold text-foreground [overflow-wrap:anywhere]">
															{role.role}
														</h4>
														<span className="min-w-0 break-words text-xs text-muted-foreground [font-variant-numeric:tabular-nums] [overflow-wrap:anywhere]">
															{role.period}
														</span>
													</div>
													<p className="m-0 min-w-0 break-words text-pretty text-sm leading-[1.55] text-muted-foreground [overflow-wrap:anywhere]">
														{role.summary}
													</p>
													{role.highlights.length > 0 ? (
														<ul className="my-1.5 grid gap-1.5 pl-4 text-xs leading-[1.55] text-muted-foreground">
															{role.highlights.map((highlight) => (
																<li
																	className="min-w-0 break-words [overflow-wrap:anywhere]"
																	key={highlight}
																>
																	{highlight}
																</li>
															))}
														</ul>
													) : null}
													<TagList className="[overflow-wrap:anywhere]" items={role.technologies} />
												</div>
											))}
										</div>
									) : null}
								</div>
							</article>
						);
					})}
				</div>
			) : (
				<EmptyState
					title="Experience is being updated."
					description="Career history will reappear here once the current roles are published."
				/>
			)}
		</section>
	);
}
