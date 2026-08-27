import { env } from "cloudflare:workers";
import { data, Form, useFetcher, useNavigation } from "react-router";

import type { Route } from "./+types/editor";
import {
  getAdminSnapshot,
  publishDraft,
  saveDraft,
  CmsStorageUnavailableError,
} from "../lib/cms.server";
import {
  getCsrfToken,
  requireOwner,
  verifyCsrfToken,
  type AccessAuthEnvironment,
} from "../lib/auth.server";
import { ContentValidationError } from "../lib/validation";
import { AtlasMark } from "../components/AtlasMark";
import { LinksEditor } from "../components/LinksEditor";

type EditorEnvironment = AccessAuthEnvironment & { DB?: D1Database };

function hasValidationIssues(value: unknown): value is { issues: Array<{ path: string; message: string }> } {
  if (!value || typeof value !== "object" || !("issues" in value)) return false;
  return Array.isArray((value as { issues?: unknown }).issues);
}

function editorEnv(): EditorEnvironment {
  return env as unknown as EditorEnvironment;
}

export function meta() {
  return [{ title: "Portfolio editor — Sohel Islam Imran" }, { name: "robots", content: "noindex, nofollow" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const runtime = editorEnv();
  const identity = await requireOwner(request, runtime);
  try {
    const snapshot = await getAdminSnapshot(runtime);
    const csrf = getCsrfToken(request);
    return data(
      { snapshot, csrfToken: csrf.token, owner: identity.email },
      {
        headers: {
          "Cache-Control": "private, no-store",
          ...(csrf.setCookie ? { "Set-Cookie": csrf.setCookie } : {}),
        },
      },
    );
  } catch (error) {
    if (error instanceof CmsStorageUnavailableError) {
      throw new Response("The content database is not configured for this environment.", { status: 503 });
    }
    throw error;
  }
}

export async function action({ request }: Route.ActionArgs) {
  const runtime = editorEnv();
  const identity = await requireOwner(request, runtime);
  const formData = await request.formData();
  const csrfToken = formData.get("csrfToken");
  const origin = runtime.APP_ORIGIN;
  if (!origin) throw new Response("The application origin is not configured.", { status: 503 });
  verifyCsrfToken(request, typeof csrfToken === "string" ? csrfToken : null, origin);

  const intent = formData.get("intent");
  const revisionValue = formData.get("revision");
  const revision = typeof revisionValue === "string" ? Number.parseInt(revisionValue, 10) : Number.NaN;
  if (!Number.isSafeInteger(revision) || revision < 0) {
    return data({ ok: false as const, message: "The draft revision is invalid." }, { status: 400 });
  }

  try {
    if (intent === "publish") {
      const result = await publishDraft(runtime, {
        expectedDraftRevision: revision,
        actor: { email: identity.email, subject: identity.subject },
      });
      if (!result.ok) {
        return data(
          { ok: false as const, message: "This draft changed in another tab. Reload before publishing." },
          { status: 409 },
        );
      }
      return { ok: true as const, message: result.status === "already-published" ? "This revision is already live." : "Published." };
    }

    if (intent !== "save") {
      return data({ ok: false as const, message: "Unknown editor action." }, { status: 400 });
    }

    const rawContent = formData.get("content");
    if (typeof rawContent !== "string") {
      return data({ ok: false as const, message: "Draft content is missing." }, { status: 400 });
    }
    let content: unknown;
    try {
      content = JSON.parse(rawContent) as unknown;
    } catch {
      return data({ ok: false as const, message: "The draft is not valid JSON." }, { status: 400 });
    }

    // The structured links editor is optional. It only sends an override after
    // the owner changes a link, so the JSON textarea remains a complete
    // fallback for advanced edits and older workflows.
    if (formData.get("profileLinksTouched") === "true") {
      const rawProfileLinks = formData.get("profileLinks");
      if (typeof rawProfileLinks !== "string") {
        return data({ ok: false as const, message: "The structured links draft is missing." }, { status: 400 });
      }
      let profileLinks: unknown;
      try {
        profileLinks = JSON.parse(rawProfileLinks) as unknown;
      } catch {
        return data({ ok: false as const, message: "The structured links draft is not valid JSON." }, { status: 400 });
      }
      if (content === null || typeof content !== "object" || Array.isArray(content)) {
        return data({ ok: false as const, message: "The draft must be a JSON object before links can be updated." }, { status: 400 });
      }
      content = { ...content, profileLinks };
    }

    const result = await saveDraft(runtime, {
      content,
      expectedRevision: revision,
      actor: { email: identity.email, subject: identity.subject },
    });
    if (!result.ok) {
      return data(
        { ok: false as const, message: "This draft changed in another tab. Reload before saving." },
        { status: 409 },
      );
    }
    return { ok: true as const, message: `Draft revision ${result.revision} saved.` };
  } catch (error) {
    if (error instanceof ContentValidationError) {
      return data(
        {
          ok: false as const,
          message: "The draft did not pass validation.",
          issues: error.issues.slice(0, 20),
        },
        { status: 400 },
      );
    }
    if (error instanceof CmsStorageUnavailableError) {
      throw new Response("The content database is not configured for this environment.", { status: 503 });
    }
    throw error;
  }
}

export default function Editor({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const mediaFetcher = useFetcher<typeof import("./editor-media").action>();
  const busy = navigation.state !== "idle";
  const { snapshot } = loaderData;

  return (
    <main className="editor-shell">
      <header className="editor-header">
        <a href="/" aria-label="Return to portfolio"><AtlasMark /></a>
        <div>
          <p className="eyebrow">Owner workspace / Cloudflare Access</p>
          <h1>Portfolio editor</h1>
        </div>
        <div className="editor-owner">
          <span>Signed in as</span>
          <strong>{loaderData.owner}</strong>
        </div>
      </header>

      <section className="editor-status" aria-label="Publishing status">
        <div><span>Draft</span><strong>r{snapshot.draftRevision}</strong></div>
        <div><span>Published</span><strong>r{snapshot.publishedRevision}</strong></div>
        <div><span>Draft updated</span><strong>{new Date(snapshot.draftUpdatedAt).toLocaleString()}</strong></div>
        <div><span>Published</span><strong>{snapshot.publishedAt ? new Date(snapshot.publishedAt).toLocaleString() : "Not yet"}</strong></div>
      </section>

      <section className="editor-media">
        <div>
          <p className="eyebrow">Private R2 library</p>
          <h2>Upload a media draft</h2>
          <p>Images and PDFs remain private until their asset ID is referenced in the content document and that draft is published.</p>
        </div>
        <mediaFetcher.Form method="post" action="/resume/edit/media" encType="multipart/form-data">
          <input type="hidden" name="csrfToken" value={loaderData.csrfToken} />
          <label>File<input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif,application/pdf" required /></label>
          <label>Alt text<input type="text" name="alt" maxLength={240} placeholder="Describe the image; leave blank only for PDFs" /></label>
          <button type="submit" disabled={mediaFetcher.state !== "idle"}>{mediaFetcher.state === "idle" ? "Upload private draft" : "Uploading…"}</button>
        </mediaFetcher.Form>
        {mediaFetcher.data && (
          <div className="editor-media__result" data-error={!mediaFetcher.data.ok || undefined} role="status">
            <strong>{mediaFetcher.data.message}</strong>
            {mediaFetcher.data.ok && <code>{JSON.stringify(mediaFetcher.data.asset)}</code>}
          </div>
        )}
      </section>

      <Form method="post" className="editor-form">
        <input type="hidden" name="csrfToken" value={loaderData.csrfToken} />
        <input type="hidden" name="revision" value={snapshot.draftRevision} />
        <LinksEditor links={snapshot.draft.profileLinks} />
        <div className="editor-form__toolbar">
          <div>
            <p className="eyebrow">Full content document</p>
            <h2>Draft JSON</h2>
            <p>Hero, experience, projects, writing, story chapters, travel entries, resume metadata, contact, and media references share one versioned document.</p>
          </div>
          <div className="editor-actions">
            <button type="submit" name="intent" value="save" disabled={busy}>{busy ? "Working…" : "Save draft"}</button>
            <button className="editor-publish" type="submit" name="intent" value="publish" disabled={busy}>Publish current draft</button>
            <a href="/" target="_blank" rel="noreferrer">Open public site ↗</a>
          </div>
        </div>
        {actionData && (
          <div className="editor-message" data-error={!actionData.ok || undefined} role="status">
            <strong>{actionData.message}</strong>
            {hasValidationIssues(actionData) && (
              <ul>{actionData.issues.map((issue) => <li key={`${issue.path}-${issue.message}`}><code>{issue.path}</code> {issue.message}</li>)}</ul>
            )}
          </div>
        )}
        <label className="editor-json">
          <span className="sr-only">Portfolio draft JSON</span>
          <textarea
            name="content"
            spellCheck={false}
            defaultValue={JSON.stringify(snapshot.draft, null, 2)}
            aria-describedby="editor-json-help"
          />
        </label>
        <p id="editor-json-help" className="editor-help">
          Draft saves are validated server-side. Publishing is explicit. Stale tabs receive a conflict instead of overwriting newer work.
        </p>
      </Form>
    </main>
  );
}

export function headers() {
  return {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
  };
}
