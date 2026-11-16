import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import {
	accentOptions,
	applyAccent,
	applyThemeMode,
	themeModeLabels,
	themeModes,
	ThemeModeIcon,
	useAppearance,
	type AccentId,
	type ThemeMode,
} from "../AccentSwitcher";
import { useCopyToClipboard } from "../motion/CopyButton";
import { Kbd } from "../ui/portfolio";
import { cn } from "@/lib/utils";
import { scoreItem } from "./fuzzy";
import {
	completeTerminalInput,
	hasTerminalPrefix,
	matchTerminalCommand,
	normalizeTerminalInput,
	runTerminalCommand,
	TERMINAL_QUICK_COMMANDS,
	type TerminalContext,
	type TerminalLineKind,
} from "./terminal";
import { terminalContextFromContent, withCurrentClock } from "./terminal-context";
import { TerminalLineText } from "./TerminalLineText";
import { toggleXray, XrayEasterEgg } from "./xray";
import {
	CheckIcon,
	CopyIcon,
	ExternalIcon,
	HomeIcon,
	LinksIcon,
	MailIcon,
	NotesIcon,
	ProjectIcon,
	ResumeIcon,
	ReturnIcon,
	SearchIcon,
	StoryIcon,
	TerminalIcon,
	WorkIcon,
} from "./icons";
import { usePublicContent } from "./public-content";

// Projects open their detail page (src/routes/work_.$slug.tsx → /work/$slug).
const PROJECT_DETAIL_ROUTE_READY = true;

type PaletteGroup = "Terminal" | "Pages" | "Projects" | "Profiles" | "Appearance" | "Actions";
const groupOrder: readonly PaletteGroup[] = [
	"Terminal",
	"Pages",
	"Projects",
	"Profiles",
	"Appearance",
	"Actions",
];

interface TerminalEntry {
	id: number;
	kind: TerminalLineKind | "cmd";
	text: string;
	description?: string;
}
let terminalEntryId = 0;
const entry = (kind: TerminalEntry["kind"], text: string): TerminalEntry => ({
	id: (terminalEntryId += 1),
	kind,
	text,
});

interface PaletteItem {
	id: string;
	group: PaletteGroup;
	label: string;
	detail?: string;
	keywords?: string;
	icon: ReactNode;
	/** Shows a check (current theme / accent). */
	checked?: boolean;
	/** External destinations show an arrow and open in a new tab. */
	external?: boolean;
	/** Keep the palette open after running (theme, accent, copy). */
	stayOpen?: boolean;
	/** Internal navigation to a different page; the route takes focus afterwards. */
	navigates?: boolean;
	/** The "Run in the terminal" row. */
	command?: boolean;
	/** `origin` is the option element, used for the appearance reveal. */
	run: (origin?: Element | null) => void;
}

interface CommandPaletteContextValue {
	open: () => void;
	close: () => void;
	toggle: () => void;
	isOpen: boolean;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

/** Open the palette from anywhere (null outside the provider, e.g. isolated tests). */
export function useCommandPalette(): CommandPaletteContextValue | null {
	return useContext(CommandPaletteContext);
}

function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	const tag = target.tagName;
	if (tag === "TEXTAREA" || tag === "SELECT") return true;
	if (tag !== "INPUT") return false;
	const type = (target as HTMLInputElement).type;
	return !["button", "checkbox", "radio", "range", "reset", "submit", "color", "file"].includes(
		type,
	);
}

