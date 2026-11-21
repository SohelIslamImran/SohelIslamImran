import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";

/** A titled group of fields on a solid CMS panel. */
export function EditorGroup({
	title,
	description,
	actions,
	className,
	children,
}: {
	title: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
	className?: string;
	children: ReactNode;
}) {
	return (
		<section
			data-slot="cms-editor-group"
			className={cn("cms-panel grid min-w-0 gap-5 p-[clamp(16px,2.2vw,24px)]", className)}
		>
			<header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<h2 className="m-0 text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
					{description ? (
						<p className="m-0 mt-1 text-[13px] text-muted-foreground">{description}</p>
					) : null}
				</div>
				{actions}
			</header>
			<div className="grid min-w-0 gap-5">{children}</div>
		</section>
	);
}

/** Placeholder until a section's editor lands. */
export function PendingEditor() {
	return (
		<EditorGroup title="Editor coming next" description="This section's form is being built.">
			<p className="m-0 text-[13px] text-muted-foreground">
				Its content is safe and still published as it is.
			</p>
		</EditorGroup>
	);
}
