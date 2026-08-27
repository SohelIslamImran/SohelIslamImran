import { useMemo, useState } from "react";
import { Link } from "react-router";
import type { ExperienceContent } from "../types/content";

interface CompanyChapter {
  company: string;
  period: string;
  role: string;
  summary: string;
  roles: ExperienceContent[];
}

export function CareerWorldline({ experience }: { experience: ExperienceContent[] }) {
  const chapters = useMemo<CompanyChapter[]>(() => {
    const companies = ["Kuno", "Tilleli", "Bugfixers"];
    return companies.flatMap((company) => {
      const roles = experience.filter((item) => item.company === company);
      if (roles.length === 0) return [];
      return [{
        company,
        period: roles.length > 1 ? "2023 — now" : roles[0].period,
        role: roles[0].role,
        summary: roles[0].summary,
        roles,
      }];
    });
  }, [experience]);
  const [selected, setSelected] = useState(0);
  const chapter = chapters[selected] ?? chapters[0];

  if (!chapter) return null;

  return (
    <section className="career-worldline" aria-labelledby="career-title">
      <div className="career-worldline__copy">
        <h2 id="career-title">Experience, in motion.</h2>
        <div className="career-worldline__tabs" role="tablist" aria-label="Choose a company">
          {chapters.map((item, index) => (
            <button
              key={item.company}
              id={`career-tab-${item.company.toLowerCase()}`}
              type="button"
              role="tab"
              aria-selected={selected === index}
              aria-controls="career-panel"
              tabIndex={selected === index ? 0 : -1}
              onClick={() => setSelected(index)}
              onKeyDown={(event) => {
                const next = event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? chapters.length - 1
                    : event.key === "ArrowRight" || event.key === "ArrowDown"
                      ? (selected + 1) % chapters.length
                      : event.key === "ArrowLeft" || event.key === "ArrowUp"
                        ? (selected - 1 + chapters.length) % chapters.length
                        : null;
                if (next === null) return;
                event.preventDefault();
                setSelected(next);
                (event.currentTarget.parentElement?.children[next] as HTMLButtonElement | undefined)?.focus();
              }}
            >
              {item.company}
            </button>
          ))}
        </div>
        <div
          id="career-panel"
          className="career-worldline__panel"
          role="tabpanel"
          aria-labelledby={`career-tab-${chapter.company.toLowerCase()}`}
          tabIndex={0}
        >
          <p className="career-worldline__period">{chapter.period}</p>
          <h3>{chapter.role}</h3>
          <p>{chapter.summary}</p>
          {chapter.company === "Kuno" && (
            <ul>
              <li>Product architecture</li>
              <li>Full-stack delivery</li>
              <li>Team and release systems</li>
            </ul>
          )}
          <Link className="worldline-button" to="/work">Explore {chapter.company} work <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
      <div className="career-worldline__stage" data-company={chapter.company.toLowerCase()} aria-hidden="true">
        {chapters.map((item, index) => (
          <div
            key={item.company}
            className="career-card"
            data-active={index === selected || undefined}
            style={{ "--card-index": index, "--selected-index": selected } as React.CSSProperties}
          >
            <div>
              <span>{item.period}</span>
              <strong>{item.company}</strong>
              <small>{item.role}</small>
            </div>
            {item.company === "Kuno" ? (
              <img
                src="/images/kuno-systems-placeholder.png"
                alt=""
                width="1448"
                height="1086"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="career-card__object"><i /><b /><em /></div>
            )}
          </div>
        ))}
        <div className="career-worldline__wire" />
      </div>
    </section>
  );
}
