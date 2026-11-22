import { Tooltip } from "@base-ui/react/tooltip";
import type { ReactElement } from "react";

export function RailTooltip({
	children,
	label,
	disabled,
	showExpanded,
}: {
	children: ReactElement;
	label: string;
	disabled?: boolean;
	showExpanded?: boolean;
}) {
	return (
		<Tooltip.Root disabled={disabled}>
			<Tooltip.Trigger render={children} />
			<Tooltip.Portal>
				<Tooltip.Positioner
					side="right"
					sideOffset={12}
					data-show-expanded={showExpanded || undefined}
					className="cms-rail-tooltip z-(--z-palette)"
				>
					<Tooltip.Popup
						role="tooltip"
						className="cms-rail-tooltip-popup rounded-lg border border-line bg-surface-solid px-2.5 py-1.5 text-[12px] font-medium text-foreground"
					>
						{label}
					</Tooltip.Popup>
				</Tooltip.Positioner>
			</Tooltip.Portal>
		</Tooltip.Root>
	);
}
