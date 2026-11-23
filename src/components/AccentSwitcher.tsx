import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "./ui/popover";
import { MenuIndicator, MenuSurface } from "./ui/portfolio";
import { cn } from "../lib/utils";

/**
 * Appearance: theme mode + accent.
 *
 * Contract (do not change without updating the boot script):
 * - `localStorage["portfolio-accent"]` holds an accent id, `["portfolio-theme"]` a mode.
 * - `<html>` carries `data-accent`, `data-theme` (mode), `data-theme-resolved`
 *   (light | dark) and the `.dark` class. `accentBootScript` sets them before paint.
 * - `meta[name="theme-color"]` mirrors the resolved paper color.
 */
export const accentOptions = [
	{ id: "cobalt", name: "Cobalt", color: "#0066d6", darkColor: "#4c9aff" },
	{ id: "sky", name: "Sky", color: "#00739e", darkColor: "#3fbde8" },
	{ id: "azure", name: "Azure", color: "#4b55e0", darkColor: "#8e96ff" },
	{ id: "tangerine", name: "Tangerine", color: "#c2410c", darkColor: "#ff9257" },
	{ id: "violet", name: "Violet", color: "#7c3aed", darkColor: "#b69aff" },
	{ id: "mint", name: "Mint", color: "#047857", darkColor: "#34d399" },
] as const;

export const themeModes = ["light", "dark", "auto"] as const;
export type AccentId = (typeof accentOptions)[number]["id"];
export type ThemeMode = (typeof themeModes)[number];
export type ResolvedTheme = "light" | "dark";

/** Browser chrome colors; keep equal to `--theme-paper` in each theme. */
export const themeColors = { light: "#fbfbfd", dark: "#0a0a0c" } as const;

const accentIds = accentOptions.map(({ id }) => id);
const accentStorageKey = "portfolio-accent";
const themeStorageKey = "portfolio-theme";
const defaultAccent: AccentId = "cobalt";

export const accentBootScript = `(()=>{try{const r=document.documentElement,a=localStorage.getItem("${accentStorageKey}"),m=localStorage.getItem("${themeStorageKey}"),t=${JSON.stringify(themeModes)}.includes(m)?m:"auto",d=t==="auto"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;if(${JSON.stringify(accentIds)}.includes(a))r.dataset.accent=a;r.dataset.theme=t;r.dataset.themeResolved=d;r.classList.toggle("dark",d==="dark");document.querySelector('meta[name="theme-color"]')?.setAttribute("content",d==="dark"?"${themeColors.dark}":"${themeColors.light}")}catch{}})()`;

export function isAccent(value: string | null | undefined): value is AccentId {
	return accentIds.some((accent) => accent === value);
}

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
	return themeModes.some((mode) => mode === value);
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
	return mode === "auto"
		? window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light"
		: mode;
}

function syncThemeColor(theme: ResolvedTheme) {
	document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColors[theme]);
}

function writeTheme(mode: ThemeMode) {
	const nextResolvedTheme = resolveTheme(mode);
	const root = document.documentElement;
	root.dataset.theme = mode;
	root.dataset.themeResolved = nextResolvedTheme;
	root.classList.toggle("dark", nextResolvedTheme === "dark");
	syncThemeColor(nextResolvedTheme);
	try {
		localStorage.setItem(themeStorageKey, mode);
	} catch {
		// The mode still applies for this page when storage is unavailable.
	}
}

function writeAccent(accent: AccentId) {
	document.documentElement.dataset.accent = accent;
	try {
		localStorage.setItem(accentStorageKey, accent);
	} catch {
		// The accent still applies for this page when storage is unavailable.
	}
}

type ViewTransitionDocument = Document & {
	startViewTransition?: (update: () => void) => {
		finished: Promise<void>;
		skipTransition: () => void;
	};
};

let activeTransition: ReturnType<
	NonNullable<ViewTransitionDocument["startViewTransition"]>
> | null = null;
let fallbackTimer: number | null = null;

/**
 * Runs an appearance change (theme or accent) as a circular reveal growing
 * from `origin` (View Transitions), a short color wash where unsupported, or
 * instantly under reduced motion. Resolves once the visual change has finished.
 */
