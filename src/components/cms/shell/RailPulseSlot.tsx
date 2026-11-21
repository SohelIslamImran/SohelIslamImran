/**
 * Live-pulse slot at the top of the CMS layer rail.
 *
 * The analytics workstream replaces or overrides this slot with live visitor
 * telemetry from `getLiveVisitors`. Kept deliberately neutral here with no
 * `aria-live` region so background polling never interrupts screen readers.
 */
import { Link } from "@tanstack/react-router";
import { cn } from "../../../lib/utils";

export interface RailPulseSlotProps {
	/** Optional live visitor count supplied by the analytics integration. */
	activeCount?: number | null;
	className?: string;
}

// `/cms/analytics` is added by the parallel analytics workstream; keep a wide
// string so this component compiles both before and after that route merges.
const ANALYTICS_ROUTE: string = "/cms/analytics";

export function RailPulseSlot({ activeCount = null, className }: RailPulseSlotProps) {
	const hasCount = typeof activeCount === "number" && Number.isFinite(activeCount);
	const active = hasCount && activeCount > 0;
	const label = hasCount
		? `${activeCount} active ${activeCount === 1 ? "visitor" : "visitors"} now`
		: "Live signals";

	return (
		<Link
			to={ANALYTICS_ROUTE}
			data-slot="cms-rail-pulse"
			title={label}
			aria-label={label}
			className={cn(
				"cms-rail-pulse group/pulse flex min-h-9 items-center justify-between gap-2 rounded-[10px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_2.5%,transparent)] px-2.5 text-[12px] text-ink-soft no-underline transition-colors duration-150 hover:border-line-strong hover:bg-[color-mix(in_srgb,var(--theme-ink)_4.5%,transparent)] hover:text-foreground pointer-coarse:min-h-11",
				className,
			)}
		>
			<span className="flex min-w-0 items-center gap-2">
				<span className="relative grid size-2.5 shrink-0 place-items-center" aria-hidden="true">
					{active ? (
						<span className="absolute inset-0 rounded-full bg-success/45 motion-safe:animate-ping-soft" />
					) : null}
					<span
						className={cn(
							"relative size-2 rounded-full",
							active ? "bg-success" : "border border-line-strong bg-muted-foreground/40",
						)}
					/>
				</span>
				<span className="cms-rail-pulse-text mono-label truncate text-[10.5px] text-muted-foreground group-hover/pulse:text-foreground">
					Live now
				</span>
			</span>
			<span className="cms-rail-pulse-text font-mono text-[12px] font-medium tabular-nums text-foreground">
				{hasCount ? activeCount : "—"}
			</span>
		</Link>
	);
}
