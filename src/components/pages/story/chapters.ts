import type { StoryChapterContent, StoryContent } from "../../../types/content";

/**
 * Pure helpers for the story page. Nothing here adds a fact: chapter ids,
 * labels and layers are all readings of the published story content.
 */

export type StoryChapterItem = StoryChapterContent & {
	domId: string;
	label: string;
	titleId: string;
	/** Two-digit numeral shown on the plane and the rail (00, 01, …). */
	numeral: string;
	paragraphs: string[];
	/** Layers this chapter's own words name, front to back. */
	layers: StoryLayerId[];
	/** Every layer named so far, this chapter included. */
	reached: StoryLayerId[];
};

/** The layers of a product, front (the interface) to back (the release). */
export const STORY_LAYERS = [
	{ id: "screen", label: "Interface" },
	{ id: "api", label: "API" },
	{ id: "data", label: "Data" },
	{ id: "access", label: "Access" },
	{ id: "cloud", label: "Infrastructure" },
	{ id: "release", label: "Release" },
] as const;

export type StoryLayerId = (typeof STORY_LAYERS)[number]["id"];

/*
 * A chapter "touches" a layer when its title, paragraphs or takeaway name
 * work there. Kept deliberately narrow so early chapters (before any product
 * work) read as "before the stack" instead of borrowing a layer.
 */
const SIGNALS: Record<StoryLayerId, RegExp> = {
	screen: /\b(screens?|react native|mobile app(?:lication)?s?|interfaces?)\b/iu,
	api: /\b(services?|apis?|backend|elysia|integrations?)\b/iu,
	data: /\b(postgresql|drizzle|redis|databases?|sql)\b/iu,
	access: /\b(authori[sz]ation|authentication|permissions?|security|sign-in)\b/iu,
	cloud: /\b(cloud|aws|terraform|infrastructure|deployments?)\b/iu,
	release: /\b(releases?|launch(?:es|ed)?|ships?|shipped|production)\b/iu,
};

export function chapterLayers(chapter: StoryChapterContent): StoryLayerId[] {
	const text = [chapter.title, ...chapter.paragraphs, chapter.artifact ?? ""].join(" \n ");
	return STORY_LAYERS.filter((layer) => SIGNALS[layer.id].test(text)).map((layer) => layer.id);
}

export function layerLabels(ids: readonly StoryLayerId[]) {
	return STORY_LAYERS.filter((layer) => ids.includes(layer.id)).map((layer) => layer.label);
}

export function fragmentToken(value: string) {
	return value
		.normalize("NFKD")
		.toLowerCase()
		.replace(/[^\p{Letter}\p{Number}\p{M}]+/gu, "-")
		.replace(/^-+|-+$/g, "");
}

export function chapterItems(chapters: StoryContent["chapters"]): StoryChapterItem[] {
	const usedTokens = new Set<string>();
	const reached = new Set<StoryLayerId>();
	return chapters.map((chapter, index) => {
		const eyebrow = chapter.eyebrow.trim();
		const title = chapter.title.trim();
		const baseToken = fragmentToken(chapter.id) || "section";
		let token = baseToken;
		let suffix = 2;
		while (usedTokens.has(token)) token = `${baseToken}-${suffix++}`;
		usedTokens.add(token);
		const domId = `chapter-${token}`;
		const layers = chapterLayers(chapter);
		for (const layer of layers) reached.add(layer);
		return {
			...chapter,
			domId,
			label: title || eyebrow || `Chapter ${index + 1}`,
			titleId: `${domId}-title`,
			numeral: String(index).padStart(2, "0"),
			paragraphs: chapter.paragraphs.map((p) => p.trim()).filter(Boolean),
			layers,
			reached: STORY_LAYERS.filter((layer) => reached.has(layer.id)).map((layer) => layer.id),
		};
	});
}

/** For each layer, the first chapter whose own words name it (or undefined). */
export function layerEntries(chapters: readonly StoryChapterItem[]) {
	return STORY_LAYERS.map((layer) => ({
		...layer,
		chapter: chapters.find((chapter) => chapter.layers.includes(layer.id)),
	}));
}

/** "From first computer to lead engineer." → lead + optional second sentence. */
export function splitStoryTitle(title: string) {
	const dot = title.indexOf(". ");
	if (dot === -1) return { lead: title, rest: "" };
	return { lead: title.slice(0, dot + 1), rest: title.slice(dot + 2) };
}

export function classifySource(href: string) {
	const value = href.trim();
	if (/^mailto:/iu.test(value)) return { arrow: "@", external: false };
	if (/^tel:/iu.test(value)) return { arrow: "☎", external: false };
	if (value.startsWith("#")) return { arrow: "↓", external: false };
	const protocol = value.match(/^([a-z][a-z\d+.-]*):/iu)?.[1].toLowerCase();
	if (/^(?:https?:)?\/\//iu.test(value) || protocol) return { arrow: "↗", external: true };
	return { arrow: "→", external: false };
}

const storyDateFormatter = new Intl.DateTimeFormat("en-US", {
	day: "numeric",
	month: "long",
	timeZone: "UTC",
	year: "numeric",
});

export function formatVisibleDate(value: string | undefined) {
	const trimmed = value?.trim();
	if (!trimmed) return "";
	const date = new Date(trimmed);
	return Number.isNaN(date.getTime()) ? trimmed : storyDateFormatter.format(date);
}
