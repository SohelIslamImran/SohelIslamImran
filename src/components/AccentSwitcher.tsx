import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "../lib/utils";

export const accentOptions = [
	{ id: "cobalt", name: "Cobalt", color: "#2f5cff" },
	{ id: "sky", name: "Sky", color: "#42b7ff" },
	{ id: "azure", name: "Azure", color: "#1294d8" },
	{ id: "tangerine", name: "Tangerine", color: "#ff7657" },
	{ id: "violet", name: "Violet", color: "#825cff" },
	{ id: "mint", name: "Mint", color: "#18b89a" },
] as const;

const themeModes = ["light", "dark", "auto"] as const;
export type AccentId = (typeof accentOptions)[number]["id"];
export type ThemeMode = (typeof themeModes)[number];

const accentIds = accentOptions.map(({ id }) => id);
const accentStorageKey = "portfolio-accent";
const themeStorageKey = "portfolio-theme";

export const accentBootScript = `(()=>{try{const r=document.documentElement,a=localStorage.getItem("${accentStorageKey}"),m=localStorage.getItem("${themeStorageKey}"),t=${JSON.stringify(themeModes)}.includes(m)?m:"auto",d=t==="auto"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;if(${JSON.stringify(accentIds)}.includes(a))r.dataset.accent=a;r.dataset.theme=t;r.dataset.themeResolved=d;r.classList.toggle("dark",d==="dark")}catch{}})()`;

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

