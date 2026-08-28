import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { env } from "cloudflare:workers";
import type { Route } from "./+types/work";
import { ArrowLink } from "../components/ArrowLink";
import { SiteShell } from "../components/SiteShell";
import { getPublicContent } from "../lib/cms.server";
import type { ExperienceContent } from "../types/content";
import {
  breadcrumbJsonLd,
  collectionPageJsonLd,
  createSeoMeta,
} from "../lib/seo";
import "../styles/work-worldline.css";

export function meta({ loaderData }: Route.MetaArgs) {
  const content = loaderData?.content;
  const name = content?.identity.name || "Sohel Islam Imran";
  const title = `Full-Stack Engineering Work at Kuno | ${name}`;
  const description =
    `Case studies from ${name}, Lead Full Stack Engineer at Kuno: TypeScript and React product architecture, secure services, data systems, CI/CD, and open-source tooling.`;

  return createSeoMeta({
    title,
    description,
    pathname: "/work",
    content,
    jsonLd: [
      collectionPageJsonLd(content, "/work", title, description),
      breadcrumbJsonLd(content, [
        { name, pathname: "/" },
        { name: "Work", pathname: "/work" },
      ]),
    ],
  });
}

const systemDomains = [
  {
    id: "identity",
    index: "01",
    label: "Identity",
    title: "Make the right context visible.",
    description:
      "Kuno is a role-aware professional-development product. I work on the rules that decide which context a person can see and what they can do next.",
    signal: "Onboarding · roles · authorization",
    color: "cobalt",
  },
  {
    id: "matching",
    index: "02",
    label: "Matching",
    title: "Turn overlapping needs into a clear next step.",
    description:
      "Programs, pathways, and people intersect. I turn those overlaps into flows that teams can test and people can follow.",
    signal: "Cohorts · pathways · next steps",
    color: "coral",
  },
  {
    id: "delivery",
    index: "03",
    label: "Delivery",
    title: "Carry the idea all the way to a running system.",
    description:
      "Product work counts when it reaches a reliable release. I connect application code to checks, observability, and guarded environments.",
    signal: "CI/CD · CLI · environments",
    color: "mint",
  },
] as const;

type SystemDomain = (typeof systemDomains)[number];

function normalizeIndex(index: number) {
  return (index + systemDomains.length) % systemDomains.length;
}

