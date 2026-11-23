import { describe, expect, it } from "vitest";
import {
	CLOUDFLARE_DASHBOARD_URL,
	cloudflareLinks,
	cloudflareZone,
	shortVersionId,
} from "./cloudflare-dashboard";

describe("cloudflare dashboard links", () => {
	it("derives the zone from the public origin", () => {
		expect(cloudflareZone("https://sohelislamimran.com")).toBe("sohelislamimran.com");
		expect(cloudflareZone("https://www.example.com/path")).toBe("example.com");
		expect(cloudflareZone("http://127.0.0.1:5190")).toBeNull();
		expect(cloudflareZone("http://localhost:5190")).toBeNull();
		expect(cloudflareZone("http://cms.localhost:5190")).toBeNull();
	});

	it("links through the account-resolving dashboard form", () => {
		const links = cloudflareLinks("https://example.com");
		expect(new Set(links.map((link) => link.id)).size).toBe(links.length);
		for (const link of links) {
			expect(link.href.startsWith("https://dash.cloudflare.com/?to=/:account/")).toBe(true);
		}
		expect(links.find((link) => link.id === "domain")?.href).toBe(
			"https://dash.cloudflare.com/?to=/:account/example.com",
		);
		expect(CLOUDFLARE_DASHBOARD_URL).toBe(
			"https://dash.cloudflare.com/?to=/:account/workers/services/view/portfolio/production",
		);
	});

	it("falls back to the domain list for a local origin", () => {
		const domain = cloudflareLinks("http://127.0.0.1:5190").find((link) => link.id === "domain");
		expect(domain?.label).toBe("Domains");
		expect(domain?.href).toBe("https://dash.cloudflare.com/?to=/:account/domains/overview");
	});

	it("shortens version ids like the dashboard", () => {
		expect(shortVersionId("1b6a0b73-6c1e-4a8e-9f00-000000000000")).toBe("1b6a0b73");
	});
});
