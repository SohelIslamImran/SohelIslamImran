import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { countWorkerErrors, formatDeploymentMessage } from "../../../lib/cloudflare-dashboard";
import { TrafficChart } from "./TrafficChart";
import { RankedList, TickingNumber, formatUtcWindow } from "./Widgets";

describe("CMS dashboard widgets", () => {
	it("exposes one accessible formatted KPI while hiding the animated glyphs", () => {
		const html = renderToStaticMarkup(createElement(TickingNumber, { value: 1250, suffix: "ms" }));
		expect(html).toContain('<span class="sr-only">1,250 ms</span>');
		expect(html).toMatch(/<span aria-hidden="true"[^>]*>1,250 ms<\/span>/u);
	});

	it("formats GitHub merge PR deployment messages concisely", () => {
		expect(
			formatDeploymentMessage("Merge pull request #16 from SohelIslamImran/t3/fix-deploy-args"),
		).toBe("PR #16 · t3/fix-deploy-args");
		expect(formatDeploymentMessage("  fix: tighten cache headers  ")).toBe(
			"fix: tighten cache headers",
		);
	});

	it("aggregates Worker errors consistently across totals and failure statuses", () => {
		expect(
			countWorkerErrors({
				errors: 0,
				statuses: [
					{ status: "success", requests: 100 },
					{ status: "clientDisconnected", requests: 4 },
				],
			}),
		).toBe(0);
		expect(
			countWorkerErrors({
				errors: 0,
				statuses: [
					{ status: "success", requests: 100 },
					{ status: "scriptThrewException", requests: 3 },
					{ status: "exceededCpu", requests: 2 },
				],
			}),
		).toBe(5);
		expect(
			countWorkerErrors({
				errors: 7,
				statuses: [{ status: "scriptThrewException", requests: 2 }],
			}),
		).toBe(7);
	});

	it("formats the full 24-hour UTC window end by adding one hourly bucket", () => {
		expect(
			formatUtcWindow(
				[
					{ at: "2026-11-22T14:40:00.000Z", pageviews: 0, visitorDays: 0 },
					{ at: "2026-11-23T13:40:00.000Z", pageviews: 0, visitorDays: 0 },
				],
				true,
			),
		).toBe("Nov 22, 14:40 – Nov 23, 14:40 UTC");
		expect(
			formatUtcWindow(
				[
					{ at: "2026-11-16", pageviews: 0, visitorDays: 0 },
					{ at: "2026-11-22", pageviews: 0, visitorDays: 0 },
				],
				false,
			),
		).toBe("Nov 16 – Nov 22, 2026 UTC");
	});

	it("renders RankedList shares on narrow screens and exact zero-length bars for zero values", () => {
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
		expect(html).toMatch(/--cms-bar:0(?:[";]|$)/);
		expect(html).toMatch(/--cms-bar:1(?:[";]|$)/);
		expect(html).not.toContain("--cms-bar:0.02");
	});

	it("omits the dashed baseline line and shows explicit zero-error summary when aggregate and buckets are zero", () => {
		const html = renderToStaticMarkup(
			createElement(TrafficChart, {
				title: "Requests",
				points: [
					{ at: "2026-11-22T00:00:00Z", pageviews: 120, visitorDays: 0 },
					{ at: "2026-11-22T01:00:00Z", pageviews: 80, visitorDays: 0 },
				],
				hourly: true,
				areaTone: "ink",
				readout: "inline",
				secondaryTone: "destructive",
				zeroSecondarySummary: "0 errors in this range",
				zeroSecondaryTone: "ok",
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

	it("explains unbucketed errors when aggregate errors exist but series buckets are zero", () => {
		const html = renderToStaticMarkup(
			createElement(TrafficChart, {
				title: "Requests",
				points: [
					{ at: "2026-11-22T00:00:00Z", pageviews: 120, visitorDays: 0 },
					{ at: "2026-11-22T01:00:00Z", pageviews: 80, visitorDays: 0 },
				],
				hourly: true,
				areaTone: "ink",
				readout: "inline",
				secondaryTone: "destructive",
				zeroSecondarySummary: "Errors lack a time breakdown",
				zeroSecondaryTone: "warn",
				series: {
					primary: { name: "Requests", one: "request", many: "requests" },
					secondary: { name: "Errors", one: "error", many: "errors" },
				},
			}),
		);
		expect(html).toContain("Errors lack a time breakdown");
		expect(html).toContain("Errors —");
		expect(html).not.toContain("0 errors in this range");
		expect(html).not.toContain('stroke-dasharray="5 4"');
		expect(html).toContain("text-destructive");
	});

	it("uses destructive color for non-zero secondary errors and preserves Analytics fill and readout", () => {
		const infraHtml = renderToStaticMarkup(
			createElement(TrafficChart, {
				title: "Requests",
				points: [
					{ at: "2026-11-22T00:00:00Z", pageviews: 120, visitorDays: 3 },
					{ at: "2026-11-22T01:00:00Z", pageviews: 80, visitorDays: 1 },
				],
				hourly: true,
				areaTone: "ink",
				readout: "inline",
				secondaryTone: "destructive",
				zeroSecondarySummary: "Errors lack a time breakdown",
				zeroSecondaryTone: "warn",
				series: {
					primary: { name: "Requests", one: "request", many: "requests" },
					secondary: { name: "Errors", one: "error", many: "errors" },
				},
			}),
		);
		expect(infraHtml).toContain("text-destructive");
		expect(infraHtml).toContain('stroke-dasharray="5 4"');
		expect(infraHtml).not.toContain("Errors lack a time breakdown");
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
		expect(analyticsHtml).toContain("text-[12px]");
		expect(analyticsHtml).toContain("var(--theme-accent)");
		expect(analyticsHtml).not.toContain("var(--theme-ink)");
		expect(analyticsHtml).toContain("padding-top:54px");
	});
});
