import { describe, expect, it } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT as content } from "../../../content/initial";
import {
	buildSkillIndex,
	buildSkillTimeline,
	eraAt,
	findSkillRanges,
	markSkill,
	periodYears,
	skillVariants,
	skillYearCounts,
} from "./skill-map";

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
		expect(skill("Data isolation")?.layer).toBe("access");
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
		expect(usedIn("Webhook trust")).toEqual([]);
	});

	it("marks matched words", () => {
		const parts = markSkill("Ran EAS builds", skill("EAS"), index.known);
		expect(parts).toEqual([
			{ text: "Ran ", marked: false },
			{ text: "EAS", marked: true },
			{ text: " builds", marked: false },
		]);
	});

	it("reads years from role and project dates only", () => {
		expect(periodYears("Dec 2023 — Jan 2025", 2026)).toEqual([2023, 2025]);
		expect(periodYears("Mar 2026 — present", 2026)).toEqual([2026, 2026]);
		expect(periodYears("2024 — now", 2026)).toEqual([2024, 2026]);
		expect(periodYears("2024", 2026)).toEqual([2024, 2024]);
		expect(periodYears("ongoing", 2026)).toBeNull();
		expect(eraAt([2021, 2024], 2020)).toBe("later");
		expect(eraAt([2021, 2024], 2022)).toBe("now");
		expect(eraAt([2021, 2024], 2025)).toBe("past");
	});

	it("counts only dated skills, including those first named in the selected year", () => {
		expect(skillYearCounts([2021, 2021, 2025, null], 2021)).toEqual({
			namedByYear: 2,
			datedTotal: 3,
			undated: 1,
		});
		expect(skillYearCounts([null], 2026)).toEqual({
			namedByYear: 0,
			datedTotal: 0,
			undated: 1,
		});
	});

	it("dates each skill by the earliest role or project that used it", () => {
		const timeline = buildSkillTimeline(index, content.experience, content.projects);
		expect(timeline).not.toBeNull();
		if (!timeline) return;
		const roleYears = content.experience.flatMap((role) =>
			(role.period.match(/\b(?:19|20)\d{2}\b/gu) ?? []).map(Number),
		);
		expect(timeline.min).toBe(Math.min(...roleYears));
		expect(timeline.max).toBe(Math.max(...roleYears));
		for (const [name, year] of Object.entries(timeline.firstYear)) {
			const uses = index.uses[name] ?? [];
			if (year === null) {
				expect(uses.every((use) => !timeline.spans[use.targetId])).toBe(true);
			} else {
				expect(uses.some((use) => timeline.spans[use.targetId]?.[0] === year)).toBe(true);
			}
		}
	});
});
