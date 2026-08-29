import { useEffect, useRef, useState, type CSSProperties } from "react";

export const prismAccents = [
	{ id: "cobalt", name: "Cobalt", color: "#2f5cff" },
	{ id: "sky", name: "Sky", color: "#42b7ff" },
	{ id: "azure", name: "Azure", color: "#1294d8" },
	{ id: "tangerine", name: "Tangerine", color: "#ff7657" },
	{ id: "violet", name: "Violet", color: "#825cff" },
	{ id: "mint", name: "Mint", color: "#18b89a" },
] as const;

const themeModes = ["light", "dark", "auto"] as const;
export type PrismAccentId = (typeof prismAccents)[number]["id"];
export type PrismThemeMode = (typeof themeModes)[number];

const accentIds = prismAccents.map(({ id }) => id);
const accentStorageKey = "prism-route-accent";
const themeStorageKey = "prism-route-theme";

export const accentBootScript = `(()=>{try{const r=document.documentElement,a=localStorage.getItem("${accentStorageKey}"),m=localStorage.getItem("${themeStorageKey}"),t=${JSON.stringify(themeModes)}.includes(m)?m:"auto";if(${JSON.stringify(accentIds)}.includes(a))r.dataset.prismAccent=a;r.dataset.prismTheme=t;r.dataset.prismThemeResolved=t==="auto"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t}catch{}})()`;

function isPrismAccent(value: string | undefined): value is PrismAccentId {
	return accentIds.some((accent) => accent === value);
}

function isThemeMode(value: string | undefined): value is PrismThemeMode {
	return themeModes.some((mode) => mode === value);
}

function resolvedTheme(mode: PrismThemeMode): "light" | "dark" {
	return mode === "auto"
		? window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light"
		: mode;
}

function updateTheme(mode: PrismThemeMode) {
	document.documentElement.dataset.prismTheme = mode;
	document.documentElement.dataset.prismThemeResolved = resolvedTheme(mode);
	try {
		localStorage.setItem(themeStorageKey, mode);
	} catch {
		// The mode still applies for this page when storage is unavailable.
	}
}

function applyAccent(accent: PrismAccentId) {
	document.documentElement.dataset.prismAccent = accent;
	try {
		localStorage.setItem(accentStorageKey, accent);
	} catch {
		// The accent still applies for this page when storage is unavailable.
	}
}

function ModeIcon({ mode }: { mode: PrismThemeMode }) {
	if (mode === "light") {
		return (
			<svg viewBox="0 0 20 20" aria-hidden="true">
				<circle cx="10" cy="10" r="3.25" />
				<path d="M10 1.75v2M10 16.25v2M1.75 10h2M16.25 10h2M4.17 4.17l1.42 1.42M14.41 14.41l1.42 1.42M15.83 4.17l-1.42 1.42M5.59 14.41l-1.42 1.42" />
			</svg>
		);
	}
	if (mode === "dark") {
		return (
			<svg viewBox="0 0 20 20" aria-hidden="true">
				<path d="M16.75 12.44A7 7 0 0 1 7.56 3.25a7 7 0 1 0 9.19 9.19Z" />
			</svg>
		);
	}
	return (
		<svg viewBox="0 0 20 20" aria-hidden="true">
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
	const [accent, setAccent] = useState<PrismAccentId>("cobalt");
	const [theme, setTheme] = useState<PrismThemeMode>("auto");
	const containerRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const savedAccent = document.documentElement.dataset.prismAccent;
		const savedTheme = document.documentElement.dataset.prismTheme;
		if (isPrismAccent(savedAccent)) setAccent(savedAccent);
		if (isThemeMode(savedTheme)) setTheme(savedTheme);
	}, []);

	useEffect(() => {
		const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
		const syncAutoTheme = () => {
			if (document.documentElement.dataset.prismTheme === "auto") updateTheme("auto");
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

	const selectTheme = (mode: PrismThemeMode, source: HTMLButtonElement) => {
		const apply = () => {
			setTheme(mode);
			updateTheme(mode);
		};
		const transitionDocument = document as Document & {
			startViewTransition?: (update: () => void) => unknown;
		};
		if (
			!transitionDocument.startViewTransition ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
			apply();
			return;
		}
		const rect = source.getBoundingClientRect();
		document.documentElement.style.setProperty("--theme-x", `${rect.left + rect.width / 2}px`);
		document.documentElement.style.setProperty("--theme-y", `${rect.top + rect.height / 2}px`);
		transitionDocument.startViewTransition(apply);
	};

	const currentAccent = prismAccents.find(({ id }) => id === accent) ?? prismAccents[0];

	return (
		<div className="accent-switcher" ref={containerRef}>
			<button
				ref={triggerRef}
				type="button"
				className="accent-switcher__trigger"
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

			<div
				ref={panelRef}
				id="accent-switcher-panel"
				className="accent-switcher__panel"
				role="dialog"
				aria-label="Appearance"
				aria-hidden={!open}
				tabIndex={-1}
				inert={!open}
				data-open={open || undefined}
			>
				<div className="appearance-modes" data-theme={theme}>
					<span className="appearance-modes__indicator" aria-hidden="true" />
					{themeModes.map((mode) => (
						<button
							key={mode}
							type="button"
							data-theme-mode={mode}
							aria-label={`${mode[0].toUpperCase()}${mode.slice(1)} appearance`}
							aria-pressed={theme === mode}
							onClick={(event) => selectTheme(mode, event.currentTarget)}
						>
							<ModeIcon mode={mode} />
							<span>{mode}</span>
						</button>
					))}
				</div>
				<div className="accent-switcher__palette" role="group" aria-label="Accent color">
					{prismAccents.map((option) => (
						<button
							key={option.id}
							type="button"
							aria-label={`${option.name} accent`}
							aria-pressed={accent === option.id}
							style={{ "--accent-option": option.color } as CSSProperties}
							onClick={() => {
								setAccent(option.id);
								applyAccent(option.id);
							}}
						>
							<span aria-hidden="true" />
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
