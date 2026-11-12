import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type KeyboardEvent,
	type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { markSkill, tokenMatchesSkill, type Skill, type SkillIndex } from "./skill-map";

type SkillState = {
	index: SkillIndex;
	/** The skill being shown: a hover/focus preview wins over the pinned one. */
	active: Skill | null;
	pinned: string | null;
	preview: (name: string | null) => void;
	toggle: (name: string) => void;
	clear: () => void;
};

const SkillContext = createContext<SkillState | null>(null);

export function SkillProvider({ index, children }: { index: SkillIndex; children: ReactNode }) {
	const [pinned, setPinned] = useState<string | null>(null);
	const [previewed, setPreviewed] = useState<string | null>(null);
	const skills = useMemo(() => index.groups.flatMap((group) => group.skills), [index]);
	const name = previewed ?? pinned;
	const active = name ? (skills.find((skill) => skill.name === name) ?? null) : null;
	const preview = useCallback((next: string | null) => setPreviewed(next), []);
	const toggle = useCallback((next: string) => {
		setPreviewed(null);
		setPinned((current) => (current === next ? null : next));
	}, []);
	const clear = useCallback(() => {
		setPreviewed(null);
		setPinned(null);
	}, []);
	const value = useMemo(
		() => ({ index, active, pinned, preview, toggle, clear }),
		[index, active, pinned, preview, toggle, clear],
	);
	return <SkillContext.Provider value={value}>{children}</SkillContext.Provider>;
}

function useSkills() {
	return useContext(SkillContext);
}

/** "match" | "dim" while a skill is active, otherwise undefined (renders no attribute). */
export function useSkillTarget(targetId: string) {
	const state = useSkills();
	if (!state?.active) return { state: undefined, isHit: () => false } as const;
	const uses = state.index.uses[state.active.name] ?? [];
	const match = uses.some((use) => use.targetId === targetId);
	const active = state.active;
	return {
		state: match ? "match" : "dim",
		isHit: (token: string) => tokenMatchesSkill(token, active, state.index.skillNames),
	} as const;
}

/** Text with the active skill's words marked. Plain text when nothing is active. */
export function Marked({ text }: { text: string }) {
	const state = useSkills();
	if (!state?.active) return <>{text}</>;
	return (
		<>
			{markSkill(text, state.active, state.index.known).map((part, index) =>
				part.marked ? (
					<mark key={index} data-skill-mark="">
						{part.text}
					</mark>
				) : (
					part.text
				),
			)}
		</>
	);
}

/** Technologies/tags as a quiet inline list; the active skill's tokens light up. */
export function TokenLine({
	label,
	tokens,
	targetId,
}: {
	label: string;
	tokens: string[];
	targetId: string;
}) {
	const { isHit } = useSkillTarget(targetId);
	const items = tokens.map((token) => token.trim()).filter(Boolean);
	if (!items.length) return null;
	return (
		<p data-slot="resume-tokens" className="mt-3 text-caption text-muted-foreground">
			<span className="sr-only">{label}: </span>
			{items.map((token, index) => (
				<span key={token}>
					{index > 0 ? (
						<span aria-hidden="true" className="text-line-strong">
							{" · "}
						</span>
					) : null}
					<span data-token="" data-hit={isHit(token) || undefined}>
						{token}
					</span>
				</span>
			))}
		</p>
	);
}

/** Six stacked planes, one lit: where this layer sits behind the interface. */
function LayerGlyph({ position, total }: { position: number; total: number }) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 20 26"
			className="h-[26px] w-5 shrink-0 overflow-visible"
			focusable="false"
		>
			{Array.from({ length: total }, (_, index) => {
				const y = 3 + index * 3.6;
				const lit = index === position;
				return (
					<path
						key={index}
						d={`M10 ${y - 2.4} L18 ${y} L10 ${y + 2.4} L2 ${y} Z`}
						className={cn(
							lit ? "fill-primary stroke-primary" : "fill-surface-solid stroke-line-strong",
						)}
						strokeWidth={0.8}
						strokeLinejoin="round"
					/>
				);
			})}
		</svg>
	);
}

