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

export type CmsSnapshotResult =
	| {
			ok: true;
			snapshot: Awaited<ReturnType<typeof readAdminSnapshot>>["snapshot"];
			csrfToken: string;
			owner: string;
	  }
	| {
			ok: false;
			code: "unauthenticated" | "forbidden" | "configuration" | "unavailable";
			message: string;
	  };

/**
 * Keep the CMS route recoverable when Access, a binding, or the RPC transport
 * is unavailable. Returning a small discriminated result prevents a loader
 * failure from falling through to the generic app error page.
 */
export const getCmsSnapshot = createServerFn({ method: "GET" }).handler(
	async (): Promise<CmsSnapshotResult> => {
		setResponseHeader("Cache-Control", "private, no-store");
		try {
			const result = await readAdminSnapshot(getRequest());
			// HttpOnly cookie issuance is kept at the RPC boundary, not in storage.
			// The token is returned only to the owner-only CMS form; the cookie itself
			// is never exposed to client JavaScript.
			if (result.setCookie) setResponseHeader("Set-Cookie", result.setCookie);
			return {
				ok: true,
				snapshot: result.snapshot,
				csrfToken: result.csrfToken,
				owner: result.owner,
			};
		} catch (error) {
			if (error instanceof Response) {
				if (error.status === 403)
					return {
						ok: false,
						code: "forbidden",
						message: "This CMS account is not on the owner allowlist.",
					};
				if (error.status === 503)
					return {
						ok: false,
						code: "configuration",
						message: "CMS authentication is not configured on this Worker yet.",
					};
				return {
					ok: false,
					code: "unauthenticated",
					message: "Sign in through Cloudflare Access to open the CMS.",
				};
			}
			return {
				ok: false,
				code: "unavailable",
				message: "The CMS snapshot could not be loaded. Try again in a moment.",
			};
		}
	},
);

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
