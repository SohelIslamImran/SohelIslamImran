import type { LiveVisitors } from "../../../server/analytics.server";

/** A live poll result is usable only with a finite, non-negative count and well-formed paths. */
export function isValidLiveVisitors(value: unknown): value is LiveVisitors {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<LiveVisitors>;
	if (
		typeof candidate.count !== "number" ||
		!Number.isFinite(candidate.count) ||
		candidate.count < 0
	) {
		return false;
	}
	if (!Array.isArray(candidate.paths)) return false;
	return candidate.paths.every(
		(row) =>
			row !== null &&
			typeof row === "object" &&
			typeof row.value === "string" &&
			typeof row.count === "number" &&
			Number.isFinite(row.count),
	);
}
