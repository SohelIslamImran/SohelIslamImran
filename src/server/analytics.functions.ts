import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { analyticsProjectPath } from "../components/analytics/paths";
import { linkableProjects, projectSlug } from "../components/work/project-utils";
import {
	readAnalyticsOverview,
	readAnalyticsSummary,
	readLiveVisitors,
	type AnalyticsSummary,
} from "./analytics.server";
import { requireOwner } from "./auth.server";
import { readPublished, runtime } from "./cms.server";

export const analyticsSearch = z.object({
	range: z.enum(["24h", "7d", "30d", "90d", "12m"]).catch("30d").default("30d"),
});

async function withProjectTitles(summary: AnalyticsSummary) {
	if (summary.topProjects.length === 0) return summary;
	const content = await readPublished();
	const titles = new Map(
		linkableProjects(content.projects).map((project) => [
			analyticsProjectPath(projectSlug(project)),
			project.title,
		]),
	);
	return {
		...summary,
		topProjects: summary.topProjects.map((row) => ({
			...row,
			label: titles.get(row.value) ?? row.value,
		})),
	};
}

export const getAnalyticsSummary = createServerFn({ method: "GET" })
	.validator(analyticsSearch)
	.handler(async ({ data }) => {
		const environment = runtime();
		setResponseHeader("Cache-Control", "private, no-store");
		await requireOwner(getRequest(), environment);
		if (!environment.DB) throw new Response("Analytics database unavailable", { status: 503 });
		return withProjectTitles(await readAnalyticsSummary(environment.DB, data.range));
	});

export const getAnalyticsOverview = createServerFn({ method: "GET" }).handler(async () => {
	const environment = runtime();
	setResponseHeader("Cache-Control", "private, no-store");
	await requireOwner(getRequest(), environment);
	if (!environment.DB) throw new Response("Analytics database unavailable", { status: 503 });
	const overview = await readAnalyticsOverview(environment.DB);
	return { ...overview, recent: await withProjectTitles(overview.recent) };
});

export const getLiveVisitors = createServerFn({ method: "GET" }).handler(async () => {
	const environment = runtime();
	setResponseHeader("Cache-Control", "private, no-store");
	await requireOwner(getRequest(), environment);
	if (!environment.DB) throw new Response("Analytics database unavailable", { status: 503 });
	return readLiveVisitors(environment.DB);
});
