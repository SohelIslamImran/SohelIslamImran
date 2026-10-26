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
import type { MediaAsset, PortfolioContent } from "../types/content";

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
				description="Sign in to open the owner-only editor."
				className="mb-0 w-full min-w-0 max-w-full [overflow-wrap:anywhere]"
			>
				<div className="mt-7 flex min-w-0 max-w-full flex-wrap gap-2.5">
					<ButtonLink href="https://cms.sohelislamimran.com/" className="min-h-11" size="default">
						Open sign-in <span aria-hidden="true">↗</span>
					</ButtonLink>
					<ButtonLink href="/" variant="outline" className="min-h-11" size="default">
						Return to the public site <span aria-hidden="true">↗</span>
					</ButtonLink>
				</div>
			</PageHeader>
		</PageShell>
	);
}

function CmsRoute() {
	const result = Route.useLoaderData();
	if (!result.ok) return <CmsAccessState code={result.code} />;
	return <CmsDashboard initial={result} />;
}

function CmsAccessState({
	code,
}: {
	code: "unauthenticated" | "forbidden" | "configuration" | "unavailable";
}) {
	const actionLabel = code === "unauthenticated" ? "Open sign-in" : "Try again";
	const actionHref = code === "unauthenticated" ? "https://cms.sohelislamimran.com/" : "/cms";
	const title =
		code === "forbidden"
			? "This editor is owner-only."
			: code === "configuration"
				? "The editor is not ready."
				: code === "unavailable"
					? "The editor is temporarily unavailable."
					: "Sign-in required.";
	const description =
		code === "unauthenticated"
			? "Sign in to open the owner-only editor."
			: code === "forbidden"
				? "This editor is available only to the owner."
				: code === "configuration"
					? "The editor is not ready yet. Try again later."
					: "The editor is temporarily unavailable. Try again in a moment.";
	return (
		<PageShell
			width="wide"
			className="grid min-h-[calc(100svh-170px)] content-center justify-items-start"
		>
			<PageHeader
				eyebrow="Private workspace"
				title={title}
				description={description}
				className="mb-0 w-full min-w-0 max-w-full [overflow-wrap:anywhere]"
			>
				<div className="mt-7 flex min-w-0 max-w-full flex-wrap gap-2.5">
					<ButtonLink href={actionHref} className="min-h-11" size="default">
						{actionLabel} <span aria-hidden="true">↗</span>
					</ButtonLink>
					<ButtonLink href="/" variant="outline" className="min-h-11" size="default">
						Return to the public site <span aria-hidden="true">↗</span>
					</ButtonLink>
				</div>
			</PageHeader>
		</PageShell>
	);
}

const structuredControlIds = [
	["site.title", "site-title"],
	["site.description", "site-description"],
	["identity.name", "name"],
	["identity.role", "role"],
	["identity.location", "location"],
	["identity.email", "email"],
	["hero.eyebrow", "hero-eyebrow"],
	["hero.title", "hero-title"],
	["hero.intro", "hero-intro"],
	["contact.title", "contact-title"],
] as const;

type UploadField = "file" | "alt";
/**
 * Owner mutations fail with 401 when Access has expired and 403 when the CSRF
 * token or origin check fails. Both mean "reload the editor", which is a
 * different recovery from a transport failure, so they are named explicitly
 * rather than reported as a generic failure.
 */
function isAuthFailure(error: unknown): boolean {
	if (!(error instanceof Error) || !("status" in error)) return false;
	const status = (error as { status?: unknown }).status;
	return status === 401 || status === 403;
}

type UploadErrors = Partial<Record<UploadField, string>>;
type PendingAction = "save" | "publish" | "upload";
const invalidDraftStatus =
	"The JSON document is invalid. Repair it in the JSON editor; structured fields and media controls stay disabled until it is valid.";
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function firstInvalidControlId(issues: ValidationIssue[]) {
	const issuePath = issues[0]?.path;
	if (!issuePath) return "portfolio-json";
	return (
		structuredControlIds.find(
			([path]) =>
				issuePath === path || issuePath.startsWith(`${path}.`) || issuePath.startsWith(`${path}[`),
		)?.[1] ?? "portfolio-json"
	);
}

function focusControl(controlId: string) {
	if (typeof document === "undefined") return false;
	const control = document.getElementById(controlId);
	if (!(control instanceof HTMLElement) || control.hasAttribute("disabled")) return false;
	control.scrollIntoView({ block: "center", inline: "nearest" });
	control.focus({ preventScroll: true });
	return true;
}

