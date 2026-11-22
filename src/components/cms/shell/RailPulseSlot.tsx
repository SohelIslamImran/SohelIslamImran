import { useRouterState } from "@tanstack/react-router";
import { cn } from "../../../lib/utils";

import { useLiveVisitors } from "../analytics/LiveVisitors";
import { RailRouterLink } from "./RailRouterLink";
import { RailTooltip } from "./RailTooltip";

export function RailPulseSlot({
	className,
	onNavigate,
}: {
	className?: string;
	onNavigate?: () => void;
}) {
	const onAnalytics = useRouterState({
		select: (state) => state.matches.at(-1)?.routeId === "/cms/analytics",
	});
	const { data, paused } = useLiveVisitors();
	const activeCount = data?.live.count ?? null;
	const hasCount = activeCount !== null;
	const active = hasCount && activeCount > 0;
	const label = hasCount
		? `${activeCount} active ${activeCount === 1 ? "visitor" : "visitors"} now`
		: "Live signals";

	return (
		<RailTooltip label={label} disabled={!!onNavigate}>
			<RailRouterLink
				to="/cms/analytics"
				preload="intent"
				viewTransition={onNavigate ? false : undefined}
				onClick={(event) => {
					if (
						event.button !== 0 ||
						event.metaKey ||
						event.ctrlKey ||
						event.shiftKey ||
						event.altKey
					)
						return;
					onNavigate?.();
					if (onAnalytics) {
						event.preventDefault();
						window.scrollTo({ top: 0, behavior: "instant" });
					}
				}}
				data-slot="cms-rail-pulse"
				data-empty={activeCount === 0 || undefined}
				aria-label={label}
				className={cn(
					"cms-rail-pulse cms-chrome-control cms-press relative flex min-h-9 items-center gap-2 rounded-[10px] px-3 text-[12px] text-ink-soft no-underline pointer-coarse:min-h-11",
					className,
				)}
			>
				<span className="flex min-w-0 items-center gap-2.5">
					<span className="relative grid size-2.5 shrink-0 place-items-center" aria-hidden="true">
						{active && !paused ? (
							<span className="cms-live-pulse absolute inset-0 rounded-full bg-success/40" />
						) : null}
						<span
							className={cn(
								"relative size-2 rounded-full",
								active ? "bg-success" : "border border-line-strong bg-muted-foreground/40",
							)}
						/>
					</span>
					<span className="cms-rail-pulse-text whitespace-nowrap text-[12px] font-medium">
						Live now
					</span>
				</span>
				<span className="cms-rail-pulse-text absolute right-3 font-mono text-[12px] font-medium tabular-nums text-foreground">
					<span key={activeCount ?? "unknown"} className="cms-count-tick">
						{hasCount ? activeCount : "—"}
					</span>
				</span>
			</RailRouterLink>
		</RailTooltip>
	);
}
