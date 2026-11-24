/** One revision in the History timeline: "r3 · Published · 6h ago". */
import { motion } from "motion/react";
import { useLiveReducedMotion } from "../shell/use-live-reduced-motion";
import { cn } from "../../../lib/utils";
import type { RevisionSummary } from "../../../server/cms-storage.server";
import { RelativeTime } from "../analytics/RelativeTime";
import { staggerStyle } from "../analytics/Widgets";
import { REDUCED, SPRING_MOVE } from "../motion";

export function revisionStateLabel(
	item: Pick<RevisionSummary, "kind">,
	isCurrentLive: boolean,
	isCurrentDraft: boolean,
): string {
	if (isCurrentLive) return "Live";
	if (item.kind === "published") return "Published";
	return isCurrentDraft ? "Current draft" : "Draft";
}

export function RevisionRow({
	item,
	selected,
	isCurrentLive,
	isCurrentDraft,
	stagger,
	onSelect,
}: {
	item: RevisionSummary;
	selected: boolean;
	isCurrentLive: boolean;
	isCurrentDraft: boolean;
	stagger: number;
	onSelect: () => void;
}) {
	const reduced = useLiveReducedMotion();
	const label = revisionStateLabel(item, isCurrentLive, isCurrentDraft);

	return (
		<li style={staggerStyle(stagger)} className="cms-enter relative pl-6">
			<span
				aria-hidden="true"
				className={cn(
					"absolute top-1/2 left-[7px] z-[1] size-2 -translate-y-1/2 rounded-full border-2 transition-[background-color,border-color,scale] duration-150",
					selected
						? "scale-125 border-primary bg-primary motion-reduce:scale-100"
						: "border-line-strong bg-surface-solid",
				)}
			/>
			<button
				type="button"
				aria-current={selected ? "true" : undefined}
				onClick={onSelect}
				className={cn(
					"cms-press cms-page-focus relative flex min-h-11 w-full items-center justify-between gap-3 rounded-[12px] border px-3 py-2 text-left",
					selected
						? "border-transparent"
						: "border-transparent hover:bg-[color-mix(in_srgb,var(--theme-ink)_4%,transparent)]",
				)}
			>
				{selected ? (
					<motion.span
						layoutId={reduced ? undefined : "cms-history-active-row"}
						aria-hidden="true"
						transition={reduced ? REDUCED : SPRING_MOVE}
						className="pointer-events-none absolute inset-0 rounded-[12px] border border-primary-line bg-primary-soft/60"
					/>
				) : null}
				<span className="relative z-[1] flex min-w-0 items-center gap-2">
					<span className="font-mono text-[13px] font-semibold tabular-nums text-foreground">
						r{item.revision}
					</span>
					<span
						className={cn(
							"inline-flex items-center rounded-full border px-2 py-0.5 text-[11.5px] font-medium",
							isCurrentLive
								? "border-success/40 bg-success/10 text-success"
								: isCurrentDraft
									? "border-primary-line bg-primary-soft text-primary-text"
									: "border-line bg-transparent text-ink-soft",
						)}
					>
						{label}
					</span>
				</span>
				<RelativeTime
					iso={item.changedAt}
					className="relative z-[1] shrink-0 text-right text-[12.5px] text-muted-foreground"
				/>
			</button>
		</li>
	);
}
