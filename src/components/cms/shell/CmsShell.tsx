/**
 * CMS shell v0 (foundation): skip link, layer rail, status bar, and one
 * `<main id="main-content">`. Functional and accessible; the visual design
 * (pipeline bar, icon rail, command bar, mobile drawer) replaces it.
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "../../../lib/utils";
import { Button } from "../../ui/button";
import { useDraftSelector, useDraftStore } from "../draft/context";
import { SECTION_GROUPS, SECTIONS } from "../sections/registry";

export const PUBLIC_SITE_ORIGIN = "https://sohelislamimran.com";

export const CMS_NAV = {
	signals: [
		{ to: "/cms", label: "Overview" },
		{ to: "/cms/analytics", label: "Analytics" },
	],
	assets: [{ to: "/cms/library", label: "Media library" }],
	release: [
		{ to: "/cms/release", label: "Changes" },
		{ to: "/cms/history", label: "History" },
		{ to: "/cms/activity", label: "Activity" },
	],
} as const;

function RailLink({
	to,
	params,
	children,
}: {
	to: string;
	params?: Record<string, string>;
	children: ReactNode;
}) {
	return (
		<Link
			to={to}
			params={params}
			activeOptions={{ exact: to === "/cms" }}
			className="flex min-h-9 items-center justify-between gap-2 rounded-[10px] px-2.5 text-[13.5px] text-ink-soft no-underline hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)] hover:text-foreground data-[status=active]:bg-[color-mix(in_srgb,var(--theme-ink)_7%,transparent)] data-[status=active]:font-medium data-[status=active]:text-foreground pointer-coarse:min-h-11"
		>
			{children}
		</Link>
	);
}

function SectionBadge({ paths }: { paths: readonly string[] }) {
	const errors = useDraftSelector((state) =>
		paths.reduce((total, path) => total + state.issues.under(path).length, 0),
	);
	const changed = useDraftSelector((state, store) =>
		paths.some((path) => store.changedAt(path, state)),
	);
	if (errors) {
		return (
			<span className="font-mono text-[11px] text-destructive">
				<span aria-hidden="true">!</span>
				{errors}
				<span className="sr-only"> errors</span>
			</span>
		);
	}
	if (changed) {
		return (
			<span className="inline-flex items-center gap-1 font-mono text-[11px] text-primary-text">
				<span aria-hidden="true">Δ</span>
				<span className="sr-only">changed</span>
			</span>
		);
	}
	return null;
}

function RailHeading({ children }: { children: ReactNode }) {
	return <p className="mono-label m-0 mt-4 mb-1 px-2.5 text-muted-foreground">{children}</p>;
}

function Rail() {
	return (
		<nav aria-label="CMS" className="grid content-start gap-0.5">
			<RailHeading>Signals</RailHeading>
			{CMS_NAV.signals.map((item) => (
				<RailLink key={item.to} to={item.to}>
					{item.label}
				</RailLink>
			))}
			{SECTION_GROUPS.map((group) => (
				<div key={group.id} className="grid gap-0.5">
					<RailHeading>{group.label}</RailHeading>
					{SECTIONS.filter((section) => section.group === group.id).map((section) => (
						<RailLink key={section.id} to="/cms/content/$section" params={{ section: section.id }}>
							<span>{section.label}</span>
							<SectionBadge paths={section.paths} />
						</RailLink>
					))}
				</div>
			))}
			<RailHeading>Assets</RailHeading>
			{CMS_NAV.assets.map((item) => (
				<RailLink key={item.to} to={item.to}>
					{item.label}
				</RailLink>
			))}
			<RailHeading>Release</RailHeading>
			{CMS_NAV.release.map((item) => (
				<RailLink key={item.to} to={item.to}>
					{item.label}
				</RailLink>
			))}
		</nav>
	);
}

/** Save state in words, never color alone. */
export function useStatusLine(): { label: string; tone: "ok" | "busy" | "warn" | "error" } {
	return useDraftSelector((state) => {
		if (state.status === "conflict") return CONFLICT;
		if (state.status === "error") return ERROR;
		if (state.status === "saving") return SAVING;
		if (state.status === "publishing") return PUBLISHING;
		if (state.issues.all.length) return INVALID;
		if (state.dirty) return UNSAVED;
		if (state.ahead) return AHEAD;
		return LIVE;
	});
}

const CONFLICT = { label: "Conflict: changed elsewhere", tone: "error" } as const;
const ERROR = { label: "Not saved", tone: "error" } as const;
const SAVING = { label: "Saving…", tone: "busy" } as const;
const PUBLISHING = { label: "Publishing…", tone: "busy" } as const;
const INVALID = { label: "Unsaved · fix errors", tone: "warn" } as const;
const UNSAVED = { label: "Unsaved changes", tone: "busy" } as const;
const AHEAD = { label: "Draft ahead of live", tone: "warn" } as const;
const LIVE = { label: "Live is up to date", tone: "ok" } as const;

function StatusBar() {
	const store = useDraftStore();
	const status = useStatusLine();
	const draftRevision = useDraftSelector((state) => state.draftRevision);
	const publishedRevision = useDraftSelector((state) => state.publishedRevision);
	const canPublish = useDraftSelector(
		(state) => (state.ahead || state.dirty) && state.issues.all.length === 0 && !state.conflict,
	);
	const busy = useDraftSelector(
		(state) => state.status === "saving" || state.status === "publishing",
	);
	const error = useDraftSelector((state) => state.error);
	return (
		<header className="sticky top-0 z-(--z-sticky) flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-line bg-background/90 px-4 py-2 backdrop-blur">
			<p
				className="m-0 flex min-w-0 items-center gap-3 font-mono text-[12px] text-ink-soft"
				role="status"
			>
				<span>Draft r{draftRevision}</span>
				<span aria-hidden="true">──</span>
				<span>Live r{publishedRevision}</span>
				<span className={cn(status.tone === "error" && "text-destructive")}>· {status.label}</span>
				{error ? <span className="text-destructive">{error}</span> : null}
			</p>
			<div className="flex items-center gap-2">
				<Button variant="outline" size="sm" disabled={busy} onClick={() => void store.save()}>
					Save
				</Button>
				<Button size="sm" disabled={!canPublish || busy} onClick={() => void store.publish()}>
					Publish
				</Button>
			</div>
		</header>
	);
}

export function CmsShell({ children }: { children: ReactNode }) {
	return (
		<div className="cms-root min-h-svh">
			<a
				href="#main-content"
				className="fixed top-2 left-2 z-(--z-skip) -translate-y-[200%] rounded-full bg-foreground px-4 py-2.5 text-[13px] font-semibold text-background focus-visible:translate-y-0"
			>
				Skip to content
			</a>
			<div className="grid min-h-svh lg:grid-cols-[248px_minmax(0,1fr)]">
				<aside className="border-r border-line px-3 py-4 max-lg:hidden">
					<a href={PUBLIC_SITE_ORIGIN} className="mono-label px-2.5 text-foreground no-underline">
						Control plane
					</a>
					<Rail />
				</aside>
				<div className="min-w-0">
					<StatusBar />
					<main
						id="main-content"
						tabIndex={-1}
						className="min-w-0 px-4 py-6 outline-hidden lg:px-8"
					>
						{children}
					</main>
				</div>
			</div>
		</div>
	);
}
