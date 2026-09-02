import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ProjectContent } from "../types/content";
import { PortfolioImage } from "./PortfolioImage";
import { cn } from "../lib/utils";
import { CardContent, CardFooter, CardHeader } from "./ui/card";
import { EmptyState, SectionIntro, StatusBadge, Surface, TagList } from "./ui/portfolio";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

type Focus = "identity" | "matching" | "delivery";
const focusKeys: Focus[] = ["identity", "matching", "delivery"];
const labels: Record<Focus, string> = {
	identity: "Identity",
	matching: "Matching",
	delivery: "Delivery",
};

const legacyFocuses: Record<string, Focus[]> = {
	"kuno-platform": ["identity", "matching", "delivery"],
	"expo-in-app-updates": ["identity", "matching"],
	ghosttime: ["delivery"],
	tailsync: ["delivery"],
	"android-mac-display": ["delivery"],
};

function projectsForFocus(projects: ProjectContent[], focus: Focus) {
	const visible = projects
		.filter((project) => (project.focuses ?? legacyFocuses[project.id] ?? []).includes(focus))
		.slice(0, 3);
	return visible;
}

export function WorkFocusTabs({
	projects,
	initialFocus,
	onFocusChange,
	sectionNumber = "02",
}: {
	projects: ProjectContent[];
	initialFocus?: Focus;
	onFocusChange?: (focus: Focus) => void;
	sectionNumber?: "01" | "02";
}) {
	const [localFocus, setLocalFocus] = useState<Focus>(initialFocus ?? "identity");
	const focus = localFocus;
	const items = projectsForFocus(projects, focus);
	const reducedMotion = useReducedMotion();
	useEffect(() => {
		if (initialFocus) setLocalFocus(initialFocus);
	}, [initialFocus]);
	const changeFocus = (value: string | null) => {
		if (!value || !focusKeys.includes(value as Focus)) return;
		setLocalFocus(value as Focus);
		onFocusChange?.(value as Focus);
	};

	return (
		<section
			className="w-full py-[clamp(68px,8vw,96px)]"
			id="work-focus"
			aria-labelledby="work-focus-title"
		>
			<SectionIntro
				eyebrow={`${sectionNumber} · Selected work`}
				title={<span id="work-focus-title">What the work needs.</span>}
				description="Start with Kuno’s product systems, then move through matching and delivery work."
			/>
			<Tabs value={focus} onValueChange={changeFocus} className="w-full">
				<TabsList
					className="relative isolate mb-7 grid h-auto w-[min(100%,390px)] grid-cols-3 gap-1 rounded-full border border-border/60 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-surface-solid)_98%,transparent),color-mix(in_srgb,var(--theme-surface-solid)_88%,var(--theme-accent-soft)))] p-1 shadow-accent max-[560px]:w-full"
					aria-label="Work focus"
				>
					<motion.span
						className="pointer-events-none absolute bottom-1 left-1 top-1 z-0 w-[calc((100%-16px)/3)] rounded-full bg-primary shadow-[0_8px_18px_var(--theme-accent-glow)]"
						aria-hidden="true"
						initial={false}
						animate={{ x: `calc(${focusKeys.indexOf(focus)} * (100% + 4px))` }}
						transition={
							reducedMotion ? { duration: 0 } : { type: "spring", duration: 0.3, bounce: 0.08 }
						}
					/>
					{focusKeys.map((key) => (
						<TabsTrigger
							key={key}
							id={`work-focus-${key}`}
							value={key}
							onKeyDown={(event) => {
								const index = focusKeys.indexOf(key);
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									changeFocus(key);
									return;
								}
								const next =
									event.key === "ArrowRight"
										? (index + 1) % focusKeys.length
										: event.key === "ArrowLeft"
											? (index - 1 + focusKeys.length) % focusKeys.length
											: event.key === "Home"
												? 0
												: event.key === "End"
													? focusKeys.length - 1
													: -1;
								if (next < 0) return;
								event.preventDefault();
								changeFocus(focusKeys[next]);
								document.getElementById(`work-focus-${focusKeys[next]}`)?.focus();
							}}
							className="relative z-[1] min-h-11 touch-manipulation rounded-full px-3 py-2.5 text-sm text-muted-foreground transition-[color,background-color,box-shadow,transform,translate,scale,rotate] duration-180 ease-route data-active:bg-transparent data-active:text-primary-foreground data-active:shadow-none hover:text-foreground"
						>
							{labels[key]}
						</TabsTrigger>
					))}
				</TabsList>
				<p className="sr-only" aria-live="polite">
					Showing {labels[focus]} systems, {items.length} {items.length === 1 ? "proof" : "proofs"}.
				</p>
				{focusKeys.map((key) => (
					<TabsContent key={key} value={key} className="mt-0 outline-none">
						<AnimatePresence initial={false} mode="sync">
							{focus === key ? (
								<motion.div
									key={`${key}-${items.map((item) => item.id).join("-")}`}
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -4 }}
									transition={{ duration: reducedMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
								>
									<div className="mb-3.5 flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
										<span>{labels[key]} systems</span>
										<span>{String(items.length).padStart(2, "0")} proofs</span>
									</div>
									{items.length > 0 ? (
										<div className="grid grid-cols-1 gap-3.5 min-[840px]:grid-cols-12">
											{items.map((project, index) => (
												<Surface
													key={project.id}
													className={cn(
														"group min-w-0 p-0 transition-[transform,translate,scale,rotate,box-shadow] duration-200 ease-route hover:-translate-y-1 hover:shadow-[0_30px_60px_var(--theme-accent-shadow),inset_0_1px_var(--theme-highlight)]",
														index === 0
															? "min-[840px]:col-span-6"
															: items.length === 2 && index === 1
																? "min-[840px]:col-span-6"
																: "min-[840px]:col-span-3",
													)}
												>
													<CardHeader className="p-2.5 pb-0">
														<PortfolioImage
															src={
																project.cover?.id
																	? `/media/${project.cover.id}`
																	: "/images/kuno-systems-724.webp"
															}
															alt={`${project.title} visual`}
															width={724}
															height={543}
															sizes="(max-width: 839px) calc(100vw - 64px), 560px"
															srcSet={
																project.cover?.id
																	? undefined
																	: "/images/kuno-systems-724.webp 724w, /images/kuno-systems-1448.webp 1448w"
															}
															className={cn(
																"block h-32 w-full rounded-[18px] object-cover transition-transform duration-300 ease-route group-hover:scale-[1.015]",
																index === 0 && "h-40 min-[840px]:h-44",
															)}
														/>
													</CardHeader>
													<CardContent className="grid gap-3 p-6 max-[560px]:p-5">
														<div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-signal">
															<span>{project.year}</span>
															{project.status ? <StatusBadge>{project.status}</StatusBadge> : null}
														</div>
														<h3 className="m-0 text-balance text-2xl font-[760] tracking-[-0.045em]">
															{project.title}
														</h3>
														<p className="m-0 leading-[1.55] text-muted-foreground">
															{project.summary}
														</p>
														<p className="m-0 text-sm font-medium text-muted-foreground">
															{project.role}
														</p>
														<TagList items={project.tags.slice(0, 4)} />
														{project.highlights.length > 0 ? (
															<ul className="m-0 grid gap-1 pl-4 text-sm leading-[1.45] text-muted-foreground">
																{project.highlights.slice(0, 3).map((highlight) => (
																	<li key={highlight}>{highlight}</li>
																))}
															</ul>
														) : null}
													</CardContent>
													{(project.repository ?? project.href) ? (
														<CardFooter className="border-0 bg-transparent px-6 pb-6 pt-0 max-[560px]:px-5 max-[560px]:pb-5">
															<a
																className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary-text no-underline transition-[color,transform,translate,scale,rotate] duration-180 ease-route hover:translate-x-0.5 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
																href={project.repository ?? project.href}
																target="_blank"
																rel="noreferrer"
															>
																Open proof <span aria-hidden="true">↗</span>
																<span className="sr-only">, opens in a new tab</span>
															</a>
														</CardFooter>
													) : null}
												</Surface>
											))}
										</div>
									) : (
										<EmptyState
											title={`${labels[key]} notes are being prepared.`}
											description="Public case studies will appear here as this part of the route is ready to share."
										/>
									)}
								</motion.div>
							) : null}
						</AnimatePresence>
					</TabsContent>
				))}
			</Tabs>
		</section>
	);
}
