import { Link } from "@tanstack/react-router";
import { cn } from "../../../lib/utils";

import { useLiveVisitors } from "../analytics/LiveVisitors";

export function RailPulseSlot({ className }: { className?: string }) {
	const { data, paused } = useLiveVisitors();
	const activeCount = data?.live.count ?? null;
	const hasCount = activeCount !== null;
	const active = hasCount && activeCount > 0;
	const label = hasCount
		? `${activeCount} active ${activeCount === 1 ? "visitor" : "visitors"} now`
		: "Live signals";

	return (
		<Link
			to="/cms/analytics"
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
					{active && !paused ? (
						<span className="absolute inset-0 rounded-full bg-success/45 motion-safe:animate-ping-soft motion-reduce:hidden" />
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