function CmsDashboard({ initial }: { initial: Extract<CmsSnapshotResult, { ok: true }> }) {
	const initialRaw = useMemo(() => JSON.stringify(initial.snapshot.draft, null, 2), [initial]);
	const [raw, setRaw] = useState(initialRaw);
	const rawRef = React.useRef(raw);
	const [savedRaw, setSavedRaw] = useState(initialRaw);
	const [lastValidStructured, setLastValidStructured] = useState<PortfolioContent>(
		initial.snapshot.draft,
	);
	const lastValidStructuredRef = React.useRef(lastValidStructured);
	const [revision, setRevision] = useState(initial.snapshot.draftRevision);
	const [publishedRevision, setPublishedRevision] = useState(initial.snapshot.publishedRevision);
	const [publishedAt, setPublishedAt] = useState(initial.snapshot.publishedAt);
	const [csrfToken] = useState(initial.csrfToken);
	const [lastUploadedAsset, setLastUploadedAsset] = useState<MediaAsset | null>(null);
	const [uploadErrors, setUploadErrors] = useState<UploadErrors>({});
	const [status, setStatus] = useState("Ready to edit the draft.");
	const [statusTone, setStatusTone] = useState<"neutral" | "success" | "error">("neutral");
	const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
	const pendingActionRef = React.useRef<PendingAction | null>(null);
	const save = useServerFn(saveDraft);
	const publish = useServerFn(publishDraft);
	const upload = useServerFn(uploadMedia);
	const parsedResult = useMemo(() => parseDraft(raw), [raw]);
	const parsed = parsedResult.value;
	const dirty = raw !== savedRaw;
	const busy = pendingAction !== null;
	const structuredDisabled = busy || !parsed;

	useEffect(() => {
		if (!parsed) return;
		lastValidStructuredRef.current = parsed;
		setLastValidStructured((current) => (current === parsed ? current : parsed));
	}, [parsed]);

	const stayButtonRef = React.useRef<HTMLButtonElement>(null);
	const blockerFocusRef = React.useRef<HTMLElement | null>(null);
	const blockerWasBlockedRef = React.useRef(false);
	const restoreFocusRef = React.useRef(false);
	const blocker = useBlocker({
		shouldBlockFn: () => dirty || pendingActionRef.current !== null,
		enableBeforeUnload: () => dirty || pendingActionRef.current !== null,
		withResolver: true,
	});

	useEffect(() => {
		if (busy) return;
		if (!parsed) {
			setStatusTone("error");
			setStatus(invalidDraftStatus);
			return;
		}
		if (dirty && statusTone === "neutral")
			setStatus("Unsaved changes. Save the draft before publishing.");
	}, [busy, dirty, parsed, statusTone]);

	useEffect(() => {
		if (blocker.status === "blocked") {
			if (!blockerWasBlockedRef.current && typeof document !== "undefined") {
				blockerFocusRef.current =
					document.activeElement instanceof HTMLElement ? document.activeElement : null;
			}
			blockerWasBlockedRef.current = true;
			stayButtonRef.current?.focus();
			return;
		}

		if (!blockerWasBlockedRef.current) return;
		blockerWasBlockedRef.current = false;
		if (restoreFocusRef.current) {
			const focusTarget = blockerFocusRef.current;
			restoreFocusRef.current = false;
			blockerFocusRef.current = null;
			if (focusTarget?.isConnected) focusTarget.focus();
		} else {
			blockerFocusRef.current = null;
		}
	}, [blocker.status]);

	const updateRaw = (next: string) => {
		rawRef.current = next;
		setRaw(next);
		if (busy) return;
		if (!parseDraft(next).value) {
			setStatusTone("error");
			setStatus(invalidDraftStatus);
		} else {
			setStatusTone("neutral");
			if (next === savedRaw) setStatus("Ready to edit the draft.");
		}
	};

	const editableDocument = () => {
		const current = parseJsonObject(rawRef.current);
		if (!current || !parseDraft(rawRef.current).value) return null;
		return current;
	};

	const updateField = (
		section: "site" | "identity" | "hero" | "contact",
		key: string,
		value: string,
	) => {
		const current = editableDocument();
		if (!current) return;
		const currentSection = current[section];
		if (!isJsonObject(currentSection)) return;
		updateRaw(
			JSON.stringify({ ...current, [section]: { ...currentSection, [key]: value } }, null, 2),
		);
	};

	const appendMediaAsset = (asset: MediaAsset) => {
		const current = editableDocument();
		if (!current || !Array.isArray(current.media)) return false;
		const currentMedia = current.media.filter(isMediaAsset);
		updateRaw(
			JSON.stringify(
				{
					...current,
					media: [...currentMedia.filter((item) => item.id !== asset.id), asset],
				},
				null,
				2,
			),
		);
		return true;
	};

	const setConflictBaseline = (draft: PortfolioContent) => {
		setSavedRaw(JSON.stringify(draft, null, 2));
		if (!parseDraft(rawRef.current).value) {
			lastValidStructuredRef.current = draft;
			setLastValidStructured(draft);
		}
	};

	const updateMediaReference = (target: "avatar" | number, assetId: string) => {
		const current = editableDocument();
		if (
			!current ||
			!Array.isArray(current.media) ||
			!isJsonObject(current.identity) ||
			!Array.isArray(current.projects)
		) {
			return;
		}
		const currentMedia = current.media.filter(isMediaAsset);
		const availableAssets = lastUploadedAsset
			? [...currentMedia.filter((item) => item.id !== lastUploadedAsset.id), lastUploadedAsset]
			: currentMedia;
		const asset = availableAssets.find((item) => item.id === assetId) ?? null;
		const next = asset ? { ...asset } : null;
		const currentIdentity = current.identity;
		const currentProjects = current.projects.map((project) =>
			isJsonObject(project) ? project : {},
		);
		const nextContent = {
			...current,
			media: asset ? [...currentMedia.filter((item) => item.id !== asset.id), asset] : currentMedia,
		};
		const value =
			target === "avatar"
				? { ...nextContent, identity: { ...currentIdentity, avatar: next } }
				: {
						...nextContent,
						projects: currentProjects.map((project, index) =>
							index === target ? { ...project, cover: next } : project,
						),
					};
		updateRaw(JSON.stringify(value, null, 2));
	};

	const focusFirstInvalid = () => {
		const controlId = firstInvalidControlId(parsedResult.issues);
		if (focusControl(controlId)) return;
		if (controlId !== "portfolio-json") focusControl("portfolio-json");
	};

	const focusUploadControl = (field: UploadField) => {
		focusControl(`media-${field}`);
	};

	const clearUploadError = (field: UploadField) => {
		setUploadErrors((current) => {
			if (!current[field]) return current;
			const next = { ...current };
			delete next[field];
			return next;
		});
	};

	const handleSave = async () => {
		if (busy || pendingActionRef.current !== null) return;
		if (!parsed) {
			setStatusTone("error");
			setStatus(invalidDraftStatus);
			focusFirstInvalid();
			return;
		}
		if (!dirty) return;
		const submittedRaw = raw;
		pendingActionRef.current = "save";
		setPendingAction("save");
		setStatusTone("neutral");
		setStatus("Saving draft…");
		try {
			const result = await save({
				data: { content: parsed, expectedRevision: revision, csrfToken },
			});
			if (result.ok) {
				const newerEdits = rawRef.current !== submittedRaw;
				lastValidStructuredRef.current = parsed;
				setLastValidStructured(parsed);
				setRevision(result.revision);

				setSavedRaw(submittedRaw);
				setStatusTone("success");
				setStatus(
					`Draft saved at revision ${result.revision}.${newerEdits ? " Newer local edits remain unsaved." : ""}`,
				);
			} else {
				const newerEdits = rawRef.current !== submittedRaw;
				setRevision(result.current.draftRevision);
				setPublishedRevision(result.current.publishedRevision);
				setPublishedAt(result.current.publishedAt);
				setConflictBaseline(result.current.draft);
				setStatusTone("error");
				setStatus(
					newerEdits
						? "A newer draft exists. Your local edits are still here. Review them, then save again."
						: "A newer draft exists. Your local copy is still here. Review it, then save again.",
				);
			}
		} catch (error) {
			setStatusTone("error");
			setStatus(
				isAuthFailure(error)
					? "Your session expired. Reload the editor, then save again."
					: "The draft could not be saved. Try again.",
			);
		} finally {
			pendingActionRef.current = null;
			setPendingAction(null);
		}
	};

	const handlePublish = async () => {
		if (busy || pendingActionRef.current !== null) return;
		if (!parsed) {
			setStatusTone("error");
			setStatus(invalidDraftStatus);
			focusFirstInvalid();
			return;
		}
		if (dirty) {
			setStatusTone("error");
			setStatus("Save the current changes before publishing.");
			return;
		}
		if (!window.confirm(`Publish revision ${revision} to the public site?`)) return;
		const submittedRaw = raw;
		pendingActionRef.current = "publish";
		setPendingAction("publish");
		setStatusTone("neutral");
		setStatus("Publishing…");
		try {
			const result = await publish({ data: { expectedDraftRevision: revision, csrfToken } });
			if (result.ok) {
				const newerEdits = rawRef.current !== submittedRaw;
				const localEditsMessage = newerEdits ? " Newer local edits remain unsaved." : "";
				const publicMessage =
					result.status === "already-published"
						? " The public site is already up to date."
						: " The public site will update shortly.";
				setPublishedRevision(result.revision);
				setPublishedAt(result.publishedAt);
				setStatusTone("success");
				setStatus(
					result.status === "already-published"
						? `Revision ${result.revision} is already published.${localEditsMessage}${publicMessage}`
						: `Revision ${result.revision} published.${localEditsMessage}${publicMessage}`,
				);
			} else {
				const newerEdits = rawRef.current !== submittedRaw;
				setRevision(result.current.draftRevision);
				setPublishedRevision(result.current.publishedRevision);
				setPublishedAt(result.current.publishedAt);
				setConflictBaseline(result.current.draft);
				setStatusTone("error");
				setStatus(
					newerEdits
						? "Publishing found a newer draft. Your local edits are still here. Save them again before publishing."
						: "Publishing found a newer draft. Your local copy is still here. Review it before trying again.",
				);
			}
		} catch (error) {
			setStatusTone("error");
			setStatus(
				isAuthFailure(error)
					? "Your session expired. Reload the editor, then publish again."
					: "The draft could not be published. Try again.",
			);
		} finally {
			pendingActionRef.current = null;
			setPendingAction(null);
		}
	};

	const handleRevert = () => {
		if (busy || pendingActionRef.current !== null || !dirty) return;
		if (
			typeof window === "undefined" ||
			!window.confirm("Revert local changes to the latest saved draft?")
		) {
			return;
		}
		updateRaw(savedRaw);
		setStatusTone("success");
		setStatus("Local changes reverted to the latest saved draft.");
	};

	const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (busy || pendingActionRef.current !== null) return;
		if (!parseDraft(rawRef.current).value) {
			setStatusTone("error");
			setStatus(invalidDraftStatus);
			focusFirstInvalid();
			return;
		}
		setUploadErrors({});
		const formElement = event.currentTarget;
		const form = new FormData(formElement);
		const file = form.get("file");
		const alt = String(form.get("alt") ?? "").trim();
		if (!(file instanceof File) || file.size === 0) {
			setUploadErrors({ file: "Choose an image file first." });
			setStatusTone("error");
			setStatus("Choose an image file first.");
			focusUploadControl("file");
			return;
		}
		if (!file.type.toLowerCase().startsWith("image/")) {
			const message = "Choose a JPG, PNG, WebP, or AVIF image.";
			setUploadErrors({ file: message });
			setStatusTone("error");
			setStatus(message);
			focusUploadControl("file");
			return;
		}
		if (file.size > MAX_UPLOAD_BYTES) {
			const message = `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 20 MB.`;
			setUploadErrors({ file: message });
			setStatusTone("error");
			setStatus(message);
			focusUploadControl("file");
			return;
		}
		if (alt.length === 0) {
			const message = "Add meaningful alt text for the image first.";
			setUploadErrors({ alt: message });
			setStatusTone("error");
			setStatus(message);
			focusUploadControl("alt");
			return;
		}
		pendingActionRef.current = "upload";
		setPendingAction("upload");
		setStatusTone("neutral");
		setStatus("Uploading image…");
		try {
			const asset = await upload({ data: { file, alt, csrfToken } });
			setLastUploadedAsset(asset);
			const attached = appendMediaAsset(asset);
			setStatusTone(attached ? "success" : "error");
			setStatus(
				attached
					? "Image uploaded. Attach it to a field, then save the draft."
					: "Image uploaded. Repair the JSON document before attaching it.",
			);
			formElement.reset();
		} catch (error) {
			// MediaUploadError carries a specific, actionable reason (wrong type,
			// oversize, missing alt). Blaming the file with a generic string
			// throws that away, so surface the server's message and only move
			// focus when the problem is genuinely in the file field.
			const serverMessage =
				error instanceof Error && error.name === "MediaUploadError" ? error.message : null;
			if (serverMessage) {
				setUploadErrors({ file: serverMessage });
				setStatusTone("error");
				setStatus(serverMessage);
				focusUploadControl("file");
			} else {
				setUploadErrors({});
				setStatusTone("error");
				setStatus(
					isAuthFailure(error)
						? "Your session expired. Reload the editor, then try again."
						: "The image could not be uploaded. Check your connection and try again.",
				);
			}
		} finally {
			pendingActionRef.current = null;
			setPendingAction(null);
		}
	};

	const structured = mergeStructuredContent(lastValidStructured, raw);
	const contentForView = parsed ?? lastValidStructured;
	const site = structured.site;
	const identity = structured.identity;
	const hero = structured.hero;
	const contact = structured.contact;
	const mediaAssets = [...contentForView.media, ...(lastUploadedAsset ? [lastUploadedAsset] : [])]
		.filter((asset, index, assets) => assets.findIndex((item) => item.id === asset.id) === index)
		.filter((asset) => !asset.mimeType || asset.mimeType.startsWith("image/"));
	const experienceCount = arrayLength(contentForView.experience);
	const projectCount = arrayLength(contentForView.projects);
	const storyCount = arrayLength(contentForView.story.chapters);
	const travelCount = arrayLength(contentForView.travel.entries);
	const linkCount = arrayLength(contentForView.profileLinks);
	const validationIssueCount = parsedResult.issues.length;
	const visibleIssues = parsedResult.issues.slice(0, 8);
	const remainingIssueCount = validationIssueCount - visibleIssues.length;
	const issueErrors = visibleIssues.map((issue) => `${issue.path}: ${issue.message}`);
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
			<PageHeader
				eyebrow="Private workspace"
				title="Keep the route current."
				description={
					initial.mediaEnabled
						? "Edit the public story, proof, links, travel notes, media, and search metadata from one owner-only dashboard."
						: "Edit the public story, proof, links, travel notes, and search metadata from one owner-only dashboard."
				}
				className="mb-6"
			/>

			<div
				data-material="glass"
				className="sticky top-[calc(4.75rem+0.5rem+env(safe-area-inset-top))] z-10 -mx-1 rounded-[18px] border border-border bg-[color-mix(in_srgb,var(--theme-surface-solid)_88%,transparent)] p-2 shadow-[0_10px_28px_var(--theme-shadow)] backdrop-blur-xl sm:-mx-2"
			>
				<div
					role="group"
					aria-label="Draft actions"
					aria-busy={busy}
					className="flex min-w-0 flex-wrap items-center gap-2"
				>
					<div
						className="flex min-h-11 min-w-0 flex-1 basis-72 items-start gap-2 rounded-[14px] bg-muted/55 px-3 py-2 text-[13px] leading-[1.45] text-muted-foreground"
						role={statusTone === "error" ? "alert" : "status"}
						aria-live={statusTone === "error" ? "assertive" : "polite"}
						aria-busy={busy}
					>
						<span
							className={
								statusTone === "error"
									? "mt-1.5 size-2 shrink-0 rounded-full bg-destructive"
									: statusTone === "success"
										? "mt-1.5 size-2 shrink-0 rounded-full bg-primary-text"
										: "mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground/60"
							}
							aria-hidden="true"
						/>
						<span className="min-w-0">{status}</span>
					</div>
					<div className="flex flex-wrap gap-2 max-[560px]:w-full">
						<Button
							className="min-h-11 aria-disabled:opacity-50"
							size="default"
							type="button"
							aria-disabled={busy || !dirty || !parsed}
							aria-busy={pendingAction === "save"}
							onClick={() => void handleSave()}
						>
							{pendingAction === "save" ? "Saving…" : "Save draft"}
							<span data-icon="inline-end" aria-hidden="true">
								↗
							</span>
						</Button>
						<Button
							variant="outline"
							className="min-h-11 border-control-border aria-disabled:opacity-50"
							size="default"
							type="button"
							aria-disabled={busy || !parsed || dirty}
							aria-busy={pendingAction === "publish"}
							onClick={() => void handlePublish()}
						>
							{pendingAction === "publish" ? "Publishing…" : "Publish revision"}
							<span data-icon="inline-end" aria-hidden="true">
								↗
							</span>
						</Button>
						<Button
							variant="ghost"
							className="min-h-11 aria-disabled:opacity-50"
							size="default"
							type="button"
							aria-disabled={busy || !dirty}
							onClick={handleRevert}
						>
							Revert
						</Button>
					</div>
				</div>
			</div>

			{blocker.status === "blocked" ? (
				<Alert className="mt-6" aria-labelledby="unsaved-changes-title">
					<AlertTitle id="unsaved-changes-title">
						{busy ? "An update is in progress." : "You have unsaved changes."}
					</AlertTitle>
					<AlertDescription className="flex flex-wrap items-center justify-between gap-3">
						<span>
							{busy
								? "Leave this page and discard local changes?"
								: "Leave this page and discard the local draft?"}
						</span>
						<span className="flex flex-wrap gap-2">
							<Button
								ref={stayButtonRef}
								variant="outline"
								className="min-h-11"
								size="default"
								type="button"
								onClick={() => {
									restoreFocusRef.current = true;
									blocker.reset?.();
								}}
							>
								Stay here
							</Button>
							<Button
								className="min-h-11"
								size="default"
								type="button"
								onClick={() => {
									restoreFocusRef.current = false;
									blocker.proceed?.();
								}}
							>
								Leave page
							</Button>
						</span>
					</AlertDescription>
				</Alert>
			) : null}

			<section
				className="mt-[clamp(42px,6vw,72px)] grid grid-cols-6 gap-2.5 max-[900px]:grid-cols-3 max-[560px]:grid-cols-2"
				aria-label="Content overview"
			>
				<StatusCard
					label="Draft revision"
					value={String(revision)}
					detail="Changes are checked before saving"
				/>
				<StatusCard
					label="Published revision"
					value={String(publishedRevision)}
					detail={publishedAt ?? "Not published yet"}
				/>
				<StatusCard
					label="Experience"
					value={String(experienceCount)}
					detail="Roles, newest first"
				/>
				<StatusCard label="Proof" value={String(projectCount)} detail="Projects and public work" />
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
				{!parsed ? (
					<p
						id="structured-fields-status"
						className="mb-4 rounded-[14px] border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
						role="status"
					>
						JSON document is invalid. Repair it in the JSON editor; structured fields and media
						controls stay disabled until it is valid.
					</p>
				) : null}
				<FieldGroup
					aria-disabled={structuredDisabled || undefined}
					aria-invalid={!parsed || undefined}
					aria-describedby={!parsed ? "structured-fields-status" : undefined}
					className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1"
				>
					<CmsField id="site-title" label="Site title" error={siteTitleError}>
						<Input
							id="site-title"
							name="site-title"
							autoComplete="off"
							className="scroll-mt-48"
							readOnly={structuredDisabled}
							aria-required="true"
							required
							aria-invalid={siteTitleError ? true : undefined}
							value={stringValue(site?.title)}
							onChange={(event) => updateField("site", "title", event.target.value)}
						/>
					</CmsField>
					<CmsField id="site-description" label="Site description" error={siteDescriptionError}>
						<Textarea
							id="site-description"
							name="site-description"
							autoComplete="off"
							rows={3}
							readOnly={structuredDisabled}
							aria-invalid={siteDescriptionError ? true : undefined}
							value={stringValue(site?.description)}
							onChange={(event) => updateField("site", "description", event.target.value)}
						/>
					</CmsField>
					<CmsField id="name" label="Name" error={nameError}>
						<Input
							id="name"
							name="name"
							autoComplete="name"
							className="scroll-mt-48"
							readOnly={structuredDisabled}
							aria-required="true"
							required
							aria-invalid={nameError ? true : undefined}
							value={stringValue(identity?.name)}
							onChange={(event) => updateField("identity", "name", event.target.value)}
						/>
					</CmsField>
					<CmsField id="role" label="Role" error={roleError}>
						<Input
							id="role"
							name="role"
							autoComplete="organization-title"
							className="scroll-mt-48"
							readOnly={structuredDisabled}
							aria-invalid={roleError ? true : undefined}
							value={stringValue(identity?.role)}
							onChange={(event) => updateField("identity", "role", event.target.value)}
						/>
					</CmsField>
					<CmsField id="location" label="Location" error={locationError}>
						<Input
							id="location"
							name="location"
							autoComplete="address-level2"
							className="scroll-mt-48"
							readOnly={structuredDisabled}
							aria-invalid={locationError ? true : undefined}
							value={stringValue(identity?.location)}
							onChange={(event) => updateField("identity", "location", event.target.value)}
						/>
					</CmsField>
					<CmsField id="email" label="Public email" error={emailError}>
						<Input
							id="email"
							name="email"
							type="email"
							autoComplete="email"
							spellCheck={false}
							className="scroll-mt-48"
							readOnly={structuredDisabled}
							aria-required="true"
							required
							aria-invalid={emailError ? true : undefined}
							value={stringValue(identity?.email)}
							onChange={(event) => updateField("identity", "email", event.target.value)}
						/>
					</CmsField>
					<CmsField id="hero-eyebrow" label="Hero eyebrow" error={heroEyebrowError}>
						<Input
							id="hero-eyebrow"
							name="hero-eyebrow"
							autoComplete="off"
							className="scroll-mt-48"
							readOnly={structuredDisabled}
							aria-invalid={heroEyebrowError ? true : undefined}
							value={stringValue(hero?.eyebrow)}
							onChange={(event) => updateField("hero", "eyebrow", event.target.value)}
						/>
					</CmsField>
					<CmsField id="hero-title" label="Hero title" error={heroTitleError}>
						<Textarea
							id="hero-title"
							name="hero-title"
							autoComplete="off"
							rows={3}
							readOnly={structuredDisabled}
							aria-required="true"
							required
							aria-invalid={heroTitleError ? true : undefined}
							value={stringValue(hero?.title)}
							onChange={(event) => updateField("hero", "title", event.target.value)}
						/>
					</CmsField>
					<CmsField id="hero-intro" label="Hero introduction" error={heroIntroError}>
						<Textarea
							id="hero-intro"
							name="hero-intro"
							autoComplete="off"
							rows={3}
							readOnly={structuredDisabled}
							aria-invalid={heroIntroError ? true : undefined}
							value={stringValue(hero?.intro)}
							onChange={(event) => updateField("hero", "intro", event.target.value)}
						/>
					</CmsField>
					<CmsField id="contact-title" label="Contact title" error={contactTitleError}>
						<Input
							id="contact-title"
							name="contact-title"
							autoComplete="off"
							className="scroll-mt-48"
							readOnly={structuredDisabled}
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
				description="Collections keep their existing schema. Fix the document before saving or publishing it."
			>
				<FormField data-invalid={parsedResult.issues.length > 0 || undefined}>
					<FieldLabel htmlFor="portfolio-json">Portfolio JSON document</FieldLabel>
					<Textarea
						id="portfolio-json"
						name="portfolio-json"
						autoComplete="off"
						spellCheck={false}
						rows={16}
						value={raw}
						onChange={(event) => updateRaw(event.target.value)}
						aria-required="true"
						required
						aria-invalid={validationIssueCount > 0 || undefined}
						aria-describedby={
							validationIssueCount > 0
								? "portfolio-json-description portfolio-json-error"
								: "portfolio-json-description"
						}
						aria-errormessage={validationIssueCount > 0 ? "portfolio-json-error" : undefined}
						className="h-[min(520px,55vh)] max-h-[min(520px,55vh)] resize-y overflow-y-auto font-mono text-[13px] leading-[1.5]"
					/>
					<FieldDescription id="portfolio-json-description">
						Use this editor for repeatable collections and fields that are not in the structured
						form.
					</FieldDescription>
					{validationIssueCount > 0 ? (
						<FieldError live={false} id="portfolio-json-error">
							<p>
								{validationIssueCount} validation {validationIssueCount === 1 ? "issue" : "issues"}.{" "}
								{remainingIssueCount > 0
									? `${remainingIssueCount} more ${remainingIssueCount === 1 ? "issue" : "issues"} not shown.`
									: "All issues are shown."}
							</p>
							<ul className="ml-4 flex list-disc flex-col gap-1">
								{issueErrors.map((message, index) => (
									<li key={`${index}-${message}`}>{message}</li>
								))}
							</ul>
						</FieldError>
					) : null}
				</FormField>
				<p className="mt-4 text-sm text-muted-foreground">
					Use the actions above to save, publish, or return to the last saved draft.
				</p>
			</EditorSection>

			{initial.mediaEnabled ? (
				<EditorSection
					eyebrow="Media shelf"
					title="Upload a future memory."
					description="Uploads stay private until you publish a document that uses them. Add alt text before uploading an image."
				>
					<form
						className="grid grid-cols-[repeat(2,minmax(0,1fr))_auto] items-end gap-4 max-[800px]:grid-cols-1"
						aria-busy={busy}
						aria-disabled={structuredDisabled || undefined}
						noValidate
						onSubmit={(event) => void handleUpload(event)}
					>
						<CmsField
							id="media-file"
							label="Image"
							description="Choose a JPG, PNG, WebP, or AVIF image."
							error={uploadErrors.file}
						>
							<Input
								id="media-file"
								name="file"
								autoComplete="off"
								type="file"
								accept="image/jpeg,image/png,image/webp,image/avif"
								className="scroll-mt-48"
								readOnly={structuredDisabled}
								aria-required="true"
								required
								aria-invalid={uploadErrors.file ? true : undefined}
								onChange={() => clearUploadError("file")}
							/>
						</CmsField>
						<CmsField
							id="media-alt"
							label="Alt text"
							description="Required for images."
							error={uploadErrors.alt}
						>
							<Input
								id="media-alt"
								name="alt"
								type="text"
								autoComplete="off"
								maxLength={240}
								placeholder="Describe the image…"
								className="scroll-mt-48"
								readOnly={structuredDisabled}
								aria-required="true"
								required
								aria-invalid={uploadErrors.alt ? true : undefined}
								onChange={() => clearUploadError("alt")}
							/>
						</CmsField>
						<Button
							variant="outline"
							className="min-h-11 aria-disabled:opacity-50"
							size="default"
							type="submit"
							aria-disabled={structuredDisabled}
							aria-busy={pendingAction === "upload"}
						>
							{pendingAction === "upload" ? "Uploading…" : "Upload image"}
						</Button>
					</form>
					<div className="mt-8 grid gap-5 border-t border-border pt-6">
						<div>
							<p className="m-0 text-sm font-[750] text-foreground">Attach an image</p>
							<p className="m-0 mt-1 text-sm leading-[1.5] text-muted-foreground">
								Choose an uploaded image for the portrait or a project cover. The image stays
								private until the draft is published.
							</p>
						</div>
						{!parsed ? (
							<p
								id="media-fields-status"
								className="m-0 rounded-[14px] border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
								role="status"
							>
								Repair the JSON document before uploading or attaching media.
							</p>
						) : null}
						{mediaAssets.length > 0 ? (
							<div className="grid gap-4 sm:grid-cols-2">
								<MediaPicker
									id="media-avatar"
									label="Portrait"
									assets={mediaAssets}
									value={identity?.avatar?.id ?? ""}
									disabled={structuredDisabled}
									onChange={(value) => updateMediaReference("avatar", value)}
								/>
								{contentForView.projects.map((project, index) => (
									<MediaPicker
										id={`media-project-${index}`}
										label={`${project.title} cover`}
										assets={mediaAssets}
										value={project.cover?.id ?? ""}
										disabled={structuredDisabled}
										onChange={(value) => updateMediaReference(index, value)}
									/>
								))}
							</div>
						) : (
							<p className="m-0 rounded-[16px] border border-dashed border-border p-4 text-sm text-muted-foreground">
								{lastUploadedAsset
									? "Image uploaded. Fix the JSON document before attaching it."
									: "Upload an image to start the private media library."}
							</p>
						)}
					</div>
				</EditorSection>
			) : null}
		</PageShell>
	);
}

