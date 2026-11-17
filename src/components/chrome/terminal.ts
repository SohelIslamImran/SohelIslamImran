/**
 * Pure logic for the command palette's terminal mode. No DOM, no React: it
 * turns one input line into printed lines plus at most one side effect, which
 * the palette then performs (navigate, switch theme, copy, …). Every answer
 * comes from the published content passed in `TerminalContext`.
 */
import { fuzzyScore } from "./fuzzy";

export type TerminalThemeMode = "light" | "dark" | "auto";

export interface TerminalContext {
	name: string;
	role: string;
	location: string;
	timeZone: string;
	availability: string;
	email: string;
	/** The current role, when the content marks one. */
	now?: { role: string; company: string; period: string };
	projects: readonly { slug: string; title: string; summary: string }[];
	links: readonly { id: string; label: string; platform: string; href: string }[];
	theme: TerminalThemeMode;
	accent: string;
	accents: readonly { id: string; name: string }[];
	/** Injected so output is deterministic in tests. */
	date: Date;
	/** Visitor's UTC offset in minutes (east positive), i.e. `-new Date().getTimezoneOffset()`. */
	visitorOffsetMinutes: number;
}

export type TerminalLineKind = "out" | "muted" | "error" | "accent";
export interface TerminalLine {
	kind: TerminalLineKind;
	text: string;
	description?: string;
}

export type TerminalEffect =
	| { type: "navigate"; path: string }
	| { type: "external"; href: string }
	| { type: "theme"; mode: TerminalThemeMode }
	| { type: "accent"; id: string }
	| { type: "copy"; text: string }
	| { type: "clear" }
	| { type: "exit" }
	| { type: "xray" };

export interface TerminalResult {
	lines: TerminalLine[];
	effect?: TerminalEffect;
}

export interface TerminalPage {
	name: string;
	label: string;
	path: string;
	aliases: readonly string[];
}

export const TERMINAL_PAGES: readonly TerminalPage[] = [
	{ name: "home", label: "Home", path: "/", aliases: ["~", "/", "index"] },
	{ name: "work", label: "Work", path: "/work", aliases: ["projects"] },
	{ name: "story", label: "Story", path: "/story", aliases: ["about"] },
	{ name: "resume", label: "Résumé", path: "/resume", aliases: ["résumé", "cv"] },
	{ name: "links", label: "Links", path: "/links", aliases: ["profiles", "contact"] },
	{ name: "field-notes", label: "Field notes", path: "/field-notes", aliases: ["notes"] },
];

interface CommandSpec {
	name: string;
	usage: string;
	description: string;
	aliases?: readonly string[];
	/** Not listed by `help` (still works). */
	hidden?: boolean;
}

export const TERMINAL_COMMANDS: readonly CommandSpec[] = [
	{
		name: "help",
		usage: "help",
		description: "List what this terminal understands",
		aliases: ["?"],
	},
	{ name: "whoami", usage: "whoami", description: "Who runs this site" },
	{ name: "now", usage: "now", description: "What I am working on now" },
	{ name: "ls", usage: "ls [work|links]", description: "List pages, projects, or profiles" },
	{ name: "open", usage: "open <page|project>", description: "Go there", aliases: ["cd"] },
	{ name: "theme", usage: "theme <light|dark|system>", description: "Switch the theme" },
	{ name: "accent", usage: "accent <name>", description: "Switch the accent color" },
	{ name: "time", usage: "time", description: "My local time", aliases: ["date"] },
	{ name: "email", usage: "email", description: "Copy my email address", aliases: ["contact"] },
	{ name: "clear", usage: "clear", description: "Clear the output", aliases: ["cls"] },
	{ name: "exit", usage: "exit", description: "Back to search", aliases: ["quit", "q"] },
	{ name: "xray", usage: "xray", description: "See the boxes behind the interface", hidden: true },
	{ name: "sudo", usage: "sudo", description: "", hidden: true },
];

const commandByName = new Map<string, CommandSpec>();
for (const command of TERMINAL_COMMANDS) {
	commandByName.set(command.name, command);
	for (const alias of command.aliases ?? []) commandByName.set(alias, command);
}

/** Strips an optional leading ">" prompt and collapses whitespace. */
export function normalizeTerminalInput(raw: string): string {
	return raw
		.replace(/^\s*>\s*/u, "")
		.trim()
		.replace(/\s+/gu, " ");
}

/** True when the input asks for terminal mode explicitly (starts with ">"). */
export function hasTerminalPrefix(raw: string): boolean {
	return /^\s*>/u.test(raw);
}

/**
 * The command the input names, or null. Plain search text such as "kuno" or
 * "dark" is not a command; "whoami", "ls work", "theme dark" are.
 */
