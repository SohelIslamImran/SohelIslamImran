import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";
import { ExternalArrowIcon } from "../shell/cms-icons";

export function EditorLayout({
	title,
	description,
	liveUrl,
	issues,
	children,
}: {
	title: string;
	description: string;
	liveUrl?: string;
	issues?: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="cms-editor">
			<header className="grid min-w-0 gap-3">
				<div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2">
					<h1 id="cms-section-heading" tabIndex={-1} className="m-0 text-headline">
						{title}
					</h1>
					{/* Errors float in the title row, so they never push the fields down. */}
					<div className="flex items-center gap-1.5">
						{issues}
						{liveUrl ? (
							<a
								href={liveUrl}
								target="_blank"
								rel="noreferrer"
								className="cms-editor-button cms-editor-live cms-press"
							>
								<span className="max-sm:sr-only">View live</span>
								<ExternalArrowIcon className="size-3.5" />
								<span className="sr-only"> (opens in a new tab)</span>
							</a>
						) : null}
					</div>
					<p className="col-span-full m-0 text-[14px] leading-relaxed text-muted-foreground">
						{description}
					</p>
				</div>
			</header>
			{children}
		</div>
	);
}

/** A titled group of fields on a solid CMS panel. */
export function EditorGroup({
	title,
	description,
	actions,
	className,
	children,
	heading = "h2",
}: {
	title: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
	className?: string;
	children?: ReactNode;
	heading?: "h2" | "h3";
}) {
	const Heading = heading;
	return (
		<section
			data-slot="cms-editor-group"
			className={cn(
				"cms-panel cms-editor-group grid min-w-0 p-[clamp(16px,2.2vw,26px)]",
				className,
			)}
		>
			<header className="cms-editor-group-heading flex min-w-0 flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<Heading className="m-0 text-[16px] font-semibold tracking-[-0.01em]">{title}</Heading>
					{description ? (
						<p className="m-0 mt-1 text-[13px] text-muted-foreground">{description}</p>
					) : null}
				</div>
				{actions}
			</header>
			{children ? <div className="grid min-w-0 gap-6">{children}</div> : null}
		</section>
	);
}