function pluralize(count: number, word: string) {
	return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function Readout() {
	const state = useSkills();
	if (!state) return null;
	const { active, pinned, index, clear } = state;
	const uses = active ? (index.uses[active.name] ?? []) : [];
	const targets = uses
		.map((use) => index.targets.find((target) => target.id === use.targetId))
		.filter((target) => target !== undefined);
	const roles = targets.filter((target) => target.kind === "role").length;
	const projects = targets.length - roles;
	return (
		// The outer box keeps its height, so the chips below never move; on narrow
		// screens an active readout floats above the dock where a thumb can reach it.
		<div className="mb-5 h-[108px] min-w-0 print:hidden">
			<div
				data-slot="resume-skill-readout"
				data-active={active ? "" : undefined}
				className="flex h-full min-w-0 flex-col overflow-hidden rounded-inner border border-line bg-[color-mix(in_srgb,var(--theme-ink)_3%,var(--theme-surface-solid))] p-3.5 max-lg:data-active:fixed max-lg:data-active:inset-x-3 max-lg:data-active:bottom-[calc(var(--dock-space-bottom)+10px)] max-lg:data-active:z-(--z-toast) max-lg:data-active:h-auto max-lg:data-active:min-h-[96px] max-lg:data-active:gap-2.5 max-lg:data-active:shadow-float"
			>
				<div className="flex min-w-0 items-start justify-between gap-3">
					<div aria-live="polite" aria-atomic="true" className="min-w-0">
						{active ? (
							<p className="m-0 text-small text-ink-soft">
								<strong className="font-semibold text-foreground">{active.name}</strong>{" "}
								{targets.length
									? `· ${[roles ? pluralize(roles, "role") : "", projects ? pluralize(projects, "project") : ""].filter(Boolean).join(", ")}`
									: "· a listed skill, not named in a role or project here."}
							</p>
						) : (
							<p className="m-0 text-small text-muted-foreground">
								Point at, focus, or tap a skill to light up the roles and projects that used it.
							</p>
						)}
					</div>
					{pinned ? (
						<button
							type="button"
							onClick={clear}
							className="pressable -mt-1 -mr-1 inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full px-2 text-caption font-semibold text-primary-text hover:bg-primary-soft"
						>
							Clear<span className="sr-only"> skill highlight</span>
							<span aria-hidden="true">×</span>
						</button>
					) : null}
				</div>
				{active && targets.length ? (
					<ul className="m-0 mt-auto flex list-none gap-1.5 overflow-x-auto p-0 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
						{targets.map((target) => (
							<li key={target.id} className="shrink-0">
								<a
									href={`#${target.id}`}
									className="pressable inline-flex min-h-8 items-center whitespace-nowrap rounded-full border border-line bg-surface-solid px-2.5 text-caption font-medium text-ink-soft hover:border-line-strong hover:text-foreground"
								>
									{target.kind === "role" ? `${target.title} · ${target.subtitle}` : target.title}
								</a>
							</li>
						))}
					</ul>
				) : null}
			</div>
		</div>
	);
}

export function SkillLayers({ titleId }: { titleId: string }) {
	const state = useSkills();
	if (!state) return null;
	const { index, pinned, preview, toggle, clear } = state;
	const layerCount = index.groups.filter((group) => group.id !== "across").length || 1;
	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Escape" && pinned) {
			event.stopPropagation();
			clear();
		}
	};

	return (
		<div onKeyDown={onKeyDown}>
			<Readout />
			<div className="grid gap-4 print:mt-0 print:gap-[1.6mm]">
				{index.groups.map((group, position) => {
					const groupId = `${titleId}-${group.id}`;
					return (
						<div
							key={group.id}
							role="group"
							aria-labelledby={groupId}
							data-slot="resume-skill-layer"
							className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-3"
						>
							<span className="pt-1 print:hidden">
								{group.id === "across" ? (
									<svg
										aria-hidden="true"
										viewBox="0 0 20 26"
										className="h-[26px] w-5 overflow-visible"
									>
										<path
											d="M10 2v22"
											className="stroke-primary"
											strokeWidth={1.4}
											strokeLinecap="round"
										/>
										<circle cx="10" cy="13" r="2.6" className="fill-primary" />
									</svg>
								) : (
									<LayerGlyph position={position} total={layerCount} />
								)}
							</span>
							<div className="min-w-0">
								<h3
									id={groupId}
									className="m-0 flex items-baseline gap-2 text-[13px] font-semibold tracking-tight text-foreground"
								>
									{group.label}
									<span className="text-caption font-normal text-muted-foreground print:hidden">
										{group.meaning}
									</span>
								</h3>
								<ul className="m-0 mt-1.5 flex list-none flex-wrap gap-1.5 p-0 print:mt-[0.4mm] print:block">
									{group.skills.map((skill) => {
										const count = index.uses[skill.name]?.length ?? 0;
										return (
											<li key={skill.name} data-slot="resume-skill">
												<button
													type="button"
													aria-pressed={pinned === skill.name}
													aria-describedby={`${titleId}-hint`}
													data-unused={count === 0 || undefined}
													onPointerEnter={(event) => {
														if (event.pointerType === "mouse") preview(skill.name);
													}}
													onPointerLeave={(event) => {
														if (event.pointerType === "mouse") preview(null);
													}}
													onFocus={(event) => {
														if (event.currentTarget.matches(":focus-visible")) preview(skill.name);
													}}
													onBlur={() => preview(null)}
													onClick={() => toggle(skill.name)}
												>
													{skill.name}
													{count ? (
														<>
															<span data-count="" aria-hidden="true">
																{count}
															</span>
															<span className="sr-only">, used in {pluralize(count, "place")}</span>
														</>
													) : null}
												</button>
											</li>
										);
									})}
								</ul>
							</div>
						</div>
					);
				})}
			</div>
			<p id={`${titleId}-hint`} className="sr-only">
				Highlights the roles and projects that use this skill. Press Escape to clear.
			</p>
		</div>
	);
}
