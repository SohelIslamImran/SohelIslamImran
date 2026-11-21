import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cms/")({
	component: CmsOverview,
});

/** Overview (signals + content health). Built by the analytics workstream. */
function CmsOverview() {
	return (
		<div className="grid gap-2">
			<p className="mono-label m-0 text-primary-text">Signals · overview</p>
			<h1 className="m-0 text-headline">Overview</h1>
			<p className="m-0 text-[14px] text-muted-foreground">
				Analytics and content health land here.
			</p>
		</div>
	);
}
