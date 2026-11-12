import { useCallback, useState } from "react";
import type { CapabilityContent } from "../types/content";
import { cn } from "../lib/utils";
import { pairPrinciples } from "./EngineeringPrinciples";
import { ReleasePipeline, type StageState } from "./home/sections/ReleasePipeline";
import { Section, SectionHeading } from "./ui/portfolio";

const STATE_LABEL: Record<StageState, string> = {
	idle: "Waiting",
	running: "Checking",
	passed: "Passed",
	reverted: "Rolled back",
};

/**
 * "How I work", shown as the mechanism instead of described: each capability
 * is a stage of a release pipeline and its principle is the check that stage
 * must pass. The notes under the pipeline hold the full words and light up as
 * their check passes.
 */
export function HowIWork({ capabilities }: { capabilities: CapabilityContent[] }) {
	const { pairs, leftover } = pairPrinciples(capabilities);
	const [states, setStates] = useState<StageState[]>([]);
	const onStatesChange = useCallback((next: StageState[]) => setStates(next), []);

	if (pairs.length === 0 && leftover.length === 0) return null;

	const stages = pairs.map(({ capability, principle }, index) => ({
		id: capability.id || String(index),
		title: capability.title.trim() || "Untitled capability",
		check: principle?.title ?? "Checks pass.",
	}));

	return (
		<Section aria-labelledby="approach-title" id="how-i-work">
			<SectionHeading
				id="approach-title"
				index="03"
				eyebrow="How I work"
				title="Follow the change through."
				description="Each way I work is a check a change has to pass. Ship one, watch the checks, then try the rollback."
			/>
			{stages.length > 0 ? (
				<ReleasePipeline stages={stages} onStatesChange={onStatesChange} />
			) : null}
			{pairs.length > 0 ? (
				<ol
					// Below md the notes sit in one swipeable row instead of a tall stack.
					tabIndex={0}
					aria-label="The stages in detail"
					className={cn(
						"m-0 mt-[clamp(40px,5vw,64px)] flex min-w-0 list-none snap-x snap-mandatory scroll-px-gutter gap-4 overflow-x-auto overscroll-x-contain p-0 px-gutter pb-2 -mx-gutter [scrollbar-width:none]",
						"md:mx-0 md:grid md:snap-none md:grid-cols-2 md:gap-x-[clamp(24px,3vw,40px)] md:gap-y-10 md:overflow-visible md:px-0 md:pb-0",
						pairs.length >= 4 && "xl:grid-cols-4",
						pairs.length === 3 && "lg:grid-cols-3",
					)}
				>
					{pairs.map(({ capability, principle }, index) => {
						const state = states[index] ?? "idle";
						const tools = capability.tools.map((tool) => tool.trim()).filter(Boolean);
						return (
							<li
								key={capability.id || index}
								data-state={state}
								className="how-note relative w-[84%] max-w-[340px] min-w-0 shrink-0 snap-start border-t border-line pt-6 md:w-auto md:max-w-none"
							>
								<p className="mono-label m-0 flex items-center justify-between gap-3 text-muted-foreground">
									<span>
										<span className="text-primary-text">{String(index + 1).padStart(2, "0")}</span>
										{" — "}Stage
									</span>
									<span
										aria-hidden="true"
										className={cn(
											"transition-colors duration-300",
											state === "passed" && "text-success",
											state === "running" && "text-primary-text",
										)}
									>
										{STATE_LABEL[state]}
									</span>
								</p>
								<h3 className="mt-4 mb-0 text-[1.25rem] leading-[1.25] font-[600] tracking-[-0.02em] text-balance text-foreground">
									{capability.title.trim() || "Untitled capability"}
								</h3>
								<p className="mt-3 mb-0 text-[15.5px] leading-[1.55] text-ink-soft">
									{capability.description.trim() ||
										"Details will appear here when they are ready to share."}
								</p>
								{principle ? (
									<div className="mt-5 rounded-inner bg-[color-mix(in_srgb,var(--theme-ink)_3.5%,transparent)] px-4 py-3.5">
										<p className="m-0 text-[14.5px] leading-snug font-semibold text-foreground">
											<span className="sr-only">Check: </span>
											{principle.title}
										</p>
										<p className="mt-1 mb-0 text-[14px] leading-[1.5] text-muted-foreground">
											{principle.body}
										</p>
									</div>
								) : null}
								{tools.length > 0 ? (
									<p className="mt-5 mb-0 font-mono text-[12.5px] leading-[1.7] text-muted-foreground">
										<span className="sr-only">Tools: </span>
										{tools.join(" · ")}
									</p>
								) : null}
							</li>
						);
					})}
				</ol>
			) : null}
			{leftover.length > 0 ? (
				<ul className="m-0 mt-10 grid list-none gap-x-10 gap-y-6 p-0 md:grid-cols-2">
					{leftover.map((principle) => (
						<li key={principle.id} className="min-w-0 border-t border-line pt-5">
							<p className="m-0 text-[1.0625rem] font-semibold text-foreground">
								{principle.title}
							</p>
							<p className="mt-1.5 mb-0 text-[15px] leading-[1.55] text-muted-foreground">
								{principle.body}
							</p>
						</li>
					))}
				</ul>
			) : null}
		</Section>
	);
}
