import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "./ui/popover";
import { MenuIndicator, MenuSurface } from "./ui/portfolio";

export const accentOptions = [
	{ id: "cobalt", name: "Cobalt", color: "#2f5cff" },
	{ id: "sky", name: "Sky", color: "#0f78b3" },
	{ id: "azure", name: "Azure", color: "#0873aa" },
	{ id: "tangerine", name: "Tangerine", color: "#c94f31" },
	{ id: "violet", name: "Violet", color: "#7044e8" },
	{ id: "mint", name: "Mint", color: "#087a68" },
] as const;

const themeModes = ["light", "dark", "auto"] as const;
export type AccentId = (typeof accentOptions)[number]["id"];
export type ThemeMode = (typeof themeModes)[number];

const accentIds = accentOptions.map(({ id }) => id);
const accentStorageKey = "portfolio-accent";
const themeStorageKey = "portfolio-theme";

export const accentBootScript = `(()=>{try{const r=document.documentElement,a=localStorage.getItem("${accentStorageKey}"),m=localStorage.getItem("${themeStorageKey}"),t=${JSON.stringify(themeModes)}.includes(m)?m:"auto",d=t==="auto"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;if(${JSON.stringify(accentIds)}.includes(a))r.dataset.accent=a;r.dataset.theme=t;r.dataset.themeResolved=d;r.classList.toggle("dark",d==="dark");document.querySelector('meta[name="theme-color"]')?.setAttribute("content",d==="dark"?"#08111f":"#f7f9fc")}catch{}})()`;

function isAccent(value: string | undefined): value is AccentId {
	return accentIds.some((accent) => accent === value);
}

function isThemeMode(value: string | undefined): value is ThemeMode {
	return themeModes.some((mode) => mode === value);
}

function resolvedTheme(mode: ThemeMode): "light" | "dark" {
	return mode === "auto"
		? window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light"
		: mode;
}

function syncThemeColor(theme: "light" | "dark") {
	document
		.querySelector('meta[name="theme-color"]')
		?.setAttribute("content", theme === "dark" ? "#08111f" : "#f7f9fc");
}

function updateTheme(mode: ThemeMode) {
	const nextResolvedTheme = resolvedTheme(mode);
	document.documentElement.dataset.theme = mode;
	document.documentElement.dataset.themeResolved = nextResolvedTheme;
	document.documentElement.classList.toggle("dark", nextResolvedTheme === "dark");
	syncThemeColor(nextResolvedTheme);
	try {
		localStorage.setItem(themeStorageKey, mode);
	} catch {
		// The mode still applies for this page when storage is unavailable.
	}
}

