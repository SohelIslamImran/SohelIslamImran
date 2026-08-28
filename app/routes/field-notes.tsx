import { env } from "cloudflare:workers";
import type { Route } from "./+types/field-notes";
import { SiteShell } from "../components/SiteShell";
import { getPublicContent } from "../lib/cms.server";
import {
  breadcrumbJsonLd,
  collectionPageJsonLd,
  createSeoMeta,
} from "../lib/seo";

export function meta({ loaderData }: Route.MetaArgs) {
  const content = loaderData?.content;
  const name = content?.identity.name || "Sohel Islam Imran";
  const travel = content?.travel;
  const title = "Travel journal — Sohel Islam Imran";
  const description =
    travel?.intro ||
    "A growing journal for Sohel Islam Imran’s remote work, travel memories, photographs, and observations.";

  return createSeoMeta({
    title,
    description,
    pathname: "/field-notes",
    content,
    jsonLd: [
      collectionPageJsonLd(content, "/field-notes", title, description),
      breadcrumbJsonLd(content, [
        { name, pathname: "/" },
        { name: "Field notes", pathname: "/field-notes" },
      ]),
    ],
  });
}

export async function loader() {
  return { content: await getPublicContent(env as unknown as { DB?: D1Database }) };
}

export default function FieldNotes({ loaderData }: Route.ComponentProps) {
  const travel = loaderData.content.travel;
  const publicEntries = travel.entries.filter((entry) => entry.visibility === "public");

  return (
    <SiteShell>
      <section className="worldline-travel">
        <header>
          <p>Travel journal</p>
          <h1>A place for the journeys still ahead.</h1>
          <p>{travel.intro}</p>
        </header>

        <figure className="worldline-travel__hero" data-reveal>
          <img src="/images/travel-placeholder.png" alt="A route through a mountain landscape, representing future travel" width="1122" height="1402" />
          <figcaption><strong>Origin</strong><span>Dhaka, Bangladesh</span></figcaption>
          <svg viewBox="0 0 800 360" aria-hidden="true">
            <path d="M20 320C180 350 240 180 390 212S585 250 782 42" />
            <circle cx="20" cy="320" r="8" />
            <circle cx="390" cy="212" r="5" />
            <circle cx="782" cy="42" r="5" />
          </svg>
        </figure>

        <div className="worldline-travel__promise" data-reveal>
          <p>This will become a living memory shelf.</p>
          <h2>One place, one photograph, one detail worth remembering.</h2>
          <p>I will add trips as they happen. No invented pins, no country counter, and no live location tracking.</p>
        </div>

        {publicEntries.length > 0 ? (
          <section className="worldline-travel__entries" aria-labelledby="travel-entry-title" data-reveal>
            <h2 id="travel-entry-title">Published memories</h2>
            {publicEntries.map((entry) => (
              <article key={entry.id} data-reveal>
                <span>{entry.season} · {entry.region}</span>
                <h3>{entry.place}</h3>
                <p>{entry.summary}</p>
                <blockquote>{entry.reflection}</blockquote>
              </article>
            ))}
          </section>
        ) : (
          <section className="worldline-travel__empty" aria-label="Journal status" data-reveal>
            <span>001</span>
            <p>The first memory has not been published yet.</p>
            <a href="mailto:sohelislamimran@gmail.com">Suggest a place <span aria-hidden="true">↗</span></a>
          </section>
        )}
      </section>
    </SiteShell>
  );
}
