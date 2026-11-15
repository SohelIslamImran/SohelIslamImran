import { describe, expect, it } from "vitest";
import type { PortfolioContent } from "../../types/content";
import { runTerminalCommand } from "./terminal";
import { terminalContextFromContent } from "./terminal-context";

const appearance = {
	theme: "light" as const,
	accent: "cobalt",
	accents: [{ id: "cobalt", name: "Cobalt" }],
};

describe("terminalContextFromContent", () => {
	it("works before content has loaded", () => {
		const context = terminalContextFromContent(null, appearance);
		expect(context.projects).toEqual([]);
		expect(context.timeZone).toBe("Asia/Dhaka");
		expect(runTerminalCommand("ls work", context).lines[0]?.text).toBe(
			"No published projects yet.",
		);
	});

	it("reads projects and drops in-page profile links", () => {
		const content = {
			identity: {
				name: " Test Person ",
				role: "Engineer",
				location: "Dhaka",
				timezone: "",
				availability: "",
				email: "",
			},
			contact: { email: "hi@example.com" },
			experience: [{ role: "Lead", company: "Acme", period: "2026", current: true }],
			projects: [{ slug: "kuno", title: "Kuno", summary: " A learning product. " }],
			profileLinks: [
				{ id: "gh", label: "", platform: "GitHub", href: "https://github.com/x" },
				{ id: "top", label: "Top", platform: "Site", href: "#top" },
			],
		} as unknown as PortfolioContent;
		const context = terminalContextFromContent(content, appearance);
		expect(context.name).toBe("Test Person");
		expect(context.email).toBe("hi@example.com");
		expect(context.now).toEqual({ role: "Lead", company: "Acme", period: "2026" });
		expect(context.links).toEqual([
			{ id: "gh", label: "GitHub", platform: "GitHub", href: "https://github.com/x" },
		]);
		expect(runTerminalCommand("open kuno", context).effect).toEqual({
			type: "navigate",
			path: "/work/kuno",
		});
	});
});
