import type { CapabilityContent } from "../types/content";

export interface EngineeringPrinciple {
	id: string;
	/** The capability this principle belongs with on the home page. */
	capabilityId: string;
	title: string;
	body: string;
}

/** UI copy from the copy deck's "Engineering principles". */
export const ENGINEERING_PRINCIPLES: readonly EngineeringPrinciple[] = [
	{
		id: "end-to-end",
		capabilityId: "product",
		title: "One change, every layer.",
		body: "A feature isn't done until its API check, database change, and tests ship with the screen.",
	},
	{
		id: "data",
		capabilityId: "data",
		title: "Change the database on purpose.",
		body: "Every schema change ships as a versioned migration, reviewed with the code that depends on it.",
	},
	{
		id: "native",
		capabilityId: "mobile",
		title: "Work with the platform.",
		body: "I start with shared code and drop into native APIs only where Android and iOS differ, as they do for in-app updates.",
	},
	{
		id: "boundaries",
		capabilityId: "access",
		title: "Enforce access on the server.",
		body: "Hiding a button isn't security. I check permissions in the API and scope queries to the right organization.",
	},
	{
		id: "delivery",
		capabilityId: "delivery",
		title: "Make releases easy to check.",
		body: "If a change can't be checked automatically and rolled back, it isn't ready to ship.",
	},
];

export interface PairedCapability {
	capability: CapabilityContent;
	principle?: EngineeringPrinciple;
}

/**
 * Pairs each published capability with its principle: by id first, then any
 * unused principle in order, so a CMS edit to capability ids never drops a
 * principle. Principles left over (more principles than capabilities) are
 * returned separately.
 */
export function pairPrinciples(capabilities: CapabilityContent[]): {
	pairs: PairedCapability[];
	leftover: EngineeringPrinciple[];
} {
	const used = new Set<string>();
	const byCapability = new Map(ENGINEERING_PRINCIPLES.map((item) => [item.capabilityId, item]));
	const pairs: PairedCapability[] = capabilities.map((capability) => {
		const match = byCapability.get(capability.id);
		if (match && !used.has(match.id)) {
			used.add(match.id);
			return { capability, principle: match };
		}
		return { capability };
	});
	for (const pair of pairs) {
		if (pair.principle) continue;
		const next = ENGINEERING_PRINCIPLES.find(
			(item) => !used.has(item.id) && !capabilities.some((cap) => cap.id === item.capabilityId),
		);
		if (next) {
			used.add(next.id);
			pair.principle = next;
		}
	}
	return { pairs, leftover: ENGINEERING_PRINCIPLES.filter((item) => !used.has(item.id)) };
}
