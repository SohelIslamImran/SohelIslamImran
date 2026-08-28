import { useEffect, useRef, useState, type CSSProperties } from "react";

export const prismAccents = [
	{ id: "cobalt", name: "Cobalt", color: "#2f5cff" },
	{ id: "sky", name: "Sky", color: "#42b7ff" },
	{ id: "azure", name: "Azure", color: "#1294d8" },
	{ id: "tangerine", name: "Tangerine", color: "#ff7657" },
	{ id: "violet", name: "Violet", color: "#825cff" },
	{ id: "mint", name: "Mint", color: "#18b89a" },
] as const;

export type PrismAccentId = (typeof prismAccents)[number]["id"];

const accentIds = prismAccents.map(({ id }) => id);
const storageKey = "prism-route-accent";

export const accentBootScript = `(()=>{try{const a=localStorage.getItem("${storageKey}");if(${JSON.stringify(accentIds)}.includes(a))document.documentElement.dataset.prismAccent=a}catch{}})()`;

function isPrismAccent(value: string | undefined): value is PrismAccentId {
	return accentIds.some((accent) => accent === value);
}

function applyAccent(accent: PrismAccentId) {
	document.documentElement.dataset.prismAccent = accent;
	try {
		localStorage.setItem(storageKey, accent);
	} catch {
		// The selection still applies for this page when storage is unavailable.
	}
}

interface AccentSwitcherProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AccentSwitcher({ open, onOpenChange }: AccentSwitcherProps) {
	const [accent, setAccent] = useState<PrismAccentId>("cobalt");
	const containerRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		const savedAccent = document.documentElement.dataset.prismAccent;
		if (isPrismAccent(savedAccent)) setAccent(savedAccent);
	}, []);

	useEffect(() => {
		if (!open) return;
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

	const currentAccent = prismAccents.find(({ id }) => id === accent) ?? prismAccents[0];

	return (
		<div className="accent-switcher" ref={containerRef}>
			<button
				ref={triggerRef}
				type="button"
				className="accent-switcher__trigger"
				aria-label={`Change accent. Current accent: ${currentAccent.name}`}
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
				id="accent-switcher-panel"
				className="accent-switcher__panel"
				role="dialog"
				aria-label="Accent theme"
				aria-hidden={!open}
				inert={!open}
				data-open={open || undefined}
			>
				<div className="accent-switcher__heading">
					<span>Accent</span>
					<strong>Choose your signal.</strong>
				</div>
				<div className="accent-switcher__palette" role="group" aria-label="Accent color">
					{prismAccents.map((option) => (
						<button
							key={option.id}
							type="button"
							aria-pressed={accent === option.id}
							style={{ "--accent-option": option.color } as CSSProperties}
							onClick={() => {
								setAccent(option.id);
								applyAccent(option.id);
							}}
						>
							<i aria-hidden="true" />
							<span>{option.name}</span>
							<svg viewBox="0 0 16 16" aria-hidden="true">
								<path d="m3.5 8.2 2.7 2.7 6.3-6.3" />
							</svg>
						</button>
					))}
				</div>
				<p className="accent-switcher__status" aria-live="polite">
					{currentAccent.name} is active across the site.
				</p>
			</div>
		</div>
	);
}
