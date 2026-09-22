import * as React from "react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	getCmsSnapshot,
	publishDraft,
	saveDraft,
	type CmsSnapshotResult,
	uploadMedia,
} from "../server/cms.functions";
import { validatePortfolioContent, type ValidationIssue } from "../lib/validation";
import { Button } from "../components/ui/button";
import { CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import {
	Field as FormField,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "../components/ui/field";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { ButtonLink, PageHeader, PageShell, Surface } from "../components/ui/portfolio";
import type { PortfolioContent } from "../types/content";

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

function CmsError() {
	return (
		<PageShell
			width="wide"
			className="grid min-h-[calc(100svh-170px)] content-center justify-items-start"
		>
			<PageHeader
				eyebrow="Private workspace"
				title="Access is required."
				description="Sign in through Cloudflare Access to open the owner-only editor."
			>
				<div className="mt-7 flex flex-wrap gap-2.5">
					<ButtonLink href="https://cms.sohelislamimran.com/" size="lg">
						Open CMS sign-in <span aria-hidden="true">↗</span>
					</ButtonLink>
					<ButtonLink href="/" variant="outline" size="lg">
						Return to the public site <span aria-hidden="true">↗</span>
					</ButtonLink>
				</div>
			</PageHeader>
		</PageShell>
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
		<PageShell
			width="wide"
			className="grid min-h-[calc(100svh-170px)] content-center justify-items-start"
		>
			<PageHeader
				eyebrow="Private workspace"
				title={code === "forbidden" ? "This route is owner-only." : "Access is required."}
				description={message}
			>
				<div className="mt-7 flex flex-wrap gap-2.5">
					<ButtonLink href={actionHref} size="lg">
						{actionLabel} <span aria-hidden="true">↗</span>
					</ButtonLink>
					<ButtonLink href="/" variant="outline" size="lg">
						Return to the public site <span aria-hidden="true">↗</span>
					</ButtonLink>
				</div>
			</PageHeader>
		</PageShell>
	);
}

function CmsDashboard({ initial }: { initial: Extract<CmsSnapshotResult, { ok: true }> }) {
	const initialRaw = useMemo(() => JSON.stringify(initial.snapshot.draft, null, 2), [initial]);
	const [raw, setRaw] = useState(initialRaw);
	const [savedRaw, setSavedRaw] = useState(initialRaw);
	const [revision, setRevision] = useState(initial.snapshot.draftRevision);
	const [publishedRevision, setPublishedRevision] = useState(initial.snapshot.publishedRevision);
	const [publishedAt, setPublishedAt] = useState(initial.snapshot.publishedAt);
	const [csrfToken] = useState(initial.csrfToken);
	const [status, setStatus] = useState("Ready to edit the draft.");
	const [statusTone, setStatusTone] = useState<"neutral" | "success" | "error">("neutral");
	const [pendingAction, setPendingAction] = useState<"save" | "publish" | "upload" | null>(null);
	const save = useServerFn(saveDraft);
	const publish = useServerFn(publishDraft);
	const upload = useServerFn(uploadMedia);
	const parsedResult = useMemo(() => parseDraft(raw), [raw]);
	const parsed = parsedResult.value;
	const dirty = raw !== savedRaw;
	const busy = pendingAction !== null;
	const blocker = useBlocker({
		shouldBlockFn: () => dirty,
		enableBeforeUnload: () => dirty,
		withResolver: true,
	});

	useEffect(() => {
		if (dirty && !busy && statusTone === "neutral")
			setStatus("Unsaved changes. Save the draft before publishing.");
	}, [busy, dirty, statusTone]);

	const updateRaw = (next: string) => {
		setRaw(next);
		if (!busy) setStatusTone("neutral");
	};

	const updateField = (
		section: "site" | "identity" | "hero" | "contact",
		key: string,
		value: string,
	) => {
		if (!parsed) return;
		const currentSection = parsed[section] as unknown as Record<string, unknown>;
		updateRaw(
			JSON.stringify({ ...parsed, [section]: { ...currentSection, [key]: value } }, null, 2),
		);
	};

	const handleSave = async () => {
		if (!parsed) {
			setStatusTone("error");
			setStatus("Fix the highlighted document errors before saving.");
			return;
		}
		setPendingAction("save");
		setStatusTone("neutral");
		setStatus("Saving draft…");
		try {
			const result = await save({
				data: { content: parsed, expectedRevision: revision, csrfToken },
			});
			if (result.ok) {
				setRevision(result.revision);
				setSavedRaw(raw);
				setStatusTone("success");
				setStatus(`Draft saved at revision ${result.revision}.`);
			} else {
				setRevision(result.current.draftRevision);
				setStatusTone("error");
				setStatus(
					"A newer draft exists. Your local edits are still here. Review them, then save again.",
				);
			}
		} catch {
			setStatusTone("error");
			setStatus("The draft could not be saved. Check your session and try again.");
		} finally {
			setPendingAction(null);
		}
	};

	const handlePublish = async () => {
		if (dirty || !parsed) {
			setStatusTone("error");
			setStatus(
				dirty
					? "Save the current changes before publishing."
					: "Fix the document errors before publishing.",
			);
			return;
		}
		setPendingAction("publish");
		setStatusTone("neutral");
		setStatus("Publishing…");
		try {
			const result = await publish({ data: { expectedDraftRevision: revision, csrfToken } });
			if (result.ok) {
				setPublishedRevision(result.revision);
				setPublishedAt(result.publishedAt);
				setStatusTone("success");
				setStatus(
					`Revision ${result.revision} published. Public pages update after the edge cache refreshes.`,
				);
			} else {
				setRevision(result.current.draftRevision);
				const currentRaw = JSON.stringify(result.current.draft, null, 2);
				setRaw(currentRaw);
				setSavedRaw(currentRaw);
				setStatusTone("error");
				setStatus("Publishing found a newer draft. Review the latest version before trying again.");
			}
		} catch {
			setStatusTone("error");
			setStatus("The draft could not be published. Check your session and try again.");
		} finally {
			setPendingAction(null);
		}
	};

	const handleRevert = () => {
		updateRaw(savedRaw);
		setStatusTone("success");
		setStatus("Local changes reverted to the last saved draft.");
	};

	const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formElement = event.currentTarget;
		const form = new FormData(formElement);
		const file = form.get("file");
		const alt = String(form.get("alt") ?? "").trim();
		if (!(file instanceof File) || file.size === 0 || alt.length === 0) {
			setStatusTone("error");
			setStatus("Choose an image and provide meaningful alt text first.");
			return;
		}
		setPendingAction("upload");
		setStatusTone("neutral");
		setStatus("Uploading media…");
		try {
			const asset = await upload({ data: { file, alt, csrfToken } });
			setStatusTone("success");
			setStatus(`Uploaded ${asset.id}. Attach it to a content field before publishing.`);
			formElement.reset();
		} catch {
			setStatusTone("error");
			setStatus("The media upload failed. Check the file type, size, and session.");
		} finally {
			setPendingAction(null);
		}
	};

	const site = parsed?.site;
	const identity = parsed?.identity;
	const hero = parsed?.hero;
	const contact = parsed?.contact;
	const experienceCount = arrayLength(parsed?.experience);
	const projectCount = arrayLength(parsed?.projects);
	const storyCount = arrayLength(parsed?.story.chapters);
	const travelCount = arrayLength(parsed?.travel.entries);
	const linkCount = arrayLength(parsed?.profileLinks);
	const issueErrors = parsedResult.issues
		.slice(0, 8)
		.map((issue) => ({ message: `${issue.path}: ${issue.message}` }));
	const issueFor = (path: string) =>
		parsedResult.issues.find(
			(issue) =>
				issue.path === path ||
				issue.path.startsWith(`${path}.`) ||
				path.startsWith(`${issue.path}.`),
		)?.message;
	const siteTitleError = issueFor("site.title");
	const siteDescriptionError = issueFor("site.description");
	const nameError = issueFor("identity.name");
	const roleError = issueFor("identity.role");
	const locationError = issueFor("identity.location");
	const emailError = issueFor("identity.email");
	const heroEyebrowError = issueFor("hero.eyebrow");
	const heroTitleError = issueFor("hero.title");
	const heroIntroError = issueFor("hero.intro");
	const contactTitleError = issueFor("contact.title");

	return (
		<PageShell width="wide" data-page="cms" aria-busy={busy}>
			<div className="grid grid-cols-[minmax(0,1fr)_minmax(240px,320px)] items-end gap-8 max-[800px]:grid-cols-1">
				<PageHeader
					eyebrow={`Private workspace · ${initial.owner}`}
					title="Keep the route current."
					description="Edit the public story, proof, links, travel notes, media, and search metadata from one owner-only dashboard."
					className="mb-0"
				/>
				<div
					className="flex min-h-14 items-start gap-2 rounded-[18px] border border-border bg-muted/50 p-4 text-[13px] leading-[1.45] text-muted-foreground"
					role="status"
					aria-live="polite"
					aria-busy={busy}
				>
					<span
						className={
							statusTone === "error"
								? "mt-1.5 size-2 shrink-0 rounded-full bg-destructive"
								: "mt-1.5 size-2 shrink-0 rounded-full bg-signal"
						}
						aria-hidden="true"
					/>
					<span>{status}</span>
				</div>
			</div>

			<section
				className="mt-[clamp(42px,6vw,72px)] grid grid-cols-6 gap-2.5 max-[900px]:grid-cols-3 max-[560px]:grid-cols-2"
				aria-label="Content overview"
			>
				<StatusCard
					label="Draft revision"
					value={String(revision)}
					detail="Optimistic conflict checks enabled"
				/>
				<StatusCard
					label="Published revision"
					value={String(publishedRevision)}
					detail={publishedAt ?? "Not published yet"}
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

			<EditorSection
				eyebrow="Structured fields"
				title="Identity and search surface"
				description="High-value fields stay visible. Collections keep their existing schema in the advanced editor below."
			>
				<FieldGroup className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
					<CmsField id="site-title" label="Site title" error={siteTitleError}>
						<Input
							id="site-title"
							aria-invalid={siteTitleError ? true : undefined}
							value={stringValue(site?.title)}
							onChange={(event) => updateField("site", "title", event.target.value)}
						/>
					</CmsField>
					<CmsField id="site-description" label="Site description" error={siteDescriptionError}>
						<Textarea
							id="site-description"
							rows={3}
							aria-invalid={siteDescriptionError ? true : undefined}
							value={stringValue(site?.description)}
							onChange={(event) => updateField("site", "description", event.target.value)}
						/>
					</CmsField>
					<CmsField id="name" label="Name" error={nameError}>
						<Input
							id="name"
							autoComplete="name"
							aria-invalid={nameError ? true : undefined}
							value={stringValue(identity?.name)}
							onChange={(event) => updateField("identity", "name", event.target.value)}
						/>
					</CmsField>
					<CmsField id="role" label="Role" error={roleError}>
						<Input
							id="role"
							autoComplete="organization-title"
							aria-invalid={roleError ? true : undefined}
							value={stringValue(identity?.role)}
							onChange={(event) => updateField("identity", "role", event.target.value)}
						/>
					</CmsField>
					<CmsField id="location" label="Location" error={locationError}>
						<Input
							id="location"
							autoComplete="address-level2"
							aria-invalid={locationError ? true : undefined}
							value={stringValue(identity?.location)}
							onChange={(event) => updateField("identity", "location", event.target.value)}
						/>
					</CmsField>
					<CmsField id="email" label="Public email" error={emailError}>
						<Input
							id="email"
							type="email"
							autoComplete="email"
							aria-invalid={emailError ? true : undefined}
							value={stringValue(identity?.email)}
							onChange={(event) => updateField("identity", "email", event.target.value)}
						/>
					</CmsField>
					<CmsField id="hero-eyebrow" label="Hero eyebrow" error={heroEyebrowError}>
						<Input
							id="hero-eyebrow"
							aria-invalid={heroEyebrowError ? true : undefined}
							value={stringValue(hero?.eyebrow)}
							onChange={(event) => updateField("hero", "eyebrow", event.target.value)}
						/>
					</CmsField>
					<CmsField id="hero-title" label="Hero title" error={heroTitleError}>
						<Textarea
							id="hero-title"
							rows={3}
							aria-invalid={heroTitleError ? true : undefined}
							value={stringValue(hero?.title)}
							onChange={(event) => updateField("hero", "title", event.target.value)}
						/>
					</CmsField>
					<CmsField id="hero-intro" label="Hero introduction" error={heroIntroError}>
						<Textarea
							id="hero-intro"
							rows={3}
							aria-invalid={heroIntroError ? true : undefined}
							value={stringValue(hero?.intro)}
							onChange={(event) => updateField("hero", "intro", event.target.value)}
						/>
					</CmsField>
					<CmsField id="contact-title" label="Contact title" error={contactTitleError}>
						<Input
							id="contact-title"
							aria-invalid={contactTitleError ? true : undefined}
							value={stringValue(contact?.title)}
							onChange={(event) => updateField("contact", "title", event.target.value)}
						/>
					</CmsField>
				</FieldGroup>
			</EditorSection>

			<EditorSection
				eyebrow="Advanced fallback"
				title="The complete content document"
				description="Collections keep their existing schema and revision history. Invalid or stale drafts never reach public pages."
			>
				<FormField data-invalid={parsedResult.issues.length > 0 || undefined}>
					<FieldLabel htmlFor="portfolio-json">Portfolio JSON document</FieldLabel>
					<Textarea
						id="portfolio-json"
						name="portfolio-json"
						autoComplete="off"
						spellCheck={false}
						value={raw}
						onChange={(event) => updateRaw(event.target.value)}
						aria-invalid={parsedResult.issues.length > 0 || undefined}
						className="min-h-[min(520px,55vh)] resize-y font-mono text-[13px] leading-[1.5]"
					/>
					<FieldDescription>
						Use this editor for repeatable collections and fields that are not in the structured
						form.
					</FieldDescription>
					{issueErrors.length > 0 ? <FieldError errors={issueErrors} /> : null}
				</FormField>
				{parsedResult.issues.length > 0 ? (
					<Alert variant="destructive" className="mt-4">
						<AlertTitle>Fix the document before saving.</AlertTitle>
						<AlertDescription>
							<ul className="grid gap-1 pl-4">
								{parsedResult.issues.slice(0, 8).map((issue) => (
									<li key={`${issue.path}-${issue.message}`}>
										{issue.path}: {issue.message}
									</li>
								))}
							</ul>
						</AlertDescription>
					</Alert>
				) : null}
				<div className="mt-4 flex flex-wrap gap-2.5">
					<Button
						size="lg"
						type="button"
						disabled={busy || !parsed || parsedResult.issues.length > 0 || !dirty}
						onClick={() => void handleSave()}
					>
						{" "}
						{pendingAction === "save" ? "Saving…" : "Save draft"}{" "}
						<span data-icon="inline-end" aria-hidden="true">
							↗
						</span>
					</Button>
					<Button
						variant="outline"
						size="lg"
						type="button"
						disabled={busy || !parsed || parsedResult.issues.length > 0 || dirty}
						onClick={() => void handlePublish()}
					>
						{pendingAction === "publish" ? "Publishing…" : "Publish revision"}{" "}
						<span data-icon="inline-end" aria-hidden="true">
							↗
						</span>
					</Button>
					{dirty ? (
						<Button variant="ghost" size="lg" type="button" disabled={busy} onClick={handleRevert}>
							Revert local changes
						</Button>
					) : null}
				</div>
			</EditorSection>

			<EditorSection
				eyebrow="Media shelf"
				title="Upload a future memory."
				description="R2 is optional until its production bucket is enabled. Images need alt text before they can enter the document."
			>
				<form
					className="grid grid-cols-[repeat(2,minmax(0,1fr))_auto] items-end gap-4 max-[800px]:grid-cols-1"
					onSubmit={(event) => void handleUpload(event)}
				>
					<FormField>
						<FieldLabel htmlFor="media-file">Image or PDF</FieldLabel>
						<Input
							id="media-file"
							name="file"
							type="file"
							accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
						/>
					</FormField>
					<FormField>
						<FieldLabel htmlFor="media-alt">Alt text</FieldLabel>
						<Input
							id="media-alt"
							name="alt"
							type="text"
							autoComplete="off"
							maxLength={240}
							required
							placeholder="Describe the image…"
						/>
					</FormField>
					<Button variant="outline" type="submit" disabled={busy}>
						{pendingAction === "upload" ? "Uploading…" : "Upload media"}
					</Button>
				</form>
			</EditorSection>

			{blocker.status === "blocked" ? (
				<Alert className="mt-6" role="alert">
					<AlertTitle>You have unsaved changes.</AlertTitle>
					<AlertDescription className="flex flex-wrap items-center justify-between gap-3">
						<span>Leave this page and discard the local draft?</span>
						<span className="flex flex-wrap gap-2">
							<Button variant="outline" size="sm" type="button" onClick={blocker.reset}>
								Stay here
							</Button>
							<Button size="sm" type="button" onClick={blocker.proceed}>
								Leave page
							</Button>
						</span>
					</AlertDescription>
				</Alert>
			) : null}
		</PageShell>
	);
}

function EditorSection({
	eyebrow,
	title,
	description,
	children,
}: {
	eyebrow: string;
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<section
			className="grid grid-cols-[minmax(190px,.4fr)_minmax(0,1fr)] gap-8 border-t border-border py-10 max-[800px]:grid-cols-1 max-[800px]:gap-6"
			aria-labelledby={title.toLowerCase().replaceAll(" ", "-")}
		>
			<div>
				<p className="mb-3.5 text-xs font-extrabold uppercase tracking-[0.11em] text-primary-text">
					{eyebrow}
				</p>
				<h2
					id={title.toLowerCase().replaceAll(" ", "-")}
					className="m-0 max-w-[600px] text-[clamp(1.65rem,3vw,2.4rem)] font-[760] leading-none tracking-[-0.055em]"
				>
					{title}
				</h2>
				<p className="mt-3 max-w-[560px] text-[15px] leading-[1.55] text-muted-foreground">
					{description}
				</p>
			</div>
			<div className="min-w-0">{children}</div>
		</section>
	);
}

function CmsField({
	id,
	label,
	description,
	error,
	children,
}: {
	id: string;
	label: string;
	description?: React.ReactNode;
	error?: string;
	children: React.ReactNode;
}) {
	return (
		<FormField data-invalid={error ? true : undefined}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			{children}
			{description ? <FieldDescription>{description}</FieldDescription> : null}
			{error ? <FieldError>{error}</FieldError> : null}
		</FormField>
	);
}

function StatusCard({ label, value, detail }: { label: string; value: string; detail: string }) {
	return (
		<Surface className="min-w-0 p-4" size="sm">
			<CardHeader className="p-0">
				<CardTitle className="text-xs leading-[1.3] font-normal text-muted-foreground">
					{label}
				</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-1 p-0">
				<strong className="text-[28px] font-[760] tracking-[-0.06em]">{value}</strong>
				<span className="text-xs leading-[1.3] text-muted-foreground">{detail}</span>
			</CardContent>
		</Surface>
	);
}

function parseDraft(raw: string): { value: PortfolioContent | null; issues: ValidationIssue[] } {
	try {
		const value: unknown = JSON.parse(raw);
		const result = validatePortfolioContent(value);
		return result.ok ? { value: result.value, issues: [] } : { value: null, issues: result.issues };
	} catch {
		return { value: null, issues: [{ path: "$", message: "must contain valid JSON" }] };
	}
}

function stringValue(value: unknown) {
	return typeof value === "string" ? value : "";
}

function arrayLength(value: unknown) {
	return Array.isArray(value) ? value.length : 0;
}
