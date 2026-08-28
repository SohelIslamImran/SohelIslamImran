/**
 * Server-only CMS primitives for TanStack Start.
 *
 * This module is deliberately a thin adapter over the existing storage layer.
 * Keeping the D1/R2 implementation in app/lib means the React Router build can
 * remain a rollback target while the Start app is migrated incrementally.
 */
import { env } from "cloudflare:workers";
import {
	getAdminSnapshot,
	getPublishedContent as readPublishedContent,
	publishDraft as publishDraftInStorage,
	saveDraft as saveDraftInStorage,
	type CmsDocumentSnapshot,
	type PublishDraftResult,
	type SaveDraftResult,
} from "../../app/lib/cms.server";
import {
	getCsrfToken,
	requireOwner,
	verifyCsrfToken,
	type AccessAuthEnvironment,
} from "../../app/lib/auth.server";
import {
	uploadMedia as uploadStoredMedia,
	type MediaEnvironment,
} from "../../app/lib/media.server";
import type { PortfolioContent } from "../../app/types/content";

export type CmsRuntime = AccessAuthEnvironment & MediaEnvironment & { CMS_ORIGIN?: string };

function runtime(): CmsRuntime {
	return env as unknown as CmsRuntime;
}

/** The CMS host is separate from the public origin, but remains configurable. */
export function cmsOrigin(environment: CmsRuntime = runtime()): string {
	const origin = environment.CMS_ORIGIN ?? environment.APP_ORIGIN;
	if (!origin) throw new Response("The application origin is not configured.", { status: 503 });
	return origin;
}

export async function readPublished(): Promise<PortfolioContent> {
	return readPublishedContent(runtime());
}

export async function readAdminSnapshot(request: Request): Promise<{
	snapshot: CmsDocumentSnapshot;
	csrfToken: string;
	setCookie: string | null;
	owner: string;
}> {
	const identity = await requireOwner(request, runtime());
	const csrf = getCsrfToken(request);
	return {
		snapshot: await getAdminSnapshot(runtime()),
		csrfToken: csrf.token,
		setCookie: csrf.setCookie,
		// The caller sets this header because server functions do not expose a
		// response object to the storage layer.
		owner: identity.email,
	};
}

function assertMutation(
	request: Request,
	csrfToken: string | null | undefined,
): Promise<Awaited<ReturnType<typeof requireOwner>>> {
	return requireOwner(request, runtime()).then((identity) => {
		verifyCsrfToken(request, csrfToken, cmsOrigin());
		return identity;
	});
}

export async function saveStoredDraft(
	request: Request,
	input: { content: unknown; expectedRevision: number; csrfToken: string },
): Promise<SaveDraftResult> {
	const identity = await assertMutation(request, input.csrfToken);
	return saveDraftInStorage(runtime(), {
		content: input.content,
		expectedRevision: input.expectedRevision,
		actor: { email: identity.email, subject: identity.subject },
	});
}

export async function publishStored(
	request: Request,
	input: { expectedDraftRevision: number; csrfToken: string },
): Promise<PublishDraftResult> {
	const identity = await assertMutation(request, input.csrfToken);
	return publishDraftInStorage(runtime(), {
		expectedDraftRevision: input.expectedDraftRevision,
		actor: { email: identity.email, subject: identity.subject },
	});
}

export async function uploadStored(
	request: Request,
	input: { file: File; alt: string; csrfToken: string },
) {
	const identity = await assertMutation(request, input.csrfToken);
	return uploadStoredMedia(runtime(), input.file, input.alt, identity.email);
}

export type { CmsDocumentSnapshot, PublishDraftResult, SaveDraftResult };
