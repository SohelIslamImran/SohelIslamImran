/**
 * The JSON document stored in D1 and consumed by the public portfolio.
 * Keep this file free of server-only imports so the same shape can be used by
 * loaders, editor forms, and lightweight client components.
 */

export const CONTENT_SCHEMA_VERSION = 2 as const;

export type ContentSchemaVersion = typeof CONTENT_SCHEMA_VERSION;

export interface SiteContent {
	title: string;
	description: string;
	url?: string;
	locale: string;
	theme: string;
}

export interface IdentityContent {
	name: string;
	handle: string;
	role: string;
	location: string;
	timezone: string;
	availability: string;
	email: string;
	avatar?: MediaAsset | null;
}

export interface LinkContent {
	label: string;
	href: string;
	external?: boolean;
}

export interface MetricContent {
	label: string;
	value: string;
}

export interface HeroContent {
	eyebrow: string;
	title: string;
	intro: string;
	actions: LinkContent[];
	metrics: MetricContent[];
}

export interface AboutContent {
	title: string;
	paragraphs: string[];
	facts: MetricContent[];
}

export interface ExperienceContent {
	id: string;
	company: string;
	role: string;
	period: string;
	location?: string;
	summary: string;
	highlights: string[];
	technologies: string[];
	current?: boolean;
	href?: string;
}

export interface ProjectContent {
	id: string;
	title: string;
	slug: string;
	summary: string;
	description: string;
	year: string;
	role: string;
	status: string;
	tags: string[];
	highlights: string[];
	href?: string;
	repository?: string;
	cover?: MediaAsset | null;
	featured?: boolean;
}

export interface CapabilityContent {
	id: string;
	title: string;
	description: string;
	tools: string[];
}

export interface WritingContent {
	id: string;
	title: string;
	excerpt: string;
	publishedAt: string;
	readingTime?: string;
	href: string;
	tags: string[];
}

export interface ContactContent {
	title: string;
	intro: string;
	email: string;
	responseTime?: string;
	links: LinkContent[];
}

export interface SocialLinkContent {
	platform: string;
	label: string;
	href: string;
	handle?: string;
}

/**
 * A public profile/contact link with a stable ID for the /links/:linkId
 * redirect. Keep this separate from `social` for backwards-compatible
 * rendering of existing surfaces while the links page becomes the canonical
 * editable list.
 */
export interface ProfileLinkContent {
	id: string;
	platform: string;
	label: string;
	href: string;
	handle?: string;
	description?: string;
	kind?: "social" | "contact" | "story" | "work" | "other";
	featured?: boolean;
}

export interface ResumeContent {
	label: string;
	href: string;
	updatedAt?: string | null;
	summary?: string;
}

export interface StoryChapterContent {
	id: string;
	eyebrow: string;
	title: string;
	paragraphs: string[];
	artifact?: string;
}

export interface StoryContent {
	eyebrow: string;
	title: string;
	intro: string;
	quote: string;
	chapters: StoryChapterContent[];
	sourceLabel: string;
	sourceHref: string;
}

export interface TravelEntryContent {
	id: string;
	place: string;
	region: string;
	season: string;
	summary: string;
	reflection: string;
	latitude?: number;
	longitude?: number;
	visibility: "public" | "unlisted" | "private";
	mediaIds: string[];
}

export interface TravelContent {
	eyebrow: string;
	title: string;
	intro: string;
	origin: string;
	entries: TravelEntryContent[];
}

export interface MediaAsset {
	id: string;
	key: string;
	alt: string;
	mimeType?: string;
	width?: number;
	height?: number;
	bytes?: number;
}

export interface PortfolioContent {
	schemaVersion: ContentSchemaVersion;
	site: SiteContent;
	identity: IdentityContent;
	hero: HeroContent;
	about: AboutContent;
	experience: ExperienceContent[];
	projects: ProjectContent[];
	capabilities: CapabilityContent[];
	writing: WritingContent[];
	contact: ContactContent;
	social: SocialLinkContent[];
	profileLinks: ProfileLinkContent[];
	resume: ResumeContent;
	story: StoryContent;
	travel: TravelContent;
	media: MediaAsset[];
}

export const EMPTY_PORTFOLIO_CONTENT: PortfolioContent = {
	schemaVersion: CONTENT_SCHEMA_VERSION,
	site: {
		title: "Sohel Islam Imran",
		description: "",
		locale: "en",
		theme: "ink",
	},
	identity: {
		name: "Sohel Islam Imran",
		handle: "sohelislamimran",
		role: "",
		location: "Dhaka, Bangladesh",
		timezone: "Asia/Dhaka",
		availability: "",
		email: "sohelislamimran@gmail.com",
		avatar: null,
	},
	hero: {
		eyebrow: "",
		title: "",
		intro: "",
		actions: [],
		metrics: [],
	},
	about: {
		title: "",
		paragraphs: [],
		facts: [],
	},
	experience: [],
	projects: [],
	capabilities: [],
	writing: [],
	contact: {
		title: "",
		intro: "",
		email: "sohelislamimran@gmail.com",
		links: [],
	},
	social: [],
	profileLinks: [],
	resume: {
		label: "Résumé",
		href: "/resume",
		updatedAt: null,
	},
	story: {
		eyebrow: "",
		title: "",
		intro: "",
		quote: "",
		chapters: [],
		sourceLabel: "",
		sourceHref: "/story",
	},
	travel: {
		eyebrow: "",
		title: "",
		intro: "",
		origin: "Dhaka, Bangladesh",
		entries: [],
	},
	media: [],
};