function MediaPicker({
	id,
	label,
	assets,
	value,
	disabled,
	onChange,
}: {
	id: string;
	label: string;
	assets: MediaAsset[];
	value: string;
	disabled?: boolean;
	onChange: (value: string) => void;
}) {
	return (
		<FormField data-disabled={disabled || undefined}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<select
				id={id}
				name={id}
				autoComplete="off"
				aria-disabled={disabled || undefined}
				className="min-h-11 w-full scroll-mt-48 rounded-[12px] border border-control-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:bg-muted aria-disabled:opacity-50"
				value={value}
				onChange={(event) => {
					if (!disabled) onChange(event.target.value);
				}}
			>
				<option value="">None</option>
				{assets.map((asset) => (
					<option key={asset.id} value={asset.id}>
						{asset.alt || asset.id}
					</option>
				))}
			</select>
		</FormField>
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
	const descriptionId = description ? `${id}-description` : undefined;
	const errorId = error ? `${id}-error` : undefined;
	const control = React.Children.only(children) as React.ReactElement<{
		"aria-describedby"?: string;
		"aria-errormessage"?: string;
		"aria-disabled"?: boolean | "true" | "false";
		disabled?: boolean;
		readOnly?: boolean;
	}>;
	const describedBy =
		[control.props["aria-describedby"], descriptionId, errorId].filter(Boolean).join(" ") ||
		undefined;
	const errorMessage =
		[control.props["aria-errormessage"], errorId].filter(Boolean).join(" ") || undefined;
	const disabled =
		control.props.disabled ||
		control.props.readOnly ||
		control.props["aria-disabled"] === true ||
		control.props["aria-disabled"] === "true";

	return (
		<FormField data-invalid={error ? true : undefined} data-disabled={disabled || undefined}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			{React.cloneElement(control, {
				"aria-describedby": describedBy,
				"aria-errormessage": errorMessage,
			})}
			{description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
			{error ? (
				<FieldError live={false} id={errorId}>
					{error}
				</FieldError>
			) : null}
		</FormField>
	);
}

function StatusCard({ label, value, detail }: { label: string; value: string; detail: string }) {
	return (
		<Surface className="min-w-0 max-w-full p-4 [overflow-wrap:anywhere]" size="sm">
			<CardHeader className="min-w-0 p-0">
				<CardTitle className="min-w-0 break-words text-xs leading-[1.3] font-normal text-muted-foreground [overflow-wrap:anywhere]">
					{label}
				</CardTitle>
			</CardHeader>
			<CardContent className="grid min-w-0 gap-1 p-0">
				<strong className="min-w-0 break-words text-[28px] font-[760] tracking-[-0.06em] [overflow-wrap:anywhere]">
					{value}
				</strong>
				<span className="min-w-0 break-words text-xs leading-[1.3] text-muted-foreground [overflow-wrap:anywhere]">
					{detail}
				</span>
			</CardContent>
		</Surface>
	);
}

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseJsonObject(raw: string): JsonObject | null {
	try {
		const value: unknown = JSON.parse(raw);
		return isJsonObject(value) ? value : null;
	} catch {
		return null;
	}
}

function mergeSection<T extends object>(fallback: T, value: unknown): T {
	if (!isJsonObject(value)) return fallback;
	const merged = { ...fallback } as JsonObject;
	for (const key of Object.keys(fallback)) {
		if (typeof value[key] === "string") merged[key] = value[key];
	}
	return merged as T;
}

function mergeStructuredContent(snapshot: PortfolioContent, raw: string): PortfolioContent {
	const current = parseJsonObject(raw);
	return {
		...snapshot,
		site: mergeSection(snapshot.site, current?.site),
		identity: mergeSection(snapshot.identity, current?.identity),
		hero: mergeSection(snapshot.hero, current?.hero),
		contact: mergeSection(snapshot.contact, current?.contact),
	};
}

function isMediaAsset(value: unknown): value is MediaAsset {
	return (
		isJsonObject(value) &&
		typeof value.id === "string" &&
		typeof value.key === "string" &&
		typeof value.alt === "string"
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
