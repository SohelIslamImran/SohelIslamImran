import { describe, expect, it } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT } from "../../content/initial";
import type { ProjectContent } from "../../types/content";
import { markTerms, projectAnatomy } from "./anatomy";

function seed(id: string): ProjectContent {
	const project = INITIAL_PORTFOLIO_CONTENT.projects.find((item) => item.id === id);
	if (!project) throw new Error(`missing seed project ${id}`);
	return project;
}

function touched(project: ProjectContent) {
	return projectAnatomy(project)
		.layers.filter((layer) => layer.touched)
		.map((layer) => layer.id);
}

describe("projectAnatomy", () => {
	it("reads every layer from Kuno's own notes", () => {
		expect(touched(seed("kuno"))).toEqual([
			"interface",
			"api",
			"data",
			"access",
			"infrastructure",
			"release",
		]);
	});

	it("does not treat payments as access", () => {
		const access = projectAnatomy(seed("tilleli")).layers.find((layer) => layer.id === "access");
		expect(access?.terms).toEqual(["Firebase Auth"]);
	});

	it("ignores broad words that are not evidence", () => {
		const anatomy = projectAnatomy({
			id: "broad",
			title: "Broad",
			slug: "broad",
			summary: "A great app experience with services, data, tests, and the edge.",
			description:
				"Built on Android Play Core for iOS and Android apps, shipped through the App Store.",
			year: "",
			role: "",
			status: "",
			tags: ["Android Play Core", "Kotlin", "Swift"],
			category: "experiment",
			highlights: ["Improved the user experience and the data behind it."],
		});
		expect(anatomy.touchedCount).toBe(0);
	});

	it("lights only mentioned layers for a small prototype", () => {
		expect(touched(seed("android-mac-display"))).toEqual(["infrastructure"]);
	});

	it("does not file a third-party lookup or a library surface under API", () => {
		const anatomy = projectAnatomy(seed("expo-in-app-updates"));
		const api = anatomy.layers.find((layer) => layer.id === "api");
		expect(api?.touched).toBe(false);
		expect(anatomy.highlightLayers[1]).toEqual([]);
		expect(touched(seed("expo-in-app-updates"))).toEqual(["interface", "release"]);
		expect(markTerms("Built on iTunes Search API lookups.", "api")).toEqual([
			{ text: "Built on iTunes Search API lookups.", marked: false },
		]);
	});

	it("keeps a small tool small", () => {
		expect(touched(seed("ghosttime"))).toEqual(["interface", "release"]);
	});

	it("maps highlights to the layers they mention", () => {
		const anatomy = projectAnatomy(seed("kuno"));
		expect(anatomy.highlightLayers[0]).toEqual(["interface", "api", "data"]);
		expect(anatomy.highlightLayers).toHaveLength(seed("kuno").highlights.length);
	});

	it("returns nothing touched for an empty project", () => {
		const anatomy = projectAnatomy({
			id: "x",
			title: "X",
			slug: "x",
			summary: "",
			description: "",
			year: "",
			role: "",
			status: "",
			tags: [" "],
			category: "experiment",
			highlights: ["", "  "],
		});
		expect(anatomy.touchedCount).toBe(0);
		expect(anatomy.highlightLayers).toEqual([]);
	});
});

describe("markTerms", () => {
	it("splits out the words that lit a layer", () => {
		expect(markTerms("Stored in the database.", "data")).toEqual([
			{ text: "Stored in the ", marked: false },
			{ text: "database", marked: true },
			{ text: ".", marked: false },
		]);
	});

	it("leaves text whole without a layer", () => {
		expect(markTerms("Plain text", null)).toEqual([{ text: "Plain text", marked: false }]);
	});
});
