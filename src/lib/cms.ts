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

export const getStudioDocument = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ payload: string; updated_at: string | Date | null }>`
    select payload, updated_at from folio_document where id = ${DOC_ID}
  `;
  if (!rows[0]) {
    return { payload: seedPayload(), updatedAt: null, source: "seed" as const };
  }
  try {
    return {
      payload: JSON.parse(rows[0].payload) as StudioPayload,
      updatedAt: rows[0].updated_at ? String(rows[0].updated_at) : null,
      source: "db" as const,
    };
  } catch {
    return { payload: seedPayload(), updatedAt: null, source: "seed" as const };
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
