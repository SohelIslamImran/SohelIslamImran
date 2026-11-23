import type { CapabilityContent, ExperienceContent, ProjectContent } from "../../../types/content";

/*
 * Skills on the résumé, grouped by the layer of the stack they live in, and
 * linked to the roles and projects that name them. Everything is read from
 * content: the capability tool lists, role technologies/summary/highlights,
 * and project tags/summary/highlights. Nothing here adds a fact. Pure and
 * deterministic, so server and client render the same thing.
 */

export type SkillLayerId =
	| "interface"
	| "api"
	| "data"
	| "access"
	| "infrastructure"
	| "release"
	| "across";

/**
 * The layers a request crosses, front to back (the home page's planes). Each
 * pattern places a tool name in a layer; it never adds a tool. Owned here so
 * the résumé does not shift when other pages retune their own readings.
 */
const LAYERS: readonly {
	id: Exclude<SkillLayerId, "across">;
	label: string;
	meaning: string;
	pattern: RegExp;
}[] = [
	{
		id: "interface",
		label: "Interface",
		meaning: "What people see and use.",
		pattern: /\b(?:react|react native|expo|tanstack|tailwind|kotlin|swift|android|ios|ui)\b/i,
	},
	{
		id: "api",
		label: "API",
		meaning: "The services behind the interface.",
		pattern: /\b(?:typescript|bun|elysia|apis?|webhooks?|graphql|rest)\b/i,
	},
	{
		id: "data",
		label: "Data",
		meaning: "Where things are stored and found.",
		pattern: /\b(?:postgres(?:ql)?|drizzle|redis|firebase|firestore|d1|sql|database)\b/i,
	},
	{
		id: "access",
		label: "Access",
		meaning: "Who can sign in, and to what.",
		pattern: /\b(?:auth|rbac|oidc|sso|permissions?|isolation|crypto\w*)\b/i,
	},
	{
		id: "infrastructure",
		label: "Cloud",
		meaning: "Where the code runs.",
		pattern: /\b(?:aws|terraform|docker|cloudflare|workers)\b/i,
	},
	{
		id: "release",
		label: "Release",
		meaning: "How changes are checked and shipped.",
		pattern: /\b(?:eas|github actions|playwright|bun test|ci|tests?)\b/i,
	},
];

/** Tools a single pattern would misplace ("Bun Test" is release, not the Bun runtime). */
const LAYER_HINTS: Partial<Record<SkillLayerId, readonly string[]>> = {
	release: ["Bun Test", "GitHub Actions", "Playwright", "EAS"],
};

export const SKILL_LAYERS: readonly { id: SkillLayerId; label: string; meaning: string }[] = [
	...LAYERS.map(({ id, label, meaning }) => ({ id, label, meaning })),
	{ id: "across", label: "Across", meaning: "Used at every layer." },
];

export interface Skill {
	name: string;
	layer: SkillLayerId;
	/** Names this skill may appear under in content ("TanStack Router/Query" → "TanStack Router", "TanStack Query"). */
	variants: string[];
}

export interface SkillGroup {
	id: SkillLayerId;
	label: string;
	meaning: string;
	skills: Skill[];
}

/** A role or project the résumé can light up. */
export interface SkillTarget {
	id: string;
	kind: "role" | "project";
	title: string;
	subtitle: string;
	/** Technologies or tags, matched as whole tokens. */
	tokens: string[];
	/** Prose (summary, highlights), matched as whole words. */
	texts: string[];
}

const lower = (value: string) => value.trim().toLowerCase();

export function skillVariants(name: string): string[] {
	const trimmed = name.trim();
	if (!trimmed.includes("/")) return [trimmed];
	const parts = trimmed
		.split("/")
		.map((part) => part.trim())
		.filter(Boolean);
	const [first, ...rest] = parts;
	const firstWords = first.split(/\s+/);
	const variants = [first];
	for (const part of rest) {
		// "TanStack Router/Query": a one-word tail shares the head's first word.
		variants.push(firstWords.length > 1 && !/\s/.test(part) ? `${firstWords[0]} ${part}` : part);
	}
	return variants;
}

function layerFor(variants: string[], capabilityId: string): SkillLayerId {
	const names = variants.map(lower);
	const hinted = (Object.keys(LAYER_HINTS) as SkillLayerId[]).find((id) =>
		LAYER_HINTS[id]?.some((tool) => names.includes(lower(tool))),
	);
	if (hinted) return hinted;
	if (SKILL_LAYERS.some((layer) => layer.id === capabilityId && layer.id !== "across")) {
		return capabilityId as SkillLayerId;
	}
	const layer = LAYERS.find((item) => variants.some((variant) => item.pattern.test(variant)));
	return layer?.id ?? "across";
}

