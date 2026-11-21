/**
 * Content sections of the CMS. The shell rail, the command bar, the release
 * diff, and `/content/$section` all read this list, so a section exists in one
 * place. Editors live in `editors.tsx`, keyed by the same ids.
 */
import type { PortfolioContent } from "../../../types/content";

export type SectionGroup = "identity" | "work" | "writing" | "links";

export const SECTION_GROUPS: readonly { id: SectionGroup; label: string }[] = [
	{ id: "identity", label: "Identity" },
	{ id: "work", label: "Work" },
	{ id: "writing", label: "Writing and story" },
	{ id: "links", label: "Links" },
];

export interface SectionMeta {
	id: string;
	label: string;
	group: SectionGroup;
	/** Top-level content keys this section edits; drives change and error counts. */
	paths: readonly (keyof PortfolioContent)[];
	/** One line for the command bar and the section header. */
	summary: string;
	/** Collections edit a list of items with `?item=<id>`. */
	collection?: boolean;
	/** Public page that shows this content, for "View live". */
	livePath?: string;
}

export const SECTIONS = [
	{
		id: "site",
		label: "Site and SEO",
		group: "identity",
		paths: ["site"],
		summary: "Title, description, canonical URL, and locale.",
		livePath: "/",
	},
	{
		id: "identity",
		label: "Identity",
		group: "identity",
		paths: ["identity"],
		summary: "Name, role, availability, email, time zone, and portrait.",
		livePath: "/",
	},
	{
		id: "hero",
		label: "Home hero",
		group: "identity",
		paths: ["hero"],
		summary: "Home headline, intro, actions, and metrics.",
		livePath: "/",
	},
	{
		id: "about",
		label: "About",
		group: "identity",
		paths: ["about"],
		summary: "About paragraphs and quick facts.",
		livePath: "/",
	},
	{
		id: "contact",
		label: "Contact",
		group: "identity",
		paths: ["contact"],
		summary: "Contact heading, email, response time, and links.",
		livePath: "/#contact",
	},
	{
		id: "resume",
		label: "Résumé",
		group: "identity",
		paths: ["resume"],
		summary: "Résumé label, link, summary, and last update.",
		livePath: "/resume",
	},
	{
		id: "projects",
		label: "Projects",
		group: "work",
		paths: ["projects"],
		summary: "Products, open source, and experiments.",
		collection: true,
		livePath: "/work",
	},
	{
		id: "experience",
		label: "Experience",
		group: "work",
		paths: ["experience"],
		summary: "Roles, companies, periods, and highlights.",
		collection: true,
		livePath: "/resume",
	},
	{
		id: "capabilities",
		label: "Capabilities",
		group: "work",
		paths: ["capabilities"],
		summary: "What I build, with the tools for each.",
		collection: true,
		livePath: "/",
	},
	{
		id: "testimonials",
		label: "Testimonials",
		group: "work",
		paths: ["testimonials"],
		summary: "Quotes from people I have worked with.",
		collection: true,
		livePath: "/",
	},
	{
		id: "credentials",
		label: "Credentials",
		group: "work",
		paths: ["credentials"],
		summary: "Certificates and awards.",
		collection: true,
		livePath: "/resume",
	},
	{
		id: "writing",
		label: "Field notes",
		group: "writing",
		paths: ["writing"],
		summary: "Posts and notes with dates and tags.",
		collection: true,
		livePath: "/field-notes",
	},
	{
		id: "story",
		label: "Story",
		group: "writing",
		paths: ["story"],
		summary: "The story page and its chapters.",
		livePath: "/story",
	},
	{
		id: "travel",
		label: "Travel",
		group: "writing",
		paths: ["travel"],
		summary: "Places, seasons, and reflections.",
	},
	{
		id: "links",
		label: "Profile links",
		group: "links",
		paths: ["profileLinks", "social"],
		summary: "The /links page and the social links on the résumé.",
		collection: true,
		livePath: "/links",
	},
] as const satisfies readonly SectionMeta[];

export type SectionId = (typeof SECTIONS)[number]["id"];

export function findSection(id: string): SectionMeta | undefined {
	return (SECTIONS as readonly SectionMeta[]).find((section) => section.id === id);
}

export function isSectionId(id: string): id is SectionId {
	return findSection(id) !== undefined;
}
