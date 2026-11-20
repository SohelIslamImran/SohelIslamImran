import type { CapabilityContent } from "../../types/content";

/**
 * "How I work" shows a feature as a plate ("Your product") resting on one
 * support per capability. Taking a support out shows, in plain words, what
 * users would feel without it, and the capability's own CMS copy says what
 * Sohel does about it.
 *
 * Plain labels and consequences are keyed by capability id. A capability the
 * CMS adds later still gets a support, labelled with its own title and a
 * neutral consequence, so the section never breaks.
 */
export interface Support {
	/** DOM-safe, unique id. */
	id: string;
	/** Short, plain label for the support, e.g. "Permissions". */
	label: string;
	/** What users would feel without this part, in one plain sentence. */
	without: string;
	capability: CapabilityContent;
}

const PLAIN: Readonly<Record<string, { label: string; without: string }>> = {
	product: {
		label: "Save",
		without: "The screen says saved. The server never got it.",
	},
	data: {
		label: "Saved data",
		without: "An update quietly breaks last year’s records.",
	},
	access: {
		label: "Permissions",
		without: "One customer can read another customer’s data.",
	},
	mobile: {
		label: "Phone app",
		without: "Customers on their phones get a second-class product.",
	},
	delivery: {
		label: "Release",
		without: "A bad release can’t be taken back.",
	},
};

const FALLBACK_WITHOUT = "Something your users rely on stops working.";

function slug(value: string) {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/gu, "-")
			.replace(/^-+|-+$/gu, "") || "part"
	);
}

/** One support per published capability, in CMS order, with unique ids. */
export function supportsFor(capabilities: readonly CapabilityContent[]): Support[] {
	const used = new Set<string>();
	/** The slug itself, or the first free "-2", "-3"… suffix ("build-2" may already be a real id). */
	const unique = (base: string) => {
		let id = base;
		for (let suffix = 2; used.has(id); suffix += 1) id = `${base}-${suffix}`;
		used.add(id);
		return id;
	};
	return capabilities
		.map((capability) => ({
			...capability,
			title: capability.title.trim(),
			description: capability.description.trim(),
			tools: capability.tools.map((tool) => tool.trim()).filter(Boolean),
		}))
		.filter((capability) => capability.title || capability.description)
		.map((capability) => {
			const plain = PLAIN[capability.id];
			return {
				id: unique(slug(capability.id || capability.title)),
				label: plain?.label ?? (capability.title.split(/[,:]/u)[0]?.trim() || "This part"),
				without: plain?.without ?? FALLBACK_WITHOUT,
				capability,
			};
		});
}

/**
 * How the plate settles when support `gone` is out of `count`: it tilts toward
 * the gap (degrees, negative = left side drops; it pivots on the far edge)
 * and drops a little, most when the gap is in the middle.
 */
export function plateSag(gone: number, count: number): { tilt: number; drop: number } {
	if (gone < 0 || gone >= count || count < 2) return { tilt: 0, drop: 0 };
	const mid = (count - 1) / 2;
	const side = (gone - mid) / mid;
	return {
		tilt: Number((side * 1.6).toFixed(2)),
		drop: Number((3 + (1 - Math.abs(side)) * 9).toFixed(1)),
	};
}
