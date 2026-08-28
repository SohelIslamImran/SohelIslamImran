/** Typed TanStack Start RPC boundary for the unified portfolio CMS. */
import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import {
	readAdminSnapshot,
	readPublished,
	saveStoredDraft,
	publishStored,
	uploadStored,
} from "./cms.server";

const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const csrfToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/u, "Invalid CSRF token.");

export const getPublishedContent = createServerFn({ method: "GET" }).handler(() => readPublished());

export const getCmsSnapshot = createServerFn({ method: "GET" }).handler(async () => {
	let result: Awaited<ReturnType<typeof readAdminSnapshot>>;
	try {
		result = await readAdminSnapshot(getRequest());
	} catch (error) {
		// A Response is useful at a direct Worker boundary but cannot cross
		// TanStack's serializable server-function transport. Preserve the status
		// in a safe Error so the CMS route can render an actionable message.
		if (error instanceof Response) {
			throw new Error(
				error.status === 403
					? "This CMS account is not on the owner allowlist."
					: "Sign in through Cloudflare Access to open the CMS.",
			);
		}
		throw error;
	}
	// HttpOnly cookie issuance is kept at the RPC boundary, not in storage.
	// The existing token remains readable by the CMS form only through the
	// returned value; the cookie itself is never exposed to client JavaScript.
	setResponseHeader("Cache-Control", "private, no-store");
	if (result.setCookie) setResponseHeader("Set-Cookie", result.setCookie);
	return { snapshot: result.snapshot, csrfToken: result.csrfToken, owner: result.owner };
});

export const saveDraft = createServerFn({ method: "POST" })
	.validator(
		z.object({
			content: z.unknown(),
			expectedRevision: revision,
			csrfToken,
		}),
	)
	.handler(({ data }) => saveStoredDraft(getRequest(), data));

export const publishDraft = createServerFn({ method: "POST" })
	.validator(z.object({ expectedDraftRevision: revision, csrfToken }))
	.handler(({ data }) => publishStored(getRequest(), data));

const uploadInput = z.object({
	file: z.custom<File>((value) => typeof File !== "undefined" && value instanceof File),
	alt: z.string().max(240),
	csrfToken,
});

export const uploadMedia = createServerFn({ method: "POST" })
	.validator(uploadInput)
	.handler(({ data }) => uploadStored(getRequest(), data));

export type CmsServerFunctions = {
	getPublishedContent: typeof getPublishedContent;
	getCmsSnapshot: typeof getCmsSnapshot;
	saveDraft: typeof saveDraft;
	publishDraft: typeof publishDraft;
	uploadMedia: typeof uploadMedia;
};
