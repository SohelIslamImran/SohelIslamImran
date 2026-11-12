import { useEffect, useState, useSyncExternalStore } from "react";
import { Kbd } from "../ui/portfolio";

/*
 * Easter egg: "x-ray". Type x-r-a-y anywhere outside a text field (or run
 * `xray` in the palette terminal) and every box on the page shows its outline,
 * the layout behind the interface. Esc or typing it again turns it off. Purely
 * visual; nothing moves, so it is the same with reduced motion.
 */

const SECRET = "xray";

export function isXrayOn(): boolean {
	return typeof document !== "undefined" && document.documentElement.hasAttribute("data-xray");
}

export function setXray(on: boolean) {
	document.documentElement.toggleAttribute("data-xray", on);
}

export function toggleXray(): boolean {
	const next = !isXrayOn();
	setXray(next);
	return next;
}

function subscribe(onChange: () => void) {
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-xray"] });
	return () => observer.disconnect();
}

function isEditable(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	return (
		target.isContentEditable ||
		target.tagName === "INPUT" ||
		target.tagName === "TEXTAREA" ||
		target.tagName === "SELECT"
	);
}

/**
 * Listens for the key sequence and renders the small "x-ray on" badge with a
 * polite announcement. Mounted once by the command palette provider.
 */
export function XrayEasterEgg() {
	const on = useSyncExternalStore(subscribe, isXrayOn, () => false);
	const [announcement, setAnnouncement] = useState("");

	useEffect(() => {
		let typed = "";
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
			if (event.key === "Escape" && isXrayOn() && !document.querySelector("[role=dialog]")) {
				setXray(false);
				return;
			}
			if (isEditable(event.target) || event.key.length !== 1) {
				typed = "";
				return;
			}
			typed = (typed + event.key.toLowerCase()).slice(-SECRET.length);
			if (typed === SECRET) {
				typed = "";
				toggleXray();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const [seen, setSeen] = useState(false);
	useEffect(() => {
		if (on) setSeen(true);
		if (on || seen) {
			setAnnouncement(on ? "X-ray on. Every box on the page is outlined." : "X-ray off.");
		}
		// `seen` only gates the first "off" message.
	}, [on]);

	return (
		<>
			<p role="status" aria-live="polite" className="sr-only">
				{announcement}
			</p>
			{on ? (
				<div
					data-slot="xray-badge"
					className="glass fixed top-[calc(var(--dock-inset-top)+4px)] left-[max(12px,env(safe-area-inset-left))] z-(--z-overlay) flex items-center gap-2.5 rounded-full py-1.5 pr-1.5 pl-3.5 text-[12px] text-ink-soft motion-safe:animate-rise-in max-md:top-[max(10px,env(safe-area-inset-top))]"
				>
					<span className="mono-label text-primary-text">X-ray</span>
					<span className="max-sm:hidden">The boxes behind the interface.</span>
					<button
						type="button"
						onClick={() => setXray(false)}
						className="pressable inline-flex min-h-8 items-center gap-1.5 rounded-full border-0 pointer-coarse:min-h-11 bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)] px-2.5 text-[12px] font-medium text-foreground outline-none hover:bg-[color-mix(in_srgb,var(--theme-ink)_10%,transparent)] focus-visible:outline-2 focus-visible:outline-ring"
					>
						Turn off <Kbd className="max-md:hidden">esc</Kbd>
					</button>
				</div>
			) : null}
		</>
	);
}
