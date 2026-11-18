import type { ProfileLinkContent } from "../../../types/content";

export type DestinationKind = "web" | "internal" | "hash" | "mailto" | "tel";

export const destinationArrows: Record<DestinationKind, string> = {
	web: "↗",
	internal: "→",
	hash: "↓",
	mailto: "@",
	tel: "☎",
};

export function classifyDestination(href: string): DestinationKind {
	const value = href.trim();
	if (/^(?:https?:)?\/\//iu.test(value)) return "web";
	if (value.startsWith("#")) return "hash";
	const protocol = value.match(/^([a-z][a-z\d+.-]*):/iu)?.[1].toLowerCase();
	if (protocol === "mailto") return "mailto";
	if (protocol === "tel") return "tel";
	if (protocol) return "web";
	return "internal";
}

/** What a person would paste: the address for email/phone, an absolute URL otherwise. */
export function copyValue(link: ProfileLinkContent, siteUrl?: string): string {
	const href = link.href.trim();
	const kind = classifyDestination(href);
	if (kind === "mailto" || kind === "tel") {
		return decodeURIComponent(href.replace(/^[a-z]+:/iu, "").split("?")[0] ?? "");
	}
	if (kind === "internal" || kind === "hash") {
		const base = siteUrl?.trim().replace(/\/$/u, "");
		return base ? `${base}${href.startsWith("/") || href.startsWith("#") ? "" : "/"}${href}` : href;
	}
	return href;
}

/** Short, readable form of what was copied, for the toast. */
export function displayValue(value: string): string {
	return value
		.replace(/^https?:\/\//iu, "")
		.replace(/^www\./iu, "")
		.replace(/\/$/u, "");
}

/**
 * The line a person scans: platform for profiles ("GitHub"), the title for
 * pieces of writing ("From first computer to lead engineer").
 */
export function linkTitles(link: ProfileLinkContent) {
	const platform = link.platform.trim() || "Link";
	const label = link.label.trim();
	const handle = link.handle?.trim();
	const isPiece = (link.kind === "story" || link.kind === "other") && !handle && label;
	const title = isPiece ? label : platform;
	const detail = isPiece ? platform : handle || label || null;
	return { platform, title, detail: detail && detail !== title ? detail : null };
}
