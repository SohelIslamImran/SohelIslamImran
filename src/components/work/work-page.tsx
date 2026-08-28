import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { profile, projects, roles } from "@/data/folio";
import { PageEnter } from "@/components/site/page-enter";
import { Tilt } from "@/components/site/tilt";
import { FocusBarrel } from "./focus-barrel";
import { OpticalBench } from "./optical-bench";

export function WorkPage() {
  const oss = projects.filter((p) => p.id !== "kuno-platform");

  return (
    <PageEnter>
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
          <Tilt>
            <figure className="relative mx-auto aspect-square w-full max-w-80">
              <div className="glass absolute inset-[8%] overflow-hidden rounded-full">
                <img src={profile.portrait} alt={profile.name} className="size-full object-cover" />
              </div>
              <figcaption className="kicker absolute inset-x-0 -bottom-1 text-center">
                {profile.city} / UTC+6
              </figcaption>
            </figure>
          </Tilt>
        </section>

        <OpticalBench roles={roles} />

        <FocusBarrel />

        <section className="mt-24">
          <p className="kicker">Contact sheet · open source</p>
          <h2 className="mt-3 text-4xl">Small tools. Public proof.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {oss.map((project) => (
              <article key={project.id} className="contact-frame flex flex-col rounded-[28px] py-6">
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
            ))}
          </div>
        </section>
      </main>
    </PageEnter>
  );
}