/**
 * Owns palette state and the global shortcuts: ⌘K / Ctrl+K toggles anywhere,
 * "/" opens when focus is not in a text field.
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
	const [isOpen, setIsOpen] = useState(false);
	const returnFocusRef = useRef<HTMLElement | null>(null);

	const open = useCallback(() => {
		const active = document.activeElement;
		returnFocusRef.current =
			active instanceof HTMLElement && active !== document.body ? active : null;
		setIsOpen(true);
	}, []);
	const close = useCallback(() => setIsOpen(false), []);
	const toggle = useCallback(() => {
		if (isOpen) setIsOpen(false);
		else open();
	}, [isOpen, open]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented || event.isComposing) return;
			const key = event.key.toLowerCase();
			if (key === "k" && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
				event.preventDefault();
				toggle();
				return;
			}
			if (
				event.key === "/" &&
				!isOpen &&
				!event.metaKey &&
				!event.ctrlKey &&
				!event.altKey &&
				!isEditableTarget(event.target)
			) {
				event.preventDefault();
				open();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, open, toggle]);

	const value = useMemo(() => ({ open, close, toggle, isOpen }), [open, close, toggle, isOpen]);

	return (
		<CommandPaletteContext.Provider value={value}>
			{children}
			<CommandPalette open={isOpen} onOpenChange={setIsOpen} returnFocusRef={returnFocusRef} />
			<XrayEasterEgg />
		</CommandPaletteContext.Provider>
	);
}

function hostOf(href: string): string | undefined {
	try {
		const url = new URL(href);
		if (url.protocol === "mailto:") return url.pathname;
		return url.host.replace(/^www\./u, "") + (url.pathname !== "/" ? url.pathname : "");
	} catch {
		return undefined;
	}
}

function CommandPalette({
	open,
	onOpenChange,
	returnFocusRef,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	returnFocusRef: React.RefObject<HTMLElement | null>;
}) {
	const navigate = useNavigate();
	const router = useRouter();
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const [hasOpened, setHasOpened] = useState(false);
	const { content, status } = usePublicContent(hasOpened);
	const appearance = useAppearance();
	const { status: copyStatus, copy } = useCopyToClipboard();
	const [query, setQuery] = useState("");
	const [mode, setMode] = useState<"search" | "terminal">("search");
	const [log, setLog] = useState<TerminalEntry[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const logRef = useRef<HTMLDivElement>(null);
	const history = useRef<string[]>([]);
	const historyCursor = useRef(-1);
	const navigateTimer = useRef<number | undefined>(undefined);
	const movedFocusByNavigation = useRef(false);
	const listboxId = useId();
	const optionPrefix = useId();
	const terminal = mode === "terminal";

	useEffect(() => {
		if (!open) return;
		setHasOpened(true);
		movedFocusByNavigation.current = false;
	}, [open]);

	useEffect(() => () => window.clearTimeout(navigateTimer.current), []);

	useEffect(() => {
		const element = logRef.current;
		if (element) element.scrollTop = element.scrollHeight;
	}, [log, terminal]);

	const email = (content?.identity.email || content?.contact.email || "").trim();

	const terminalContext = useMemo<TerminalContext>(
		() =>
			terminalContextFromContent(content, {
				theme: appearance.theme,
				accent: appearance.accent,
				accents: accentOptions,
			}),
		[appearance.accent, appearance.theme, content],
	);

	const enterTerminal = useCallback((initial = "") => {
		setMode("terminal");
		setQuery(initial);
		historyCursor.current = -1;
		setLog((current) =>
			current.length
				? current
				: [entry("muted", "Type help to see the commands. Esc goes back to search.")],
		);
		inputRef.current?.focus({ preventScroll: true });
	}, []);

	const leaveTerminal = useCallback(() => {
		setMode("search");
		setQuery("");
		inputRef.current?.focus({ preventScroll: true });
	}, []);

	const executeTerminal = (raw: string) => {
		const input = normalizeTerminalInput(raw);
		setMode("terminal");
		setQuery("");
		historyCursor.current = -1;
		if (!input) {
			setLog((current) => [...current, entry("cmd", "")]);
			return;
		}
		history.current = [input, ...history.current.filter((item) => item !== input)].slice(0, 30);
		const result = runTerminalCommand(input, withCurrentClock(terminalContext));
		const printed = [
			entry("cmd", input),
			...result.lines.map((line) => ({
				...entry(line.kind, line.text),
				description: line.description,
			})),
		];
		const effect = result.effect;
		if (effect?.type === "clear") {
			setLog([]);
			return;
		}
		setLog((current) => [...current, ...printed].slice(-120));
		if (!effect) return;
		switch (effect.type) {
			case "exit":
				leaveTerminal();
				return;
			case "navigate": {
				window.clearTimeout(navigateTimer.current);
				const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
				navigateTimer.current = window.setTimeout(
					() => {
						movedFocusByNavigation.current = effect.path !== pathname;
						onOpenChange(false);
						if (effect.path !== pathname) router.history.push(effect.path);
					},
					reduce ? 0 : 420,
				);
				return;
			}
			case "external":
				if (/^mailto:/iu.test(effect.href)) window.location.href = effect.href;
				else window.open(effect.href, "_blank", "noopener,noreferrer");
				return;
			case "theme":
				void applyThemeMode(effect.mode, inputRef.current);
				return;
			case "accent":
				void applyAccent(effect.id as AccentId, inputRef.current);
				return;
			case "copy":
				void copy(effect.text).then((ok) => {
					setLog((current) => [
						...current,
						entry(ok ? "accent" : "error", ok ? "Copied." : "Could not reach the clipboard."),
					]);
				});
				return;
			case "xray": {
				const on = toggleXray();
				setLog((current) => [
					...current,
					entry("accent", on ? "X-ray on. Close this to look." : "X-ray off."),
				]);
				return;
			}
		}
	};

	const items = useMemo<PaletteItem[]>(() => {
		const go = (target: string, action: () => void): Pick<PaletteItem, "run" | "navigates"> => ({
			navigates: target !== pathname,
			run: action,
		});
		const pages: PaletteItem[] = [
			{
				id: "page-home",
				group: "Pages",
				label: "Home",
				keywords: "start index about",
				icon: <HomeIcon />,
				...go("/", () => void navigate({ to: "/" })),
			},
			{
				id: "page-work",
				group: "Pages",
				label: "Work",
				keywords: "projects portfolio case studies open source",
				icon: <WorkIcon />,
				...go("/work", () => void navigate({ to: "/work", search: { group: "all" } })),
			},
			{
				id: "page-story",
				group: "Pages",
				label: "Story",
				keywords: "about background career path",
				icon: <StoryIcon />,
				...go("/story", () => void navigate({ to: "/story" })),
			},
			{
				id: "page-resume",
				group: "Pages",
				label: "Résumé",
				keywords: "resume cv experience pdf print",
				icon: <ResumeIcon />,
				...go("/resume", () => void navigate({ to: "/resume" })),
			},
			{
				id: "page-links",
				group: "Pages",
				label: "Links",
				keywords: "profiles social contact",
				icon: <LinksIcon />,
				...go("/links", () => void navigate({ to: "/links", search: { kind: "all" } })),
			},
			{
				id: "page-field-notes",
				group: "Pages",
				label: "Field notes",
				keywords: "travel notes writing",
				icon: <NotesIcon />,
				...go("/field-notes", () => void navigate({ to: "/field-notes" })),
			},
		];

		const projects: PaletteItem[] = (content?.projects ?? [])
			.filter((project) => project.title.trim())
			.map((project) => {
				const target = PROJECT_DETAIL_ROUTE_READY ? `/work/${project.slug}` : "/work";
				return {
					id: `project-${project.id}`,
					group: "Projects" as const,
					label: project.title.trim(),
					detail: project.summary.trim() || undefined,
					keywords: [project.category, project.year, project.role, ...project.tags].join(" "),
					icon: <ProjectIcon />,
					...go(target, () => {
						if (PROJECT_DETAIL_ROUTE_READY) router.history.push(target);
						else void navigate({ to: "/work", search: { group: "all" } });
					}),
				};
			});

		const links: PaletteItem[] = (content?.profileLinks ?? [])
			.filter((link) => link.href.trim() && !link.href.trim().startsWith("#"))
			.map((link) => {
				const href = link.href.trim();
				const internal = href.startsWith("/");
				const mail = /^mailto:/iu.test(href);
				return {
					id: `link-${link.id}`,
					group: "Profiles" as const,
					label: link.label.trim() || link.platform.trim() || href,
					detail: link.handle?.trim() || hostOf(href),
					keywords: [link.platform, link.kind ?? "", link.description ?? ""].join(" "),
					icon: mail ? <MailIcon /> : <ExternalIcon />,
					external: !internal && !mail,
					...(internal
						? go(href, () => router.history.push(href))
						: {
								run: () => {
									if (mail) window.location.href = href;
									else window.open(href, "_blank", "noopener,noreferrer");
								},
							}),
				};
			});

		const appearanceItems: PaletteItem[] = [];
		themeModes.forEach((themeMode: ThemeMode) => {
			appearanceItems.push({
				id: `action-theme-${themeMode}`,
				group: "Appearance",
				label:
					themeMode === "auto"
						? "Follow system theme"
						: `Use ${themeModeLabels[themeMode].toLowerCase()} theme`,
				keywords: `theme ${themeMode} appearance mode switch ${themeMode === "dark" ? "night" : themeMode === "light" ? "day" : "system auto"}`,
				icon: <ThemeModeIcon mode={themeMode} className="size-5" />,
				checked: appearance.theme === themeMode,
				stayOpen: true,
				run: (origin) => {
					if (!appearance.transitioning) void applyThemeMode(themeMode, origin);
				},
			});
		});
		accentOptions.forEach((option) => {
			appearanceItems.push({
				id: `action-accent-${option.id}`,
				group: "Appearance",
				label: `${option.name} accent`,
				keywords: `accent ${option.id} color colour highlight change`,
				icon: (
					<span
						aria-hidden="true"
						className="m-[3px] size-3.5 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]"
						style={{
							background: appearance.resolvedTheme === "dark" ? option.darkColor : option.color,
						}}
					/>
				),
				checked: appearance.accent === option.id,
				stayOpen: true,
				run: (origin) => {
					if (!appearance.transitioning) void applyAccent(option.id as AccentId, origin);
				},
			});
		});

		const actions: PaletteItem[] = [
			{
				id: "action-terminal",
				group: "Actions",
				label: "Open terminal",
				detail: "whoami, ls work, open <project>, theme dark …",
				keywords: "terminal shell cli command console prompt",
				icon: <TerminalIcon />,
				stayOpen: true,
				run: () => enterTerminal(),
			},
		];
		if (email) {
			actions.push({
				id: "action-copy-email",
				group: "Actions",
				label: copyStatus === "copied" ? "Email copied. Talk soon." : "Copy email",
				detail: email,
				keywords: "contact mail clipboard address",
				icon: copyStatus === "copied" ? <CheckIcon className="text-success" /> : <CopyIcon />,
				stayOpen: true,
				run: () => void copy(email),
			});
		}

		return [...pages, ...projects, ...links, ...appearanceItems, ...actions];
	}, [appearance, content, copy, copyStatus, email, enterTerminal, navigate, pathname, router]);

	const commandName = terminal ? null : matchTerminalCommand(query);

	const results = useMemo(() => {
		const trimmed = query.trim();
		if (!trimmed) return items;
		return items
			.map((item, order) => ({
				item,
				order,
				score: scoreItem(
					trimmed,
					item.label,
					`${item.detail ?? ""} ${item.keywords ?? ""} ${item.group}`,
				),
			}))
			.filter(
				(candidate): candidate is { item: PaletteItem; order: number; score: number } =>
					candidate.score !== null,
			)
			.sort((a, b) => b.score - a.score || a.order - b.order)
			.map((candidate) => candidate.item);
	}, [items, query]);

	const grouped = useMemo(() => {
		const run: PaletteItem[] = commandName
			? [
					{
						id: "terminal-run",
						group: "Terminal",
						label: normalizeTerminalInput(query),
						detail: "Run in the terminal",
						icon: <ReturnIcon />,
						stayOpen: true,
						command: true,
						run: () => executeTerminal(query),
					},
				]
			: [];
		if (query.trim()) {
			return [
				...(run.length ? [{ group: "Terminal" as PaletteGroup | null, items: run }] : []),
				{ group: null as PaletteGroup | null, items: results },
			].filter((section) => section.items.length > 0);
		}
		return groupOrder
			.map((group) => ({
				group: group as PaletteGroup | null,
				items: results.filter((item) => item.group === group),
			}))
			.filter((section) => section.items.length > 0);
		// executeTerminal is recreated each render; the query drives this list.
	}, [commandName, query, results]);
	const flat = useMemo(() => grouped.flatMap((section) => section.items), [grouped]);

	const activeIndex = Math.max(
		0,
		flat.findIndex((item) => item.id === activeId),
	);
	const activeItem = terminal ? undefined : flat[activeIndex];

	useEffect(() => {
		setActiveId(flat[0]?.id ?? null);
		listRef.current?.scrollTo({ top: 0 });
		// Reset to the best match whenever the query (not the item list) changes.
	}, [query, mode]);

	useEffect(() => {
		if (!activeItem) return;
		document
			.getElementById(`${optionPrefix}-${activeItem.id}`)
			?.scrollIntoView({ block: "nearest" });
	}, [activeItem, optionPrefix]);

	const run = (item: PaletteItem, origin?: Element | null) => {
		if (item.command) {
			executeTerminal(query);
			return;
		}
		movedFocusByNavigation.current = Boolean(item.navigates);
		item.run(origin ?? document.getElementById(`${optionPrefix}-${item.id}`));
		if (!item.stayOpen) onOpenChange(false);
	};

	const move = (index: number) => {
		if (!flat.length) return;
		const next = (index + flat.length) % flat.length;
		setActiveId(flat[next]?.id ?? null);
	};

	const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				move(activeIndex + 1);
				break;
			case "ArrowUp":
				event.preventDefault();
				move(activeIndex - 1);
				break;
			case "Home":
				event.preventDefault();
				move(0);
				break;
			case "End":
				event.preventDefault();
				move(flat.length - 1);
				break;
			case "PageDown":
				event.preventDefault();
				move(Math.min(activeIndex + 5, flat.length - 1));
				break;
			case "PageUp":
				event.preventDefault();
				move(Math.max(activeIndex - 5, 0));
				break;
			case "Enter":
				if (activeItem) {
					event.preventDefault();
					run(activeItem);
				}
				break;
		}
	};

	const onTerminalKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		switch (event.key) {
			case "Enter":
				event.preventDefault();
				executeTerminal(query);
				break;
			case "ArrowUp":
			case "ArrowDown": {
				const list = history.current;
				if (!list.length) return;
				event.preventDefault();
				const step = event.key === "ArrowUp" ? 1 : -1;
				historyCursor.current = Math.max(
					-1,
					Math.min(list.length - 1, historyCursor.current + step),
				);
				setQuery(historyCursor.current === -1 ? "" : (list[historyCursor.current] ?? ""));
				break;
			}
			case "Tab": {
				if (!query.trim()) return;
				const completed = completeTerminalInput(query, terminalContext);
				// Keep Tab for focus movement when there is nothing to complete.
				if (completed) {
					event.preventDefault();
					setQuery(completed);
				}
				break;
			}
			case "Backspace":
				if (!query) {
					event.preventDefault();
					leaveTerminal();
				}
				break;
			case "l":
				if (event.ctrlKey) {
					event.preventDefault();
					setLog([]);
				}
				break;
		}
	};

	const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.nativeEvent.isComposing) return;
		if (terminal) onTerminalKeyDown(event);
		else onSearchKeyDown(event);
	};

	const onChange = (value: string) => {
		if (!terminal && hasTerminalPrefix(value)) {
			enterTerminal(value.replace(/^\s*>\s?/u, ""));
			return;
		}
		historyCursor.current = -1;
		setQuery(value);
	};

	const trimmedQuery = query.trim();
	const loadingRemote = !content && status === "loading";

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(next, details) => {
				// Escape clears the input first, then leaves the terminal, then closes.
				if (!next && details.reason === "escape-key") {
					if (inputRef.current?.value) {
						details.cancel();
						setQuery("");
						return;
					}
					if (terminal) {
						details.cancel();
						leaveTerminal();
						return;
					}
				}
				if (!next) movedFocusByNavigation.current = false;
				onOpenChange(next);
			}}
			onOpenChangeComplete={(isOpenNow) => {
				if (!isOpenNow) {
					setQuery("");
					setMode("search");
					// While the modal was open the page was inert, so the route's own
					// focus call could not land. Hand focus to the page's <main> now; if
					// the next route commits later, RouteOutlet focuses its <main> again.
					if (movedFocusByNavigation.current) {
						document
							.querySelector<HTMLElement>("main#main-content")
							?.focus({ preventScroll: true });
					}
					// The flag is cleared on the next open: Base UI resolves `finalFocus`
					// after this callback, during unmount.
				}
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop
					data-slot="command-palette-backdrop"
					className="fixed inset-0 z-(--z-palette) bg-[rgb(0_0_0/0.2)] backdrop-blur-[2px] transition-opacity duration-300 ease-trace data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-[rgb(0_0_0/0.5)]"
				/>
				<Dialog.Popup
					data-slot="command-palette"
					data-material="glass"
					data-mode={mode}
					initialFocus={inputRef}
					finalFocus={() => {
						// After navigating, focus belongs to the page (route-focus contract).
						if (movedFocusByNavigation.current) return false;
						const target = returnFocusRef.current;
						return target?.isConnected ? target : true;
					}}
					className={cn(
						"glass fixed z-(--z-palette) flex flex-col overflow-hidden bg-[color-mix(in_srgb,var(--theme-surface-solid)_86%,transparent)]! text-foreground outline-hidden",
						"transition-[opacity,translate,scale,filter] ease-trace",
						// Mobile: bottom sheet.
						"inset-x-0 bottom-0 max-h-[min(86dvh,680px)] rounded-t-[28px] pb-[env(safe-area-inset-bottom)] duration-[360ms]",
						"data-starting-style:translate-y-full data-ending-style:translate-y-full data-ending-style:duration-[240ms]",
						// Desktop: centered spotlight panel.
						"md:inset-x-auto md:bottom-auto md:left-[calc(50%-min(320px,50vw-16px))] md:top-[max(12vh,88px)] md:max-h-[min(560px,76vh)] md:w-[min(640px,calc(100vw-32px))] md:rounded-[24px] md:pb-0 md:duration-[260ms]",
						"md:data-starting-style:translate-y-[-6px] md:data-starting-style:scale-[.97] md:data-starting-style:opacity-0 md:data-starting-style:blur-[3px]",
						"md:data-ending-style:translate-y-[-4px] md:data-ending-style:scale-[.98] md:data-ending-style:opacity-0 md:data-ending-style:duration-[180ms]",
					)}
				>
					<Dialog.Title className="sr-only">
						{terminal ? "Terminal" : "Search the site"}
					</Dialog.Title>
					<Dialog.Description className="sr-only">
						{terminal
							? "Type a command and press Enter. Type help for the list. Up and down recall earlier commands, Tab completes, Escape goes back to search."
							: "Type to filter pages, projects, profiles, and actions. Use the up and down arrow keys to choose, and Enter to open. Start with a greater-than sign for the terminal."}
					</Dialog.Description>
					<div
						className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong md:hidden"
						aria-hidden="true"
					/>
					<div className="relative flex shrink-0 items-center gap-3 border-b border-line px-5 py-1">
						<span className="relative grid size-5 shrink-0 place-items-center" aria-hidden="true">
							<SearchIcon
								className={cn(
									"col-start-1 row-start-1 text-muted-foreground transition-[opacity,scale] duration-200 ease-trace",
									terminal ? "scale-50 opacity-0" : "scale-100 opacity-100",
								)}
							/>
							<span
								className={cn(
									"col-start-1 row-start-1 font-mono text-[17px] leading-none text-primary-text transition-[opacity,scale] duration-200 ease-trace",
									terminal ? "scale-100 opacity-100" : "scale-50 opacity-0",
								)}
							>
								❯
							</span>
						</span>
						<input
							ref={inputRef}
							type="text"
							role={terminal ? undefined : "combobox"}
							aria-expanded={terminal ? undefined : true}
							aria-controls={terminal ? undefined : listboxId}
							aria-autocomplete={terminal ? undefined : "list"}
							aria-activedescendant={activeItem ? `${optionPrefix}-${activeItem.id}` : undefined}
							aria-label={
								terminal ? "Terminal command" : "Search pages, projects, profiles, and actions"
							}
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="off"
							spellCheck={false}
							enterKeyHint={terminal ? "send" : "go"}
							placeholder={terminal ? "help" : "Find a page, project, or action…"}
							value={query}
							onChange={(event) => onChange(event.target.value)}
							onKeyDown={onKeyDown}
							className={cn(
								"h-14 min-w-0 flex-1 border-0 bg-transparent text-[17px] text-foreground outline-hidden placeholder:text-muted-foreground",
								terminal
									? "font-mono text-[16px] caret-[var(--theme-accent-line)] md:text-[15px]"
									: "tracking-[-0.01em]",
							)}
						/>
						{terminal ? (
							<span className="mono-label shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-primary-text">
								~/sohel
							</span>
						) : (
							<span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground max-md:hidden">
								<Kbd>&gt;</Kbd>
								<span>terminal</span>
							</span>
						)}
						<Dialog.Close className="pressable -mr-2 inline-flex min-h-11 items-center rounded-full px-3 text-[15px] font-medium text-primary-text outline-hidden focus-visible:outline-2 focus-visible:outline-ring md:hidden">
							Cancel
						</Dialog.Close>
					</div>
					{terminal ? (
						<div className="flex min-h-0 flex-1 flex-col">
							<div
								ref={logRef}
								role="log"
								aria-live="polite"
								aria-label="Terminal output"
								data-slot="palette-terminal"
								onClick={() => inputRef.current?.focus({ preventScroll: true })}
								className="h-[min(340px,48dvh)] min-h-0 overflow-y-auto overscroll-contain px-5 py-4 font-mono text-[13px] leading-[1.65]"
							>
								{log.map((line) =>
									line.kind === "cmd" ? (
										<p
											key={line.id}
											className="m-0 mt-2 text-foreground [overflow-wrap:anywhere] first:mt-0"
										>
											<span aria-hidden="true" className="text-primary-text">
												❯{" "}
											</span>
											<span className="sr-only">Command: </span>
											<TerminalLineText text={line.text} description={line.description} />
										</p>
									) : (
										<p
											key={line.id}
											className={cn(
												"m-0 whitespace-pre-wrap [overflow-wrap:anywhere]",
												line.kind === "out" && "text-ink-soft",
												line.kind === "muted" && "text-muted-foreground",
												line.kind === "error" && "text-destructive",
												line.kind === "accent" && "text-primary-text",
											)}
										>
											<TerminalLineText text={line.text} description={line.description} />
										</p>
									),
								)}
							</div>
							<div className="flex shrink-0 flex-wrap gap-1.5 border-t border-line px-3 py-2.5">
								{TERMINAL_QUICK_COMMANDS.map((command) => (
									<button
										key={command}
										type="button"
										onClick={() => {
											executeTerminal(command);
											inputRef.current?.focus({ preventScroll: true });
										}}
										className="pressable min-h-9 rounded-full border-0 bg-transparent px-3 font-mono text-[12px] text-muted-foreground outline-hidden transition-[background-color,color,scale] duration-200 focus-visible:outline-2 focus-visible:outline-ring pointer-fine:hover:bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)] pointer-fine:hover:text-foreground max-md:min-h-11"
									>
										<span className="sr-only">Run </span>
										{command}
									</button>
								))}
							</div>
						</div>
					) : (
						<div
							ref={listRef}
							id={listboxId}
							role="listbox"
							aria-label="Results"
							// Scrollable regions are tabbable by default; arrows and Enter live on the input.
							tabIndex={-1}
							className="min-h-0 flex-1 overscroll-contain overflow-y-auto scroll-py-2 p-2"
						>
							{grouped.map((section) => (
								<PaletteSection
									key={section.group ?? "results"}
									group={section.group}
									items={section.items}
									activeId={activeItem?.id}
									optionPrefix={optionPrefix}
									onHover={setActiveId}
									onRun={run}
								/>
							))}
							{loadingRemote && !trimmedQuery ? (
								<div className="grid gap-2 px-3 py-3" aria-hidden="true">
									<span className="skeleton h-4 w-40" />
									<span className="skeleton h-4 w-56" />
								</div>
							) : null}
							{flat.length === 0 ? (
								<div className="grid justify-items-center gap-1.5 px-6 py-12 text-center">
									<p className="m-0 text-[15px] font-medium">No matches for “{trimmedQuery}”</p>
									<p className="m-0 text-sm text-muted-foreground">
										Try a shorter search, or type &gt; for the terminal.
									</p>
								</div>
							) : null}
						</div>
					)}
					<div className="flex shrink-0 items-center justify-between gap-4 border-t border-line px-5 py-2.5 text-xs text-muted-foreground max-md:hidden">
						{terminal ? (
							<>
								<span className="flex items-center gap-1.5">
									<Kbd>
										<ReturnIcon className="size-3" />
									</Kbd>
									<span className="ml-1">run</span>
									<Kbd className="ml-2">↑</Kbd>
									<span className="ml-1">history</span>
									<Kbd className="ml-2">tab</Kbd>
									<span className="ml-1">complete</span>
								</span>
								<span className="flex items-center gap-1.5">
									<Kbd>esc</Kbd>
									<span className="ml-1">back to search</span>
								</span>
							</>
						) : (
							<>
								<span className="flex items-center gap-1.5">
									<Kbd>↑</Kbd>
									<Kbd>↓</Kbd>
									<span className="ml-1">to move</span>
									<Kbd className="ml-2">
										<ReturnIcon className="size-3" />
									</Kbd>
									<span className="ml-1">to open</span>
								</span>
								<span className="flex items-center gap-1.5">
									<Kbd>esc</Kbd>
									<span className="ml-1">to close</span>
								</span>
							</>
						)}
					</div>
					<p role="status" aria-live="polite" className="sr-only">
						{!terminal && trimmedQuery
							? flat.length === 1
								? "1 result"
								: `${flat.length} results`
							: ""}
						{copyStatus === "copied" ? " Email copied. Talk soon." : ""}
					</p>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

function PaletteSection({
	group,
	items,
	activeId,
	optionPrefix,
	onHover,
	onRun,
}: {
	group: PaletteGroup | null;
	items: PaletteItem[];
	activeId: string | undefined;
	optionPrefix: string;
	onHover: (id: string) => void;
	onRun: (item: PaletteItem, origin?: Element | null) => void;
}) {
	const headingId = useId();
	const options = items.map((item) => {
		const active = item.id === activeId;
		return (
			<div
				key={item.id}
				id={`${optionPrefix}-${item.id}`}
				role="option"
				aria-selected={active}
				aria-checked={item.checked === undefined ? undefined : item.checked}
				data-active={active || undefined}
				className={cn(
					"group/option relative flex min-h-12 cursor-default select-none items-center gap-3 rounded-[14px] px-3 py-2 text-[15px] transition-colors duration-150",
					active ? "bg-[color-mix(in_srgb,var(--theme-ink)_7%,transparent)]" : "",
				)}
				onPointerMove={(event) => {
					if (event.pointerType === "mouse" && !active) onHover(item.id);
				}}
				onClick={(event) => onRun(item, event.currentTarget)}
			>
				<span
					className={cn(
						"grid size-8 shrink-0 place-items-center rounded-[10px] text-ink-soft transition-colors duration-150",
						active
							? "bg-surface-raised text-primary-text shadow-raised"
							: "bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)]",
					)}
					aria-hidden="true"
				>
					{item.icon}
				</span>
				<span className="grid min-w-0 flex-1">
					<span
						className={cn(
							"truncate font-medium tracking-[-0.01em]",
							item.command && "font-mono text-[14px] tracking-normal",
						)}
					>
						{item.command ? (
							<span aria-hidden="true" className="text-primary-text">
								❯{" "}
							</span>
						) : null}
						{item.label}
					</span>
					{item.detail ? (
						<span className="truncate text-[13px] text-muted-foreground">{item.detail}</span>
					) : null}
				</span>
				{item.checked ? <CheckIcon className="size-4 text-primary-text" /> : null}
				{item.external ? <span className="sr-only">, opens in a new tab</span> : null}
				<span
					aria-hidden="true"
					className={cn(
						"mono-label shrink-0 text-muted-foreground transition-opacity duration-150 max-md:hidden",
						active ? "opacity-100" : "opacity-0",
					)}
				>
					{item.command ? "Run ↵" : item.external ? "Open ↗" : item.stayOpen ? "Apply" : "Go"}
				</span>
			</div>
		);
	});

	if (!group) return <>{options}</>;
	return (
		<div role="group" aria-labelledby={headingId} className="pb-1.5 not-first:pt-1.5">
			<div id={headingId} className="mono-label px-3 pt-2 pb-1.5 text-muted-foreground">
				{group}
			</div>
			{options}
		</div>
	);
}
