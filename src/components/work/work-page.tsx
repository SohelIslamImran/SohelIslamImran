import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { projects, roles } from "@/data/folio";
import { Tilt } from "@/components/site/tilt";
import { OpticalLens } from "@/components/home/lens";
import { FocusBarrel } from "./focus-barrel";
import { OpticalBench } from "./optical-bench";

export function WorkPage() {
  const oss = projects.filter((p) => p.id !== "kuno-platform");

  return (
    <main className="page pt-28 pb-24 md:pt-36">
        <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="kicker">Work / 2021—now</p>
            <h1 className="mt-4 max-w-3xl text-5xl md:text-7xl">
              Product systems that give complexity a clear next step.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              I lead full-stack product work at Kuno, connecting product rules, secure services, and delivery systems.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#kuno-work" className="btn">
                Rack the career
              </a>
              <Link to="/resume" className="btn btn-ghost">
                View résumé
              </Link>
            </div>
          </div>
          <OpticalLens compact />
        </section>

        <OpticalBench roles={roles} />

        <FocusBarrel />

        <section className="mt-24">
          <p className="kicker">Contact sheet · open source</p>
          <h2 className="mt-3 text-4xl">Small tools. Public proof.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {oss.map((project) => (
              <Tilt key={project.id}>
                <article id={project.id} className="contact-frame flex scroll-mt-28 flex-col rounded-[28px] py-6">
                  <div className="flex justify-between text-sm text-muted">
                    <span>{project.year}</span>
                    <span>{project.status}</span>
                  </div>
                  <h3 className="mt-4 text-2xl">{project.title}</h3>
                  <p className="mt-3 flex-1 text-sm text-muted">{project.summary}</p>
                  {project.repository ? (
                    <a href={project.repository} className="mt-5 inline-flex items-center gap-1 text-sm hover:text-primary">
                      View the public project <ArrowUpRight className="size-4" />
                    </a>
                  ) : null}
                </article>
              </Tilt>
            ))}
          </div>
        </section>
      </main>
  );
}
