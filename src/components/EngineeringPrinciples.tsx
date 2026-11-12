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
		title: "Follow the whole change.",
		body: "I keep the interface, server rule, data change, test, and release in view together.",
	},
	{
		id: "native",
		capabilityId: "mobile",
		title: "Work with the platform.",
		body: "I start with shared tools. When Android or iOS needs something native, I use Kotlin or Swift.",
	},
	{
		id: "boundaries",
		capabilityId: "access",
		title: "Put rules where they count.",
		body: "I check access and privacy in the services and data layer, as well as the interface.",
	},
	{
		id: "delivery",
		capabilityId: "delivery",
		title: "Make releases easy to check.",
		body: "I use infrastructure as code and automated checks. I also work on clear ways to recover or roll back.",
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
