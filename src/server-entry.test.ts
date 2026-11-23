import { describe, expect, it, vi } from "vitest";

const startFetch = vi.fn(async (request: Request) => new Response(new URL(request.url).pathname));

vi.mock("@tanstack/react-start/server", () => ({
	createStartHandler: () => startFetch,
	defaultStreamHandler: {},
}));

const { default: worker } = await import("./server-entry");

const env = {
	APP_ORIGIN: "https://sohelislamimran.com",
	CMS_ORIGIN: "https://cms.sohelislamimran.com",
} as Env;

describe("CMS host routing", () => {
	it("serves the CMS at the root of its host; the router rewrites to /cms", async () => {
		const response = await worker.fetch(new Request("https://cms.sohelislamimran.com/"), env);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe("/");
		expect(response.headers.get("Cache-Control")).toBe("private, no-store");
		expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
	});

	it("serves CMS sections on the CMS host", async () => {
		const response = await worker.fetch(
			new Request("https://cms.sohelislamimran.com/content/projects"),
			env,
		);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe("/content/projects");
	});

	it("moves old /cms bookmarks on the CMS host to clean URLs", async () => {
		const root = await worker.fetch(new Request("https://cms.sohelislamimran.com/cms"), env);
		expect(root.status).toBe(308);
		expect(root.headers.get("Location")).toBe("https://cms.sohelislamimran.com/");
		const nested = await worker.fetch(
			new Request("https://cms.sohelislamimran.com/cms/analytics?range=7d"),
			env,
		);
		expect(nested.headers.get("Location")).toBe(
			"https://cms.sohelislamimran.com/analytics?range=7d",
		);
	});

	it("sends /cms and /resume/edit on the public host to the CMS host", async () => {
		const cms = await worker.fetch(new Request("https://sohelislamimran.com/cms/release"), env);
		expect(cms.headers.get("Location")).toBe("https://cms.sohelislamimran.com/release");
		const edit = await worker.fetch(new Request("https://sohelislamimran.com/resume/edit"), env);
		expect(edit.headers.get("Location")).toBe("https://cms.sohelislamimran.com/");
	});

	it("keeps the CMS host out of search engines", async () => {
		const response = await worker.fetch(
			new Request("https://cms.sohelislamimran.com/robots.txt"),
			env,
		);
		expect(await response.text()).toContain("Disallow: /");
	});

	it("leaves public pages alone on the public host", async () => {
		const response = await worker.fetch(new Request("https://sohelislamimran.com/work"), env);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe("/work");
	});
});
