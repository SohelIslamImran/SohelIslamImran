import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import type { MetricContent } from "../../types/content";
import { useHydrated, usePrefersReducedMotion } from "@/components/motion";
import { buttonVariants } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/portfolio";
import { cn } from "@/lib/utils";

interface BackgroundSectionProps {
	title: string;
	paragraphs: string[];
	facts: MetricContent[];
}

/**
 * About copy as two sheets of paper: where it started, and what I care about.
 * The second sheet slides out from under the first as you scroll. The facts
 * and the story link sit with the heading, so the sheets hold only the words.
 * Server HTML and reduced motion show both sheets in their final places.
 */
export function BackgroundSection({ title, paragraphs, facts }: BackgroundSectionProps) {
	const [lead, ...rest] = paragraphs;
	const visibleFacts = facts.filter((fact) => fact.value.trim() || fact.label.trim());
	const stackRef = useRef<HTMLDivElement>(null);
	const hydrated = useHydrated();
	const reduceMotion = usePrefersReducedMotion();
	const animate = hydrated && !reduceMotion;
	const { scrollYProgress } = useScroll({ target: stackRef, offset: ["start 90%", "start 30%"] });
	const backY = useTransform(scrollYProgress, [0, 1], [-20, 0]);

	return (
		<Section aria-labelledby="about-title" id="background">
			<div className="grid min-w-0 gap-x-[clamp(40px,6vw,96px)] gap-y-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
				<div className="min-w-0">
					<div className="lg:sticky lg:top-[calc(var(--dock-space-top)+56px)]">
						<SectionHeading
							id="about-title"
							index="04"
							eyebrow="Background"
							title={title}
							className="mb-0"
						/>
						{visibleFacts.length > 0 ? (
							<dl className="m-0 mt-10 grid max-w-[420px] grid-cols-2 gap-x-6 border-t border-line pt-6">
								{visibleFacts.map((fact, index) => (
									<div key={`${fact.label}-${index}`} className="min-w-0">
										<dt className="mono-label text-muted-foreground">
											{fact.label.trim() || "Fact"}
										</dt>
										<dd className="m-0 mt-1.5 text-[1.375rem] leading-tight font-semibold tracking-[-0.02em] text-foreground">
											{fact.value.trim() || "—"}
										</dd>
									</div>
								))}
							</dl>
						) : null}
						<Link
							to="/story"
							className={cn(buttonVariants({ variant: "outline" }), "group/story mt-8 gap-2")}
						>
							Read the whole story
							<span
								aria-hidden="true"
								className="transition-transform duration-300 ease-trace group-hover/story:translate-x-0.5"
							>
								→
							</span>
						</Link>
					</div>
				</div>
				<div ref={stackRef} className="relative min-w-0">
					<div className="relative z-10 rounded-card border border-line bg-surface-solid p-[clamp(24px,4vw,44px)] shadow-surface">
						<p className="mono-label m-0 mb-5 text-muted-foreground">How it started</p>
						<p className="m-0 max-w-[40ch] text-[clamp(1.25rem,2vw,1.625rem)] leading-[1.4] font-[500] tracking-[-0.018em] text-foreground">
							{lead || "I learned by building, one layer at a time."}
						</p>
					</div>
					{rest.length > 0 ? (
						<motion.div
							style={animate ? { y: backY } : undefined}
							className="relative z-0 mx-[clamp(8px,1.5vw,16px)] -mt-5 rounded-b-card border border-t-0 border-line bg-surface-raised px-[clamp(22px,3.6vw,40px)] pt-[clamp(40px,5vw,56px)] pb-[clamp(24px,3.6vw,40px)]"
						>
							<span
								aria-hidden="true"
								className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--theme-ink)_7%,transparent),transparent)]"
							/>
							<p className="mono-label m-0 mb-4 text-muted-foreground">What I care about</p>
							{rest.map((paragraph) => (
								<p
									key={paragraph}
									className="m-0 mb-5 max-w-[60ch] text-body text-ink-soft last:mb-0"
								>
									{paragraph}
								</p>
							))}
						</motion.div>
					) : null}
				</div>
			</div>
		</Section>
	);
}
