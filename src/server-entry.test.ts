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
	it("redirects the CMS root to /cms so server and client render the same route", async () => {
		const response = await worker.fetch(new Request("https://cms.sohelislamimran.com/"), env);
		expect(response.status).toBe(308);
		expect(response.headers.get("Location")).toBe("https://cms.sohelislamimran.com/cms");
		expect(response.headers.get("Cache-Control")).toBe("private, no-store");
	});

	it("serves /cms on the CMS host without rewriting the path", async () => {
		const response = await worker.fetch(new Request("https://cms.sohelislamimran.com/cms"), env);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe("/cms");
	});

	it("sends /cms on the public host straight to the CMS route", async () => {
		const response = await worker.fetch(new Request("https://sohelislamimran.com/cms"), env);
		expect(response.headers.get("Location")).toBe("https://cms.sohelislamimran.com/cms");
	});

	it("redirects public pages requested on the CMS host to the public origin", async () => {
		const response = await worker.fetch(new Request("https://cms.sohelislamimran.com/work"), env);
		expect(response.headers.get("Location")).toBe("https://sohelislamimran.com/work");
	});
});
