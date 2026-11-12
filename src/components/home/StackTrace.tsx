import {
	useId,
	useRef,
	useState,
	type CSSProperties,
	type KeyboardEvent,
	type PointerEvent as ReactPointerEvent,
} from "react";
import {
	prefersReducedMotion,
	useHydrated,
	useOffscreenPause,
	usePrefersReducedMotion,
} from "@/components/motion";
import { Tag } from "@/components/ui/portfolio";
import { cn } from "@/lib/utils";
import { LayerMini } from "./hero/LayerMinis";
import { STACK_CSS } from "./hero/stack-css";
import { STACK_LAYERS, type StackLayer } from "./stack-layers";

interface StackTraceProps {
	layers?: readonly StackLayer[];
	className?: string;
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * The Stack Trace: six isometric glass planes, one per layer of his work,
 * stacked in real CSS 3D with a trace line through their centres.
 *
 * - The labels beside the stack are a vertical tablist (arrows, Home, End);
 *   planes are clickable and tappable too. The selected plane lifts, lights,
 *   and its miniature comes alive; the card below says what he does there.
 * - Autoplay walks the layers. A request pulse travels down the trace line
 *   in step with the progress bar and lands at Release. It pauses on hover,
 *   focus, off-screen, and for good once the visitor picks a layer; it never
 *   runs with reduced motion.
 * - The stack tilts with the pointer and pulls apart on hover, on a sideways
 *   drag (touch too), or with the "Pull apart" control.
 * - Every label and panel is in the server HTML; with JS off or reduced
 *   motion it is a still, complete composition. Sizes never change.
 */
export function StackTrace({ layers = STACK_LAYERS, className }: StackTraceProps) {
	const baseId = useId();
	const count = layers.length;
	const [active, setActive] = useState(0);
	const [autoplay, setAutoplay] = useState(true);
	const [pinned, setPinned] = useState(false);
	const [hovering, setHovering] = useState(false);
	const [focusWithin, setFocusWithin] = useState(false);
	const [dragging, setDragging] = useState(false);
	const hydrated = useHydrated();
	const reducedMotion = usePrefersReducedMotion();
	const rootRef = useRef<HTMLDivElement>(null);
	const rigRef = useRef<HTMLDivElement>(null);
	const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
	const suppressClick = useRef(false);
	useOffscreenPause(rootRef);

	if (count === 0) return null;

	const last = count - 1;
	const running = hydrated && autoplay && !reducedMotion && count > 1;
	const open = pinned || hovering || dragging;

	const select = (index: number, { focus = false } = {}) => {
		const next = Math.max(0, Math.min(count - 1, index));
		setAutoplay(false);
		setActive(next);
		if (focus) tabRefs.current[next]?.focus();
	};

	const advance = () => {
		if (prefersReducedMotion()) return;
		setActive((current) => (current + 1) % count);
	};

	const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		let next: number;
		switch (event.key) {
			case "ArrowDown":
			case "ArrowRight":
				next = (index + 1) % count;
				break;
			case "ArrowUp":
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
		if (event.pointerType !== "mouse" || drag.current?.moved) return;
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
		if (event.button !== 0) return;
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
			setAutoplay(false);
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
			data-autoplay={running ? "" : undefined}
			data-hold={hovering || focusWithin ? "" : undefined}
			data-landing={running && active === last ? "" : undefined}
			data-first={running && active === 0 ? "" : undefined}
			style={
				{
					"--count": count,
					"--mid": last / 2,
					"--active": active,
					"--to": Math.min(active + 1, last),
				} as CSSProperties
			}
			onPointerEnter={(event) => {
				if (event.pointerType === "mouse") setHovering(true);
			}}
			onPointerLeave={() => {
				setHovering(false);
				resetTilt();
			}}
			onPointerMove={onRootPointerMove}
			onFocus={() => setFocusWithin(true)}
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

			<div className="st-body">
				{/* Decorative 3D scene. The tablist beside it is the real control. */}
				<div
					className="st-scene"
					aria-hidden="true"
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
								style={{ "--i": index } as CSSProperties}
								onClick={() => {
									if (!suppressClick.current) select(index);
								}}
							>
								<span className="st-plane-index">{pad(index + 1)}</span>
								<svg viewBox="0 0 100 100" className="st-mini" focusable="false">
									<LayerMini id={layer.id} />
								</svg>
							</div>
						))}
						<span key={`dot-${active}-${running}`} className="st-dot">
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
					<span className="mono-label text-muted-foreground" aria-hidden="true">
						<span className="text-primary-text">{pad(active + 1)}</span> / {pad(count)}
					</span>
					<span className="st-progress" aria-hidden="true">
						{running ? (
							<span key={active} className="st-progress-fill" onAnimationEnd={advance} />
						) : null}
					</span>
					{count > 1 ? (
						<button
							type="button"
							className="st-play"
							onClick={() => setAutoplay((value) => !value)}
							disabled={hydrated && reducedMotion}
						>
							{running ? (
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
								{running ? "Pause the layer tour" : "Play the layer tour"}
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
								data-active={selected ? "" : undefined}
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
			</div>
		</div>
	);
}
