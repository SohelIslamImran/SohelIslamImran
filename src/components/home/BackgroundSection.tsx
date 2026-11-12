import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { MetricContent } from "../../types/content";
import { useHydrated } from "@/components/motion";
import { buttonVariants } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/portfolio";
import { cn } from "@/lib/utils";

interface BackgroundSectionProps {
	title: string;
	paragraphs: string[];
	facts: MetricContent[];
}

/**
 * About copy as two sheets of paper. The lead sits on the front sheet; the
 * rest is on the sheet below it, which slides out from underneath as you
 * scroll, so "the layer below" is something you see. Server HTML and reduced
 * motion show both sheets in their final places.
 */
export function BackgroundSection({ title, paragraphs, facts }: BackgroundSectionProps) {
	const [lead, ...rest] = paragraphs;
	const visibleFacts = facts.filter((fact) => fact.value.trim() || fact.label.trim());
	const stackRef = useRef<HTMLDivElement>(null);
	const hydrated = useHydrated();
	const reduceMotion = useReducedMotion() === true;
	const animate = hydrated && !reduceMotion;
	const { scrollYProgress } = useScroll({ target: stackRef, offset: ["start 90%", "start 30%"] });
	const backY = useTransform(scrollYProgress, [0, 1], [-96, 0]);
	const backScale = useTransform(scrollYProgress, [0, 1], [0.94, 1]);
	const frontRotate = useTransform(scrollYProgress, [0, 1], [7, 0]);
	const shadowOpacity = useTransform(scrollYProgress, [0, 1], [0, 1]);

	return (
		<Section aria-labelledby="about-title" id="background">
			<div className="grid min-w-0 gap-x-[clamp(40px,6vw,96px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
				<div className="min-w-0">
					<SectionHeading
						id="about-title"
						index="04"
						eyebrow="Background"
						title={title}
						className="mb-10 lg:sticky lg:top-[calc(var(--dock-space-top)+56px)] lg:mb-0"
					/>
				</div>
				<div ref={stackRef} className="relative min-w-0 [perspective:1400px]">
					<motion.div
						style={animate ? { rotateX: frontRotate, transformOrigin: "50% 100%" } : undefined}
						className="relative z-10 rounded-card border border-line bg-surface-solid p-[clamp(24px,4vw,44px)] shadow-surface"
					>
						<p className="mono-label m-0 mb-5 text-muted-foreground">On the surface</p>
						<p className="m-0 max-w-[40ch] text-[clamp(1.25rem,2vw,1.625rem)] leading-[1.4] font-[500] tracking-[-0.018em] text-foreground">
							{lead || "I learned by building, one layer at a time."}
						</p>
					</motion.div>
					<motion.div
						style={animate ? { y: backY, scale: backScale } : undefined}
						className="relative z-0 mx-[clamp(8px,1.5vw,16px)] -mt-5 rounded-b-card border border-t-0 border-line bg-surface-raised px-[clamp(22px,3.6vw,40px)] pt-[clamp(40px,5vw,56px)] pb-[clamp(24px,3.6vw,40px)]"
					>
						<motion.span
							aria-hidden="true"
							style={animate ? { opacity: shadowOpacity } : undefined}
							className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--theme-ink)_7%,transparent),transparent)]"
						/>
						<p className="mono-label m-0 mb-4 text-muted-foreground">One layer down</p>
						{rest.map((paragraph) => (
							<p
								key={paragraph}
								className="m-0 mb-5 max-w-[60ch] text-body text-ink-soft last:mb-0"
							>
								{paragraph}
							</p>
						))}
						<div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-line pt-6">
							{visibleFacts.length > 0 ? (
								<dl className="m-0 flex flex-wrap gap-x-7 gap-y-3">
									{visibleFacts.map((fact, index) => (
										<div key={`${fact.label}-${index}`} className="min-w-0">
											<dt className="mono-label text-muted-foreground">
												{fact.label.trim() || "Fact"}
											</dt>
											<dd className="m-0 mt-1 text-[1.0625rem] font-semibold tracking-[-0.015em] text-foreground">
												{fact.value.trim() || "—"}
											</dd>
										</div>
									))}
								</dl>
							) : null}
							<Link
								to="/story"
								className={cn(buttonVariants({ variant: "outline" }), "group/story gap-2")}
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
					</motion.div>
					<span
						aria-hidden="true"
						className="relative z-[-1] mx-[clamp(20px,3vw,32px)] -mt-px block h-3 rounded-b-[18px] border border-t-0 border-line bg-[color-mix(in_srgb,var(--theme-ink)_3%,var(--theme-surface-raised))]"
					/>
				</div>
			</div>
		</Section>
	);
}
