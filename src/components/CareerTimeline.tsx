import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { useScroll } from "motion/react";
import type { ExperienceContent } from "../types/content";
import { dateTimeFromPeriod } from "../lib/content-dates";
import { groupExperienceByCompany } from "../lib/experience";
import { cn } from "../lib/utils";
import { CAREER_LAYERS, layersTouched, type CareerLayerId } from "./home/sections/career-layers";
import { SmoothDetails } from "./home/sections/SmoothDetails";
import { TraceLine } from "./motion/TraceLine";
import {
	EmptyState,
	MonoLabel,
	Section,
	SectionHeading,
	StatusBadge,
	StatusDot,
	TagList,
} from "./ui/portfolio";

interface CareerTimelineProps {
	experience: ExperienceContent[];
	title?: string;
	description?: string;
	className?: string;
}

function ChevronIcon({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className={className}>
			<path
				d="m4.5 6.25 3.5 3.5 3.5-3.5"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/**
 * A core sample: six cells, front (interface) to back (release), lit where the
 * role did work. The text alternative names the layers.
 */
function CoreSample({ layers, className }: { layers: CareerLayerId[]; className?: string }) {
	const names = CAREER_LAYERS.filter((layer) => layers.includes(layer.id)).map(
		(layer) => layer.label,
	);
	return (
		<span className={cn("inline-flex items-center gap-[3px]", className)}>
			{CAREER_LAYERS.map((layer, index) => (
				<span
					key={layer.id}
					aria-hidden="true"
					className={cn(
						"h-3 w-[5px] rounded-[2px] transition-[background-color,opacity] duration-300",
						layers.includes(layer.id)
							? "bg-primary"
							: "bg-[color-mix(in_srgb,var(--theme-ink)_12%,transparent)]",
					)}
					style={{ opacity: layers.includes(layer.id) ? 1 - index * 0.09 : 1 }}
				/>
			))}
			<span className="sr-only">Layers: {names.join(", ") || "none listed"}.</span>
		</span>
	);
}

/**
 * The depth gauge: six planes in real 3D, the interface (a browser window) in front, release at the
 * back. The role being read lights the layers it reached and a probe drops to
 * the deepest one. Decorative; each row's core sample carries the same facts.
 */
function DepthGauge({ role, layers }: { role?: ExperienceContent; layers: CareerLayerId[] }) {
	const deepest = CAREER_LAYERS.reduce(
		(max, layer, index) => (layers.includes(layer.id) ? index : max),
		0,
	);
	const gap = 14 + layers.length * 3;
	return (
		<div className="mt-12 hidden lg:block" aria-hidden="true">
			<div className="depth-gauge">
				<div className="depth-gauge-stack" style={{ "--gap": `${gap}px` } as CSSProperties}>
					{CAREER_LAYERS.map((layer, index) => (
						<div
							key={layer.id}
							className="depth-gauge-plane"
							data-lit={layers.includes(layer.id) ? "" : undefined}
							style={{ "--i": index } as CSSProperties}
						>
							{layer.id === "interface" ? (
								<span className="depth-gauge-window">
									<i />
									<i />
									<i />
								</span>
							) : null}
							<span className="mono-label">{layer.label}</span>
						</div>
					))}
					<div className="depth-gauge-probe" style={{ "--i": deepest } as CSSProperties} />
				</div>
			</div>
			<div className="mt-2 grid gap-1.5 border-t border-line pt-5">
				<p className="m-0 flex items-baseline justify-between gap-4 text-[15px] font-medium text-foreground">
					<span className="min-w-0 truncate">{role?.role.trim() || "—"}</span>
					<span className="mono-label shrink-0 text-primary-text">
						{layers.length} / {CAREER_LAYERS.length} layers
					</span>
				</p>
				<p className="mono-label m-0 text-muted-foreground">
					{role ? `${role.company.trim()} · ${role.period.trim()}` : ""}
				</p>
			</div>
		</div>
	);
}

/**
 * The path, oldest role first. Every role is a disclosure that animates in all
 * browsers (and still works without JavaScript); the current role starts
 * open. On wide screens a 3D depth gauge shows the role you opened or
 * focused; while nothing was opened by hand, it follows the role in view.
 */
export function CareerTimeline({
	experience,
	title = "From the interface to the whole stack.",
	description = "I started on the interface. The bars show which layers each role reached.",
	className,
}: CareerTimelineProps) {
	const titleId = useId();
	const accordion = useId();
	const railRef = useRef<HTMLDivElement>(null);
	const roleRefs = useRef(new Map<string, HTMLElement>());
	// Oldest first: scrolling down is going deeper.
	const groups = groupExperienceByCompany(experience)
		.map((group) => ({ ...group, roles: [...group.roles].reverse() }))
		.reverse();
	const roles = groups.flatMap((group) => group.roles);
	const currentId = (roles.find((role) => role.current) ?? roles.at(-1))?.id;
	const [activeId, setActiveId] = useState(currentId);
	// A role opened by hand holds the gauge; scroll only moves it when none is.
	const pinnedId = useRef<string | null>(null);
	const pressedId = useRef<string | null>(null);
	const active = roles.find((role) => role.id === activeId) ?? roles.at(-1);
	const { scrollYProgress } = useScroll({
		target: railRef,
		offset: ["start 72%", "end 60%"],
	});

	useEffect(() => {
		if (typeof IntersectionObserver === "undefined") return;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					const id = (entry.target as HTMLElement).dataset.roleId;
					if (id && !pinnedId.current) setActiveId(id);
				}
			},
			{ rootMargin: "-35% 0px -45% 0px" },
		);
		for (const element of roleRefs.current.values()) observer.observe(element);
		return () => observer.disconnect();
	}, [roles.length]);

	return (
		<Section
			className={cn("min-w-0", className)}
			id="experience"
			tabIndex={-1}
			aria-labelledby={titleId}
		>
			<div className="grid min-w-0 gap-x-[clamp(40px,6vw,96px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
				<div className="min-w-0">
					<div className="lg:sticky lg:top-[calc(var(--dock-space-top)+40px)]">
						<SectionHeading
							id={titleId}
							index="02"
							eyebrow="Path"
							title={title}
							description={description}
							className="lg:mb-0"
						/>
						{roles.length > 0 ? (
							<DepthGauge role={active} layers={active ? layersTouched(active) : []} />
						) : null}
					</div>
				</div>

				{groups.length > 0 ? (
					<div ref={railRef} className="relative min-w-0">
						<TraceLine progress={scrollYProgress} className="absolute top-3 bottom-6 left-0" />
						<ol className="m-0 grid min-w-0 list-none gap-[clamp(40px,5vw,60px)] p-0">
							{groups.map((group) => (
								<li
									key={`${group.company}-${group.roles.map((role) => role.id).join("-")}`}
									className="relative min-w-0 pl-10 sm:pl-12"
								>
									<span
										aria-hidden="true"
										className={cn(
											"absolute top-[0.55rem] left-0 grid size-3 place-items-center rounded-full bg-paper shadow-[0_0_0_1.5px_var(--theme-line-strong)]",
											group.current &&
												"shadow-[0_0_0_1.5px_var(--theme-accent-line),0_0_0_6px_color-mix(in_srgb,var(--theme-accent)_12%,transparent)]",
										)}
									>
										<span
											className={cn(
												"size-1.5 rounded-full",
												group.current ? "bg-primary" : "bg-line-strong",
											)}
										/>
									</span>
									<div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1.5">
										<h3 className="m-0 text-headline [overflow-wrap:anywhere]">
											{group.company.trim() || "Company"}
										</h3>
										{group.current ? <StatusBadge tone="accent">Current</StatusBadge> : null}
									</div>
									<MonoLabel className="mt-2 block">
										<time dateTime={dateTimeFromPeriod(group.period)}>{group.period}</time>
										{group.roles.length > 1 ? (
											<span>
												{" · "}
												{group.roles.length} roles
											</span>
										) : null}
									</MonoLabel>

									<ol className="m-0 mt-5 grid min-w-0 list-none gap-1 p-0">
										{group.roles.map((role) => {
											const isCurrent = role.current === true;
											const layers = layersTouched(role);
											return (
												<li
													key={role.id}
													data-role-id={role.id}
													ref={(element) => {
														if (element) roleRefs.current.set(role.id, element);
														else roleRefs.current.delete(role.id);
													}}
													className="relative min-w-0"
													onClickCapture={(event) => {
														if ((event.target as HTMLElement).closest("summary")) {
															pressedId.current = role.id;
														}
													}}
													onFocus={(event) => {
														if ((event.target as HTMLElement).closest("summary")) {
															setActiveId(role.id);
														}
													}}
												>
													<SmoothDetails
														group={accordion}
														defaultOpen={role.id === currentId}
														onOpenChange={(open) => {
															if (open && pressedId.current === role.id) {
																pinnedId.current = role.id;
																setActiveId(role.id);
															} else if (!open && pinnedId.current === role.id) {
																pinnedId.current = null;
															}
															if (pressedId.current === role.id) pressedId.current = null;
														}}
														className="group/role min-w-0 rounded-[20px] transition-[background-color,box-shadow] duration-300 ease-trace open:bg-surface-solid open:shadow-raised"
														summaryClassName="relative flex min-h-14 cursor-pointer items-center gap-x-4 gap-y-1 rounded-[20px] px-4 py-3 select-none transition-[background-color,scale] duration-200 ease-trace active:scale-[0.99] pointer-fine:hover:bg-[color-mix(in_srgb,var(--theme-ink)_4%,transparent)] group-open/role:pointer-fine:hover:bg-transparent sm:px-5"
														summary={
															<>
																<span
																	aria-hidden="true"
																	className="absolute top-1/2 left-[-2.5rem] grid size-3 -translate-y-1/2 place-items-center sm:left-[-3rem]"
																>
																	{isCurrent ? (
																		<StatusDot tone="success" />
																	) : (
																		<span className="size-2 rounded-full bg-paper shadow-[inset_0_0_0_1.5px_var(--theme-line-strong)] transition-[background-color,box-shadow] duration-300 group-open/role:bg-primary group-open/role:shadow-[0_0_0_3px_color-mix(in_srgb,var(--theme-accent)_16%,transparent)]" />
																	)}
																</span>
																<span className="grid min-w-0 flex-1 gap-1 sm:flex sm:items-baseline sm:justify-between sm:gap-4">
																	<span className="min-w-0 text-[1.0625rem] leading-snug font-medium tracking-[-0.012em] text-foreground [overflow-wrap:anywhere]">
																		{role.role.trim() || "Role"}
																	</span>
																	<span className="flex shrink-0 items-center gap-3">
																		<CoreSample layers={layers} />
																		<MonoLabel>
																			<time dateTime={dateTimeFromPeriod(role.period)}>
																				{role.period}
																			</time>
																		</MonoLabel>
																	</span>
																</span>
																<span className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-[rotate,background-color] duration-300 ease-trace group-open/role:rotate-180 group-open/role:bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)]">
																	<ChevronIcon className="size-4" />
																</span>
															</>
														}
													>
														<div className="min-w-0 px-4 pb-6 sm:px-5">
															{role.summary.trim() ? (
																<p className="m-0 max-w-[60ch] text-body text-ink-soft">
																	{role.summary.trim()}
																</p>
															) : null}
															{role.highlights.length > 0 ? (
																<ul className="m-0 mt-4 grid list-none gap-2.5 p-0">
																	{role.highlights.map((highlight) => (
																		<li
																			key={highlight}
																			className="relative max-w-[62ch] pl-5 text-[15.5px] leading-[1.55] text-muted-foreground [overflow-wrap:anywhere] before:absolute before:top-[0.72em] before:left-0 before:h-px before:w-2.5 before:bg-line-strong"
																		>
																			{highlight}
																		</li>
																	))}
																</ul>
															) : null}
															{role.technologies.length > 0 ? (
																<TagList className="mt-5" items={role.technologies} />
															) : null}
														</div>
													</SmoothDetails>
												</li>
											);
										})}
									</ol>
								</li>
							))}
						</ol>
						<p className="mono-label mt-10 mb-0 flex items-center gap-3 pl-10 text-muted-foreground sm:pl-12">
							<span aria-hidden="true">
								<CoreSample layers={CAREER_LAYERS.map((layer) => layer.id)} />
							</span>
							<span>Front to back: {CAREER_LAYERS.map((layer) => layer.label).join(" → ")}</span>
						</p>
					</div>
				) : (
					<EmptyState
						title="Experience is being updated."
						description="Career history will reappear here once the current roles are published."
					/>
				)}
			</div>
		</Section>
	);
}
