import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import {
	getCmsSnapshot,
	publishDraft,
	saveDraft,
	type CmsSnapshotResult,
	uploadMedia,
} from "../server/cms.functions";
import { Button } from "../components";

const emptyRecord = z.record(z.string(), z.unknown());

export const Route = createFileRoute("/cms")({
	loader: () => getCmsSnapshot(),
	head: () => ({
		meta: [
			{ title: "CMS · Sohel Islam Imran" },
			{ name: "robots", content: "noindex, nofollow, noarchive" },
			{ name: "referrer", content: "no-referrer" },
		],
	}),
	errorComponent: CmsError,
	component: CmsRoute,
});

function CmsError({ error }: { error: unknown }) {
	const message =
		error instanceof Error ? error.message : "Sign in through Cloudflare Access to open the CMS.";
	return (
		<main className="page cms status-page mx-auto grid min-h-[calc(100svh-170px)] w-[min(1180px,calc(100%-40px))] content-center justify-items-start py-[clamp(58px,9vw,120px)]">
			<p className="eyebrow">Private workspace</p>
			<h1 className="page-title mb-[22px] mt-0 max-w-[960px] text-[clamp(3rem,5vw,4.8rem)] font-[760] leading-[.98] tracking-[-.06em]">
				Access is required.
			</h1>
			<p className="lede m-0 max-w-[650px] text-[clamp(17px,2vw,21px)] leading-[1.55] text-muted">
				{message}
			</p>
			<div className="status-actions mt-[30px] flex flex-wrap gap-2.5">
				<a
					className="button button-primary inline-flex min-h-12 items-center gap-[15px] rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground no-underline shadow-[0_10px_24px_var(--theme-accent-glow)]"
					href="https://cms.sohelislamimran.com/"
				>
					Open CMS sign-in <span aria-hidden="true">↗</span>
				</a>
				<a
					className="button button-quiet inline-flex min-h-12 items-center gap-[15px] rounded-full border border-line bg-surface-solid px-5 text-sm font-bold text-ink no-underline"
					href="/"
				>
					Return to the public site <span aria-hidden="true">↗</span>
				</a>
			</div>
		</main>
	);
}

function CmsRoute() {
	const result = Route.useLoaderData();
	if (!result.ok) return <CmsAccessState code={result.code} message={result.message} />;
	return <CmsDashboard initial={result} />;
}

function CmsAccessState({
	code,
	message,
}: {
	code: "unauthenticated" | "forbidden" | "configuration" | "unavailable";
	message: string;
}) {
	const actionLabel = code === "unauthenticated" ? "Open CMS sign-in" : "Try CMS again";
	const actionHref = code === "unauthenticated" ? "https://cms.sohelislamimran.com/" : "/cms";
	return (
		<main className="page cms status-page mx-auto grid min-h-[calc(100svh-170px)] w-[min(1180px,calc(100%-40px))] content-center justify-items-start py-[clamp(58px,9vw,120px)]">
			<p className="eyebrow">Private workspace</p>
			<h1 className="page-title mb-[22px] mt-0 max-w-[960px] text-[clamp(3rem,5vw,4.8rem)] font-[760] leading-[.98] tracking-[-.06em]">
				{code === "forbidden" ? "This route is owner-only." : "Access is required."}
			</h1>
			<p className="lede m-0 max-w-[650px] text-[clamp(17px,2vw,21px)] leading-[1.55] text-muted">
				{message}
			</p>
			<div className="status-actions mt-[30px] flex flex-wrap gap-2.5">
				<a
					className="button button-primary inline-flex min-h-12 items-center gap-[15px] rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground no-underline shadow-[0_10px_24px_var(--theme-accent-glow)]"
					href={actionHref}
				>
					{actionLabel} <span aria-hidden="true">↗</span>
				</a>
				<a
					className="button button-quiet inline-flex min-h-12 items-center gap-[15px] rounded-full border border-line bg-surface-solid px-5 text-sm font-bold text-ink no-underline"
					href="/"
				>
					Return to the public site <span aria-hidden="true">↗</span>
				</a>
			</div>
		</main>
	);
}

