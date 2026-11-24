import { scoreItem } from "../../chrome/fuzzy";

export const pageKeywords = {
	"page-overview": "overview home dashboard status signals",
	"page-analytics": "visitors referrers countries traffic stats views metrics",
	"page-infrastructure":
		"hosting build version worker deployments cloudflare health cpu latency d1 r2 cron uptime",
	"page-release": "changes review diff publish deploy release json export import",
	"page-history": "versions revisions rollback restore snapshots timeline",
	"page-activity": "audit events log history",
	"page-library": "media library pdf images photos uploads r2 files assets",
} as const;

export function searchCommands<
	T extends { label: string; group: string; keywords?: string; detail?: string },
>(entries: readonly T[], query: string): T[] {
	return entries
		.flatMap((item) => {
			const nameScore = scoreItem(query, item.label, item.keywords);
			// An explicit keyword outranks a match in descriptive copy.
			const detailScore = scoreItem(query, "", `${item.detail ?? ""} ${item.group}`.trim());
			if (nameScore === null && detailScore === null) return [];
			return [{ item, score: Math.max(nameScore ?? -Infinity, (detailScore ?? -Infinity) - 180) }];
		})
		.sort((a, b) => b.score - a.score)
		.map(({ item }) => item);
}
