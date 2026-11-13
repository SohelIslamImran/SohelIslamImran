import { useId, useState } from "react";
import type { ProjectContent } from "../../types/content";
import { cn } from "../../lib/utils";
import { nonEmpty } from "./project-utils";

type Branch = "android" | "ios" | "shared";

export interface UpdateFlowModel {
	root: { title: string; detail: string };
	branches: {
		id: "android" | "ios";
		language: string;
		platform: string;
		/** The platform service named in the highlight, when it names one. */
		service: string;
		steps: string[];
	}[];
	highlights: { text: string; branch: Branch }[];
}

function branchOf(text: string): Branch {
	if (/\b(?:android|play core|kotlin)\b/i.test(text)) return "android";
	if (/\b(?:ios|app store|itunes|swift)\b/i.test(text)) return "ios";
	return "shared";
}

function clean(part: string) {
	return part
		.trim()
		.replace(/^(?:and|an?|the)\s+/i, "")
		.replace(/[.;]+$/, "")
		.trim();
}

/** "Built the Android side on Google Play Core: a, b, and c." → service + steps, all in the highlight's words. */
function parseHighlight(text: string): { service: string; steps: string[] } {
	const [head = "", tail] = text.split(/:\s*/, 2);
	const on = /\bon\s+(.+)$/i.exec(head)?.[1] ?? "";
	const list = tail ?? on;
	const steps = list
		.split(/,\s*|\s+and\s+/)
		.map(clean)
		.filter(Boolean);
	return { service: tail ? clean(on) : "", steps };
}

/**
 * Reads the "one call, two native sides" story from the project's own tags,
 * description, and highlights. Returns null unless the content names both an
 * Android and an iOS side, so the diagram never shows anything the project
 * does not say.
 */
export function updateFlowModel(project: ProjectContent): UpdateFlowModel | null {
	const tags = nonEmpty(project.tags);
	const highlights = nonEmpty(project.highlights).map((text) => ({ text, branch: branchOf(text) }));
	const android = highlights.find((item) => item.branch === "android");
	const ios = highlights.find((item) => item.branch === "ios");
	if (!android || !ios) return null;
	const has = (tag: string) => tags.some((item) => item.toLowerCase() === tag.toLowerCase());
	const typescriptApi = /typescript api/i.test(`${project.description} ${project.summary}`);
	const build = (id: "android" | "ios", text: string) => ({
		id,
		language:
			id === "android" ? (has("Kotlin") ? "Kotlin" : "Native") : has("Swift") ? "Swift" : "Native",
		platform: id === "android" ? "Android" : "iOS",
		...parseHighlight(text),
	});
	return {
		root: {
			title: typescriptApi ? "One TypeScript API" : "One API",
			detail: has("Expo") ? "called from an Expo app" : "called from the app",
		},
		branches: [build("android", android.text), build("ios", ios.text)],
		highlights,
	};
}

const flowStyles = String.raw`
[data-update-flow] .uf-wire { stroke: var(--theme-line-strong); stroke-width: 1.5; fill: none; vector-effect: non-scaling-stroke; transition: stroke 300ms ease, opacity 300ms ease; }
[data-update-flow] .uf-wire[data-lit] { stroke: var(--theme-accent-line); stroke-width: 2; }
[data-update-flow] .uf-flow { stroke: var(--theme-accent); stroke-width: 2.5; fill: none; vector-effect: non-scaling-stroke; stroke-dasharray: 4 10; opacity: 0; transition: opacity 300ms ease; }
[data-update-flow] .uf-flow[data-lit] { opacity: 1; }
@media (prefers-reduced-motion: no-preference) {
	[data-update-flow] .uf-flow[data-lit] { animation: uf-flow 900ms linear infinite; }
}
@keyframes uf-flow { to { stroke-dashoffset: -14; } }
`;

/**
 * expo-in-app-updates as "what happens": one TypeScript call fans out into a
 * Kotlin branch and a Swift branch. Hovering, focusing, or tapping a highlight
 * lights the branch it describes (and the shared module for the rest), so the
 * notes and the drawing explain each other. Text-first: everything in the
 * diagram is real text; only the wires are decorative.
 */
