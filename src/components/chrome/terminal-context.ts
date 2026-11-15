import type { PortfolioContent } from "../../types/content";
import type { TerminalContext, TerminalThemeMode } from "./terminal";

/**
 * Builds the terminal's context from published content, so the command
 * palette and the 404 prompt answer from the same data. The clock fields are
 * placeholders: callers replace them with the real time when a command runs.
 */
export function terminalContextFromContent(
	content: PortfolioContent | null | undefined,
	appearance: {
		theme: TerminalThemeMode;
		accent: string;
		accents: readonly { id: string; name: string }[];
	},
): TerminalContext {
	const current = content?.experience.find((item) => item.current);
	return {
		name: content?.identity.name.trim() ?? "",
		role: content?.identity.role.trim() ?? "",
		location: content?.identity.location.trim() ?? "",
		timeZone: content?.identity.timezone.trim() || "Asia/Dhaka",
		availability: content?.identity.availability.trim() ?? "",
		email: (content?.identity.email || content?.contact.email || "").trim(),
		now: current
			? {
					role: current.role.trim(),
					company: current.company.trim(),
					period: current.period.trim(),
				}
			: undefined,
		projects: (content?.projects ?? []).map((project) => ({
			slug: project.slug.trim(),
			title: project.title.trim(),
			summary: project.summary.trim(),
		})),
		links: (content?.profileLinks ?? [])
			.filter((link) => link.href.trim() && !link.href.trim().startsWith("#"))
			.map((link) => ({
				id: link.id,
				label: link.label.trim() || link.platform.trim(),
				platform: link.platform.trim(),
				href: link.href.trim(),
			})),
		theme: appearance.theme,
		accent: appearance.accent,
		accents: appearance.accents.map(({ id, name }) => ({ id, name })),
		// Replaced with the real clock at run time (never read during render).
		date: new Date(0),
		visitorOffsetMinutes: 0,
	};
}

/** The context with its clock set to now. Call from event handlers, never during render. */
export function withCurrentClock(context: TerminalContext): TerminalContext {
	const now = new Date();
	return { ...context, date: now, visitorOffsetMinutes: -now.getTimezoneOffset() };
}
