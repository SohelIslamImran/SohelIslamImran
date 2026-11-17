/**
 * What one generic request prints as it crosses each layer of the hero stack,
 * keyed by `StackLayer.id`. Illustrative and product-neutral on purpose: no
 * real endpoints, data, or numbers from any employer.
 */
export interface TraceLine {
	/** The short mono verb ("click", "POST"). */
	verb: string;
	/** What happened at that layer. */
	detail: string;
}

export const REQUEST_TRACE: Readonly<Record<string, TraceLine>> = {
	interface: { verb: "click", detail: "Save changes" },
	api: { verb: "POST", detail: "/api/items → 200" },
	data: { verb: "write", detail: "1 row" },
	access: { verb: "check", detail: "role: member ✓" },
	infrastructure: { verb: "deploy", detail: "healthy" },
	release: { verb: "release", detail: "v1.5 ✓" },
};

/** The trace line for a layer, or a plain fallback for unknown layers. */
export function traceLineFor(id: string, name: string): TraceLine {
	return REQUEST_TRACE[id] ?? { verb: "pass", detail: name };
}
