import { describe, expect, it } from "vitest";
import {
	completeTerminalInput,
	hasTerminalPrefix,
	matchTerminalCommand,
	resolveOpenTarget,
	runTerminalCommand,
	zoneOffsetMinutes,
	type TerminalContext,
} from "./terminal";

const context: TerminalContext = {
	name: "Test Person",
	role: "Engineer",
	location: "Dhaka, Bangladesh",
	timeZone: "Asia/Dhaka",
	availability: "Open to work",
	email: "test@example.com",
	now: { role: "Engineer", company: "Acme", period: "Jan 2025 – Present" },
	projects: [
		{ slug: "kuno", title: "Kuno", summary: "A learning product." },
		{ slug: "expo-in-app-updates", title: "expo-in-app-updates", summary: "Update prompts." },
		{ slug: "expo-import-cost", title: "expo-import-cost", summary: "Import sizes." },
	],
	links: [
		{ id: "github", label: "GitHub", platform: "GitHub", href: "https://github.com/test" },
		{ id: "mail", label: "Email", platform: "Email", href: "mailto:test@example.com" },
	],
	theme: "light",
	accent: "cobalt",
	accents: [
		{ id: "cobalt", name: "Cobalt" },
		{ id: "mint", name: "Mint" },
	],
	date: new Date("2026-03-02T06:30:00Z"),
	visitorOffsetMinutes: 0,
};

describe("matchTerminalCommand", () => {
	it("recognizes known commands and aliases, not plain search words", () => {
		expect(matchTerminalCommand("whoami")).toBe("whoami");
		expect(matchTerminalCommand("ls work")).toBe("ls");
		expect(matchTerminalCommand("cd story")).toBe("open");
		expect(matchTerminalCommand("> Theme dark")).toBe("theme");
		expect(matchTerminalCommand("kuno")).toBeNull();
		expect(matchTerminalCommand("dark")).toBeNull();
		expect(matchTerminalCommand("")).toBeNull();
	});

	it("detects the > prefix", () => {
		expect(hasTerminalPrefix(">")).toBe(true);
		expect(hasTerminalPrefix("  > ls")).toBe(true);
		expect(hasTerminalPrefix("ls")).toBe(false);
	});
});

describe("runTerminalCommand", () => {
	it("answers whoami from content", () => {
		const { lines } = runTerminalCommand("whoami", context);
		expect(lines.map((line) => line.text)).toEqual([
			"Test Person",
			"Engineer · Dhaka, Bangladesh",
			"Open to work",
		]);
	});

	it("lists projects with ls work", () => {
		const { lines } = runTerminalCommand("ls work", context);
		expect(lines[0]?.text).toMatch(/^kuno\s+A learning product\.$/u);
		expect(lines.at(-1)?.text).toBe("Try: open kuno");
	});

	it("opens pages, projects (exact and unique prefix), and external links", () => {
		expect(runTerminalCommand("open résumé", context).effect).toEqual({
			type: "navigate",
			path: "/resume",
		});
		expect(runTerminalCommand("cd ~", context).effect).toEqual({ type: "navigate", path: "/" });
		expect(runTerminalCommand("open kuno", context).effect).toEqual({
			type: "navigate",
			path: "/work/kuno",
		});
		expect(runTerminalCommand("open expo-in", context).effect).toEqual({
			type: "navigate",
			path: "/work/expo-in-app-updates",
		});
		expect(runTerminalCommand("open github", context).effect).toEqual({
			type: "external",
			href: "https://github.com/test",
		});
	});

	it("refuses ambiguous or unknown open targets", () => {
		expect(runTerminalCommand("open expo", context).effect).toBeUndefined();
		expect(runTerminalCommand("open nowhere", context).lines[0]?.kind).toBe("error");
		expect(runTerminalCommand("open", context).lines[0]?.kind).toBe("error");
	});

	it("switches theme and accent", () => {
		expect(runTerminalCommand("theme dark", context).effect).toEqual({
			type: "theme",
			mode: "dark",
		});
		expect(runTerminalCommand("theme system", context).effect).toEqual({
			type: "theme",
			mode: "auto",
		});
		expect(runTerminalCommand("theme light", context).effect).toBeUndefined();
		expect(runTerminalCommand("theme purple", context).lines[0]?.kind).toBe("error");
		expect(runTerminalCommand("accent Mint", context).effect).toEqual({
			type: "accent",
			id: "mint",
		});
		expect(runTerminalCommand("accent", context).lines[0]?.text).toBe("cobalt*  mint");
	});

	it("tells time in the owner's zone relative to the visitor", () => {
		const { lines } = runTerminalCommand("time", context);
		expect(lines[0]?.text).toBe("Mon 12:30 in Dhaka (UTC+6)");
		expect(lines[1]?.text).toBe("That is 6h ahead of you.");
		const same = runTerminalCommand("time", { ...context, visitorOffsetMinutes: 360 });
		expect(same.lines[1]?.text).toBe("Same time zone as you.");
	});

	it("handles clear, exit, email, xray and unknown commands", () => {
		expect(runTerminalCommand("clear", context).effect).toEqual({ type: "clear" });
		expect(runTerminalCommand("> exit", context).effect).toEqual({ type: "exit" });
		expect(runTerminalCommand("email", context).effect).toEqual({
			type: "copy",
			text: "test@example.com",
		});
		expect(runTerminalCommand("xray", context).effect).toEqual({ type: "xray" });
		const unknown = runTerminalCommand("whoam", context);
		expect(unknown.lines[0]?.text).toBe("command not found: whoam");
		expect(unknown.lines[1]?.text).toContain("whoami");
	});

	it("mentions the easter egg in help", () => {
		const text = runTerminalCommand("help", context)
			.lines.map((line) => line.text)
			.join("\n");
		expect(text).toContain("whoami");
		expect(text).toContain("xray");
	});
});

describe("completeTerminalInput", () => {
	it("completes commands and arguments to the shared prefix", () => {
		expect(completeTerminalInput("who", context)).toBe("whoami");
		expect(completeTerminalInput("op", context)).toBe("open ");
		expect(completeTerminalInput("ls", context)).toBe("ls ");
		expect(completeTerminalInput("whoami", context)).toBeNull();
		expect(completeTerminalInput("open ku", context)).toBe("open kuno");
		expect(completeTerminalInput("open ex", context)).toBe("open expo-i");
		expect(completeTerminalInput("theme d", context)).toBe("theme dark");
		expect(completeTerminalInput("> ls w", context)).toBe("> ls work");
		expect(completeTerminalInput("zzz", context)).toBeNull();
	});
});

describe("zoneOffsetMinutes", () => {
	it("reads fixed and half-hour offsets", () => {
		const date = new Date("2026-01-15T00:00:00Z");
		expect(zoneOffsetMinutes("Asia/Dhaka", date)).toBe(360);
		expect(zoneOffsetMinutes("Asia/Kolkata", date)).toBe(330);
		expect(zoneOffsetMinutes("UTC", date)).toBe(0);
		expect(zoneOffsetMinutes("Not/AZone", date)).toBeNull();
	});
});

describe("resolveOpenTarget", () => {
	it("prefers pages, then projects, then profiles", () => {
		expect(resolveOpenTarget("/work/", context)).toMatchObject({ kind: "page" });
		expect(resolveOpenTarget("/work/kuno", context)).toMatchObject({
			kind: "project",
			slug: "kuno",
		});
		expect(resolveOpenTarget("git", context)).toMatchObject({ kind: "link", label: "GitHub" });
		expect(resolveOpenTarget("", context)).toBeNull();
	});
});
