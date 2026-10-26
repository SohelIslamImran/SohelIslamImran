import { SectionIntro, Surface } from "./ui/portfolio";

interface Principle {
	title: string;
	subtitle: string;
	description: string;
}

const PRINCIPLES: Principle[] = [
	{
		title: "Follow the change end to end",
		subtitle: "Interface to release",
		description:
			"I keep the user action, server rule, data change, test, and release path in the same working loop.",
	},
	{
		title: "Enforce boundaries in the system",
		subtitle: "Access and data",
		description:
			"I apply authorization and privacy checks at service and data boundaries, not only in the interface.",
	},
	{
		title: "Respect native platform behavior",
		subtitle: "Pragmatic bridges",
		description:
			"I use cross-platform tools first, then Kotlin, Swift, or native APIs when the platform requires them.",
	},
	{
		title: "Keep delivery inspectable",
		subtitle: "Checks and recovery",
		description:
			"I work with infrastructure as code, automated checks, release coordination, and explicit rollback behavior.",
	},
];

export function EngineeringPrinciples() {
	return (
		<section
			className="w-full min-w-0 py-[clamp(56px,7vw,84px)]"
			aria-labelledby="principles-title"
		>
			<SectionIntro
				eyebrow="Approach"
				title={<span id="principles-title">Principles that survive the handoff.</span>}
				description="A few checks I keep close when a change crosses interfaces, data, or deployment."
				className="mb-[clamp(34px,5vw,52px)] [&_h2]:text-[clamp(1.9rem,3.4vw,3rem)] [&_h2]:leading-[1.04]"
			/>
			<div className="grid min-w-0 grid-cols-2 gap-4 max-[760px]:grid-cols-1">
				{PRINCIPLES.map((principle) => (
					<Surface
						key={principle.title}
						className="relative flex min-w-0 flex-col justify-between gap-3 border border-border/70 p-6 max-[560px]:p-5"
					>
						<div>
							<p className="m-0 min-w-0 break-words text-xs font-semibold text-muted-foreground [overflow-wrap:anywhere]">
								{principle.subtitle}
							</p>
							<h3 className="m-0 mt-2 min-w-0 break-words text-[1.25rem] font-[760] leading-[1.2] tracking-[-0.035em] text-foreground [overflow-wrap:anywhere]">
								{principle.title}
							</h3>
						</div>
						<p className="m-0 min-w-0 break-words text-pretty text-[14.5px] leading-[1.6] text-muted-foreground [overflow-wrap:anywhere]">
							{principle.description}
						</p>
					</Surface>
				))}
			</div>
		</section>
	);
}