function CmsDashboard({ initial }: { initial: Extract<CmsSnapshotResult, { ok: true }> }) {
	const initialRaw = useMemo(() => JSON.stringify(initial.snapshot.draft, null, 2), [initial]);
	const [raw, setRaw] = useState(initialRaw);
	const [savedRaw, setSavedRaw] = useState(initialRaw);
	const [revision, setRevision] = useState(initial.snapshot.draftRevision);
	const [csrfToken] = useState(initial.csrfToken);
	const [status, setStatus] = useState("Ready to edit the draft.");
	const [pendingAction, setPendingAction] = useState<"save" | "publish" | "upload" | null>(null);
	const save = useServerFn(saveDraft);
	const publish = useServerFn(publishDraft);
	const upload = useServerFn(uploadMedia);
	const parsed = useMemo(() => parseDraft(raw), [raw]);
	const dirty = raw !== savedRaw;
	const busy = pendingAction !== null;

	useEffect(() => {
		if (!dirty) return;
		const warnBeforeLeaving = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener("beforeunload", warnBeforeLeaving);
		return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
	}, [dirty]);

	useEffect(() => {
		if (dirty && !pendingAction) setStatus("Unsaved changes. Save the draft before publishing.");
	}, [dirty, pendingAction]);

	const updateField = (section: "site" | "identity", key: string, value: string) => {
		if (!parsed) return;
		const currentSection = emptyRecord.safeParse(parsed[section]).success
			? (parsed[section] as Record<string, unknown>)
			: {};
		setRaw(JSON.stringify({ ...parsed, [section]: { ...currentSection, [key]: value } }, null, 2));
	};

	const handleSave = async () => {
		if (!parsed) {
			setStatus("The JSON is not valid yet. Fix it before saving.");
			return;
		}
		setPendingAction("save");
		setStatus("Saving draft…");
		try {
			const result = await save({
				data: { content: parsed, expectedRevision: revision, csrfToken },
			});
			if (result.ok) {
				setRevision(result.revision);
				setSavedRaw(raw);
				setStatus(`Draft saved at revision ${result.revision}.`);
			} else {
				setRevision(result.current.draftRevision);
				// Keep the submitted document in the editor. Replacing it with the
				// server snapshot here silently discards the owner's local changes.
				// Advancing the revision lets the owner explicitly save this draft
				// again after reviewing the conflict message.
				setStatus(
					"A newer draft exists. Your local edits are still here; review them, then save again to use the latest revision.",
				);
			}
		} catch {
			setStatus("The draft could not be saved. Check your session and try again.");
		} finally {
			setPendingAction(null);
		}
	};

	const handlePublish = async () => {
		if (dirty) {
			setStatus("Save the current changes before publishing.");
			return;
		}
		setPendingAction("publish");
		setStatus("Publishing…");
		try {
			const result = await publish({ data: { expectedDraftRevision: revision, csrfToken } });
			if (result.ok) {
				setStatus(`Published revision ${result.revision}. Public pages now use this snapshot.`);
			} else {
				setRevision(result.current.draftRevision);
				const currentRaw = JSON.stringify(result.current.draft, null, 2);
				setRaw(currentRaw);
				setSavedRaw(currentRaw);
				setStatus("Publishing found a newer draft. Review the latest version before trying again.");
			}
		} catch {
			setStatus("The draft could not be published. Check your session and try again.");
		} finally {
			setPendingAction(null);
		}
	};

	const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const file = form.get("file");
		const alt = String(form.get("alt") ?? "").trim();
		if (!(file instanceof File) || file.size === 0 || alt.length === 0) {
			setStatus("Choose an image and provide meaningful alt text first.");
			return;
		}
		setPendingAction("upload");
		setStatus("Uploading media…");
		try {
			const asset = await upload({ data: { file, alt, csrfToken } });
			setStatus(`Uploaded ${asset.id}. Attach it to a published content field before publishing.`);
			event.currentTarget.reset();
		} catch {
			setStatus("The media upload failed. Check the file type, size, and session.");
		} finally {
			setPendingAction(null);
		}
	};

	const site = readSection(parsed, "site");
	const identity = readSection(parsed, "identity");
	const experienceCount = arrayLength(parsed?.experience);
	const projectCount = arrayLength(parsed?.projects);
	const storyCount = arrayLength(readSection(parsed, "story")?.chapters);
	const travelCount = arrayLength(readSection(parsed, "travel")?.entries);
	const linkCount = arrayLength(parsed?.profileLinks);

	return (
		<main className="page cms mx-auto min-h-[calc(100svh-150px)] w-[min(1180px,calc(100%-40px))] py-[clamp(58px,9vw,120px)]">
			<header className="cms-header mb-[54px] grid grid-cols-[minmax(0,1fr)_minmax(220px,320px)] items-end gap-[30px] max-[800px]:grid-cols-1">
				<div>
					<p className="eyebrow">Private workspace · {initial.owner}</p>
					<h1 className="cms-title mb-[18px] mt-0 max-w-[760px] text-[clamp(3.2rem,7vw,6.8rem)] font-[760] leading-[.9] tracking-[-.08em] [text-wrap:balance]">
						Keep the route current.
					</h1>
					<p className="lede m-0 max-w-[650px] text-[clamp(17px,2vw,21px)] leading-[1.55] text-muted">
						Edit the published story, proof, links, travel notes, media, and search metadata from
						one owner-only dashboard.
					</p>
				</div>
				<div
					className="cms-status flex items-start gap-2 rounded-[18px] border border-line bg-[color-mix(in_srgb,var(--theme-surface-solid)_92%,transparent)] p-4 text-[13px] leading-[1.45] text-muted shadow-[0_12px_32px_var(--theme-shadow)] backdrop-blur-[16px]"
					role="status"
					aria-live="polite"
				>
					<span className="status-dot" aria-hidden="true" />
					{status}
				</div>
			</header>

			<section
				className="cms-overview mb-[68px] grid grid-cols-6 gap-2.5 max-[800px]:grid-cols-2"
				aria-label="Content overview"
			>
				<StatusCard
					label="Draft revision"
					value={String(revision)}
					detail="Optimistic conflict checks enabled"
				/>
				<StatusCard
					label="Published revision"
					value={String(initial.snapshot.publishedRevision)}
					detail={initial.snapshot.publishedAt ?? "Not published yet"}
				/>
				<StatusCard
					label="Experience"
					value={String(experienceCount)}
					detail="Kuno-first timeline"
				/>
				<StatusCard label="Proof" value={String(projectCount)} detail="Projects and open source" />
				<StatusCard
					label="Story / travel"
					value={`${storyCount} / ${travelCount}`}
					detail="Chapters and public entries"
				/>
				<StatusCard label="Public links" value={String(linkCount)} detail="Stable /links IDs" />
			</section>

			<section
				className="cms-editor grid grid-cols-[minmax(190px,.4fr)_minmax(0,1fr)] gap-8 border-t border-line py-[42px] max-[800px]:grid-cols-1 max-[800px]:gap-6"
				aria-labelledby="cms-editor-title"
			>
				<div className="cms-editor-intro min-w-0">
					<p className="eyebrow">Structured fields</p>
					<h2
						className="cms-editor-intro-title mb-3 mt-2 max-w-[600px] text-[clamp(26px,3vw,38px)] font-[760] leading-none tracking-[-.055em]"
						id="cms-editor-title"
					>
						Identity and search surface
					</h2>
					<p className="cms-editor-intro-copy m-0 text-[15px] leading-[1.55] text-muted">
						These high-value fields stay visible. Use the advanced editor below for collections and
						rich content.
					</p>
				</div>
				<div className="cms-fields grid grid-cols-2 gap-3.5 max-[560px]:grid-cols-1">
					<Field
						name="site-title"
						label="Site title"
						value={stringValue(site?.title)}
						onChange={(value) => updateField("site", "title", value)}
					/>
					<Field
						name="site-description"
						label="Site description"
						value={stringValue(site?.description)}
						onChange={(value) => updateField("site", "description", value)}
						multiline
					/>
					<Field
						name="name"
						label="Name"
						autoComplete="name"
						value={stringValue(identity?.name)}
						onChange={(value) => updateField("identity", "name", value)}
					/>
					<Field
						name="role"
						label="Role"
						autoComplete="organization-title"
						value={stringValue(identity?.role)}
						onChange={(value) => updateField("identity", "role", value)}
					/>
					<Field
						name="location"
						label="Location"
						autoComplete="address-level2"
						value={stringValue(identity?.location)}
						onChange={(value) => updateField("identity", "location", value)}
					/>
					<Field
						name="email"
						label="Public email"
						autoComplete="email"
						value={stringValue(identity?.email)}
						onChange={(value) => updateField("identity", "email", value)}
						type="email"
					/>
				</div>
			</section>

			<section
				className="cms-editor grid grid-cols-[minmax(190px,.4fr)_minmax(0,1fr)] gap-8 border-t border-line py-[42px] max-[800px]:grid-cols-1 max-[800px]:gap-6"
				aria-labelledby="cms-json-title"
			>
				<div className="cms-editor-intro min-w-0">
					<p className="eyebrow">Advanced fallback</p>
					<h2
						className="cms-editor-intro-title mb-3 mt-2 max-w-[600px] text-[clamp(26px,3vw,38px)] font-[760] leading-none tracking-[-.055em]"
						id="cms-json-title"
					>
						The complete content document
					</h2>
					<p className="cms-editor-intro-copy m-0 text-[15px] leading-[1.55] text-muted">
						Collections keep their existing schema and revision history. Invalid or stale drafts
						never reach public pages.
					</p>
				</div>
				<textarea
					className="cms-json col-span-full min-h-[520px] w-full resize-y rounded-[13px] border border-line bg-surface-solid p-4 font-mono text-[13px] leading-[1.45] text-ink outline-none transition-[border-color,box-shadow] duration-180 ease-route focus-visible:border-primary focus-visible:shadow-[0_0_0_4px_var(--theme-picker-soft)] max-[800px]:col-span-1"
					name="portfolio-json"
					autoComplete="off"
					value={raw}
					onChange={(event) => setRaw(event.target.value)}
					spellCheck={false}
					aria-label="Portfolio JSON document"
				/>
				<div className="cms-actions col-span-full flex flex-wrap gap-2.5 max-[800px]:col-span-1">
					<Button
						className="button button-primary min-h-12"
						size="lg"
						type="button"
						disabled={busy || !parsed || !dirty}
						onClick={() => void handleSave()}
					>
						{pendingAction === "save" ? "Saving…" : "Save draft"} <span aria-hidden="true">↗</span>
					</Button>
					<Button
						className="button button-quiet border border-line bg-surface-solid text-ink"
						variant="outline"
						size="lg"
						type="button"
						disabled={busy || dirty}
						onClick={() => void handlePublish()}
					>
						{pendingAction === "publish" ? "Publishing…" : "Publish revision"}{" "}
						<span aria-hidden="true">↗</span>
					</Button>
				</div>
			</section>

			<section
				className="cms-editor grid grid-cols-[minmax(190px,.4fr)_minmax(0,1fr)] gap-8 border-t border-line py-[42px] max-[800px]:grid-cols-1 max-[800px]:gap-6"
				aria-labelledby="cms-media-title"
			>
				<div className="cms-editor-intro min-w-0">
					<p className="eyebrow">Media shelf</p>
					<h2
						className="cms-editor-intro-title mb-3 mt-2 max-w-[600px] text-[clamp(26px,3vw,38px)] font-[760] leading-none tracking-[-.055em]"
						id="cms-media-title"
					>
						Upload a future memory.
					</h2>
					<p className="cms-editor-intro-copy m-0 text-[15px] leading-[1.55] text-muted">
						R2 is optional until its production bucket is enabled. Images need alt text before they
						can enter the document.
					</p>
				</div>
				<form
					className="cms-upload grid grid-cols-[repeat(2,minmax(0,1fr))_auto] items-end gap-3.5 max-[800px]:grid-cols-1"
					onSubmit={(event) => void handleUpload(event)}
				>
					<label className="grid gap-1.5 text-xs font-[750] text-muted">
						Image or PDF
						<input
							className="cms-input w-full rounded-[13px] border border-line bg-surface-solid px-3 py-[9px] text-[15px] leading-[1.45] text-ink outline-none transition-[border-color,box-shadow] duration-180 ease-route focus-visible:border-primary focus-visible:shadow-[0_0_0_4px_var(--theme-picker-soft)]"
							name="file"
							type="file"
							accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
						/>
					</label>
					<label className="grid gap-1.5 text-xs font-[750] text-muted">
						Alt text
						<input
							className="cms-input w-full rounded-[13px] border border-line bg-surface-solid px-3 py-[9px] text-[15px] leading-[1.45] text-ink outline-none transition-[border-color,box-shadow] duration-180 ease-route focus-visible:border-primary focus-visible:shadow-[0_0_0_4px_var(--theme-picker-soft)]"
							name="alt"
							type="text"
							autoComplete="off"
							maxLength={240}
							required
							placeholder="Describe the image…"
						/>
					</label>
					<Button
						className="button button-quiet border border-line bg-surface-solid text-ink"
						variant="outline"
						type="submit"
						disabled={busy}
					>
						{pendingAction === "upload" ? "Uploading…" : "Upload media"}
					</Button>
				</form>
			</section>
		</main>
	);
}

