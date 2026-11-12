import { useId, useRef, useState, type CSSProperties } from "react";
import type { ExperienceContent } from "../../../types/content";
import { useOffscreenPause } from "@/components/motion";
import { cn } from "@/lib/utils";
import {
	CAREER_LAYERS,
	highlightsByLayer,
	layersTouched,
	toolsForLayer,
	type CareerLayerId,
} from "./career-layers";

/**
 * The current role as a web product taken apart: a browser window in front,
 * and the API, data, access, infrastructure, and release layers fanned out
 * behind it. A request pulse travels from the window to the back. Choosing a
 * layer (click, tap, or arrow keys) pulls its plane out and shows the
 * published tools and highlight for it. The 3D art is decorative; the
 * chips and the text under them carry the meaning.
 */
export function WebStack({
	role,
	host,
	className,
}: {
	role: ExperienceContent;
	/** Hostname shown in the window's address bar, from the product link. */
	host?: string;
	className?: string;
}) {
	const panelId = useId();
	const sceneRef = useRef<HTMLDivElement>(null);
	useOffscreenPause(sceneRef);
	const touched = layersTouched(role);
	const layers = CAREER_LAYERS.filter((layer) => touched.includes(layer.id));
	const highlights = highlightsByLayer(role);
	const [selected, setSelected] = useState<CareerLayerId>(layers[0]?.id ?? "interface");
	const buttons = useRef(new Map<CareerLayerId, HTMLButtonElement>());
	if (layers.length === 0) return null;
	const selectedIndex = Math.max(
		0,
		layers.findIndex((layer) => layer.id === selected),
	);
	const tools = toolsForLayer(role, selected);
	const highlight = highlights[selected];

	const move = (step: number) => {
		const next = layers[(selectedIndex + step + layers.length) % layers.length];
		if (!next) return;
		setSelected(next.id);
		buttons.current.get(next.id)?.focus();
	};

	return (
		<div className={cn("grid min-w-0 gap-6", className)}>
			<div ref={sceneRef} className="webstack" aria-hidden="true" data-par="1">
				<div
					className="webstack-rig"
					style={{ "--count": layers.length, "--sel": selectedIndex } as CSSProperties}
				>
					{layers
						.map((layer, index) => ({ layer, index }))
						.reverse()
						.map(({ layer, index }) =>
							index === 0 ? (
								<div
									key={layer.id}
									className="webstack-window"
									data-on={selectedIndex === 0 ? "" : undefined}
									style={{ "--i": 0 } as CSSProperties}
								>
									<div className="webstack-chrome">
										<span />
										<span />
										<span />
										<span className="webstack-url">{host ?? ""}</span>
									</div>
									<div className="webstack-page">
										<span className="webstack-nav" />
										<span className="webstack-hero" />
										<span className="webstack-line w-[78%]" />
										<span className="webstack-line w-[56%]" />
										<span className="webstack-cards">
											<span />
											<span />
											<span />
										</span>
									</div>
								</div>
							) : (
								<div
									key={layer.id}
									className="webstack-plane"
									data-on={selectedIndex === index ? "" : undefined}
									style={{ "--i": index } as CSSProperties}
								>
									<span className="mono-label">{layer.label}</span>
								</div>
							),
						)}
					<span className="webstack-pulse" />
				</div>
			</div>

			<div className="grid min-w-0 gap-3">
				<div
					role="tablist"
					aria-label="Layers of the work"
					className="flex min-w-0 flex-wrap gap-1.5"
				>
					{layers.map((layer, index) => (
						<button
							key={layer.id}
							ref={(element) => {
								if (element) buttons.current.set(layer.id, element);
								else buttons.current.delete(layer.id);
							}}
							type="button"
							role="tab"
							aria-selected={layer.id === selected}
							aria-controls={panelId}
							tabIndex={layer.id === selected ? 0 : -1}
							onClick={() => setSelected(layer.id)}
							onPointerEnter={(event) => {
								if (event.pointerType === "mouse") setSelected(layer.id);
							}}
							onKeyDown={(event) => {
								if (event.key === "ArrowRight" || event.key === "ArrowDown") {
									event.preventDefault();
									move(1);
								} else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
									event.preventDefault();
									move(-1);
								} else if (event.key === "Home") {
									event.preventDefault();
									move(-selectedIndex);
								} else if (event.key === "End") {
									event.preventDefault();
									move(layers.length - 1 - selectedIndex);
								}
							}}
							className={cn(
								"pressable inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 font-mono text-[12px] tracking-[0.04em] transition-[background-color,border-color,color,scale] duration-200",
								layer.id === selected
									? "border-transparent bg-primary-soft text-primary-text"
									: "border-line text-muted-foreground pointer-fine:hover:text-foreground",
							)}
						>
							<span className="text-[10px] opacity-70">{String(index + 1).padStart(2, "0")}</span>
							{layer.label}
						</button>
					))}
				</div>
				<div
					id={panelId}
					role="tabpanel"
					aria-label={layers[selectedIndex]?.label}
					className="min-h-[4.75rem] min-w-0"
				>
					{highlight ? (
						<p className="m-0 max-w-[58ch] text-[15.5px] leading-[1.5] text-ink-soft">
							{highlight}
						</p>
					) : null}
					{tools.length > 0 ? (
						<p className="mt-1.5 mb-0 font-mono text-[12.5px] text-muted-foreground">
							{tools.join(" · ")}
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}
