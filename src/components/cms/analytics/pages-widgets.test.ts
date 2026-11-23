import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { formatDeploymentMessage } from "../../../lib/cloudflare-dashboard";
import { TrafficChart } from "./TrafficChart";
import { RankedList } from "./Widgets";

describe("CMS dashboard widgets", () => {
	it("formats GitHub merge PR deployment messages concisely", () => {
		expect(
			formatDeploymentMessage("Merge pull request #16 from SohelIslamImran/t3/fix-deploy-args"),
		).toBe("PR #16 · t3/fix-deploy-args");
		expect(formatDeploymentMessage("  fix: tighten cache headers  ")).toBe(
			"fix: tighten cache headers",
		);
	});

	it("renders RankedList shares on narrow screens and zero-length bars for zero values", () => {
		const html = renderToStaticMarkup(
			createElement(RankedList, {
				rows: [
					{ value: "success", label: "Completed", count: 10 },
					{ value: "error", label: "Exception", count: 0 },
				],
			}),
		);
		expect(html).toContain("100%");
		expect(html).toContain("0%");
		expect(html).not.toContain("hidden w-8");
		expect(html).toContain("--cms-bar:0");
		expect(html).toContain("--cms-bar:1");
	});

	it("omits the dashed baseline line and shows explicit summary when errors are all zero", () => {
		const html = renderToStaticMarkup(
			createElement(TrafficChart, {
				title: "Requests",
				points: [
					{ at: "2026-11-22T00:00:00Z", pageviews: 120, visitorDays: 0 },
					{ at: "2026-11-22T01:00:00Z", pageviews: 80, visitorDays: 0 },
				],
				hourly: true,
				secondaryTone: "destructive",
				zeroSecondarySummary: "0 errors in this range",
				series: {
					primary: { name: "Requests", one: "request", many: "requests" },
					secondary: { name: "Errors", one: "error", many: "errors" },
				},
			}),
		);
		expect(html).toContain("0 errors in this range");
		expect(html).toContain("text-[12px]");
		expect(html).not.toContain('stroke-dasharray="5 4"');
		expect(html).toContain("var(--theme-ink)");
		expect(html).not.toContain("var(--theme-accent)");
	});

	it("uses destructive color for non-zero secondary errors and keeps Analytics accent defaults", () => {
		const infraHtml = renderToStaticMarkup(
			createElement(TrafficChart, {
				title: "Requests",
				points: [
					{ at: "2026-11-22T00:00:00Z", pageviews: 120, visitorDays: 3 },
					{ at: "2026-11-22T01:00:00Z", pageviews: 80, visitorDays: 1 },
				],
				hourly: true,
				secondaryTone: "destructive",
				zeroSecondarySummary: "0 errors in this range",
				series: {
					primary: { name: "Requests", one: "request", many: "requests" },
					secondary: { name: "Errors", one: "error", many: "errors" },
				},
			}),
		);
		expect(infraHtml).toContain("text-destructive");
		expect(infraHtml).toContain('stroke-dasharray="5 4"');
		expect(infraHtml).not.toContain("0 errors in this range");

		const analyticsHtml = renderToStaticMarkup(
			createElement(TrafficChart, {
				title: "Traffic over time",
				points: [
					{ at: "2026-11-21", pageviews: 42, visitorDays: 18 },
					{ at: "2026-11-22", pageviews: 55, visitorDays: 22 },
				],
			}),
		);
		expect(analyticsHtml).toContain("Pageviews");
		expect(analyticsHtml).toContain("Visitor-days");
		expect(analyticsHtml).toContain("text-primary-text");
		expect(analyticsHtml).toContain('stroke-dasharray="5 4"');
	});
});