function applyAccent(accent: AccentId) {
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

function ModeIcon({ mode }: { mode: ThemeMode }) {
	if (mode === "light") {
		return (
			<svg
				className="size-4 fill-none stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]"
				viewBox="0 0 20 20"
				aria-hidden="true"
			>
				<circle cx="10" cy="10" r="3.25" />
				<path d="M10 1.75v2M10 16.25v2M1.75 10h2M16.25 10h2M4.17 4.17l1.42 1.42M14.41 14.41l1.42 1.42M15.83 4.17l-1.42 1.42M5.59 14.41l-1.42 1.42" />
			</svg>
		);
	}
	if (mode === "dark") {
		return (
			<svg
				className="size-4 fill-none stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]"
				viewBox="0 0 20 20"
				aria-hidden="true"
			>
				<path d="M16.75 12.44A7 7 0 0 1 7.56 3.25a7 7 0 1 0 9.19 9.19Z" />
			</svg>
		);
	}
	return (
		<svg
			className="size-4 fill-none stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]"
			viewBox="0 0 20 20"
			aria-hidden="true"
		>
			<rect x="2.25" y="3.25" width="15.5" height="11" rx="2" />
			<path d="M7 17h6M10 14.25V17M10 5.25v7" />
		</svg>
	);
}

interface AccentSwitcherProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AccentSwitcher({ open, onOpenChange }: AccentSwitcherProps) {
	const [accent, setAccent] = useState<AccentId>("cobalt");
	const [theme, setTheme] = useState<ThemeMode>("auto");
	const themeRef = useRef<ThemeMode>("auto");
	const activeTransitionRef = useRef<ReturnType<
		NonNullable<ViewTransitionDocument["startViewTransition"]>
	> | null>(null);
	const fallbackTimerRef = useRef<number | null>(null);
	const [themeTransitioning, setThemeTransitioning] = useState(false);
	const reducedMotion = useReducedMotion();

	useEffect(() => {
		const savedAccent = document.documentElement.dataset.accent;
		const savedTheme = document.documentElement.dataset.theme;
		if (isAccent(savedAccent)) setAccent(savedAccent);
		if (isThemeMode(savedTheme)) {
			themeRef.current = savedTheme;
			setTheme(savedTheme);
		}
	}, []);

	useEffect(() => {
		return () => {
			activeTransitionRef.current?.skipTransition();
			if (fallbackTimerRef.current !== null) window.clearTimeout(fallbackTimerRef.current);
		};
	}, []);

	useEffect(() => {
		const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
		const syncAutoTheme = () => {
			if (document.documentElement.dataset.theme === "auto") {
				themeRef.current = "auto";
				setTheme("auto");
				updateTheme("auto");
			}
		};
		colorScheme.addEventListener("change", syncAutoTheme);
		return () => colorScheme.removeEventListener("change", syncAutoTheme);
	}, []);

	const selectTheme = (mode: ThemeMode, source: HTMLButtonElement) => {
		if (mode === themeRef.current) return;
		themeRef.current = mode;
		const apply = () => {
			setTheme(mode);
			updateTheme(mode);
		};
		const documentWithViewTransition = document as ViewTransitionDocument;
		const root = document.documentElement;
		const clearFallbackTransition = () => {
			if (fallbackTimerRef.current !== null) {
				window.clearTimeout(fallbackTimerRef.current);
				fallbackTimerRef.current = null;
			}
			if (root.dataset.themeTransitioning === "fallback") delete root.dataset.themeTransitioning;
			root.style.removeProperty("--theme-transition-from");
			setThemeTransitioning(false);
		};
		if (reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			clearFallbackTransition();
			apply();
			return;
		}
		if (!documentWithViewTransition.startViewTransition) {
			clearFallbackTransition();
			root.style.setProperty(
				"--theme-transition-from",
				getComputedStyle(document.body).backgroundColor,
			);
			root.dataset.themeTransitioning = "fallback";
			setThemeTransitioning(true);
			apply();
			fallbackTimerRef.current = window.setTimeout(clearFallbackTransition, 420);
			return;
		}
		activeTransitionRef.current?.skipTransition();
		activeTransitionRef.current = null;
		clearFallbackTransition();
		const rect = source.getBoundingClientRect();
		root.style.setProperty("--theme-toggle-x", `${rect.left + rect.width / 2}px`);
		root.style.setProperty("--theme-toggle-y", `${rect.top + rect.height / 2}px`);
		root.dataset.themeTransitioning = "view";
		setThemeTransitioning(true);
		try {
			const transition = documentWithViewTransition.startViewTransition(apply);
			activeTransitionRef.current = transition;
			const clearTransition = () => {
				if (activeTransitionRef.current !== transition) return;
				activeTransitionRef.current = null;
				if (root.dataset.themeTransitioning === "view") delete root.dataset.themeTransitioning;
				root.style.removeProperty("--theme-toggle-x");
				root.style.removeProperty("--theme-toggle-y");
				setThemeTransitioning(false);
			};
			void transition.finished.then(clearTransition, clearTransition);
		} catch {
			delete root.dataset.themeTransitioning;
			root.style.removeProperty("--theme-toggle-x");
			root.style.removeProperty("--theme-toggle-y");
			setThemeTransitioning(false);
			apply();
		}
	};

	const currentAccent = accentOptions.find(({ id }) => id === accent) ?? accentOptions[0];

	return (
		<>
			<Popover open={open} onOpenChange={onOpenChange}>
				<PopoverTrigger
					className="relative grid size-[38px] place-items-center rounded-[13px] border border-border/60 bg-surface p-0 text-foreground shadow-[0_8px_20px_var(--theme-accent-shadow),inset_0_1px_var(--theme-highlight)] transition-[border-color,box-shadow,transform,translate,scale,rotate,background-color] duration-200 ease-route hover:border-primary/40 hover:bg-surface-solid hover:shadow-accent focus-visible:outline-2 focus-visible:outline-ring active:scale-[.94]"
					aria-label={`Appearance. ${theme} mode, ${currentAccent.name} accent`}
					aria-haspopup="dialog"
				>
					<svg className="size-[19px]" viewBox="0 0 24 24" aria-hidden="true">
						<path
							d="M12 3.25 19.5 8v8L12 20.75 4.5 16V8L12 3.25Z"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="1.45"
						/>
						<path
							d="m4.8 8.15 7.2 4.6 7.2-4.6M12 12.75v8"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="1.45"
						/>
					</svg>
					<span
						className="absolute bottom-1 right-1 size-[9px] rounded-full border-2 border-surface-solid shadow-[0_1px_5px_var(--theme-accent-shadow)]"
						style={{ background: currentAccent.color } as CSSProperties}
						aria-hidden="true"
					/>
				</PopoverTrigger>
				<PopoverContent
					align="end"
					sideOffset={10}
					className="w-auto rounded-none border-0 bg-transparent p-0 shadow-none"
				>
					<MenuSurface className="flex w-[min(232px,calc(100vw-32px))] flex-col gap-2.5 p-2.5">
						<PopoverHeader className="sr-only">
							<PopoverTitle>Appearance</PopoverTitle>
						</PopoverHeader>
						<div
							className="grid grid-cols-3 gap-1 rounded-[13px] border-0 bg-muted/55 p-1 shadow-[inset_0_1px_var(--theme-highlight)]"
							role="group"
							aria-label="Theme mode"
						>
							{themeModes.map((mode) => (
								<button
									key={mode}
									type="button"
									aria-label={`${mode[0].toUpperCase()}${mode.slice(1)} appearance`}
									aria-pressed={theme === mode}
									disabled={themeTransitioning}
									className="relative grid min-h-11 place-items-center gap-0.5 rounded-[10px] border-0 bg-transparent px-1 py-1 text-muted-foreground transition-[color,transform,translate,scale,rotate] duration-180 ease-route hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:scale-[.94] aria-pressed:text-foreground"
									onClick={(event) => selectTheme(mode, event.currentTarget)}
								>
									{theme === mode ? (
										<MenuIndicator
											className="rounded-[10px] shadow-[0_3px_10px_var(--theme-accent-shadow),inset_0_1px_var(--theme-highlight)]"
											layoutId="appearance-mode-indicator"
											transition={{ type: "spring", duration: 0.28, bounce: 0.04 }}
										/>
									) : null}
									<span className="relative z-[1]">
										<ModeIcon mode={mode} />
									</span>
									<span className="relative z-[1] text-[9px] font-bold capitalize leading-none">
										{mode}
									</span>
								</button>
							))}
						</div>
						<div
							className="mt-2 flex justify-between gap-0 p-1"
							role="group"
							aria-label="Accent color"
						>
							{accentOptions.map((option) => (
								<button
									key={option.id}
									type="button"
									aria-label={`${option.name} accent`}
									aria-pressed={accent === option.id}
									disabled={themeTransitioning}
									className="grid size-[34px] shrink-0 place-items-center rounded-full border-0 p-0 transition-[transform,translate,scale,rotate,box-shadow] duration-200 ease-route hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring active:scale-[.94] aria-pressed:ring-2 aria-pressed:ring-primary/25 aria-pressed:ring-offset-1 aria-pressed:ring-offset-transparent disabled:pointer-events-none"
									style={{ color: option.color } as CSSProperties}
									onClick={() => {
										setAccent(option.id);
										applyAccent(option.id);
									}}
								>
									<span
										className="size-[18px] rounded-full border-2 border-surface-solid shadow-[0_2px_6px_var(--theme-accent-shadow)]"
										style={{ background: option.color }}
										aria-hidden="true"
									/>
								</button>
							))}
						</div>
					</MenuSurface>
				</PopoverContent>
			</Popover>
		</>
	);
}