function runAppearanceTransition(update: () => void, origin?: Element | null): Promise<void> {
	const root = document.documentElement;
	const documentWithViewTransition = document as ViewTransitionDocument;
	const clearFallback = () => {
		if (fallbackTimer !== null) {
			window.clearTimeout(fallbackTimer);
			fallbackTimer = null;
		}
		if (root.dataset.themeTransitioning === "fallback") delete root.dataset.themeTransitioning;
		root.style.removeProperty("--theme-transition-from");
	};
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		clearFallback();
		update();
		return Promise.resolve();
	}
	if (!documentWithViewTransition.startViewTransition) {
		clearFallback();
		root.style.setProperty(
			"--theme-transition-from",
			getComputedStyle(document.body).backgroundColor,
		);
		root.dataset.themeTransitioning = "fallback";
		update();
		return new Promise((resolve) => {
			fallbackTimer = window.setTimeout(() => {
				clearFallback();
				resolve();
			}, 420);
		});
	}
	activeTransition?.skipTransition();
	activeTransition = null;
	clearFallback();
	// A route transition names the dock; the reveal must capture the page whole.
	delete root.dataset.routeVt;
	const rect = origin?.isConnected ? origin.getBoundingClientRect() : undefined;
	root.style.setProperty(
		"--theme-toggle-x",
		rect ? `${rect.left + rect.width / 2}px` : `${window.innerWidth / 2}px`,
	);
	root.style.setProperty("--theme-toggle-y", rect ? `${rect.top + rect.height / 2}px` : "0px");
	root.dataset.themeTransitioning = "view";
	const clear = () => {
		delete root.dataset.themeTransitioning;
		root.style.removeProperty("--theme-toggle-x");
		root.style.removeProperty("--theme-toggle-y");
	};
	try {
		const transition = documentWithViewTransition.startViewTransition(update);
		activeTransition = transition;
		const settle = () => {
			if (activeTransition === transition) {
				activeTransition = null;
				clear();
			}
		};
		return transition.finished.then(settle, settle);
	} catch {
		clear();
		update();
		return Promise.resolve();
	}
}

/**
 * Sets the accent. With `origin`, the new accent is revealed in a circle
 * growing from that control; without it the colors interpolate in place.
 */
export function applyAccent(accent: AccentId, origin?: Element | null): Promise<void> {
	if (document.documentElement.dataset.accent === accent) return Promise.resolve();
	if (!origin) {
		writeAccent(accent);
		return Promise.resolve();
	}
	return runAppearanceTransition(() => writeAccent(accent), origin);
}

/**
 * Switches the theme mode with a circular reveal from `origin` (View
 * Transitions), a color wash where unsupported, or instantly under reduced
 * motion. Resolves once the visual transition has finished.
 */
export function applyThemeMode(mode: ThemeMode, origin?: Element | null): Promise<void> {
	if (document.documentElement.dataset.theme === mode) return Promise.resolve();
	return runAppearanceTransition(() => writeTheme(mode), origin);
}

export interface Appearance {
	theme: ThemeMode;
	resolvedTheme: ResolvedTheme;
	accent: AccentId;
	/** True while a theme reveal is running; controls should ignore input. */
	transitioning: boolean;
}

const serverSnapshot = `auto|light|${defaultAccent}|0`;

function readSnapshot(): string {
	const data = document.documentElement.dataset;
	const theme = isThemeMode(data.theme) ? data.theme : "auto";
	const resolved = data.themeResolved === "dark" ? "dark" : "light";
	const accent = isAccent(data.accent) ? data.accent : defaultAccent;
	return `${theme}|${resolved}|${accent}|${data.themeTransitioning ? 1 : 0}`;
}

function subscribe(onChange: () => void) {
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: [
			"data-theme",
			"data-theme-resolved",
			"data-accent",
			"data-theme-transitioning",
		],
	});
	return () => observer.disconnect();
}

/**
 * Live appearance state read from `<html>`. Hydration-safe: the first client
 * render uses the server defaults, then updates to the stored preference.
 */