export function matchTerminalCommand(raw: string): string | null {
	const input = normalizeTerminalInput(raw);
	if (!input) return null;
	const [head = ""] = input.split(" ");
	return commandByName.get(head.toLowerCase())?.name ?? null;
}

function fold(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[̀-ͯ]/gu, "")
		.toLowerCase()
		.trim();
}

/** Finds a page by name, label, alias, or path ("/work", "resume", "Résumé"). */
export function resolvePage(target: string): TerminalPage | null {
	const wanted = fold(target).replace(/\/+$/u, "") || "/";
	return (
		TERMINAL_PAGES.find(
			(page) =>
				page.name === wanted.replace(/^\//u, "") ||
				fold(page.label) === wanted ||
				page.path === wanted ||
				page.aliases.some((alias) => fold(alias) === wanted),
		) ?? null
	);
}

type OpenTarget =
	| { kind: "page"; page: TerminalPage }
	| { kind: "project"; slug: string; title: string; summary: string }
	| { kind: "link"; label: string; href: string };

/** Resolves `open` targets: pages, then projects, then profiles. Unique prefixes work. */
export function resolveOpenTarget(target: string, context: TerminalContext): OpenTarget | null {
	if (!fold(target)) return null;
	const page = resolvePage(target);
	if (page) return { kind: "page", page };
	const wanted = fold(target)
		.replace(/^\/?work\//u, "")
		.replace(/\/+$/u, "");
	if (!wanted) return null;

	const projects = context.projects.filter((project) => project.slug && project.title.trim());
	const exactProject = projects.find(
		(project) => fold(project.slug) === wanted || fold(project.title) === wanted,
	);
	if (exactProject) return { kind: "project", ...exactProject };

	const links = context.links.filter((link) => link.href.trim());
	const exactLink = links.find(
		(link) =>
			fold(link.label) === wanted || fold(link.platform) === wanted || fold(link.id) === wanted,
	);
	if (exactLink) return { kind: "link", label: exactLink.label, href: exactLink.href };

	const projectPrefix = projects.filter(
		(project) => fold(project.slug).startsWith(wanted) || fold(project.title).startsWith(wanted),
	);
	if (projectPrefix.length === 1 && projectPrefix[0])
		return { kind: "project", ...projectPrefix[0] };
	const linkPrefix = links.filter(
		(link) => fold(link.label).startsWith(wanted) || fold(link.platform).startsWith(wanted),
	);
	if (projectPrefix.length === 0 && linkPrefix.length === 1 && linkPrefix[0]) {
		return { kind: "link", label: linkPrefix[0].label, href: linkPrefix[0].href };
	}
	return null;
}

/** UTC offset of `timeZone` at `date`, in minutes east of UTC. Null when unknown. */
export function zoneOffsetMinutes(timeZone: string, date: Date): number | null {
	try {
		const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
			.formatToParts(date)
			.find((item) => item.type === "timeZoneName")?.value;
		if (!part) return null;
		if (part === "GMT" || part === "UTC") return 0;
		const match = /([+-])(\d{1,2})(?::(\d{2}))?/u.exec(part);
		if (!match) return null;
		const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
		return match[1] === "-" ? -minutes : minutes;
	} catch {
		return null;
	}
}

function formatOffset(minutes: number): string {
	const sign = minutes < 0 ? "-" : "+";
	const absolute = Math.abs(minutes);
	const hours = Math.floor(absolute / 60);
	const rest = absolute % 60;
	return `UTC${sign}${hours}${rest ? `:${String(rest).padStart(2, "0")}` : ""}`;
}

function formatGap(minutes: number): string {
	const absolute = Math.abs(minutes);
	const hours = Math.floor(absolute / 60);
	const rest = absolute % 60;
	const text = rest ? `${hours}h ${rest}m` : `${hours}h`;
	return minutes > 0 ? `${text} ahead of you` : `${text} behind you`;
}

function timeLines(context: TerminalContext): TerminalLine[] {
	const city = context.location.split(",")[0]?.trim() || context.timeZone;
	let clock: string;
	try {
		clock = new Intl.DateTimeFormat("en-GB", {
			timeZone: context.timeZone,
			weekday: "short",
			hour: "2-digit",
			minute: "2-digit",
			hourCycle: "h23",
		}).format(context.date);
	} catch {
		return [{ kind: "error", text: "Clock unavailable." }];
	}
	const offset = zoneOffsetMinutes(context.timeZone, context.date);
	const lines: TerminalLine[] = [
		{
			kind: "out",
			text: `${clock} in ${city}${offset === null ? "" : ` (${formatOffset(offset)})`}`,
		},
	];
	if (offset !== null) {
		const gap = offset - context.visitorOffsetMinutes;
		lines.push({
			kind: "muted",
			text: gap === 0 ? "Same time zone as you." : `That is ${formatGap(gap)}.`,
		});
	}
	return lines;
}

const out = (text: string): TerminalLine => ({ kind: "out", text });
const muted = (text: string): TerminalLine => ({ kind: "muted", text });
const error = (text: string): TerminalLine => ({ kind: "error", text });
const accent = (text: string): TerminalLine => ({ kind: "accent", text });

function helpLines(): TerminalLine[] {
	const visible = TERMINAL_COMMANDS.filter((command) => !command.hidden);
	return [
		...visible.map((command) => ({
			kind: "out" as const,
			text: command.usage,
			description: command.description,
		})),
		muted("Plain words still search. Psst: type xray anywhere on the page."),
	];
}

function lsLines(argument: string, context: TerminalContext): TerminalLine[] {
	const target = fold(argument).replace(/\/+$/u, "");
	if (!target || target === "~" || target === "/" || target === ".") {
		return [
			out(
				TERMINAL_PAGES.filter((page) => page.name !== "home")
					.map((page) => `${page.name}/`)
					.join("  "),
			),
			muted("Try: ls work"),
		];
	}
	if (target === "work" || target === "projects") {
		const projects = context.projects.filter((project) => project.slug && project.title.trim());
		if (!projects.length) return [muted("No published projects yet.")];
		// Name and description travel separately so the output can lay them out
		// as two columns, or stack them on a narrow interface.
		return [
			...projects.map((project) => ({
				kind: "out" as const,
				text: project.slug,
				description: project.summary.trim() || project.title.trim(),
			})),
			muted(`Try: open ${projects[0]?.slug ?? "<project>"}`),
		];
	}
	if (target === "links" || target === "profiles") {
		const links = context.links.filter((link) => link.href.trim() && link.label.trim());
		if (!links.length) return [muted("No published profiles yet.")];
		return links.map((link) => ({
			kind: "out" as const,
			text: link.label.trim(),
			description: link.platform.trim(),
		}));
	}
	return [error(`ls: ${argument}: No such directory. Try ls, ls work, or ls links.`)];
}

function suggestCommand(name: string): string | null {
	let best: { name: string; score: number } | null = null;
	for (const command of TERMINAL_COMMANDS) {
		if (command.hidden) continue;
		const score = fuzzyScore(name, command.name);
		if (score !== null && (!best || score > best.score)) best = { name: command.name, score };
	}
	return best?.name ?? null;
}

const THEME_ALIASES: Record<string, TerminalThemeMode> = {
	light: "light",
	day: "light",
	dark: "dark",
	night: "dark",
	system: "auto",
	auto: "auto",
};

/** Runs one line. Unknown input prints an error with a suggestion. */
export function runTerminalCommand(raw: string, context: TerminalContext): TerminalResult {
	const input = normalizeTerminalInput(raw);
	if (!input) return { lines: [] };
	const [head = "", ...rest] = input.split(" ");
	const argument = rest.join(" ");
	const command = commandByName.get(head.toLowerCase())?.name;

	switch (command) {
		case "help":
			return { lines: helpLines() };
		case "whoami": {
			const lines = [accent(context.name || "Unknown")];
			if (context.role) lines.push(out(context.role));
			if (context.availability) lines.push(muted(context.availability));
			return { lines };
		}
		case "now":
			if (!context.now) return { lines: [out(context.role || "Nothing published yet.")] };
			return {
				lines: [
					out(`${context.now.role} at ${context.now.company}`),
					...(context.now.period ? [muted(context.now.period)] : []),
				],
			};
		case "ls":
			return { lines: lsLines(argument, context) };
		case "open": {
			if (!argument) return { lines: [error("open what? Try ls or ls work.")] };
			const target = resolveOpenTarget(argument, context);
			if (!target) {
				return { lines: [error(`Nothing called ${argument}. Try ls work.`)] };
			}
			if (target.kind === "page") {
				return {
					lines: [muted(`Opening ${target.page.path} …`)],
					effect: { type: "navigate", path: target.page.path },
				};
			}
			if (target.kind === "project") {
				const path = `/work/${target.slug}`;
				return {
					lines: [
						...(target.summary.trim() ? [out(target.summary.trim())] : []),
						muted(`Opening ${path} …`),
					],
					effect: { type: "navigate", path },
				};
			}
			if (/^mailto:/iu.test(target.href)) {
				return {
					lines: [muted(`Opening your mail app for ${target.label} …`)],
					effect: { type: "external", href: target.href },
				};
			}
			if (target.href.startsWith("/")) {
				return {
					lines: [muted(`Opening ${target.href} …`)],
					effect: { type: "navigate", path: target.href },
				};
			}
			return {
				lines: [muted(`Opening ${target.label} in a new tab …`)],
				effect: { type: "external", href: target.href },
			};
		}
		case "theme": {
			if (!argument) {
				const label = context.theme === "auto" ? "system" : context.theme;
				return {
					lines: [out(`theme: ${label}`), muted("Try: theme light, theme dark, theme system")],
				};
			}
			const mode = THEME_ALIASES[fold(argument)];
			if (!mode)
				return { lines: [error(`theme: unknown mode ${argument}. Use light, dark, or system.`)] };
			if (mode === context.theme) {
				return { lines: [muted(`Already using the ${mode === "auto" ? "system" : mode} theme.`)] };
			}
			return {
				lines: [out(`Theme set to ${mode === "auto" ? "system" : mode}.`)],
				effect: { type: "theme", mode },
			};
		}
		case "accent": {
			const names = context.accents.map((option) =>
				option.id === context.accent ? `${fold(option.name)}*` : fold(option.name),
			);
			if (!argument) return { lines: [out(names.join("  ")), muted("Try: accent mint")] };
			const wanted = fold(argument);
			const option = context.accents.find(
				(item) => fold(item.id) === wanted || fold(item.name) === wanted,
			);
			if (!option) {
				return { lines: [error(`accent: unknown color ${argument}.`), muted(names.join("  "))] };
			}
			if (option.id === context.accent) return { lines: [muted(`Already using ${option.name}.`)] };
			return {
				lines: [out(`Accent set to ${option.name}.`)],
				effect: { type: "accent", id: option.id },
			};
		}
		case "time":
			return { lines: timeLines(context) };
		case "email":
			if (!context.email) return { lines: [muted("No public email address yet. Try open links.")] };
			return {
				lines: [out(context.email), muted("Copying to your clipboard …")],
				effect: { type: "copy", text: context.email },
			};
		case "clear":
			return { lines: [], effect: { type: "clear" } };
		case "exit":
			return { lines: [], effect: { type: "exit" } };
		case "xray":
			return {
				lines: [muted("Toggling x-ray. Press Esc on the page to turn it off.")],
				effect: { type: "xray" },
			};
		case "sudo":
			return { lines: [error("Permission denied. This shell is read-only.")] };
		default: {
			const suggestion = suggestCommand(head.toLowerCase());
			return {
				lines: [
					error(`command not found: ${head}`),
					muted(
						suggestion
							? `Did you mean ${suggestion}? Type help for the list.`
							: "Type help for the list.",
					),
				],
			};
		}
	}
}

/**
 * Tab completion: completes the command, then its argument (pages, projects,
 * themes, accents). Returns null when nothing (or nothing unique) matches.
 */
export function completeTerminalInput(raw: string, context: TerminalContext): string | null {
	const prefix = hasTerminalPrefix(raw) ? "> " : "";
	const input = raw.replace(/^\s*>\s*/u, "").replace(/^\s+/u, "");
	const spaceIndex = input.indexOf(" ");
	if (spaceIndex === -1) {
		const head = input.toLowerCase();
		if (!head) return null;
		const matches = TERMINAL_COMMANDS.filter(
			(command) => !command.hidden && command.name.startsWith(head),
		);
		if (matches.length !== 1 || !matches[0]) return null;
		const needsArgument = ["open", "ls", "theme", "accent"].includes(matches[0].name);
		if (matches[0].name === head && !needsArgument) return null;
		return `${prefix}${matches[0].name}${needsArgument ? " " : ""}`;
	}
	const head = input.slice(0, spaceIndex).toLowerCase();
	const argument = fold(input.slice(spaceIndex + 1));
	const command = commandByName.get(head)?.name;
	let pool: string[] = [];
	if (command === "open") {
		pool = [
			...TERMINAL_PAGES.map((page) => page.name),
			...context.projects.map((project) => project.slug).filter(Boolean),
		];
	} else if (command === "ls") pool = ["work", "links"];
	else if (command === "theme") pool = ["light", "dark", "system"];
	else if (command === "accent") pool = context.accents.map((option) => fold(option.name));
	const matches = pool.filter((item) => item.startsWith(argument) && item !== argument);
	if (matches.length === 0) return null;
	// Complete to the longest shared prefix, like a shell.
	let shared = matches[0] ?? "";
	for (const item of matches) {
		while (!item.startsWith(shared)) shared = shared.slice(0, -1);
	}
	if (shared.length <= argument.length) return null;
	return `${prefix}${input.slice(0, spaceIndex)} ${shared}`;
}

/** Commands offered as tap targets under the terminal. */
export const TERMINAL_QUICK_COMMANDS = ["help", "whoami", "ls work", "time"] as const;
