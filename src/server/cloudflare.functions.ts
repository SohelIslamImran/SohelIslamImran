import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireOwner } from "./auth.server";
import { runtime } from "./cms.server";
import { INSIGHTS_RANGES } from "../lib/cloudflare-dashboard";
import {
	readCloudflareInsights,
	type CloudflareInsightsResult,
} from "./cloudflare-insights.server";

export const insightsSearch = z.object({
	range: z.enum(INSIGHTS_RANGES).catch("24h").default("24h"),
});

interface InsightsEnvironment {
	CF_API_TOKEN?: string;
	CF_ACCOUNT_ID?: string;
	CF_D1_DATABASE_ID?: string;
}

/**
 * Owner-only Cloudflare metrics for the Infrastructure page and the Overview
 * card. Returns a result instead of throwing so the page can explain a missing
 * token or an API outage in place.
 */
export const getCloudflareInsights = createServerFn({ method: "GET" })
	.validator(insightsSearch)
	.handler(async ({ data }): Promise<CloudflareInsightsResult> => {
		setResponseHeader("Cache-Control", "private, no-store");
		const environment = runtime();
		await requireOwner(getRequest(), environment);
		const config = environment as typeof environment & InsightsEnvironment;
		if (!config.CF_API_TOKEN || !config.CF_ACCOUNT_ID) {
			return {
				ok: false,
				reason: "not-configured",
				message: "Add a read-only Cloudflare API token as the CF_API_TOKEN secret.",
			};
		}
		try {
			const insights = await readCloudflareInsights(
				{
					token: config.CF_API_TOKEN,
					accountId: config.CF_ACCOUNT_ID,
					databaseId: config.CF_D1_DATABASE_ID,
				},
				data.range,
			);
			return { ok: true, insights };
		} catch (error) {
			// The message carries no token or request details, only the API status.
			console.warn("cloudflare insights unavailable", error instanceof Error ? error.message : "");
			return {
				ok: false,
				reason: "unavailable",
				message: "Cloudflare metrics could not be loaded right now.",
			};
		}
	});