export function useAppearance(): Appearance {
	const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => serverSnapshot);
	return useMemo(() => {
		const [theme, resolvedTheme, accent, transitioning] = snapshot.split("|");
		return {
			theme: theme as ThemeMode,
			resolvedTheme: resolvedTheme as ResolvedTheme,
			accent: accent as AccentId,
			transitioning: transitioning === "1",
		};
	}, [snapshot]);
}

/** Keeps `auto` mode in step with the OS setting. Mount once (the nav dock does). */
export function useSystemThemeSync() {
	useEffect(() => {
		const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
		const sync = () => {
			if (document.documentElement.dataset.theme === "auto") writeTheme("auto");
		};
		colorScheme.addEventListener("change", sync);
		return () => colorScheme.removeEventListener("change", sync);
	}, []);
}

export const themeModeLabels: Record<ThemeMode, string> = {
	light: "Light",
	dark: "Dark",
	auto: "Auto",
};

export function ThemeModeIcon({ mode, className }: { mode: ThemeMode; className?: string }) {
	const iconClassName = cn(
		"size-4 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]",
		className,
	);
	if (mode === "light") {
		return (
			<svg className={iconClassName} viewBox="0 0 20 20" aria-hidden="true">
				<circle cx="10" cy="10" r="3.25" />
				<path d="M10 1.75v2M10 16.25v2M1.75 10h2M16.25 10h2M4.17 4.17l1.42 1.42M14.41 14.41l1.42 1.42M15.83 4.17l-1.42 1.42M5.59 14.41l-1.42 1.42" />
			</svg>
		);
	}
	if (mode === "dark") {
		return (
			<svg className={iconClassName} viewBox="0 0 20 20" aria-hidden="true">
				<path d="M16.75 12.44A7 7 0 0 1 7.56 3.25a7 7 0 1 0 9.19 9.19Z" />
			</svg>
		);
	}
	return (
		<svg className={iconClassName} viewBox="0 0 20 20" aria-hidden="true">
			<circle cx="10" cy="10" r="7.25" />
			<path d="M10 2.75v14.5" />
			<path d="M10 2.75a7.25 7.25 0 0 1 0 14.5Z" className="fill-current stroke-none" />
		</svg>
	);
}

interface AccentSwitcherProps {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	className?: string;
}

/**
 * Appearance popover: theme mode (light / dark / auto) and accent. Sits in the
 * nav dock; the command palette offers the same actions.
 */
