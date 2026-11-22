/** The single "storage not connected" card shown when `MEDIA` (R2) is unbound. */
import { staggerStyle } from "../analytics/Widgets";

export function StorageDisconnectedCard({ hasAssets }: { hasAssets: boolean }) {
	return (
		<section
			data-slot="cms-media-disconnected"
			style={staggerStyle(0)}
			className="cms-panel cms-enter flex items-start gap-3.5 p-5 sm:gap-4 sm:p-6"
		>
			<span
				aria-hidden="true"
				className="grid size-11 shrink-0 place-items-center rounded-[13px] border border-line-strong bg-surface-raised text-foreground shadow-[0_1px_2px_var(--theme-shadow-soft),inset_0_1px_var(--theme-highlight)]"
			>
				<svg
					viewBox="0 0 20 20"
					className="size-5 fill-none stroke-current stroke-[1.5] [stroke-linecap:round] [stroke-linejoin:round]"
				>
					<ellipse cx="10" cy="5.5" rx="6" ry="2.5" />
					<path d="M4 5.5v4.5c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V5.5" />
					<path d="M4 10v4.5c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V10" />
				</svg>
			</span>
			<div className="grid min-w-0 gap-1">
				<h2 className="m-0 text-[16px] font-semibold tracking-[-0.015em] text-foreground">
					Storage isn’t connected
				</h2>
				<p className="m-0 max-w-[64ch] text-[13.5px] leading-relaxed text-muted-foreground">
					{hasAssets
						? "You can browse existing assets. Connect media storage to upload new files."
						: "Connect media storage to upload images and PDFs."}
				</p>
			</div>
		</section>
	);
}
