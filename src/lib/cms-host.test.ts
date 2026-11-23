import { describe, expect, it } from "vitest";
import { cmsHostRewrite, isCmsHostname, toInternalCmsPath, toPublicCmsPath } from "./cms-host";

describe("cms host rewrite", () => {
	it("recognizes CMS hostnames", () => {
		expect(isCmsHostname("cms.sohelislamimran.com")).toBe(true);
		expect(isCmsHostname("CMS.localhost")).toBe(true);
		expect(isCmsHostname("sohelislamimran.com")).toBe(false);
		expect(isCmsHostname("www.sohelislamimran.com")).toBe(false);
	});

	it("maps public CMS paths into the /cms route tree", () => {
		expect(toInternalCmsPath("/")).toBe("/cms");
		expect(toInternalCmsPath("/analytics")).toBe("/cms/analytics");
		expect(toInternalCmsPath("/content/projects")).toBe("/cms/content/projects");
		expect(toInternalCmsPath("/cms/analytics")).toBe("/cms/analytics");
	});

	it("never rewrites runtime paths", () => {
		for (const path of [
			"/_serverFn/abc",
			"/assets/index.js",
			"/media/asset_1234",
			"/draft-media/asset_1234",
			"/images/me.webp",
			"/favicon.svg",
			"/robots.txt",
		]) {
			expect(toInternalCmsPath(path)).toBe(path);
		}
	});

	it("strips the prefix on output", () => {
		expect(toPublicCmsPath("/cms")).toBe("/");
		expect(toPublicCmsPath("/cms/release")).toBe("/release");
		expect(toPublicCmsPath("/cmsx")).toBe("/cmsx");
		expect(toPublicCmsPath("/work")).toBe("/work");
	});

	it("only rewrites on the CMS host", () => {
		const publicUrl = new URL("https://sohelislamimran.com/analytics");
		expect(cmsHostRewrite.input({ url: publicUrl })).toBeUndefined();
		const cmsUrl = new URL("https://cms.sohelislamimran.com/analytics?range=7d");
		expect(cmsHostRewrite.input({ url: cmsUrl })?.href).toBe(
			"https://cms.sohelislamimran.com/cms/analytics?range=7d",
		);
		const out = new URL("https://cms.sohelislamimran.com/cms/content/projects?item=a");
		expect(cmsHostRewrite.output({ url: out })?.href).toBe(
			"https://cms.sohelislamimran.com/content/projects?item=a",
		);
	});
});
