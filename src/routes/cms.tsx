/**
 * CMS layout route. On the CMS host every path is rewritten under `/cms`
 * (see `src/lib/cms-host.ts`), so `cms.sohelislamimran.com/analytics` renders
 * `/cms/analytics` here. The loader is the owner gate for the UI; each private
 * server function still authorizes itself.
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { LiveVisitorsProvider } from "../components/cms/analytics/LiveVisitors";
import { CmsDraftProvider } from "../components/cms/draft/context";
import type { DraftApi } from "../components/cms/draft/store";
import { AccessScreen } from "../components/cms/shell/AccessScreen";
import { CmsShell, useCommittedPathname } from "../components/cms/shell/CmsShell";
import { discardDraft, restoreRevision } from "../server/cms-history.functions";
import { getCmsSnapshot, publishDraft, saveDraft } from "../server/cms.functions";

export const Route = createFileRoute("/cms")({
	loader: () => getCmsSnapshot(),
	// The draft lives in the layout; re-running the gate on every child
	// navigation would refetch the whole document for nothing.
	staleTime: Number.POSITIVE_INFINITY,
	shouldReload: false,
	head: () => ({
		meta: [
			{ title: "Control plane · Sohel Islam Imran" },
			{ name: "robots", content: "noindex, nofollow, noarchive" },
			{ name: "referrer", content: "no-referrer" },
		],
	}),
	errorComponent: () => <AccessScreen code="unavailable" />,
	notFoundComponent: CmsNotFound,
	component: CmsLayout,
});

function CmsLayout() {
	const result = Route.useLoaderData();
	if (!result.ok) return <AccessScreen code={result.code} />;
	return <CmsWorkspace initial={result} />;
}

function CmsWorkspace({
	initial,
}: {
	initial: Extract<Awaited<ReturnType<typeof getCmsSnapshot>>, { ok: true }>;
}) {
	const save = useServerFn(saveDraft);
	const publish = useServerFn(publishDraft);
	const restore = useServerFn(restoreRevision);
	const discard = useServerFn(discardDraft);
	const csrfToken = initial.csrfToken;
	const api = useMemo<DraftApi>(
		() => ({
			save: ({ content, expectedRevision }) =>
				save({ data: { content, expectedRevision, csrfToken } }),
			publish: ({ expectedDraftRevision }) =>
				publish({ data: { expectedDraftRevision, csrfToken } }),
			restore: (input) => restore({ data: { ...input, csrfToken } }),
			discard: (input) => discard({ data: { ...input, csrfToken } }),
		}),
		[save, publish, restore, discard, csrfToken],
	);
	const session = useMemo(
		() => ({
			csrfToken,
			owner: initial.owner,
			mediaEnabled: initial.mediaEnabled,
			publicOrigin: initial.publicOrigin,
			build: initial.build,
		}),
		[csrfToken, initial.owner, initial.mediaEnabled, initial.publicOrigin, initial.build],
	);
	return (
		<CmsDraftProvider snapshot={initial.snapshot} session={session} api={api}>
			<LiveVisitorsProvider>
				<CmsShell>
					<CmsSection />
				</CmsShell>
			</LiveVisitorsProvider>
		</CmsDraftProvider>
	);
}

function CmsSection() {
	const pathname = useCommittedPathname();

	return (
		<div key={pathname} data-slot="cms-section">
			<Outlet />
		</div>
	);
}

function CmsNotFound() {
	return (
		<div className="cms-panel grid max-w-[520px] gap-3 p-6">
			<p className="mono-label m-0 text-destructive">404 · route</p>
			<h1 className="m-0 text-headline">No console page here.</h1>
			<p className="m-0 text-[14px] text-muted-foreground">Pick a section from the rail.</p>
		</div>
	);
}
