import {
	useEffect,
	useId,
	useRef,
	useState,
	type CSSProperties,
	type KeyboardEvent,
	type PointerEvent as ReactPointerEvent,
} from "react";
import { useHydrated, useOffscreenPause, usePrefersReducedMotion } from "@/components/motion";
import { Tag } from "@/components/ui/portfolio";
import { cn } from "@/lib/utils";
import { LayerMini } from "./hero/LayerMinis";
import { STACK_CSS } from "./hero/stack-css";
import { traceLineFor } from "./request-trace";
import { STACK_LAYERS, type StackLayer } from "./stack-layers";

interface StackTraceProps {
	layers?: readonly StackLayer[];
	className?: string;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** The calm tour: how long each layer stays before the pulse moves on. */
const TOUR_MS = 4500;
/** "Send a request": one hop per layer, then a longer beat to land. */
const SEND_STEP_MS = 760;
const SEND_LAND_MS = 1500;
/** Reduced motion: the selection steps on this beat with nothing travelling. */
const STILL_STEP_MS = 260;

/**
 * The Stack Trace: six isometric glass planes, one per layer of his work,
 * stacked in real CSS 3D with a trace line through their centres.
 *
 * - A calm tour: each layer stays for a few seconds while the depth rail's
 *   thumb fills like a timer, then the pulse drops to the next plane and the
 *   card crossfades to it (old copy leaves toward where it now sits, new copy
 *   arrives from the other side), the counter rolls, and the trace highlight
 *   glides. It holds while the pointer or keyboard focus is on it and while
 *   off-screen, has a pause button, and stops for good once a layer is picked.
 * - The labels beside the stack are a vertical tablist (arrows, Home, End);
 *   planes are clickable and tappable too. Hovering a label only points at
 *   its layer. The selected plane lifts, lights, and its miniature comes
 *   alive. The request trace always shows all six lines; the lines the
 *   request has reached are lit.
 * - "Send a request" plays one run: a pulse travels down the trace line,
 *   layer by layer, and the inspector follows it, then it rests. With reduced
 *   motion nothing travels; the selection steps on a short beat instead.
 * - The stack tilts with the pointer and eases apart while the pointer is
 *   over it or on a sideways drag (touch too). "Pull apart" pins it wider
 *   still, with each layer's name written on its plane.
 * - Every label and panel is in the server HTML; with JS off or reduced
 *   motion it is a still, complete composition. Sizes never change.
 */
export function StackTrace({ layers = STACK_LAYERS, className }: StackTraceProps) {
	const baseId = useId();
	const count = layers.length;
	const [active, setActive] = useState(0);
	const [pinned, setPinned] = useState(false);
	/** Mouse over the 3D scene: eases the stack apart. */
	const [hovering, setHovering] = useState(false);
	const [dragging, setDragging] = useState(false);
	/** One "Send a request" run is travelling down the stack. */
	const [sending, setSending] = useState(false);
	const [runKey, setRunKey] = useState(0);
	/** A run has finished at least once: the button offers a replay. */
	const [ran, setRan] = useState(false);
	/** Mouse over a label: highlights that layer without changing the selection. */
	const [hovered, setHovered] = useState<number | null>(null);
	/** The calm tour; off for good once the visitor picks a layer. */
	const [touring, setTouring] = useState(true);
	/** Pointer or keyboard focus inside: the tour holds while someone reads. */
	const [pointerInside, setPointerInside] = useState(false);
	const [focusWithin, setFocusWithin] = useState(false);
	const hydrated = useHydrated();
	const reducedMotion = usePrefersReducedMotion();
	const rootRef = useRef<HTMLDivElement>(null);
	const rigRef = useRef<HTMLDivElement>(null);
	const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
	const suppressClick = useRef(false);
	useOffscreenPause(rootRef);

	const last = count - 1;
	const tourOn = hydrated && touring && !sending && !reducedMotion && count > 1;
	const stepMs = sending
		? reducedMotion
			? STILL_STEP_MS
			: active === last
				? SEND_LAND_MS
				: SEND_STEP_MS
		: TOUR_MS;
	const moving = (sending && !reducedMotion) || tourOn;

	useEffect(() => {
		if (!sending) return;
		const timer = window.setTimeout(() => {
			if (active < last) setActive(active + 1);
			else {
				setSending(false);
				setRan(true);
			}
		}, stepMs);
		return () => window.clearTimeout(timer);
	}, [sending, active, last, stepMs]);

	if (count === 0) return null;

	const open = pinned || hovering || dragging;

	const select = (index: number, { focus = false } = {}) => {
		const next = Math.max(0, Math.min(count - 1, index));
		setSending(false);
		setTouring(false);
		setActive(next);
		if (focus) tabRefs.current[next]?.focus();
	};

	const advanceTour = () => setActive((value) => (value + 1) % count);

	const sendRequest = () => {
		setTouring(false);
		setActive(0);
		setRunKey((value) => value + 1);
		setSending(count > 1);
	};

	const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		// In a narrow container the labels form a two-column grid: Up and Down
		// move by a row there, Left and Right by one label.
		const row = (rootRef.current?.offsetWidth ?? Infinity) <= 480 ? 2 : 1;
		let next: number;
		switch (event.key) {
			case "ArrowDown":
				next = Math.min(count - 1, index + row);
				break;
			case "ArrowRight":
				next = (index + 1) % count;
				break;
			case "ArrowUp":
				next = Math.max(0, index - row);
				break;
			case "ArrowLeft":
				next = (index - 1 + count) % count;
				break;
			case "Home":
				next = 0;
				break;
			case "End":
				next = count - 1;
				break;
			default:
				return;
		}
		event.preventDefault();
		select(next, { focus: true });
	};

