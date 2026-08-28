import { env } from "cloudflare:workers";
import { Link } from "react-router";
import type { Route } from "./+types/story";
import { SiteShell } from "../components/SiteShell";
import { getPublicContent } from "../lib/cms.server";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  createSeoMeta,
  personJsonLd,
} from "../lib/seo";

export function meta({ loaderData }: Route.MetaArgs) {
  const content = loaderData?.content;
  const story = content?.story;
  const name = content?.identity.name || "Sohel Islam Imran";
  const title = "From a phone in Bangladesh to full-stack engineering — Sohel Islam Imran";
  const description =
    story?.intro ||
    "Sohel Islam Imran’s first-person story about learning, work, and growing into full-stack engineering.";
  // The original first-person post was published on 2025-06-18. Keep a
  // stable date in structured data even if an older CMS document has no
  // matching writing index entry yet.
  const publishedAt = content?.writing.find((entry) => entry.href === "/story")?.publishedAt || "2025-06-18";

  return createSeoMeta({
    title,
    description,
    pathname: "/story",
    content,
    type: "article",
    article: {
      publishedAt,
      section: "Career",
      tags: ["Career", "Self-taught", "Bangladesh"],
    },
    jsonLd: [
      personJsonLd(content),
      articleJsonLd({
        content,
        pathname: "/story",
        headline: title,
        description,
        publishedAt,
        section: "Career",
        tags: ["Career", "Self-taught", "Bangladesh"],
      }),
      breadcrumbJsonLd(content, [
        { name, pathname: "/" },
        { name: "Story", pathname: "/story" },
      ]),
    ],
  });
}

export async function loader() {
  return { content: await getPublicContent(env as unknown as { DB?: D1Database }) };
}

export default function Story({ loaderData }: Route.ComponentProps) {
  const { story } = loaderData.content;

  return (
    <SiteShell>
      <article className="worldline-story">
        <header className="worldline-story__hero">
          <div>
            <p>My story · 12 minute read</p>
            <h1>From a phone in Bangladesh to full-stack engineering.</h1>
            <p className="worldline-story__intro">{story.intro}</p>
            <a href="#story-start">Start reading <span aria-hidden="true">↓</span></a>
          </div>
          <figure>
            <img src="/images/sohel-linkedin.png" alt="Sohel Islam Imran" width="800" height="800" />
            <figcaption>Dhaka, Bangladesh · Still learning</figcaption>
          </figure>
        </header>

        <blockquote className="worldline-story__quote" data-reveal>“{story.quote}”</blockquote>

        <div className="worldline-story__body" id="story-start">
          <aside aria-label="Chapter index">
            <p>On this page</p>
            {story.chapters.map((chapter) => (
              <a href={`#chapter-${chapter.id}`} key={chapter.id}>{chapter.title}</a>
            ))}
          </aside>
          <div className="worldline-story__chapters">
            {story.chapters.map((chapter, index) => (
              <section id={`chapter-${chapter.id}`} key={chapter.id} data-reveal>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p className="worldline-story__label">{chapter.eyebrow}</p>
                <h2>{chapter.title}</h2>
                {chapter.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {chapter.artifact && <blockquote>{chapter.artifact}</blockquote>}
              </section>
            ))}
          </div>
        </div>

        <footer className="worldline-story__end" data-reveal>
          <div>
            <p>The original version was published on LinkedIn in June 2025.</p>
            <a href={story.sourceHref} target="_blank" rel="noreferrer">{story.sourceLabel} <span aria-hidden="true">↗</span></a>
          </div>
          <Link to="/field-notes">Follow the journey <span aria-hidden="true">↗</span></Link>
        </footer>
      </article>
    </SiteShell>
  );
}
