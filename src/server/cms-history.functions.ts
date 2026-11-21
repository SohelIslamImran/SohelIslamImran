/**
 * Owner-only TanStack Start server functions for revision history, draft
 * restore/discard, audit events, and the media library.
 *
 * Every read calls `requireOwner` itself; every mutation calls `assertMutation`
 * (owner + CSRF + origin). Never log content, cookies, JWTs, or private keys.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireOwner } from "./auth.server";
import { assertMutation, runtime } from "./cms.server";
import {
	discardDraft as discardDraftInStorage,
	getAdminSnapshot,
	getRevision as getRevisionInStorage,
	listAuditEvents as listAuditEventsInStorage,
	listRevisions as listRevisionsInStorage,
	restoreRevision as restoreRevisionInStorage,
} from "./cms-storage.server";
import {
	listMediaAssets,
	MediaUploadError,
	updateMediaAlt as updateMediaAltInStorage,
} from "./media.server";

const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const positiveId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const csrfToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/u, "Invalid CSRF token.");

export const listRevisions = createServerFn({ method: "GET" })
	.validator(
		z.object({
			kind: z.enum(["draft", "published"]).optional(),
			limit: z.number().int().min(1).max(100).optional(),
			before: positiveId.optional(),
		}),
	)
	.handler(async ({ data }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		await requireOwner(getRequest(), runtime());
		return listRevisionsInStorage(runtime(), data);
	});

export const getRevision = createServerFn({ method: "GET" })
	.validator(z.object({ id: positiveId }))
	.handler(async ({ data }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		await requireOwner(getRequest(), runtime());
		const detail = await getRevisionInStorage(runtime(), data.id);
		if (!detail) {
			throw new Response("Revision not found.", { status: 404 });
		}
		return detail;
	});

export const restoreRevision = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: positiveId,
			expectedRevision: revision,
			csrfToken,
		}),
	)
	.handler(async ({ data }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		const identity = await assertMutation(getRequest(), data.csrfToken);
		return restoreRevisionInStorage(runtime(), {
			id: data.id,
			expectedRevision: data.expectedRevision,
			actor: { email: identity.email, subject: identity.subject },
		});
	});

export const discardDraft = createServerFn({ method: "POST" })
	.validator(
		z.object({
			expectedRevision: revision,
			expectedPublishedRevision: revision,
			csrfToken,
		}),
	)
	.handler(async ({ data }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		const identity = await assertMutation(getRequest(), data.csrfToken);
		return discardDraftInStorage(runtime(), {
			expectedRevision: data.expectedRevision,
			expectedPublishedRevision: data.expectedPublishedRevision,
			actor: { email: identity.email, subject: identity.subject },
		});
	});

export const listAuditEvents = createServerFn({ method: "GET" })
	.validator(
		z.object({
			limit: z.number().int().min(1).max(100).optional(),
			before: z.string().max(120).optional(),
		}),
	)
	.handler(async ({ data }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		await requireOwner(getRequest(), runtime());
		return listAuditEventsInStorage(runtime(), data);
	});

export const listMedia = createServerFn({ method: "GET" })
	.validator(z.object({ includeAttachments: z.boolean().optional() }).optional())
	.handler(async ({ data }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		await requireOwner(getRequest(), runtime());
		const environment = runtime();
		const snapshot = await getAdminSnapshot(environment);
		return listMediaAssets(environment, snapshot.draft, data?.includeAttachments);
	});

export const updateMediaAlt = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: z.string().min(1).max(160),
			alt: z.string().max(240),
			csrfToken,
		}),
	)
	.handler(async ({ data }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		const identity = await assertMutation(getRequest(), data.csrfToken);
		try {
			return await updateMediaAltInStorage(runtime(), {
				id: data.id,
				alt: data.alt,
				actor: { email: identity.email, subject: identity.subject },
			});
		} catch (error) {
			if (error instanceof MediaUploadError) {
				throw new Response(error.message, { status: 400 });
			}
			throw error;
		}
	});