function KunoOrbit() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ pointerId: number; x: number; moved: boolean } | null>(null);
  const tiltFrameRef = useRef<number | null>(null);
  const pendingTiltRef = useRef<{ element: HTMLDivElement; x: number; y: number } | null>(null);
  const activeDomain: SystemDomain = systemDomains[activeIndex];

  const moveBy = (delta: number) => {
    setActiveIndex((current) => normalizeIndex(current + delta));
  };

  const selectDomain = (index: number) => {
    setActiveIndex(normalizeIndex(index));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, moved: false };
    setIsDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    pendingTiltRef.current = {
      element: event.currentTarget,
      x: Math.max(-4, Math.min(4, y * -3)),
      y: Math.max(-5, Math.min(5, x * 4)),
    };
    if (tiltFrameRef.current === null) {
      tiltFrameRef.current = window.requestAnimationFrame(() => {
        const pending = pendingTiltRef.current;
        if (pending) {
          pending.element.style.setProperty("--orbit-tilt-x", `${pending.x}deg`);
          pending.element.style.setProperty("--orbit-tilt-y", `${pending.y}deg`);
        }
        tiltFrameRef.current = null;
      });
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || drag.moved) return;
    const distance = event.clientX - drag.x;
    if (Math.abs(distance) < 52) return;
    moveBy(distance < 0 ? 1 : -1);
    dragRef.current = { ...drag, moved: true };
  };

  const stopPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
    pendingTiltRef.current = null;
    if (tiltFrameRef.current !== null) {
      window.cancelAnimationFrame(tiltFrameRef.current);
      tiltFrameRef.current = null;
    }
    event.currentTarget.style.setProperty("--orbit-tilt-x", "0deg");
    event.currentTarget.style.setProperty("--orbit-tilt-y", "0deg");
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = normalizeIndex(index + 1);
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = normalizeIndex(index - 1);
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = systemDomains.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    selectDomain(nextIndex);
    window.requestAnimationFrame(() => {
      document.getElementById(`system-tab-${systemDomains[nextIndex].id}`)?.focus();
    });
  };

  return (
    <section className="worldline-lens" id="system-lens" aria-labelledby="system-lens-title" data-reveal>
      <div className="worldline-lens__heading">
        <p className="worldline-kicker">One product, three pressures</p>
        <h2 id="system-lens-title">The part of the work I keep coming back to.</h2>
        <p>
          Drag the orbit or use the controls. Each point is a real Kuno concern, described at the
          level that can be shared publicly.
        </p>
      </div>

      <div className="worldline-lens__body">
        <div
          className="worldline-orbit-stage"
          data-dragging={isDragging || undefined}
          style={{ "--orbit-tilt-x": "0deg", "--orbit-tilt-y": "0deg" } as CSSProperties}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopPointer}
          onPointerCancel={stopPointer}
          onPointerLeave={(event) => {
            if (!dragRef.current) {
              event.currentTarget.style.setProperty("--orbit-tilt-x", "0deg");
              event.currentTarget.style.setProperty("--orbit-tilt-y", "0deg");
            }
            if (dragRef.current?.pointerId === event.pointerId) stopPointer(event);
          }}
        >
          <div className="worldline-orbit-stage__wash" aria-hidden="true" />
          <div className="worldline-orbit" aria-hidden="true">
            <span className="worldline-orbit__ring worldline-orbit__ring--horizontal" />
            <span className="worldline-orbit__ring worldline-orbit__ring--vertical" />
            <span className="worldline-orbit__orbit-line" />
            <div className="worldline-orbit__core">
              <span>the product</span>
              <strong>KUNO</strong>
              <small>systems in motion</small>
            </div>
            {systemDomains.map((domain, index) => {
              const angle = index * 120 - activeIndex * 120;
              return (
                <span
                  className={`worldline-orbit__node worldline-orbit__node--${domain.color}${
                    activeIndex === index ? " is-active" : ""
                  }`}
                  key={domain.id}
                  style={
                    {
                      "--orbit-angle": `${angle}deg`,
                      "--orbit-counter-angle": `${-angle}deg`,
                    } as CSSProperties
                  }
                >
                  <span>{domain.index}</span>
                  <strong>{domain.label}</strong>
                </span>
              );
            })}
          </div>
          <p className="worldline-orbit-stage__hint">
            <span aria-hidden="true">↔</span> Drag to rotate
          </p>
        </div>

        <div className="worldline-lens__copy">
          <div className="worldline-lens__tabs" role="tablist" aria-label="Kuno system domains">
            {systemDomains.map((domain, index) => (
              <button
                className={activeIndex === index ? "is-active" : undefined}
                id={`system-tab-${domain.id}`}
                key={domain.id}
                role="tab"
                type="button"
                aria-selected={activeIndex === index}
                aria-controls={`system-panel-${domain.id}`}
                tabIndex={activeIndex === index ? 0 : -1}
                onClick={() => selectDomain(index)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                <span>{domain.index}</span>
                {domain.label}
              </button>
            ))}
          </div>

          <div
            key={activeDomain.id}
            className="worldline-lens__panel"
            id={`system-panel-${activeDomain.id}`}
            role="tabpanel"
            aria-labelledby={`system-tab-${activeDomain.id}`}
            tabIndex={0}
          >
            <p className="worldline-kicker">{activeDomain.index} / {activeDomain.label}</p>
            <h3>{activeDomain.title}</h3>
            <p aria-live="polite">{activeDomain.description}</p>
            <p className="worldline-lens__signal">
              <span>Public signal</span>
              {activeDomain.signal}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function KunoRole({ role }: { role: ExperienceContent }) {
  return (
    <article className="worldline-role" data-reveal>
      <div className="worldline-role__rail" aria-hidden="true">
        <span />
      </div>
      <div className="worldline-role__content">
        <div className="worldline-role__meta">
          <time>{role.period}</time>
          {role.current && <span className="worldline-live">Current</span>}
        </div>
        <div className="worldline-role__topline">
          <p className="worldline-kicker">{role.company}</p>
        </div>
        <h3>{role.role}</h3>
        <p>{role.summary}</p>
        {role.highlights.length > 0 && (
          <ul>
            {role.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
          </ul>
        )}
        <ul className="worldline-tags" aria-label={`${role.role} technologies`}>
          {role.technologies.map((technology) => <li key={technology}>{technology}</li>)}
        </ul>
      </div>
    </article>
  );
}

export async function loader() {
  return { content: await getPublicContent(env as unknown as { DB?: D1Database }) };
}

export default function Work({ loaderData }: Route.ComponentProps) {
  const { content } = loaderData;
  const kunoRoles = content.experience
    .filter((experience) => experience.company.toLowerCase() === "kuno")
    .slice();
  const earlierRoles = content.experience.filter(
    (experience) => experience.company.toLowerCase() !== "kuno",
  );
  const kunoProject = content.projects.find((project) => project.id === "kuno-platform");
  const openSourceProjects = content.projects.filter((project) => project.id !== "kuno-platform");
  const avatar = content.identity.avatar;
  const avatarSrc = avatar
    ? `/media/${encodeURIComponent(avatar.id)}`
    : "/images/sohel-linkedin.png";

  return (
    <SiteShell>
      <div className="worldline-page">
        <section className="worldline-hero" aria-labelledby="work-title">
          <div className="worldline-hero__meta">
            <span>Work / 2021—now</span>
            <span>Kuno first</span>
          </div>
          <div className="worldline-hero__grid">
            <div className="worldline-hero__copy">
              <p className="worldline-kicker">Lead full-stack engineering · Kuno</p>
              <h1 id="work-title">Product systems that give complexity a clear next step.</h1>
              <p className="worldline-hero__intro">
                I lead full-stack product work at Kuno, connecting product rules, secure services,
                and delivery systems so people can focus on the work in front of them.
              </p>
              <div className="worldline-actions">
                <ArrowLink to="#kuno-work">See the Kuno work</ArrowLink>
                <ArrowLink to="/resume">View résumé</ArrowLink>
              </div>
            </div>

            <figure className="worldline-portrait-card">
              <div className="worldline-portrait-card__image">
                <img
                  src={avatarSrc}
                  alt={avatar?.alt || `${content.identity.name} portrait`}
                  width={800}
                  height={800}
                  fetchPriority="high"
                />
                <span className="worldline-portrait-card__stamp">Dhaka / UTC+6</span>
              </div>
              <figcaption>
                <span>{content.identity.name}</span>
                <span>{content.identity.role}</span>
              </figcaption>
            </figure>
          </div>
          <a className="worldline-scroll-cue" href="#kuno-work">
            <span>Scroll into the work</span>
            <span aria-hidden="true">↓</span>
          </a>
        </section>

        <section className="worldline-kuno" id="kuno-work" aria-labelledby="kuno-title" data-reveal>
          <div className="worldline-section-intro">
            <div>
              <p className="worldline-kicker">01 / Kuno</p>
              <h2 id="kuno-title">Most of my work happens where the rules get real.</h2>
            </div>
            <p>
              Kuno builds professional-development products for organizations. My role sits across
              the product, the services underneath it, and the path that gets each change into a
              running environment.
            </p>
          </div>

          {kunoRoles.length > 0 ? (
            <div className="worldline-role-list">
              {kunoRoles.map((role) => <KunoRole key={role.id} role={role} />)}
            </div>
          ) : (
            <p className="worldline-empty">Kuno experience will appear here when the public profile is updated.</p>
          )}

          {kunoProject && (
            <article className="worldline-project-note" data-reveal>
              <div>
                <p className="worldline-kicker">A public account</p>
                <h3>{kunoProject.title}</h3>
              </div>
              <p>{kunoProject.description}</p>
              <ul className="worldline-tags" aria-label="Kuno project themes">
                {kunoProject.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            </article>
          )}
        </section>

        <KunoOrbit />

        <section className="worldline-earlier" aria-labelledby="earlier-title" data-reveal>
          <div className="worldline-section-intro worldline-section-intro--compact">
            <div>
              <p className="worldline-kicker">02 / Earlier company work</p>
              <h2 id="earlier-title">The product work before the lead role.</h2>
            </div>
            <p>Mobile and frontend roles built the habits that now carry through the whole system.</p>
          </div>
          <div className="worldline-earlier__list">
            {earlierRoles.map((role) => (
              <article key={role.id} id={role.company.toLowerCase()} data-reveal>
                <time>{role.period}</time>
                <div>
                  <p className="worldline-kicker">{role.company}</p>
                  <h3>{role.role}</h3>
                  <p>{role.summary}</p>
                </div>
                <ul className="worldline-tags" aria-label={`${role.role} technologies`}>
                  {role.technologies.map((technology) => <li key={technology}>{technology}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="worldline-open-source" id="open-source" aria-labelledby="open-source-title" data-reveal>
          <div className="worldline-section-intro worldline-section-intro--compact">
            <div>
              <p className="worldline-kicker">03 / Open source</p>
              <h2 id="open-source-title">Small tools. Public proof.</h2>
            </div>
            <p>
              These projects are the smaller, visible edge of the same practice: make one problem
              easier to understand, then keep the boundary honest.
            </p>
          </div>
          <div className="worldline-open-source__grid">
            {openSourceProjects.map((project) => (
              <article className="worldline-open-source-card" key={project.id} data-reveal>
                <div className="worldline-open-source-card__topline">
                  <span>{project.year}</span>
                  <span>{project.status}</span>
                </div>
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
                <ul className="worldline-tags" aria-label={`${project.title} technologies`}>
                  {project.tags.map((tag) => <li key={tag}>{tag}</li>)}
                </ul>
                {(project.repository || project.href) && (
                  <ArrowLink to={project.repository || project.href || "#"} external>
                    View the public project
                  </ArrowLink>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="worldline-close" aria-labelledby="worldline-close-title" data-reveal>
          <p className="worldline-kicker">04 / The through-line</p>
          <h2 id="worldline-close-title">Follow the whole problem.</h2>
          <p>
            Interface, service, data, release. I like work that asks me to stay with an outcome
            long enough to make the edges make sense.
          </p>
          <div className="worldline-actions">
            <ArrowLink to="/story">Read the story</ArrowLink>
            <ArrowLink to="mailto:sohelislamimran@gmail.com" external>Start a conversation</ArrowLink>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
