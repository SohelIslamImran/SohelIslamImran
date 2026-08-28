import { env } from "cloudflare:workers";
import { Link } from "react-router";
import type { Route } from "./+types/home";
import { CareerWorldline } from "../components/CareerWorldline";
import { SiteShell } from "../components/SiteShell";
import { WorldlineHero } from "../components/WorldlineHero";
import { getPublicContent } from "../lib/cms.server";
import {
  breadcrumbJsonLd,
  createSeoMeta,
  personJsonLd,
  profilePageJsonLd,
  websiteJsonLd,
} from "../lib/seo";

export function meta({ loaderData }: Route.MetaArgs) {
  const content = loaderData?.content;
  const name = content?.identity.name || "Sohel Islam Imran";
  const role = content?.identity.role || "Lead Full Stack Engineer";
  const title = `${name} | ${role} at Kuno`;
  const description =
    "Sohel Islam Imran is a Lead Full Stack Engineer at Kuno in Dhaka, building secure TypeScript products with React, backend services, data systems, and Cloudflare.";

  return createSeoMeta({
    title,
    description,
    pathname: "/",
    content,
    jsonLd: [
      websiteJsonLd(content),
      personJsonLd(content),
      profilePageJsonLd(content, "/", title, description),
      breadcrumbJsonLd(content, [{ name, pathname: "/" }]),
    ],
  });
}

export async function loader() {
  return { content: await getPublicContent(env as unknown as { DB?: D1Database }) };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { content } = loaderData;
  const openSource = content.projects.filter((project) => project.id !== "kuno-platform").slice(0, 2);

  return (
    <SiteShell>
      <section className="worldline-hero">
        <div className="worldline-hero__copy">
          <h1>I lead full-stack engineering for ambitious products.</h1>
          <p>
            I&apos;m Sohel Islam Imran, a Dhaka-based Lead Full Stack Engineer at Kuno. I build
            secure TypeScript products across React interfaces, backend services, data, and delivery.
          </p>
          <div className="worldline-hero__actions">
            <Link className="worldline-button" to="/work">See my work <span aria-hidden="true">↗</span></Link>
            <Link className="worldline-text-link" to="/links/linkedin">LinkedIn <span aria-hidden="true">↗</span></Link>
          </div>
          <p className="worldline-hero__status"><span aria-hidden="true" /> Based in Dhaka. Working worldwide.</p>
        </div>
        <WorldlineHero />
      </section>

      <div data-reveal><CareerWorldline experience={content.experience} /></div>

      <section className="company-proof" aria-labelledby="company-proof-title" data-reveal>
        <header>
          <h2 id="company-proof-title">Company work comes first.</h2>
          <p>Roles where I owned real product constraints, release pressure, and outcomes shared with a team.</p>
        </header>
        <div className="company-proof__grid">
          <Link to="/work#kuno-work" className="company-proof__feature">
            <span>Kuno · 2023 — now</span>
            <h3>From mobile product work to leading full-stack engineering.</h3>
            <p>Secure enterprise flows, product architecture, platform delivery, and the systems that help a team ship with confidence.</p>
            <b>Read the Kuno case study ↗</b>
          </Link>
          <Link to="/work#tilleli" className="company-proof__row">
            <span>Tilleli · 2021 — 2024</span>
            <h3>React Native product and release engineering</h3>
            <b aria-hidden="true">↗</b>
          </Link>
          <Link to="/work#bugfixers" className="company-proof__row">
            <span>Bugfixers · 2021</span>
            <h3>Production frontend foundations</h3>
            <b aria-hidden="true">↗</b>
          </Link>
        </div>
      </section>

      <section className="open-source-proof" aria-labelledby="open-source-title" data-reveal>
        <header>
          <p>Side projects, after the day job</p>
          <h2 id="open-source-title">Small tools with a public life.</h2>
        </header>
        <div className="open-source-proof__list">
          {openSource.map((project) => (
            <a key={project.id} href={project.repository ?? project.href} target="_blank" rel="noreferrer">
              <span>{project.title}</span>
              <p>{project.summary}</p>
              <b aria-hidden="true">↗</b>
            </a>
          ))}
        </div>
        <Link className="worldline-text-link" to="/work#open-source">Browse the open-source archive <span aria-hidden="true">↗</span></Link>
      </section>

      <section className="worldline-paths" data-reveal>
        <Link className="worldline-path worldline-path--story" to="/story">
          <img src="/images/sohel-linkedin.png" alt="Portrait of Sohel Islam Imran" width="800" height="800" loading="lazy" />
          <div><span>My story</span><h2>From a phone in Bangladesh to full-stack engineering.</h2><b>Read the story ↗</b></div>
        </Link>
        <Link className="worldline-path worldline-path--travel" to="/field-notes">
          <img src="/images/travel-placeholder.png" alt="A future travel route through a mountain landscape" width="1122" height="1402" loading="lazy" />
          <div><span>Travel journal</span><h2>A place for the journeys still ahead.</h2><b>Open the journal ↗</b></div>
        </Link>
      </section>

      <section className="worldline-contact" data-reveal>
        <p>Have a complicated product problem?</p>
        <a href={`mailto:${content.identity.email}`}>Let&apos;s make it clearer. <span aria-hidden="true">↗</span></a>
      </section>
    </SiteShell>
  );
}
