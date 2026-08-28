import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { profile, projects, site } from "@/data/folio";
import { Reveal, RevealIn } from "@/components/site/reveal";
import { Tilt } from "@/components/site/tilt";
import { OpticalLens } from "./lens";
import { LightMeter } from "./meter";

function workHash(id: string) {
  return id === "kuno-platform" ? "kuno-work" : id;
}


function DisplayLede({ lede }: { lede: string }) {
  if (lede.trim() === profile.lede) {
    return (
      <h1 className="display mt-5">
        I build systems
        <br />
        that make complexity
        <br />
        <em className="text-primary">feel clear.</em>
      </h1>
    );
  }
  return <h1 className="display mt-5">{lede}</h1>;
}

export function HomePage({
  intro = profile.intro,
  lede = profile.lede,
  quote = profile.quote,
}: {
  intro?: string;
  lede?: string;
  quote?: string;
}) {
  const featured = projects.filter((p) => p.featured);
  const lead = featured[0];
  const rest = featured.slice(1);

  return (
    <main className="page pt-28 pb-24 md:pt-36">

        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <Reveal>
              <p className="kicker">Lead full stack engineer · {profile.company}</p>
            </Reveal>
            <Reveal delay={0.06}>
              <DisplayLede lede={lede} />
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-6 max-w-xl text-lg text-muted">{intro}</p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/work" className="btn">
                  Explore selected work
                </Link>
                <a href={`mailto:${site.email}`} className="btn btn-ghost">
                  Start a conversation
                </a>
              </div>
              <p className="mt-6 font-mono text-xs tracking-[0.16em] text-faint">
                {profile.coords} · {profile.city}
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <OpticalLens />
          </Reveal>
        </section>

        <RevealIn>
          <LightMeter />
        </RevealIn>

        <section className="mt-24">
          <RevealIn>
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="kicker">Selected plates</p>
                <h2 className="mt-3 text-4xl md:text-5xl">Public work, on the table.</h2>
              </div>
              <Link
                to="/work"
                className="hidden items-center gap-1 text-sm text-muted hover:text-fg md:inline-flex"
              >
                All work <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </RevealIn>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {lead ? (
              <RevealIn className="md:row-span-2">
                <Link to="/work" hash={workHash(lead.id)} className="block h-full">
                  <Tilt>
                    <article className="glass glass-spec flex h-full min-h-64 flex-col justify-between rounded-[32px] p-7 md:min-h-full md:p-8">
                      <div>
                        <p className="kicker">Plate 01 · {lead.year}</p>
                        <h3 className="mt-4 text-4xl md:text-5xl">{lead.title}</h3>
                        <p className="mt-4 max-w-md text-muted">{lead.summary}</p>
                      </div>
                      <p className="mt-8 text-xs tracking-[0.14em] text-faint uppercase">{lead.status}</p>
                    </article>
                  </Tilt>
                </Link>
              </RevealIn>
            ) : null}
            <div className="grid gap-4">
              {rest.map((project, i) => (
                <RevealIn key={project.id} delay={0.06 * (i + 1)}>
                  <Link to="/work" hash={workHash(project.id)} className="block h-full">
                    <Tilt>
                      <article className="glass glass-spec flex h-full flex-col justify-between rounded-[28px] p-6">
                        <div>
                          <p className="kicker">
                            Plate 0{i + 2} · {project.year}
                          </p>
                          <h3 className="mt-3 text-3xl">{project.title}</h3>
                          <p className="mt-3 text-sm text-muted">{project.summary}</p>
                        </div>
                        <p className="mt-5 text-xs tracking-[0.14em] text-faint uppercase">{project.status}</p>
                      </article>
                    </Tilt>
                  </Link>
                </RevealIn>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-20 grid gap-4 md:grid-cols-2">
          <RevealIn>
            <Link
              to="/story"
              className="glass glass-spec block rounded-[32px] p-8 transition-transform duration-150 active:scale-[0.98]"
            >
              <p className="kicker">Story</p>
              <h2 className="mt-3 text-4xl">From first principles.</h2>
              <p className="mt-3 text-muted">{quote}</p>
            </Link>
          </RevealIn>
          <RevealIn delay={0.08}>
            <Link
              to="/field-notes"
              className="glass glass-spec block rounded-[32px] p-8 transition-transform duration-150 active:scale-[0.98]"
            >
              <p className="kicker">Field notes</p>
              <h2 className="mt-3 text-4xl">A camera lucida of place.</h2>
              <p className="mt-3 text-muted">Origin, observation, and journeys still ahead — no invented pins.</p>
            </Link>
          </RevealIn>
        </section>
      </main>
  );
}

