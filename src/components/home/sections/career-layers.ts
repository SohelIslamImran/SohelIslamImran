import type { ExperienceContent } from "../../../types/content";

/**
 * The layers of a web product, front to back: the same order as the hero
 * stack. A role "touches" a layer when its published tools or highlights name
 * work there. Nothing here is a new fact; it is a reading of the role content.
 */
export const CAREER_LAYERS = [
	{ id: "interface", label: "Interface" },
	{ id: "api", label: "API" },
	{ id: "data", label: "Data" },
	{ id: "access", label: "Access" },
	{ id: "cloud", label: "Infrastructure" },
	{ id: "release", label: "Release" },
] as const;

export type CareerLayerId = (typeof CAREER_LAYERS)[number]["id"];

const SIGNALS: Record<CareerLayerId, RegExp> = {
	interface:
		/\b(react|react native|expo|tanstack|figma|sass|bootstrap|ui|interfaces?|screens?|web apps?|mobile|admin portal)\b/iu,
	api: /\b(elysia|bun|cloud functions|services?|api)\b/iu,
	data: /\b(postgresql|drizzle|redis|firestore|database|data models?)\b/iu,
	access: /\b(sign-in|sign in|permissions?|role-based|access|auth|privacy)\b/iu,
	cloud: /\b(aws|terraform|docker|cloudflare|infrastructure|deployment)\b/iu,
	release: /\b(releases?|eas|ci|app store|google play|rollback|playwright|beta channels|tests)\b/iu,
};

/** Which layers one role worked in, in front-to-back order. */
export function layersTouched(role: ExperienceContent): CareerLayerId[] {
	const text = [...role.technologies, ...role.highlights].join(" \n ");
	return CAREER_LAYERS.filter((layer) => SIGNALS[layer.id].test(text)).map((layer) => layer.id);
}

/** The role's published tools that belong to one layer. */
export function toolsForLayer(role: ExperienceContent, layer: CareerLayerId): string[] {
	return role.technologies
		.map((tool) => tool.trim())
		.filter((tool) => tool && SIGNALS[layer].test(tool));
}

/**
 * One published highlight per layer, preferring highlights no earlier layer
 * has used, so each layer reads as its own piece of the work.
 */
export function highlightsByLayer(role: ExperienceContent): Partial<Record<CareerLayerId, string>> {
	const used = new Set<string>();
	const result: Partial<Record<CareerLayerId, string>> = {};
	for (const layer of CAREER_LAYERS) {
		const matches = role.highlights.filter((item) => SIGNALS[layer.id].test(item));
		const pick = matches.find((item) => !used.has(item)) ?? matches[0];
		if (pick) {
			result[layer.id] = pick.trim();
			used.add(pick);
		}
	}
	return result;
}
