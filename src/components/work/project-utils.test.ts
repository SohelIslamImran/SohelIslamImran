import { describe, expect, it } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT } from "../../content/initial";
import type { ProjectContent } from "../../types/content";
import {
	adjacentProjects,
	findProjectBySlug,
	hashString,
	linkableProjects,
	monogram,
	orderProjects,
	projectLinkName,
	projectLinks,
	projectsInGroup,
	seededRandom,
	statusTone,
} from "./project-utils";

function project(overrides: Partial<ProjectContent>): ProjectContent {
	return {
		id: "x",
		title: "X",
		slug: "x",
		summary: "",
		description: "",
		year: "2026",
		role: "Creator",
		status: "Live",
		tags: [],
		category: "product",
		highlights: [],
		...overrides,
	};
}

describe("work project helpers", () => {
	it("orders projects by category, keeping content order inside each group", () => {
		const ordered = orderProjects([
			project({ id: "e", category: "experiment" }),
			project({ id: "p1" }),
			project({ id: "o", category: "open-source" }),
			project({ id: "p2" }),
		]);
		expect(ordered.map((item) => item.id)).toEqual(["p1", "p2", "o", "e"]);
	});

	it("finds detail pages by trimmed slug and skips unusable records", () => {
		const projects = [
			project({ id: "a", slug: " a " }),
			project({ id: "blank", slug: "  " }),
			project({ id: "untitled", slug: "u", title: " " }),
		];
		expect(findProjectBySlug(projects, "a")?.id).toBe("a");
		expect(findProjectBySlug(projects, "u")).toBeUndefined();
		expect(findProjectBySlug(projects, "")).toBeUndefined();
		expect(linkableProjects(projects)).toHaveLength(1);
	});

	it("wraps previous and next around the ordered list", () => {
		const projects = [project({ slug: "a" }), project({ slug: "b" }), project({ slug: "c" })];
		expect(adjacentProjects(projects, "a").previous?.slug).toBe("c");
		expect(adjacentProjects(projects, "c").next?.slug).toBe("a");
		expect(adjacentProjects([project({ slug: "a" })], "a")).toEqual({});
	});

	it("steps within the reader's group when the project belongs to it", () => {
		const projects = [
			project({ slug: "p1", category: "product" }),
			project({ slug: "e1", category: "experiment" }),
			project({ slug: "p2", category: "product" }),
			project({ slug: "e2", category: "experiment" }),
		];
		expect(adjacentProjects(projects, "e1", "experiment")).toEqual({
			previous: projects[3],
			next: projects[3],
		});
		expect(projectsInGroup(projects, "e2", "experiment").map((p) => p.slug)).toEqual(["e1", "e2"]);
		// A project outside the remembered group falls back to all work.
		expect(projectsInGroup(projects, "p1", "experiment")).toHaveLength(4);
		expect(adjacentProjects(projects, "p2", "all").next?.slug).toBe("e1");
	});

	it("labels site, package, and source links for the cards", () => {
		const links = projectLinks(
			project({
				title: "pkg",
				href: "https://www.npmjs.com/package/pkg",
				repository: "https://github.com/me/pkg",
			}),
		);
		expect(links.map((link) => link.label)).toEqual(["Open package", "View source"]);
		expect(projectLinkName(links[1], "pkg")).toBe("View source for pkg (opens in a new tab)");
		expect(projectLinks(project({ href: "javascript:alert(1)" }))).toEqual([]);
		expect(projectLinks(project({ href: "https://example.com" }))[0]?.label).toBe("Visit site");
	});

	it("gives cautionary statuses priority over live ones", () => {
		expect(statusTone("Experimental")).toBe("signal");
		expect(statusTone("Active · v0.12.0")).toBe("success");
		expect(statusTone("Shipped to production")).toBe("success");
		expect(statusTone("On hold")).toBe("neutral");
	});

	it("seeds artwork deterministically", () => {
		expect(hashString("kuno")).toBe(hashString("kuno"));
		const first = seededRandom(hashString("new-project"));
		const second = seededRandom(hashString("new-project"));
		expect([first(), first(), first()]).toEqual([second(), second(), second()]);
		expect(monogram("Android Mac Display")).toBe("AM");
		expect(monogram("ghosttime")).toBe("GH");
	});

	it("gives every seeded project a detail page", () => {
		expect(linkableProjects(INITIAL_PORTFOLIO_CONTENT.projects)).toHaveLength(
			INITIAL_PORTFOLIO_CONTENT.projects.length,
		);
	});
});