/** Capability tools, de-duplicated, grouped front-to-back by layer. Empty groups are dropped. */
export function groupSkills(capabilities: CapabilityContent[]): SkillGroup[] {
	const seen = new Set<string>();
	const skills: Skill[] = [];
	for (const capability of capabilities) {
		for (const tool of capability.tools) {
			const name = tool.trim();
			if (!name || seen.has(lower(name))) continue;
			seen.add(lower(name));
			const variants = skillVariants(name);
			skills.push({ name, variants, layer: layerFor(variants, capability.id) });
		}
	}
	return SKILL_LAYERS.map((layer) => ({
		...layer,
		skills: skills.filter((skill) => skill.layer === layer.id),
	})).filter((group) => group.skills.length > 0);
}

export function roleTargets(experience: ExperienceContent[]): SkillTarget[] {
	return experience.map((role) => ({
		id: `role-${role.id}`,
		kind: "role",
		title: role.role.trim(),
		subtitle: role.company.trim(),
		tokens: role.technologies.map((item) => item.trim()).filter(Boolean),
		texts: [role.summary, ...role.highlights].map((item) => item.trim()).filter(Boolean),
	}));
}

export function projectTargets(projects: ProjectContent[]): SkillTarget[] {
	return projects.map((project) => ({
		id: `project-${project.id}`,
		kind: "project",
		title: project.title.trim(),
		subtitle: project.role.trim(),
		tokens: project.tags.map((item) => item.trim()).filter(Boolean),
		texts: [project.summary, ...project.highlights].map((item) => item.trim()).filter(Boolean),
	}));
}

