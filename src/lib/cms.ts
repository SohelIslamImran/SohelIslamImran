import { createServerFn } from "@tanstack/react-start";
import { fieldNotes, profile, profileLinks } from "@/data/folio";

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

export function rememberStudioDocument(doc: StudioDocument) {
  cache = doc;
}

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

export { DOC_ID };
