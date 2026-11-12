import { describe, expect, it } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT as content } from "../../../content/initial";
import { buildSkillIndex, findSkillRanges, markSkill, skillVariants } from "./skill-map";

const index = buildSkillIndex(content.capabilities, content.experience, content.projects);
const usedIn = (name: string) => (index.uses[name] ?? []).map((use) => use.targetId);
const skill = (name: string) =>
	index.groups.flatMap((group) => group.skills).find((item) => item.name === name) ?? null;

describe("skill map", () => {
	it("splits slash names into the names content uses", () => {
		expect(skillVariants("TanStack Router/Query")).toEqual(["TanStack Router", "TanStack Query"]);
		expect(skillVariants("OIDC / SSO")).toEqual(["OIDC", "SSO"]);
		expect(skillVariants("React")).toEqual(["React"]);
	});

	it("groups every capability tool exactly once, front to back", () => {
		const names = index.groups.flatMap((group) => group.skills.map((item) => item.name));
		const tools = new Set(content.capabilities.flatMap((capability) => capability.tools));
		expect(new Set(names)).toEqual(tools);
		expect(names.length).toBe(tools.size);
		expect(skill("PostgreSQL")?.layer).toBe("data");
		expect(skill("Terraform")?.layer).toBe("infrastructure");
		expect(skill("Playwright")?.layer).toBe("release");
		expect(skill("Data Isolation")?.layer).toBe("access");
	});

	it("never lets a shorter name light a longer one", () => {
		expect(findSkillRanges("React Native and React", ["React"], ["React Native"])).toEqual([
			[17, 22],
		]);
		expect(usedIn("React")).not.toContain("role-tilleli");
		expect(usedIn("React Native")).toContain("role-tilleli");
		expect(usedIn("Bun")).not.toContain("role-kuno-mobile");
	});

	it("links skills only to roles and projects that name them", () => {
		expect(usedIn("TanStack Router/Query")).toContain("role-kuno-lead");
		expect(usedIn("Firebase")).toEqual(expect.arrayContaining(["role-tilleli", "project-tilleli"]));
		expect(usedIn("Kotlin")).toContain("project-expo-in-app-updates");
		expect(usedIn("Kotlin").some((id) => id.startsWith("role-"))).toBe(false);
		expect(usedIn("Webhook Cryptography")).toEqual([]);
	});

	it("marks matched words", () => {
		const parts = markSkill("Ran EAS builds", skill("EAS"), index.known);
		expect(parts).toEqual([
			{ text: "Ran ", marked: false },
			{ text: "EAS", marked: true },
			{ text: " builds", marked: false },
		]);
	});
});
