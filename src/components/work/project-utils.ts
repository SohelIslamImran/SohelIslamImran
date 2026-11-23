import { PROJECT_CATEGORIES, type ProjectCategory, type ProjectContent } from "../../types/content";

/*
 * Pure helpers shared by the work index, the project cards, the detail route,
 * and the posters. No React, no DOM: everything here is safe on the server and
 * deterministic, so markup never differs between SSR and hydration.
 */

export const workGroups = ["all", ...PROJECT_CATEGORIES] as const;
export type WorkGroup = (typeof workGroups)[number];

/** Short labels for the filter control. */
export const workGroupLabels: Record<WorkGroup, string> = {
	all: "All work",
	product: "Products",
	"open-source": "Open source",
	experiment: "Experiments",
};

/** One plain sentence per group (copy deck: Work → groups). */
export const workGroupDescriptions: Record<WorkGroup, string> = {
	all: "Products, tools, and experiments in one place.",
	product: "Products that shipped to real users.",
	"open-source": "Tools you can inspect, use, and build on.",
	experiment: "Small projects where I try an idea.",
};

/** Singular label for a project's category, used as a card or page eyebrow. */
export const categoryLabels: Record<ProjectCategory, string> = {
	product: "Product",
	"open-source": "Open source",
	experiment: "Experiment",
};

/** Index order: products, then open source, then experiments; content order inside each. */
export function orderProjects(projects: readonly ProjectContent[]): ProjectContent[] {
	return PROJECT_CATEGORIES.flatMap((category) =>
		projects.filter((project) => project.category === category),
	);
}

export function projectSlug(project: ProjectContent): string {
	return project.slug.trim();
}

/** Projects that can have a detail page (a usable slug and a title). */
export function linkableProjects(projects: readonly ProjectContent[]): ProjectContent[] {
	const seen = new Set<string>();
	return orderProjects(projects).filter((project) => {
		const slug = projectSlug(project);
		if (!slug || !project.title.trim() || seen.has(slug)) return false;
		seen.add(slug);
		return true;
	});
}

export function findProjectBySlug(
	projects: readonly ProjectContent[],
	slug: string,
): ProjectContent | undefined {
	const wanted = slug.trim();
	if (!wanted) return undefined;
	return linkableProjects(projects).find((project) => projectSlug(project) === wanted);
}

/**
 * The linkable projects a reader is stepping through: one group when they came
 * from a filtered /work view and the project belongs to it, otherwise all work.
 */
export function projectsInGroup(
	projects: readonly ProjectContent[],
	slug: string,
	group: WorkGroup = "all",
): ProjectContent[] {
	const list = linkableProjects(projects);
	if (group === "all") return list;
	const scoped = list.filter((project) => project.category === group);
	return scoped.some((project) => projectSlug(project) === slug.trim()) ? scoped : list;
}

/** Previous and next projects in index order within the group, wrapping at the ends. */
export function adjacentProjects(
	projects: readonly ProjectContent[],
	slug: string,
	group: WorkGroup = "all",
): { previous?: ProjectContent; next?: ProjectContent } {
	const list = projectsInGroup(projects, slug, group);
	const index = list.findIndex((project) => projectSlug(project) === slug.trim());
	if (index === -1 || list.length < 2) return {};
	return {
		previous: list[(index - 1 + list.length) % list.length],
		next: list[(index + 1) % list.length],
	};
}

const cautionaryStatus =
	/\b(?:archived|deprecated|discontinued|draft|experimental|inactive|prototype|unmaintained|unstable)\b/i;
const liveStatus = /\b(?:current|live|active|maintained|shipped|production)\b/i;

export type StatusTone = "neutral" | "signal" | "success";

/** Tone for a free-text status: cautionary words win over "live" words. */
export function statusTone(status: string): StatusTone {
	if (cautionaryStatus.test(status)) return "signal";
	if (liveStatus.test(status)) return "success";
	return "neutral";
}

export interface ProjectLink {
	kind: "site" | "package" | "source";
	label: string;
	href: string;
	/** Opens in a new tab (absolute web URL). */
	external: boolean;
}

function isWebHref(href: string) {
	return /^(?:https?:)?\/\//i.test(href);
}

function isSafeHref(href: string) {
	return (
		isWebHref(href) || (href.startsWith("/") && !href.startsWith("//")) || /^mailto:/i.test(href)
	);
}

const packageHosts = /(?:^|\.)(?:npmjs\.com|npmjs\.org|jsr\.io|pypi\.org|crates\.io|pub\.dev)$/i;

function hostOf(href: string) {
	try {
		return new URL(href, "https://example.invalid").hostname;
	} catch {
		return "";
	}
}

/** The public destinations of a project, labelled with the copy deck's card actions. */
export function projectLinks(project: ProjectContent): ProjectLink[] {
	const links: ProjectLink[] = [];
	const href = project.href?.trim();
	if (href && isSafeHref(href)) {
		const isPackage = packageHosts.test(hostOf(href));
		links.push({
			kind: isPackage ? "package" : "site",
			label: isPackage ? "Open package" : "Visit site",
			href,
			external: isWebHref(href),
		});
	}
	const repository = project.repository?.trim();
	if (repository && isSafeHref(repository) && repository !== href) {
		links.push({
			kind: "source",
			label: "View source",
			href: repository,
			external: isWebHref(repository),
		});
	}
	return links;
}

/** Accessible name for an external project link, e.g. "View source for TailSync (opens in a new tab)". */
export function projectLinkName(link: ProjectLink, title: string) {
	return `${link.label} for ${title.trim() || "this project"}${link.external ? " (opens in a new tab)" : ""}`;
}

export function nonEmpty(values: readonly string[] | undefined): string[] {
	return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

export function projectMetrics(project: ProjectContent) {
	return (project.metrics ?? [])
		.map((metric) => ({ value: metric.value.trim(), label: metric.label.trim() }))
		.filter((metric) => metric.value && metric.label);
}

/** 32-bit FNV-1a. Stable across server and client. */
export function hashString(value: string): number {
	let hash = 0x811c9dc5;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

/** Deterministic PRNG (mulberry32) for seeded artwork. */
export function seededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Up to two initials from a title: "Android Mac Display" → "AM", "ghosttime" → "GH". */
export function monogram(title: string): string {
	const words = title
		.replace(/[^\p{Letter}\p{Number}]+/gu, " ")
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (words.length === 0) return "··";
	if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
	return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
