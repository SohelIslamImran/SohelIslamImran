import { describe, expect, it } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT } from "../content/initial";
import { PERSON_ID, ogLocale, pageHead, twitterHandle } from "./seo";

type Meta =
	| { title: string }
	| { name: string; content: string }
	| { property: string; content: string };

function metaOf(head: ReturnType<typeof pageHead>) {
	return head.meta as Meta[];
}

function jsonLdOf(head: ReturnType<typeof pageHead>) {
	return head.scripts.map((script) => JSON.parse(script.children) as Record<string, unknown>);
}

function property(head: ReturnType<typeof pageHead>, key: string) {
	return metaOf(head).find((tag) => "property" in tag && tag.property === key) as
		| { content: string }
		| undefined;
}

describe("pageHead", () => {
	it("emits canonical, social, and structured metadata for a public route", () => {
		const head = pageHead(INITIAL_PORTFOLIO_CONTENT, {
			title: "Sohel Islam Imran — Work",
			crumb: "Work",
			description: "Selected work.",
			path: "/work",
		});
		const meta = metaOf(head);

		expect(meta).toContainEqual({ name: "author", content: "Sohel Islam Imran" });
		expect(meta).toContainEqual({ name: "description", content: "Selected work." });
		expect(meta).toContainEqual({ property: "og:type", content: "website" });
		expect(meta).toContainEqual({ property: "og:locale", content: "en_US" });
		expect(meta).toContainEqual({ property: "og:image:width", content: "1200" });
		expect(meta).toContainEqual({ property: "og:image:type", content: "image/png" });
		expect(meta).toContainEqual({ name: "twitter:card", content: "summary_large_image" });
		expect(meta).toContainEqual({ name: "twitter:site", content: "@SohelIslamImran" });
		expect(head.links).toContainEqual({
			rel: "canonical",
			href: "https://sohelislamimran.com/work",
		});
		expect(head.links).toContainEqual({ rel: "me", href: "https://github.com/SohelIslamImran" });

		const nodes = jsonLdOf(head);
		const types = nodes.map((node) => node["@type"]);
		expect(types).toEqual(["Person", "WebSite", "WebPage", "BreadcrumbList"]);
		const person = nodes[0]!;
		expect(person["@id"]).toBe(PERSON_ID);
		expect(person.sameAs).not.toContain("https://sohelislamimran.com/");
		const crumbs = nodes[3]!.itemListElement as Array<{ name: string }>;
		expect(crumbs.map((crumb) => crumb.name)).toEqual(["Sohel Islam Imran", "Work"]);
	});

	it("keeps each meta name and property unique, since the router dedupes by key", () => {
		const head = pageHead(INITIAL_PORTFOLIO_CONTENT, {
			title: "Story",
			description: "A story.",
			path: "/story",
			type: "article",
			publishedTime: "2025-06-22",
		});
		const keys = metaOf(head).map((tag) =>
			"name" in tag ? tag.name : "property" in tag ? tag.property : "title",
		);
		expect(new Set(keys).size).toBe(keys.length);
		expect(property(head, "article:published_time")?.content).toBe("2025-06-22");
		expect(property(head, "og:type")?.content).toBe("article");
	});

	it("adds profile tags and a ProfilePage node for the home page", () => {
		const head = pageHead(INITIAL_PORTFOLIO_CONTENT, {
			title: "Sohel Islam Imran — Lead Full Stack Engineer",
			description: "Home.",
			path: "/",
			type: "profile",
			page: { "@type": "ProfilePage", mainEntity: { "@id": PERSON_ID } },
		});
		expect(property(head, "profile:first_name")?.content).toBe("Sohel");
		expect(property(head, "profile:last_name")?.content).toBe("Islam Imran");
		const page = jsonLdOf(head).find((node) => node["@type"] === "ProfilePage");
		expect(page?.mainEntity).toEqual({ "@id": PERSON_ID });
	});

	it("uses a cover's real dimensions and drops them when unknown", () => {
		const sized = pageHead(INITIAL_PORTFOLIO_CONTENT, {
			title: "Project",
			description: "A project.",
			path: "/work/project",
			image: { href: "/media/cover", width: 1600, height: 900, type: "image/webp" },
			parents: [{ name: "Work", path: "/work" }],
		});
		expect(property(sized, "og:image")?.content).toBe("https://sohelislamimran.com/media/cover");
		expect(property(sized, "og:image:width")?.content).toBe("1600");
		expect(property(sized, "og:image:type")?.content).toBe("image/webp");
		const crumbs = jsonLdOf(sized).find((node) => node["@type"] === "BreadcrumbList")!
			.itemListElement as Array<{ name: string }>;
		expect(crumbs.map((crumb) => crumb.name)).toEqual(["Sohel Islam Imran", "Work", "Project"]);

		const unsized = pageHead(INITIAL_PORTFOLIO_CONTENT, {
			title: "Project",
			description: "A project.",
			path: "/work/project",
			image: { href: "/media/cover" },
		});
		expect(property(unsized, "og:image:width")).toBeUndefined();
	});

	it("escapes CMS strings so JSON-LD cannot close its script element", () => {
		const content = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		const unsafe = '</script><script>alert("x")</script>&\u2028\u2029';
		content.identity.name = unsafe;
		content.story.title = unsafe;

		const head = pageHead(content, { title: unsafe, description: unsafe, path: "/" });
		const scripts = head.scripts.map((script) => script.children);

		for (const script of scripts) {
			expect(script).not.toMatch(/[<>&\u2028\u2029]/u);
			expect(() => JSON.parse(script)).not.toThrow();
		}
		expect(scripts.some((script) => script.includes("\\u003c/script\\u003e"))).toBe(true);
	});
});

describe("ogLocale", () => {
	it("normalizes to language_TERRITORY", () => {
		expect(ogLocale("en")).toBe("en_US");
		expect(ogLocale("en-GB")).toBe("en_GB");
		expect(ogLocale("bn")).toBe("bn");
	});
});

describe("twitterHandle", () => {
	it("prefers the X profile handle", () => {
		expect(twitterHandle(INITIAL_PORTFOLIO_CONTENT)).toBe("@SohelIslamImran");
		const content = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		content.social = content.social.filter((link) => link.platform !== "X");
		expect(twitterHandle(content)).toBe("@sohelislamimran");
	});
});
