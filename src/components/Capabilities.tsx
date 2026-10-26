import type { CapabilityContent } from "../types/content";
import { CardContent, CardHeader } from "./ui/card";
import { SectionIntro, Surface, TagList } from "./ui/portfolio";

/** The four areas a project can land in, and the tools that come with each. */
export function Capabilities({ capabilities }: { capabilities: CapabilityContent[] }) {
	if (capabilities.length === 0) return null;

	return (
		<section
			className="w-full min-w-0 py-[clamp(56px,7vw,84px)]"
			aria-labelledby="capabilities-title"
		>
			<SectionIntro
				eyebrow="Scope"
				title={<span id="capabilities-title">Where I work.</span>}
				description="Interfaces, mobile, access boundaries, and delivery are connected by the same product problems."
				className="mb-[clamp(34px,5vw,52px)] [&_h2]:text-[clamp(1.9rem,3.4vw,3rem)] [&_h2]:leading-[1.04]"
			/>
			<div className="grid min-w-0 grid-cols-2 gap-4 max-[760px]:grid-cols-1">
				{capabilities.map((capability) => (
					<Surface
						key={capability.id}
						className="relative flex min-w-0 flex-col justify-between gap-0 overflow-hidden border border-border/70 p-0"
					>
						<CardHeader className="min-w-0 gap-2 p-6 pb-2 max-[560px]:p-5 max-[560px]:pb-2">
							<h3 className="m-0 min-w-0 break-words text-[1.35rem] font-[760] leading-[1.15] tracking-[-0.04em] [overflow-wrap:anywhere]">
								{capability.title.trim() || "Untitled capability"}
							</h3>
						</CardHeader>
						<CardContent className="grid min-w-0 gap-4 p-6 pt-2 max-[560px]:p-5 max-[560px]:pt-2">
							<p className="m-0 min-w-0 max-w-[52ch] break-words text-pretty text-[15px] leading-[1.55] text-muted-foreground [overflow-wrap:anywhere]">
								{capability.description.trim() ||
									"Details will appear here when they are ready to share."}
							</p>
							<div className="pt-1">
								<TagList items={capability.tools} />
							</div>
						</CardContent>
					</Surface>
				))}
			</div>
		</section>
	);
}