function StatusCard({ label, value, detail }: { label: string; value: string; detail: string }) {
	return (
		<article className="cms-status-card glass grid min-h-[125px] min-w-0 gap-1 rounded-[18px] p-4 max-[560px]:min-h-[110px]">
			<span className="cms-status-label text-xs leading-[1.3] text-muted">{label}</span>
			<strong className="cms-status-value text-[28px] font-[760] tracking-[-.06em]">{value}</strong>
			<small className="cms-status-label text-xs leading-[1.3] text-muted">{detail}</small>
		</article>
	);
}

function Field({
	name,
	label,
	value,
	onChange,
	multiline = false,
	type = "text",
	autoComplete = "off",
}: {
	name: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	multiline?: boolean;
	type?: string;
	autoComplete?: string;
}) {
	return (
		<label className="cms-field grid gap-1.5 text-xs font-[750] text-muted">
			{label}
			{multiline ? (
				<textarea
					name={name}
					autoComplete={autoComplete}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					rows={3}
					className="cms-input w-full rounded-[13px] border border-line bg-surface-solid px-3 py-[9px] text-[15px] leading-[1.45] text-ink outline-none transition-[border-color,box-shadow] duration-180 ease-route focus-visible:border-primary focus-visible:shadow-[0_0_0_4px_var(--theme-picker-soft)]"
				/>
			) : (
				<input
					name={name}
					type={type}
					autoComplete={autoComplete}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					className="cms-input w-full rounded-[13px] border border-line bg-surface-solid px-3 py-[9px] text-[15px] leading-[1.45] text-ink outline-none transition-[border-color,box-shadow] duration-180 ease-route focus-visible:border-primary focus-visible:shadow-[0_0_0_4px_var(--theme-picker-soft)]"
				/>
			)}
		</label>
	);
}

function parseDraft(raw: string): Record<string, unknown> | null {
	try {
		const value: unknown = JSON.parse(raw);
		return emptyRecord.safeParse(value).success ? (value as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

function readSection(
	value: Record<string, unknown> | null,
	key: string,
): Record<string, unknown> | null {
	if (!value) return null;
	const result = emptyRecord.safeParse(value[key]);
	return result.success ? (result.data as Record<string, unknown>) : null;
}

function stringValue(value: unknown) {
	return typeof value === "string" ? value : "";
}

function arrayLength(value: unknown) {
	return Array.isArray(value) ? value.length : 0;
}
