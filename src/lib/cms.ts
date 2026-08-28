import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { fieldNotes, profile, profileLinks } from "@/data/folio";
import { isOwnerEmail } from "@/lib/owner";

export type StudioPayload = {
  lede: string;
  intro: string;
  quote: string;
  notes: typeof fieldNotes;
  links: typeof profileLinks;
};

export type StudioDocument = {
  payload: StudioPayload;
  updatedAt: string | null;
  source: "seed" | "db";
};

export const STUDIO_STALE_MS = 60_000;

const DOC_ID = "folio";

function seedPayload(): StudioPayload {
  return {
    lede: profile.lede,
    intro: profile.intro,
    quote: profile.quote,
    notes: fieldNotes,
    links: profileLinks,
  };
}

function seedDocument(): StudioDocument {
  return { payload: seedPayload(), updatedAt: null, source: "seed" };
}

let cache: StudioDocument | null = null;
let warming: Promise<StudioDocument> | null = null;

async function readStudioDocument(): Promise<StudioDocument> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ payload: string; updated_at: string | Date | null }>`
    select payload, updated_at from folio_document where id = ${DOC_ID}
  `;
  if (!rows[0]) return seedDocument();
  try {
    return {
      payload: JSON.parse(rows[0].payload) as StudioPayload,
      updatedAt: rows[0].updated_at ? String(rows[0].updated_at) : null,
      source: "db",
    };
  } catch {
    return seedDocument();
  }
}

function warmStudioDocument() {
  warming ??= readStudioDocument()
    .then((doc) => {
      cache = doc;
      return doc;
    })
    .catch(() => cache ?? seedDocument())
    .finally(() => {
      warming = null;
    });
  return warming;
}

/** Public pages: never wait on PGlite/Neon. Seed (or warm cache) returns now. */
export const getPublicDocument = createServerFn({ method: "GET" }).handler(async () => {
  if (cache) return cache;
  void warmStudioDocument();
  return seedDocument();
});

/** Studio: wait for the live document. */
export const getStudioDocument = createServerFn({ method: "GET" }).handler(async () => {
  if (cache?.source === "db") return cache;
  try {
    const doc = await readStudioDocument();
    cache = doc;
    return doc;
  } catch {
    return cache ?? seedDocument();
  }
});

export const saveStudioDocument = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: StudioPayload) => data)
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const users = await sql<{ email: string }>`
      select email from "user" where id = ${context.userId}
    `;
    const email = users[0]?.email ?? null;
    if (!isOwnerEmail(email)) {
      throw new Error("Forbidden");
    }
    const payload = JSON.stringify(data);
    await sql`
      insert into folio_document (id, payload, updated_at, updated_by)
      values (${DOC_ID}, ${payload}, now(), ${context.userId})
      on conflict (id) do update set
        payload = excluded.payload,
        updated_at = now(),
        updated_by = excluded.updated_by
    `;
    cache = { payload: data, updatedAt: new Date().toISOString(), source: "db" };
    return { ok: true };
  });

export const getStudioAccess = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const users = await sql<{ email: string; name: string }>`
      select email, name from "user" where id = ${context.userId}
    `;
    const email = users[0]?.email ?? null;
    return {
      email,
      name: users[0]?.name ?? null,
      owner: isOwnerEmail(email),
    };
  });
