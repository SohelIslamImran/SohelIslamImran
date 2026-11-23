import { useState } from "react";
import type { ProjectContent } from "../../types/content";
import { cn } from "../../lib/utils";
import { usePointerFine } from "../motion";
import { nonEmpty } from "./project-utils";

const platformLabels = { both: "Both", android: "Android", ios: "iOS" } as const;
type Platform = keyof typeof platformLabels;
type Branch = Exclude<Platform, "both"> | "shared";

export interface UpdateFlowModel {
	root: { title: string; detail: string; language: string };
	lead: string;
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
	const prose = `${project.description} ${project.summary}`;
	const typescriptApi = /typescript api/i.test(prose);
	const root = {
		title: `One ${typescriptApi ? "TypeScript API" : "API"}`,
		detail: has("Expo") ? "called from an Expo app" : "called from the app",
		language: typescriptApi || has("TypeScript") ? "TypeScript" : "",
	};
	const build = (id: "android" | "ios", text: string) => ({
		id,
		language:
			id === "android" ? (has("Kotlin") ? "Kotlin" : "Native") : has("Swift") ? "Swift" : "Native",
		platform: id === "android" ? "Android" : "iOS",
		...parseHighlight(text),
	});
	return {
		root,
		lead: `Your app talks to ${typescriptApi ? "one TypeScript API" : "one API"}.${
			has("Kotlin") && has("Swift")
				? " Underneath, Kotlin handles Android and Swift handles iOS."
				: ""
		}`,
		branches: [build("android", android.text), build("ios", ios.text)],
		highlights,
	};
}

const flowStyles = String.raw`
[data-update-flow] .uf-figure { container-type: inline-size; }
[data-update-flow] .uf-wire,
[data-update-flow] .uf-pulse { fill: none; vector-effect: non-scaling-stroke; }
[data-update-flow] .uf-wire { stroke: var(--theme-line-strong); stroke-width: 1.5; }
[data-update-flow] .uf-wire[data-lit] { stroke: var(--theme-accent-line); stroke-width: 2; }
[data-update-flow] .uf-pulse { display: none; }
@media (prefers-reduced-motion: no-preference) {
	[data-update-flow] .uf-pulse {
		display: block;
		stroke: var(--theme-accent);
		stroke-width: 4;
		stroke-linecap: round;
		stroke-dasharray: 12 112;
		stroke-dashoffset: -106;
		opacity: 0;
		animation: uf-pulse 600ms var(--theme-ease) both;
	}
}
@keyframes uf-pulse {
	from { stroke-dashoffset: 12; opacity: 1; }
	85% { opacity: 1; }
	to { stroke-dashoffset: -106; opacity: 0; }
}
[data-update-flow] .uf-short { display: none; }
@container (width < 400px) {
	[data-update-flow] .uf-fork { display: none; }
	[data-update-flow] .uf-short { display: block; }
	[data-update-flow] .uf-branches { grid-template-columns: minmax(0, 1fr); }
}
`;