/** Every name that could shadow a shorter one ("React Native" shadows "React"). */
export function knownNames(skills: Skill[], targets: SkillTarget[]): string[] {
	const names = new Set<string>();
	for (const skill of skills) for (const variant of skill.variants) names.add(variant);
	for (const target of targets) for (const token of target.tokens) names.add(token);
	return [...names];
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Ranges in `text` where one of `variants` appears as a whole word, ignoring longer known names. */
export function findSkillRanges(
	text: string,
	variants: string[],
	known: string[],
): [number, number][] {
	const ranges: [number, number][] = [];
	for (const variant of variants) {
		const v = lower(variant);
		if (!v) continue;
		// Blank out longer names that start with this one, so "React" never lights "React Native".
		let masked = text;
		for (const name of known) {
			const n = lower(name);
			if (n.length > v.length && n.startsWith(`${v} `)) {
				masked = masked.replace(new RegExp(escape(name), "gi"), (hit) => " ".repeat(hit.length));
			}
		}
		const pattern = new RegExp(`(?<![\\w-])${escape(variant.trim())}(?![\\w-])`, "gi");
		for (const match of masked.matchAll(pattern)) {
			const start = match.index ?? 0;
			ranges.push([start, start + match[0].length]);
		}
	}
	return ranges
		.sort((a, b) => a[0] - b[0])
		.filter((range, index, all) => index === 0 || range[0] >= all[index - 1][1]);
}

export interface SkillUse {
	targetId: string;
	tokens: string[];
	inText: boolean;
}

export function skillUses(
	skill: Skill,
	targets: SkillTarget[],
	known: string[],
	skillNames: string[],
): SkillUse[] {
	const uses: SkillUse[] = [];
	for (const target of targets) {
		const tokens = target.tokens.filter((token) => tokenMatchesSkill(token, skill, skillNames));
		const inText = target.texts.some(
			(text) => findSkillRanges(text, skill.variants, known).length > 0,
		);
		if (tokens.length || inText) uses.push({ targetId: target.id, tokens, inText });
	}
	return uses;
}

/**
 * Token match used by the page: exact, or a broad token that is not itself a
 * listed skill ("TanStack" → "TanStack Router/Query", but "React" ↛ "React Native").
 */
export function tokenMatchesSkill(token: string, skill: Skill, skillNames: string[]): boolean {
	const t = lower(token);
	const isSkill = skillNames.some((name) => lower(name) === t);
	return skill.variants.some((variant) => {
		const v = lower(variant);
		return t === v || (!isSkill && v.startsWith(`${t} `));
	});
}

export interface SkillIndex {
	groups: SkillGroup[];
	targets: SkillTarget[];
	/** Skill name → where it is used (roles first, then projects, content order). */
	uses: Record<string, SkillUse[]>;
	known: string[];
	skillNames: string[];
}

export function buildSkillIndex(
	capabilities: CapabilityContent[],
	experience: ExperienceContent[],
	projects: ProjectContent[],
): SkillIndex {
	const groups = groupSkills(capabilities);
	const skills = groups.flatMap((group) => group.skills);
	const targets = [...roleTargets(experience), ...projectTargets(projects)];
	const known = knownNames(skills, targets);
	const skillNames = skills.flatMap((skill) => skill.variants);
	const uses: Record<string, SkillUse[]> = {};
	for (const skill of skills) uses[skill.name] = skillUses(skill, targets, known, skillNames);
	return { groups, targets, uses, known, skillNames };
}

/** Splits text into plain and marked parts for the active skill. */
export function markSkill(
	text: string,
	skill: Skill | null,
	known: string[],
): { text: string; marked: boolean }[] {
	if (!skill) return [{ text, marked: false }];
	const ranges = findSkillRanges(text, skill.variants, known);
	if (!ranges.length) return [{ text, marked: false }];
	const parts: { text: string; marked: boolean }[] = [];
	let cursor = 0;
	for (const [start, end] of ranges) {
		if (start > cursor) parts.push({ text: text.slice(cursor, start), marked: false });
		parts.push({ text: text.slice(start, end), marked: true });
		cursor = end;
	}
	if (cursor < text.length) parts.push({ text: text.slice(cursor), marked: false });
	return parts;
}

/* ── Years: when each skill first shows up, read from role and project dates ── */

const YEAR = /\b(?:19|20)\d{2}\b/gu;
const ONGOING = /\b(?:present|now|current)\b/iu;

/**
 * "Dec 2023 — Jan 2025" → [2023, 2025]; "Mar 2026 — present" → [2026, latest];
 * "2024" → [2024, 2024]. Null when the text carries no year.
 */
export function periodYears(period: string, latest: number): [number, number] | null {
	const years = (period.match(YEAR) ?? []).map(Number);
	if (!years.length) return null;
	const start = years[0];
	const end = years.length > 1 ? years[years.length - 1] : ONGOING.test(period) ? latest : start;
	return [start, Math.max(start, end)];
}

export interface SkillTimeline {
	/** First and last year any role covers. */
	min: number;
	max: number;
	/** Role or project target id → the years it covers. */
	spans: Record<string, [number, number]>;
	/** Skill name → the first year a dated role or project named it (null for no dated mention). */
	firstYear: Record<string, number | null>;
}

export function buildSkillTimeline(
	index: SkillIndex,
	experience: ExperienceContent[],
	projects: ProjectContent[],
): SkillTimeline | null {
	const roleYears = experience.flatMap((role) => (role.period.match(YEAR) ?? []).map(Number));
	if (!roleYears.length) return null;
	const min = Math.min(...roleYears);
	const max = Math.max(...roleYears);
	const spans: Record<string, [number, number]> = {};
	for (const role of experience) {
		const span = periodYears(role.period, max);
		if (span) spans[`role-${role.id}`] = span;
	}
	for (const project of projects) {
		const span = periodYears(project.year, max);
		if (span) spans[`project-${project.id}`] = span;
	}
	const firstYear: Record<string, number | null> = {};
	for (const group of index.groups) {
		for (const skill of group.skills) {
			const starts = (index.uses[skill.name] ?? [])
				.map((use) => spans[use.targetId]?.[0])
				.filter((year): year is number => year !== undefined);
			firstYear[skill.name] = starts.length ? Math.min(...starts) : null;
		}
	}
	return { min, max, spans, firstYear };
}

/** Where a role or project sits relative to the chosen year. */
export function eraAt(span: [number, number] | undefined, year: number) {
	if (!span) return undefined;
	if (span[0] > year) return "later" as const;
	if (span[1] < year) return "past" as const;
	return "now" as const;
}

export function skillYearCounts(firstYears: (number | null)[], year: number) {
	const dated = firstYears.filter((first): first is number => first !== null);
	return {
		namedByYear: dated.filter((first) => first <= year).length,
		datedTotal: dated.length,
		undated: firstYears.length - dated.length,
	};
}

/** An undated layer stays neutral; otherwise its first dated mention sets its reach. */
export function skillLayerReached(firstYears: (number | null)[], year: number): boolean {
	const { namedByYear, datedTotal } = skillYearCounts(firstYears, year);
	return datedTotal === 0 || namedByYear > 0;
}
