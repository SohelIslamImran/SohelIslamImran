import { env } from "cloudflare:workers";
import { data } from "react-router";
import type { Route } from "./+types/editor-media";
import { requireOwner, verifyCsrfToken, type AccessAuthEnvironment } from "../lib/auth.server";
import { MediaStorageUnavailableError, MediaUploadError, uploadMedia, type MediaEnvironment } from "../lib/media.server";

type Runtime = AccessAuthEnvironment & MediaEnvironment;

export async function action({ request }: Route.ActionArgs) {
  const runtime = env as unknown as Runtime;
  const identity = await requireOwner(request, runtime);
  if (!runtime.APP_ORIGIN) throw new Response("The application origin is not configured.", { status: 503 });
  const formData = await request.formData();
  const csrfToken = formData.get("csrfToken");
  verifyCsrfToken(request, typeof csrfToken === "string" ? csrfToken : null, runtime.APP_ORIGIN);
  const file = formData.get("file");
  const alt = formData.get("alt");
  if (!(file instanceof File)) return data({ ok: false as const, message: "Choose a file to upload." }, { status: 400 });
  try {
    const asset = await uploadMedia(runtime, file, typeof alt === "string" ? alt : "", identity.email);
    return { ok: true as const, message: "Uploaded as a private draft asset.", asset };
  } catch (error) {
    if (error instanceof MediaStorageUnavailableError) throw new Response(error.message, { status: 503 });
    if (error instanceof MediaUploadError) return data({ ok: false as const, message: error.message }, { status: 400 });
    throw error;
  }
}
