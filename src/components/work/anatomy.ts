import type { ProjectContent } from "../../types/content";
import { nonEmpty } from "./project-utils";

/*
 * "Anatomy" of a project: which layers of the stack it touched, read only from
 * the project's own tags, highlights, summary, and description. Nothing here
 * adds a fact; each lit layer keeps the exact words that lit it, so the page
 * can show its evidence. Pure and deterministic (safe for SSR + hydration).
 */

export type AnatomyLayerId = "interface" | "api" | "data" | "access" | "infrastructure" | "release";

export interface AnatomyLayerDefinition {
	id: AnatomyLayerId;
	name: string;
	/** One plain line about what the layer is (UI copy, not a project fact). */
	meaning: string;
	pattern: RegExp;
}

/*
 * Patterns name specific tools or concrete mechanisms only. Broad words
 * ("experience", "app", "services", "data", "tests") are left out on purpose:
 * a layer lights only when the project's own words clearly point at it, and
 * the UI says "mentioned", never more.
 */
export const ANATOMY_LAYERS: readonly AnatomyLayerDefinition[] = [
	{
		id: "interface",
		name: "Interface",
		meaning: "What people see and use.",
		pattern:
			/\b(?:react native|react(?: 19)?|expo|tanstack(?: start| router)?|ui|onboarding|vs code|terminal animation|cli|command-line|reduced-motion)\b/gi,
	},
	{
		id: "api",
		name: "API",
		meaning: "The services between the interface and the data.",
		pattern:
			/\b(?:api|elysia|cloud functions|peerapi|server rendering|webhooks?|stripe|revenuecat)\b/gi,
	},
	{
		id: "data",
		name: "Data",
		meaning: "Where things are stored and looked up.",
		pattern:
			/\b(?:postgres(?:ql)?|database|d1|firestore|redis|drizzle|revisions|revisioned|algolia)\b/gi,
	},
	{
		id: "access",
		name: "Access",
		meaning: "Who can sign in, and what they can reach.",
		pattern:
			/\b(?:firebase auth|better auth|cloudflare access|role-based access|rbac|permissions|oidc|sso|csrf|allowlist|owner-only|sign-in|account linking|trust between services)\b/gi,
	},
	{
		id: "infrastructure",
		name: "Infrastructure",
		meaning: "Where the code runs and how it connects.",
		pattern:
			/\b(?:aws|terraform|cloudflare workers|docker|deployment identity|infrastructure|port forwarding|tailscale)\b/gi,
	},
	{
		id: "release",
		name: "Release",
		meaning: "How changes are checked and shipped.",
		pattern:
			/\b(?:releases|release tooling|release coordination|eas|github actions|playwright|bun test|rollback|beta channels?|npm)\b/gi,
	},
];

export interface AnatomyLayer {
	id: AnatomyLayerId;
	name: string;
	meaning: string;
	touched: boolean;
	/** Project tags that point at this layer, in content order. */
	tags: string[];
	/** Indexes into the project's (trimmed, non-empty) highlights. */
	notes: number[];
	/** Distinct words from the project's own text that lit the layer. */
	terms: string[];
}

export interface ProjectAnatomy {
	layers: AnatomyLayer[];
	/** For each highlight (same order as `nonEmpty(project.highlights)`), the layers it touches. */
	highlightLayers: AnatomyLayerId[][];
	touchedCount: number;
}

function matches(pattern: RegExp, text: string): string[] {
	const found: string[] = [];
	for (const match of text.matchAll(new RegExp(pattern.source, pattern.flags))) {
		found.push(match[0]);
	}
	return found;
}

function addTerm(terms: string[], term: string) {
	const lower = term.toLowerCase();
	if (!terms.some((existing) => existing.toLowerCase() === lower)) terms.push(term);
}

export function projectAnatomy(project: ProjectContent): ProjectAnatomy {
	const tags = nonEmpty(project.tags);
	const highlights = nonEmpty(project.highlights);
	const prose = [project.summary, project.description].map((text) => text.trim()).join(" ");

	const highlightLayers: AnatomyLayerId[][] = highlights.map(() => []);
	const layers = ANATOMY_LAYERS.map((definition): AnatomyLayer => {
		const terms: string[] = [];
		const layerTags = tags.filter((tag) => {
			const hit = matches(definition.pattern, tag);
			hit.forEach((term) => addTerm(terms, term));
			return hit.length > 0;
		});
		const notes: number[] = [];
		highlights.forEach((highlight, index) => {
			const hit = matches(definition.pattern, highlight);
			if (hit.length === 0) return;
			hit.forEach((term) => addTerm(terms, term));
			notes.push(index);
			highlightLayers[index].push(definition.id);
		});
		matches(definition.pattern, prose).forEach((term) => addTerm(terms, term));
		return {
			id: definition.id,
			name: definition.name,
			meaning: definition.meaning,
			touched: terms.length > 0,
			tags: layerTags,
			notes,
			terms,
		};
	});

	return {
		layers,
		highlightLayers,
		touchedCount: layers.filter((layer) => layer.touched).length,
	};
}

/** Splits text into plain and matched parts, to underline the words that lit a layer. */
export function markTerms(
	text: string,
	layerId: AnatomyLayerId | null,
): { text: string; marked: boolean }[] {
	const definition = ANATOMY_LAYERS.find((layer) => layer.id === layerId);
	if (!definition) return [{ text, marked: false }];
	const parts: { text: string; marked: boolean }[] = [];
	let cursor = 0;
	for (const match of text.matchAll(
		new RegExp(definition.pattern.source, definition.pattern.flags),
	)) {
		const start = match.index ?? 0;
		if (start > cursor) parts.push({ text: text.slice(cursor, start), marked: false });
		parts.push({ text: match[0], marked: true });
		cursor = start + match[0].length;
	}
	if (cursor < text.length) parts.push({ text: text.slice(cursor), marked: false });
	return parts;
}
