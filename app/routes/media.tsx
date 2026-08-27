import { env } from "cloudflare:workers";
import type { Route } from "./+types/media";
import { getPublishedMedia, MediaStorageUnavailableError, type MediaEnvironment } from "../lib/media.server";

export async function loader({ params }: Route.LoaderArgs) {
  try {
    const media = await getPublishedMedia(env as unknown as MediaEnvironment, params.assetId);
    if (!media) throw new Response("Not found", { status: 404 });
    const headers = new Headers();
    media.object.writeHttpMetadata(headers);
    headers.set("Content-Type", media.mimeType);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("ETag", media.object.httpEtag);
    return new Response(media.object.body, { headers });
  } catch (error) {
    if (error instanceof MediaStorageUnavailableError) throw new Response("Media storage is not configured.", { status: 503 });
    throw error;
  }
}
