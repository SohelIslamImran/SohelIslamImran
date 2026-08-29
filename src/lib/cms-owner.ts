import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { isOwnerEmail } from "@/lib/owner";
import {
  DOC_ID,
  rememberStudioDocument,
  type StudioPayload,
} from "@/lib/cms";

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
    rememberStudioDocument({
      payload: data,
      updatedAt: new Date().toISOString(),
      source: "db",
    });
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
