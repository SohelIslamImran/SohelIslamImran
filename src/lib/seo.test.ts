import { describe, expect, it } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT } from "../content/initial";
import { pageHead } from "./seo";

describe("pageHead", () => {
	it("emits canonical, social, and structured metadata for a public route", () => {
		const head = pageHead(
			INITIAL_PORTFOLIO_CONTENT,
			"Sohel Islam Imran — Work",
			"Selected work.",
			"/work",
		);
		const meta = head.meta as Array<
			{ title: string } | { name: string; content: string } | { property: string; content: string }
		>;

		expect(meta).toContainEqual({ name: "author", content: "Sohel Islam Imran" });
		expect(meta).toContainEqual({ property: "og:image:width", content: "1200" });
		expect(head.links).toContainEqual({
			rel: "canonical",
			href: "https://sohelislamimran.com/work",
		});
		expect(head.scripts).toHaveLength(3);
		const jsonLdScripts = (head.scripts as Array<{ children: string }>).map(
			(script) => script.children,
		);
		expect(jsonLdScripts.join(" ")).toContain('"@type":"Person"');
		expect(jsonLdScripts.join(" ")).toContain('"@type":"BreadcrumbList"');
	});

	it("escapes CMS strings so JSON-LD cannot close its script element", () => {
		const content = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		const unsafe = '</script><script>alert("x")</script>&\u2028\u2029';
		content.identity.name = unsafe;
		content.story.title = unsafe;

		const head = pageHead(content, unsafe, unsafe, "/");
		const scripts = (head.scripts as Array<{ children: string }>).map((script) => script.children);

		for (const script of scripts) {
			expect(script).not.toMatch(/[<>&\u2028\u2029]/u);
			expect(() => JSON.parse(script)).not.toThrow();
		}
		expect(scripts.some((script) => script.includes("\\u003c/script\\u003e"))).toBe(true);
	});
});