export function UpdateFlow({ model }: { model: UpdateFlowModel }) {
	const [selected, setSelected] = useState<number | null>(null);
	const [preview, setPreview] = useState<number | null>(null);
	const activeIndex = preview ?? selected;
	const active: Branch | null =
		activeIndex === null ? null : (model.highlights[activeIndex]?.branch ?? null);
	const statusId = `update-flow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
	const lit = (branch: "android" | "ios") => active === branch || active === "shared";
	const status =
		active === null
			? "Pick a highlight to follow it through the module."
			: active === "shared"
				? "This one is about the shared module, so it covers both sides."
				: `This one happens on the ${active === "android" ? "Android" : "iOS"} side.`;

	return (
		<div data-slot="update-flow" data-update-flow="" className="grid min-w-0 gap-8 md:gap-10">
			<style href="trace-work-update-flow" precedence="default">
				{flowStyles}
			</style>
			<figure className="m-0 grid min-w-0 justify-items-center rounded-tile border border-line bg-[radial-gradient(circle_at_1px_1px,var(--theme-line)_1px,transparent_1.3px)] [background-size:18px_18px] px-3 py-6 sm:px-6 sm:py-8">
				<div
					className={cn(
						"relative z-[1] grid min-w-0 justify-items-center gap-1 rounded-inner border bg-surface-solid px-5 py-3.5 text-center shadow-[0_10px_30px_-18px_var(--theme-shadow-strong)] transition-[border-color,box-shadow] duration-300 ease-trace",
						active ? "border-primary-line" : "border-line-strong",
						active === "shared" && "shadow-[0_0_0_4px_var(--theme-accent-soft)]",
					)}
				>
					<span className="mono-label text-primary-text">TypeScript</span>
					<span className="text-[17px] leading-tight font-semibold tracking-[-0.01em] text-foreground">
						{model.root.title}
					</span>
					<span className="text-caption text-muted-foreground">{model.root.detail}</span>
				</div>
				<svg
					aria-hidden="true"
					viewBox="0 0 100 40"
					preserveAspectRatio="none"
					className="block h-12 w-full max-w-[560px] sm:h-16"
				>
					{(["android", "ios"] as const).map((branch) => {
						const d =
							branch === "android" ? "M50 0 C50 22 25 18 25 40" : "M50 0 C50 22 75 18 75 40";
						return (
							<g key={branch}>
								<path d={d} className="uf-wire" data-lit={lit(branch) || undefined} />
								<path d={d} className="uf-flow" data-lit={lit(branch) || undefined} />
							</g>
						);
					})}
				</svg>
				<div className="grid w-full max-w-[560px] min-w-0 grid-cols-2 gap-3 sm:gap-6">
					{model.branches.map((branch) => (
						<div
							key={branch.id}
							className={cn(
								"grid min-w-0 content-start gap-3 rounded-inner border bg-surface-solid p-3.5 transition-[border-color,box-shadow,opacity,translate] duration-300 ease-trace sm:p-4",
								lit(branch.id)
									? "border-primary-line shadow-[0_0_0_4px_var(--theme-accent-soft)] motion-safe:-translate-y-0.5"
									: "border-line",
								active && !lit(branch.id) && "opacity-50",
							)}
						>
							<div className="grid min-w-0 gap-0.5">
								<span className="mono-label text-primary-text">{branch.language}</span>
								<span className="text-[16px] leading-tight font-semibold text-foreground">
									{branch.platform}
								</span>
								{branch.service ? (
									<span className="text-caption text-muted-foreground">on {branch.service}</span>
								) : null}
							</div>
							{branch.steps.length > 0 ? (
								<ol className="m-0 grid min-w-0 list-none gap-1.5 border-t border-line p-0 pt-3">
									{branch.steps.map((step, index) => (
										<li
											key={step}
											className="flex min-w-0 items-baseline gap-2 text-caption text-ink-soft"
										>
											<span
												aria-hidden="true"
												className={cn(
													"size-1.5 shrink-0 translate-y-[-1px] rounded-full transition-colors duration-300",
													lit(branch.id) ? "bg-primary" : "bg-line-strong",
												)}
											/>
											<span className="min-w-0 break-words">
												<span className="sr-only">Step {index + 1}: </span>
												{step}
											</span>
										</li>
									))}
								</ol>
							) : null}
						</div>
					))}
				</div>
				<figcaption
					id={statusId}
					aria-live="polite"
					className="mt-5 text-center text-caption text-muted-foreground"
				>
					{status}
				</figcaption>
			</figure>

			<ol aria-label="Highlights" className="m-0 grid min-w-0 list-none gap-3 p-0">
				{model.highlights.map((highlight, index) => {
					const isSelected = selected === index;
					const isLit = activeIndex === index;
					const side =
						highlight.branch === "shared"
							? "Both sides"
							: highlight.branch === "android"
								? "Android side"
								: "iOS side";
					return (
						<li key={highlight.text} className="min-w-0">
							<button
								type="button"
								aria-pressed={isSelected}
								aria-describedby={statusId}
								onClick={() => setSelected(isSelected ? null : index)}
								onPointerEnter={(event) => {
									if (event.pointerType === "mouse") setPreview(index);
								}}
								onPointerLeave={() => setPreview(null)}
								onFocus={() => setPreview(index)}
								onBlur={() => setPreview(null)}
								className={cn(
									"pressable grid w-full min-w-0 grid-cols-[32px_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-inner border bg-surface-solid p-4 text-left sm:grid-cols-[40px_minmax(0,1fr)] sm:p-5",
									"transition-[border-color,background-color,opacity,scale] duration-300 ease-trace",
									"pointer-fine:hover:border-line-strong",
									isLit || isSelected
										? "border-primary-line pointer-fine:hover:border-primary-line"
										: "border-line",
									isSelected &&
										"bg-[color-mix(in_srgb,var(--theme-accent)_6%,var(--theme-surface-solid))]",
									activeIndex !== null && !isLit && "opacity-55",
								)}
							>
								<span
									aria-hidden="true"
									className={cn(
										"mono-label row-span-2 grid size-8 place-items-center rounded-full border text-foreground sm:size-10",
										isLit ? "border-primary-line text-primary-text" : "border-line-strong",
									)}
								>
									{String(index + 1).padStart(2, "0")}
								</span>
								<span className="mono-label text-primary-text">{side}</span>
								<span className="max-w-prose text-[16px] leading-[1.55] text-ink-soft sm:text-body">
									{highlight.text}
								</span>
							</button>
						</li>
					);
				})}
			</ol>
		</div>
	);
}