export function AccentSwitcher({ open, onOpenChange, className }: AccentSwitcherProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const isOpen = open ?? uncontrolledOpen;
	const setOpen = (next: boolean) => {
		setUncontrolledOpen(next);
		onOpenChange?.(next);
	};
	const { theme, resolvedTheme, accent, transitioning } = useAppearance();
	useSystemThemeSync();

	// The popover trigger may move focus during the reveal; hand it back after.
	const selectTheme = (mode: ThemeMode, source: HTMLButtonElement) => {
		if (transitioning || mode === theme) return;
		void applyThemeMode(mode, source).then(() => {
			if (source.isConnected && document.activeElement !== source) {
				source.focus({ preventScroll: true });
			}
		});
	};

	const currentAccent = accentOptions.find(({ id }) => id === accent) ?? accentOptions[0];
	const swatch = (option: (typeof accentOptions)[number]) =>
		resolvedTheme === "dark" ? option.darkColor : option.color;

	return (
		<Popover open={isOpen} onOpenChange={setOpen}>
			<PopoverTrigger
				className={cn(
					"pressable relative grid size-11 shrink-0 place-items-center rounded-full border-0 bg-transparent p-0 text-ink-soft outline-hidden hover:bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)] hover:text-foreground focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-expanded:bg-[color-mix(in_srgb,var(--theme-ink)_7%,transparent)] aria-expanded:text-foreground",
					className,
				)}
				aria-label={`Appearance: ${themeModeLabels[theme]} theme, ${currentAccent.name} accent`}
				aria-haspopup="dialog"
			>
				<ThemeModeIcon mode={theme} className="size-[18px]" />
				<span
					className="absolute bottom-[9px] right-[9px] size-2 rounded-full ring-2 ring-paper pointer-fine:in-[.cms-rail-appearance]:right-1 pointer-fine:in-[.cms-rail-appearance]:bottom-1"
					style={{ background: "var(--theme-accent)" } as CSSProperties}
					aria-hidden="true"
				/>
			</PopoverTrigger>
			{/* Fixed, like the dock it opens from, so scrolling never moves it. */}
			<PopoverContent
				align="end"
				sideOffset={12}
				positionMethod="fixed"
				className="appearance-pop w-auto rounded-none border-0 bg-transparent p-0 shadow-none ring-0 data-[ending-style]:animate-none data-[starting-style]:animate-none"
			>
				<MenuSurface className="flex w-[min(300px,calc(100vw-24px))] flex-col gap-3 p-3">
					<PopoverHeader className="sr-only">
						<PopoverTitle>Appearance</PopoverTitle>
					</PopoverHeader>
					<p className="mono-label px-1 pt-0.5 text-muted-foreground" aria-hidden="true">
						Theme
					</p>
					<div
						className="grid grid-cols-3 gap-1 rounded-[18px] bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)] p-1"
						role="group"
						aria-label="Theme"
					>
						{themeModes.map((mode) => (
							<button
								key={mode}
								type="button"
								aria-pressed={theme === mode}
								aria-disabled={transitioning || undefined}
								className="pressable relative flex min-h-11 items-center justify-center gap-1.5 rounded-[14px] border-0 bg-transparent px-2 text-[13px] font-medium text-muted-foreground outline-hidden hover:text-foreground focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:text-foreground aria-disabled:pointer-events-none"
								onClick={(event) => selectTheme(mode, event.currentTarget)}
							>
								{theme === mode ? (
									<MenuIndicator
										className="rounded-[14px] bg-surface-raised shadow-raised"
										layoutId="appearance-mode-indicator"
										transition={{ type: "spring", duration: 0.3, bounce: 0 }}
									/>
								) : null}
								<span className="relative z-[1]">
									<ThemeModeIcon mode={mode} />
								</span>
								<span className="relative z-[1]">{themeModeLabels[mode]}</span>
							</button>
						))}
					</div>
					<p className="mono-label flex items-baseline justify-between px-1 pt-1 text-muted-foreground">
						<span aria-hidden="true">Accent</span>
						<span className="normal-case tracking-normal text-foreground" aria-hidden="true">
							{currentAccent.name}
						</span>
					</p>
					<div
						className="grid grid-cols-6 justify-items-center"
						role="group"
						aria-label="Accent color"
					>
						{accentOptions.map((option) => (
							<button
								key={option.id}
								type="button"
								aria-label={option.name}
								aria-pressed={accent === option.id}
								aria-disabled={transitioning || undefined}
								className="pressable group/swatch grid size-11 place-items-center rounded-full border-0 bg-transparent p-0 outline-hidden focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring aria-disabled:pointer-events-none"
								onClick={(event) => {
									if (transitioning || accent === option.id) return;
									const source = event.currentTarget;
									void applyAccent(option.id, source).then(() => {
										if (source.isConnected && document.activeElement !== source) {
											source.focus({ preventScroll: true });
										}
									});
								}}
							>
								<span
									className="grid size-[26px] place-items-center rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] transition-[scale,box-shadow] duration-200 ease-trace group-hover/swatch:scale-110 group-aria-pressed/swatch:shadow-[0_0_0_2px_var(--theme-surface-solid),0_0_0_3.5px_currentColor]"
									style={{ background: swatch(option), color: swatch(option) }}
									aria-hidden="true"
								>
									{accent === option.id ? (
										<svg
											viewBox="0 0 16 16"
											className="size-3 fill-none stroke-white stroke-[2.2] [stroke-linecap:round] [stroke-linejoin:round] dark:stroke-[#0a0a0c]"
										>
											<path d="m4 8.4 2.6 2.4L12 5.4" />
										</svg>
									) : null}
								</span>
							</button>
						))}
					</div>
				</MenuSurface>
			</PopoverContent>
		</Popover>
	);
}