function updateTheme(mode: ThemeMode) {
	const nextResolvedTheme = resolvedTheme(mode);
	document.documentElement.dataset.theme = mode;
	document.documentElement.dataset.themeResolved = nextResolvedTheme;
	document.documentElement.classList.toggle("dark", nextResolvedTheme === "dark");
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

function ModeIcon({ mode }: { mode: ThemeMode }) {
	if (mode === "light") {
		return (
			<svg className="relative z-[1] size-[15px]" viewBox="0 0 20 20" aria-hidden="true">
				<circle cx="10" cy="10" r="3.25" />
				<path d="M10 1.75v2M10 16.25v2M1.75 10h2M16.25 10h2M4.17 4.17l1.42 1.42M14.41 14.41l1.42 1.42M15.83 4.17l-1.42 1.42M5.59 14.41l-1.42 1.42" />
			</svg>
		);
	}
	if (mode === "dark") {
		return (
			<svg className="relative z-[1] size-[15px]" viewBox="0 0 20 20" aria-hidden="true">
				<path d="M16.75 12.44A7 7 0 0 1 7.56 3.25a7 7 0 1 0 9.19 9.19Z" />
			</svg>
		);
	}
	return (
		<svg className="relative z-[1] size-[15px]" viewBox="0 0 20 20" aria-hidden="true">
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
	const containerRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const themeRevealSequence = useRef(0);
	const [themeReveal, setThemeReveal] = useState<{
		x: number;
		y: number;
		color: string;
		id: number;
	} | null>(null);
	const reducedMotion = useReducedMotion();

	useEffect(() => {
		if (!themeReveal) return;
		const timeout = window.setTimeout(() => {
			setThemeReveal((current) => (current?.id === themeReveal.id ? null : current));
		}, 620);
		return () => window.clearTimeout(timeout);
	}, [themeReveal]);

	useEffect(() => {
		const savedAccent = document.documentElement.dataset.accent;
		const savedTheme = document.documentElement.dataset.theme;
		if (isAccent(savedAccent)) setAccent(savedAccent);
		if (isThemeMode(savedTheme)) setTheme(savedTheme);
	}, []);

	useEffect(() => {
		const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
		const syncAutoTheme = () => {
			if (document.documentElement.dataset.theme === "auto") updateTheme("auto");
		};
		colorScheme.addEventListener("change", syncAutoTheme);
		return () => colorScheme.removeEventListener("change", syncAutoTheme);
	}, []);

	useEffect(() => {
		if (!open) return;
		panelRef.current?.focus();
		const onPointerDown = (event: PointerEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) onOpenChange(false);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			onOpenChange(false);
			triggerRef.current?.focus();
		};
		window.addEventListener("pointerdown", onPointerDown);
		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("pointerdown", onPointerDown);
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [onOpenChange, open]);

	const selectTheme = (mode: ThemeMode, source: HTMLButtonElement) => {
		if (mode === theme) {
			return;
		}
		const previousResolvedTheme = resolvedTheme(theme);
		const apply = () => {
			setTheme(mode);
			updateTheme(mode);
		};
		const rect = source.getBoundingClientRect();
		apply();
		if (reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		setThemeReveal({
			x: rect.left + rect.width / 2,
			y: rect.top + rect.height / 2,
			// Keep the previous surface above the document and peel it back from
			// the control. The new theme is applied underneath immediately, so a
			// fast second click never leaves a half-transitioned document behind.
			color: previousResolvedTheme === "dark" ? "#08111f" : "#f7f9fc",
			id: ++themeRevealSequence.current,
		});
	};

	const currentAccent = accentOptions.find(({ id }) => id === accent) ?? accentOptions[0];

	return (
		<div className="accent-switcher relative" ref={containerRef}>
			<button
				ref={triggerRef}
				type="button"
				className="appearance-trigger relative grid size-[38px] place-items-center rounded-[13px] border border-line bg-surface p-0 text-ink shadow-[inset_0_1px_color-mix(in_srgb,var(--theme-surface-solid)_82%,transparent)] transition-[transform,border-color,box-shadow] duration-180 ease-route hover:-translate-y-px active:scale-[.94]"
				aria-label={`Appearance. ${theme} mode, ${currentAccent.name} accent`}
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-controls="accent-switcher-panel"
				onClick={() => onOpenChange(!open)}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M12 3.25 19.5 8v8L12 20.75 4.5 16V8L12 3.25Z" />
					<path d="m4.8 8.15 7.2 4.6 7.2-4.6M12 12.75v8" />
				</svg>
				<span style={{ "--accent-dot": currentAccent.color } as CSSProperties} aria-hidden="true" />
			</button>

			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						ref={panelRef}
						id="accent-switcher-panel"
						className="appearance-panel absolute right-0 top-[calc(100%+11px)] z-40 w-[220px] origin-[86%_0] rounded-[18px] border border-[color-mix(in_srgb,var(--theme-surface-solid)_72%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-surface-solid)_98%,transparent),color-mix(in_srgb,var(--theme-surface-solid)_90%,var(--theme-blue-soft)))] p-2.5 shadow-[0_26px_70px_#1e385f24,inset_0_1px_color-mix(in_srgb,var(--theme-surface-solid)_78%,transparent)] backdrop-blur-[28px] backdrop-saturate-[170%]"
						role="dialog"
						aria-label="Appearance"
						tabIndex={-1}
						data-open="true"
						data-glass="true"
						initial={{ opacity: 0, y: -7, scale: 0.96 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -7, scale: 0.96 }}
						transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
					>
						<div
							className="appearance-modes relative grid grid-cols-3 gap-0.5 rounded-[12px] border border-line bg-ink/5 p-[3px]"
							data-theme={theme}
						>
							{themeModes.map((mode) => (
								<button
									key={mode}
									type="button"
									data-theme-mode={mode}
									aria-label={`${mode[0].toUpperCase()}${mode.slice(1)} appearance`}
									aria-pressed={theme === mode}
									className={cn(
										"appearance-mode relative z-[1] grid min-h-[40px] place-items-center gap-0.5 rounded-[9px] border-0 bg-transparent px-1 py-1 text-muted transition-[color,transform] duration-150 ease-route hover:text-ink focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1 active:scale-[.94]",
										theme === mode && "text-ink",
									)}
									onClick={(event) => selectTheme(mode, event.currentTarget)}
								>
									{theme === mode && (
										<motion.span
											className="appearance-indicator absolute inset-[3px] rounded-[9px] border border-surface-solid/85 bg-surface-solid shadow-[0_3px_10px_var(--theme-shadow)]"
											aria-hidden="true"
											layoutId="appearance-mode-indicator"
											transition={{ type: "spring", duration: 0.28, bounce: 0.08 }}
										/>
									)}
									<ModeIcon mode={mode} />
									<span className="appearance-mode-label relative z-[1] text-[9px] font-bold capitalize leading-none">
										{mode}
									</span>
								</button>
							))}
						</div>
						<div
							className="appearance-palette mt-2 flex justify-between gap-1 p-1"
							role="group"
							aria-label="Accent color"
						>
							{accentOptions.map((option) => (
								<button
									key={option.id}
									type="button"
									aria-label={`${option.name} accent`}
									aria-pressed={accent === option.id}
									className={cn(
										"appearance-color-button grid size-[26px] place-items-center rounded-full border border-transparent bg-transparent p-0 transition-transform duration-150 ease-route hover:scale-110 active:scale-[.94]",
										accent === option.id && "border-[var(--accent-option)]",
									)}
									style={{ "--accent-option": option.color } as CSSProperties}
									onClick={() => {
										setAccent(option.id);
										applyAccent(option.id);
									}}
								>
									<span
										className="appearance-color-dot size-4 rounded-full border-2 border-[color-mix(in_srgb,var(--theme-surface-solid)_90%,transparent)] shadow-[0_1px_4px_#0002]"
										style={{ background: "var(--accent-option)" }}
										aria-hidden="true"
									/>
								</button>
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
			{typeof document !== "undefined" && themeReveal
				? createPortal(
						<AnimatePresence initial={false}>
							<motion.div
								key={themeReveal.id}
								className="theme-reveal pointer-events-none fixed inset-0 z-[90]"
								aria-hidden="true"
								style={
									{
										"--theme-x": `${themeReveal.x}px`,
										"--theme-y": `${themeReveal.y}px`,
										background: themeReveal.color,
									} as CSSProperties
								}
								initial={{ clipPath: `circle(160vmax at ${themeReveal.x}px ${themeReveal.y}px)` }}
								animate={{ clipPath: `circle(0px at ${themeReveal.x}px ${themeReveal.y}px)` }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
								onAnimationComplete={() =>
									setThemeReveal((current) => (current?.id === themeReveal.id ? null : current))
								}
							/>
						</AnimatePresence>,
						document.body,
					)
				: null}
		</div>
	);
}
