import { Link } from "@tanstack/react-router";
import { cn } from "../../../lib/utils";

import { useLiveVisitors } from "../analytics/LiveVisitors";

export function RailPulseSlot({
	className,
	onNavigate,
}: {
	className?: string;
	onNavigate?: () => void;
}) {
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
			preload="intent"
			resetScroll={false}
			onClick={onNavigate}
			data-slot="cms-rail-pulse"
			title={label}
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
		</Link>
	);
}