export function UpdateFlow({ model }: { model: UpdateFlowModel }) {
	const [{ branch, revision }, setPlatform] = useState<{ branch: Platform; revision: number }>({
		branch: "both",
		revision: 0,
	});
	const [finishedRevision, setFinishedRevision] = useState(0);
	const [selected, setSelected] = useState<number | null>(null);
	const [preview, setPreview] = useState<number | null>(null);
	const pointerFine = usePointerFine();
	const activeIndex = preview ?? selected;
	const active = activeIndex === null ? null : model.highlights[activeIndex]?.branch;
	const matches = (side: Branch) => branch === "both" || side === "shared" || branch === side;
	const commit = (next: Platform) => {
		if (next === branch) return;
		setPlatform((current) => ({ branch: next, revision: current.revision + 1 }));
		setPreview(null);
	};
	const selectPlatform = (next: Platform) => {
		commit(next);
		if (selected !== null) {
			const side = model.highlights[selected].branch;
			if (next !== "both" && side !== "shared" && side !== next) setSelected(null);
		}
	};
	const caption =
		active === "shared"
			? "This highlight covers the shared module on both platforms."
			: active
				? `This highlight covers the ${platformLabels[active]} side.`
				: "Pick a highlight to follow it through the module.";
	const wire = (d: string, lit: boolean, pulse: boolean) => (
		<>
			<path d={d} className="uf-wire" data-lit={lit || undefined} />
			{pulse && revision !== finishedRevision ? (
				<path
					key={revision}
					d={d}
					pathLength={100}
					className="uf-pulse"
					onAnimationEnd={() => setFinishedRevision(revision)}
				/>
			) : null}
		</>
	);

	return (
		<div data-slot="update-flow" data-update-flow="" className="grid min-w-0 gap-8 md:gap-10">
			<style href="trace-work-update-flow" precedence="default">
				{flowStyles}
			</style>
			<figure className="uf-figure m-0 grid min-w-0 justify-items-center rounded-tile border border-line bg-[radial-gradient(circle_at_1px_1px,var(--theme-line)_1px,transparent_1.3px)] [background-size:18px_18px] px-3 py-6 sm:px-6 sm:py-8">
				<div
					className={cn(
						"relative z-[1] grid min-w-0 justify-items-center gap-1 rounded-inner border bg-surface-solid px-5 py-3.5 text-center shadow-[0_10px_30px_-18px_var(--theme-shadow-strong)] transition-[border-color,box-shadow] duration-300 ease-trace",
						active ? "border-primary-line" : "border-line-strong",
						active === "shared" && "shadow-[0_0_0_4px_var(--theme-accent-soft)]",
					)}
				>
					{model.root.language ? (
						<span className="mono-label text-primary-text">{model.root.language}</span>
					) : null}
					<span className="text-[17px] leading-tight font-semibold tracking-[-0.01em] text-foreground">
						{model.root.title}
					</span>
					<span className="text-caption text-muted-foreground">{model.root.detail}</span>
				</div>
				<div
					role="group"
					aria-label="Show platform"
					className="relative z-[1] mt-3 flex max-w-full flex-wrap items-center justify-center gap-1 rounded-full border border-line bg-surface-solid p-1"
				>
					{(["both", "android", "ios"] as const).map((platform) => (
						<button
							key={platform}
							type="button"
							aria-pressed={branch === platform}
							onClick={() => selectPlatform(platform)}
							className="pressable min-h-11 rounded-full px-3 text-sm font-medium text-ink-soft transition-[scale] duration-220 ease-trace pointer-fine:hover:bg-muted aria-pressed:bg-primary-soft aria-pressed:text-primary-text"
						>
							{platformLabels[platform]}
						</button>
					))}
				</div>
				<svg
					aria-hidden="true"
					viewBox="0 0 560 64"
					preserveAspectRatio="none"
					className="uf-fork block h-12 w-full max-w-[560px] sm:h-16"
				>
					{wire("M280 0 C280 35 134 29 134 64", matches("android"), branch === "android")}
					{wire("M280 0 C280 35 426 29 426 64", matches("ios"), branch === "ios")}
				</svg>
				<svg aria-hidden="true" viewBox="0 0 4 24" className="uf-short h-6 w-1">
					{wire("M2 0 V24", true, branch !== "both")}
				</svg>
				<div className="uf-branches grid w-full max-w-[560px] min-w-0 grid-cols-2 gap-3 sm:gap-6">
					{model.branches.map((branch) => (
						<div
							key={branch.id}
							className={cn(
								"grid min-w-0 content-start gap-3 rounded-inner border bg-surface-solid p-3.5 transition-[translate] duration-220 ease-trace sm:p-4",
								matches(branch.id)
									? "border-primary-line shadow-[0_0_0_4px_var(--theme-accent-soft)] motion-safe:-translate-y-0.5"
									: "border-line",
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
													"size-1.5 shrink-0 translate-y-[-1px] rounded-full",
													matches(branch.id) ? "bg-primary" : "bg-line-strong",
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
				<figcaption className="mt-5 text-center text-caption text-muted-foreground">
					{caption}
				</figcaption>
			</figure>
			<p role="status" className="sr-only">
				{revision > 0 ? (
					<span key={revision}>
						{branch === "both"
							? "Showing both sides."
							: `Showing the ${platformLabels[branch]} side.`}
					</span>
				) : null}
			</p>

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
								onClick={() => {
									setSelected(isSelected ? null : index);
									setPreview(null);
									if (!isSelected) {
										commit(highlight.branch === "shared" ? "both" : highlight.branch);
									}
								}}
								onPointerEnter={(event) => {
									if (pointerFine && event.pointerType === "mouse") setPreview(index);
								}}
								onPointerLeave={() => setPreview(null)}
								onFocus={(event) => {
									if (event.currentTarget.matches(":focus-visible")) setPreview(index);
								}}
								onBlur={() => setPreview(null)}
								className={cn(
									"pressable grid w-full min-w-0 grid-cols-[32px_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-inner border bg-surface-solid p-4 text-left sm:grid-cols-[40px_minmax(0,1fr)] sm:p-5",
									"transition-[scale] duration-220 ease-trace",
									"pointer-fine:hover:border-line-strong",
									isLit || isSelected
										? "border-primary-line pointer-fine:hover:border-primary-line"
										: matches(highlight.branch)
											? "border-line"
											: "border-transparent",
									isSelected &&
										"bg-[color-mix(in_srgb,var(--theme-accent)_6%,var(--theme-surface-solid))]",
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