	const setRigVar = (name: string, value: number) => {
		rigRef.current?.style.setProperty(name, `${value.toFixed(2)}deg`);
	};

	// Pointer tilt (mouse only): a few degrees, eased by a CSS transition.
	const onRootPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (reducedMotion || event.pointerType !== "mouse" || drag.current?.moved) return;
		const rect = event.currentTarget.getBoundingClientRect();
		const x = (event.clientX - rect.left) / rect.width - 0.5;
		const y = (event.clientY - rect.top) / rect.height - 0.5;
		setRigVar("--tilt-z", x * 10);
		setRigVar("--tilt-x", y * -8);
	};
	const resetTilt = () => {
		setRigVar("--tilt-z", 0);
		setRigVar("--tilt-x", 0);
	};

	// A sideways drag spins the stack and pulls it apart; vertical stays scroll.
	const onScenePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (reducedMotion || event.button !== 0) return;
		drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
	};
	const onScenePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		const current = drag.current;
		if (!current || current.id !== event.pointerId) return;
		const dx = event.clientX - current.x;
		if (!current.moved) {
			if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(event.clientY - current.y)) return;
			current.moved = true;
			event.currentTarget.setPointerCapture(event.pointerId);
			setDragging(true);
		}
		setRigVar("--spin", Math.max(-40, Math.min(40, dx * 0.3)));
	};
	const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
		const current = drag.current;
		if (!current || current.id !== event.pointerId) return;
		drag.current = null;
		if (!current.moved) return;
		suppressClick.current = true;
		window.setTimeout(() => {
			suppressClick.current = false;
		}, 0);
		setRigVar("--spin", 0);
		setDragging(false);
	};

	const tabId = (index: number) => `${baseId}-tab-${index}`;
	const panelId = (index: number) => `${baseId}-panel-${index}`;

	return (
		<div
			ref={rootRef}
			data-slot="stack-trace"
			className={cn("st relative min-w-0", className)}
			data-open={open ? "" : undefined}
			data-pinned={pinned ? "" : undefined}
			data-moving={moving ? "" : undefined}
			data-touring={tourOn ? "" : undefined}
			data-hold={tourOn && (pointerInside || focusWithin) ? "" : undefined}
			data-sending={sending && !reducedMotion ? "" : undefined}
			data-landing={moving && active === last ? "" : undefined}
			data-first={moving && active === 0 ? "" : undefined}
			style={
				{
					"--count": count,
					"--mid": last / 2,
					"--active": active,
					"--to": Math.min(active + 1, last),
					"--step": `${stepMs}ms`,
					"--col": Math.floor(active / 3),
					"--row": active % 3,
				} as CSSProperties
			}
			onPointerEnter={(event) => {
				if (event.pointerType === "mouse") setPointerInside(true);
			}}
			onPointerLeave={() => {
				setPointerInside(false);
				resetTilt();
			}}
			onPointerMove={onRootPointerMove}
			onFocus={(event) => {
				if (event.target instanceof HTMLElement)
					setFocusWithin(event.target.matches(":focus-visible"));
			}}
			onBlur={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null))
					setFocusWithin(false);
			}}
		>
			<style dangerouslySetInnerHTML={{ __html: STACK_CSS }} />

			<div className="st-head">
				<p className="mono-label m-0 min-w-0 text-muted-foreground">
					<span className="text-primary-text">Stack trace</span>
					<span className="st-head-sub">
						<span aria-hidden="true"> · </span>
						One request, {count === 6 ? "six" : count} layers
					</span>
				</p>
				<div className="st-actions">
					<button
						type="button"
						className="st-pull st-send"
						data-busy={sending ? "" : undefined}
						onClick={sendRequest}
					>
						<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
							<path d="M8 2.2v9.2" />
							<path d="m4.4 8 3.6 3.6L11.6 8" />
							<path d="M3 14.2h10" opacity="0.6" />
						</svg>
						<span>{sending ? "Tracing…" : ran ? "Replay request" : "Send a request"}</span>
					</button>
					<button
						type="button"
						className="st-pull"
						aria-pressed={pinned}
						onClick={() => setPinned((value) => !value)}
					>
						<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
							<path d="M8 1.8 13.5 5 8 8.2 2.5 5Z" />
							<path d="m2.5 8.4 5.5 3.2 5.5-3.2" opacity="0.7" />
							<path d="m2.5 11.6 5.5 3.2 5.5-3.2" opacity="0.45" />
						</svg>
						<span>Pull apart</span>
					</button>
				</div>
			</div>

			<div className="st-body">
				{/* Decorative 3D scene. The tablist beside it is the real control. */}
				<div
					className="st-scene"
					aria-hidden="true"
					onPointerEnter={(event) => {
						if (!reducedMotion && event.pointerType === "mouse") setHovering(true);
					}}
					onPointerLeave={() => setHovering(false)}
					onPointerDown={onScenePointerDown}
					onPointerMove={onScenePointerMove}
					onPointerUp={endDrag}
					onPointerCancel={endDrag}
				>
					<span className="st-glow" />
					<div ref={rigRef} className="st-rig" data-dragging={dragging ? "" : undefined}>
						{layers.map((layer, index) => (
							<span
								key={`shadow-${layer.id}`}
								className="st-shadow"
								data-active={index === active ? "" : undefined}
								data-floor={index === last ? "" : undefined}
								style={{ "--i": index } as CSSProperties}
							/>
						))}
						<span className="st-wire" />
						<span className="st-wire st-wire-lit" />
						{layers.map((layer, index) => (
							<div
								key={layer.id}
								className="st-plane"
								data-active={index === active ? "" : undefined}
								data-lit={index < active ? "" : undefined}
								data-hover={index === hovered ? "" : undefined}
								style={{ "--i": index } as CSSProperties}
								onClick={() => {
									if (!suppressClick.current) select(index);
								}}
							>
								<span className="st-plane-index">{pad(index + 1)}</span>
								<span className="st-plane-name">{layer.name}</span>
								<svg viewBox="0 0 100 100" className="st-mini" focusable="false">
									<LayerMini id={layer.id} />
								</svg>
							</div>
						))}
						<span key={`dot-${runKey}-${active}-${moving}`} className="st-dot">
							<span className="st-dot-core" />
						</span>
						<span key={`land-${active}`} className="st-land" />
					</div>
				</div>

				<div
					role="tablist"
					aria-orientation="vertical"
					aria-label="Layers of a product"
					className="st-tabs"
				>
					{layers.map((layer, index) => {
						const selected = index === active;
						return (
							<button
								key={layer.id}
								ref={(element) => {
									tabRefs.current[index] = element;
								}}
								type="button"
								role="tab"
								id={tabId(index)}
								aria-selected={selected}
								aria-controls={panelId(index)}
								tabIndex={selected ? 0 : -1}
								className="st-tab"
								data-active={selected ? "" : undefined}
								data-lit={index < active ? "" : undefined}
								style={{ "--i": index } as CSSProperties}
								onClick={() => select(index)}
								data-hover={index === hovered ? "" : undefined}
								onPointerEnter={(event) => {
									// Hover only points at the layer; a click, tap, or key selects it.
									if (event.pointerType === "mouse") setHovered(index);
								}}
								onPointerLeave={() => setHovered(null)}
								onKeyDown={(event) => onTabKeyDown(event, index)}
							>
								<span className="st-tab-lead" aria-hidden="true" />
								<span className="st-tab-index" aria-hidden="true">
									{pad(index + 1)}
								</span>
								<span className="st-tab-name">{layer.name}</span>
							</button>
						);
					})}
				</div>
			</div>

			<div className="st-card">
				<div className="st-card-head">
					<span className="mono-label st-count text-muted-foreground" aria-hidden="true">
						<span className="st-odo text-primary-text">
							<span className="st-odo-strip">
								{layers.map((layer, index) => (
									<span key={layer.id}>{pad(index + 1)}</span>
								))}
							</span>
						</span>
						<span>/ {pad(count)}</span>
					</span>
					{/* Depth rail: one segment per layer; the thumb glides to the selection. */}
					<span className="st-rail" aria-hidden="true">
						{layers.map((layer, index) => (
							<span
								key={layer.id}
								className="st-rail-seg"
								data-lit={index <= active ? "" : undefined}
							/>
						))}
						<span className="st-rail-thumb">
							{tourOn ? (
								<span
									key={`${runKey}-${active}`}
									className="st-rail-fill"
									onAnimationEnd={advanceTour}
								/>
							) : null}
						</span>
					</span>
					{count > 1 ? (
						<button
							type="button"
							className="st-play"
							disabled={hydrated && reducedMotion}
							onClick={() => {
								if (tourOn) {
									setTouring(false);
									return;
								}
								setSending(false);
								setPointerInside(false);
								setFocusWithin(false);
								setTouring(true);
							}}
						>
							{tourOn ? (
								<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
									<path
										d="M3.5 2.5v7M8.5 2.5v7"
										stroke="currentColor"
										strokeWidth="1.6"
										strokeLinecap="round"
									/>
								</svg>
							) : (
								<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
									<path d="M3.5 2.2v7.6L9.8 6z" fill="currentColor" />
								</svg>
							)}
							<span className="sr-only">
								{tourOn ? "Pause the layer tour" : "Play the layer tour"}
							</span>
						</button>
					) : null}
				</div>
				<div className="st-panels">
					{layers.map((layer, index) => {
						const selected = index === active;
						return (
							<div
								key={layer.id}
								role="tabpanel"
								id={panelId(index)}
								aria-labelledby={tabId(index)}
								tabIndex={selected ? 0 : -1}
								className="st-panel"
								inert={!selected}
								data-active={selected ? "" : undefined}
								data-pos={index < active ? "before" : index > active ? "after" : undefined}
							>
								<p className="st-panel-title">{layer.name}</p>
								<p className="st-panel-copy">{layer.sentence}</p>
								<ul aria-label={`${layer.name} tools`} className="st-panel-tools">
									{layer.tools.map((tool) => (
										<li key={tool}>
											<Tag>{tool}</Tag>
										</li>
									))}
								</ul>
							</div>
						);
					})}
				</div>
				<ol className="st-log" aria-label="Request trace">
					{layers.map((layer, index) => {
						const trace = traceLineFor(layer.id, layer.name);
						return (
							<li
								key={layer.id}
								className="st-log-line"
								data-lit={index <= active ? "" : undefined}
								data-active={index === active ? "" : undefined}
								data-now={sending && index === active ? "" : undefined}
								aria-current={index === active ? "step" : undefined}
							>
								<span className="st-log-i" aria-hidden="true">
									{pad(index + 1)}
								</span>
								<span className="st-log-k">{trace.verb}</span>{" "}
								<span className="st-log-d">{trace.detail}</span>
							</li>
						);
					})}
				</ol>
				<p className="sr-only" role="status">
					{sending
						? "Tracing a request through the stack."
						: ran
							? `The request reached ${layers[last]?.name ?? "the last layer"}.`
							: ""}
				</p>
			</div>
		</div>
	);
}
