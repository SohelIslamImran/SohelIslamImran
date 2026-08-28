import { capabilities, profile, projects, roles, site, stack } from "@/data/folio";

export function ResumePrint() {
  return (
    <div>
      <p className="max-w-3xl text-lg">{profile.intro}</p>
      <p className="mt-4 text-sm text-muted">
        {site.email} · {profile.coords} · {profile.city}
      </p>

      <h2 className="mt-10 text-3xl">Experience</h2>
      <div className="mt-6 space-y-6">
        {roles.map((role) => (
          <article key={role.id} className="grid gap-2 border-t border-line/70 pt-6 md:grid-cols-[180px_1fr]">
            <p className="text-sm text-muted">{role.dates}</p>
            <div>
              <h3 className="text-2xl">{role.title}</h3>
              <p className="text-sm text-muted">{role.org}</p>
              <p className="mt-2">{role.summary}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
                {role.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      <h2 className="mt-12 text-3xl">Selected projects</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {projects.map((p) => (
          <article key={p.id} className="rounded-[24px] border border-line/60 p-5">
            <p className="kicker">{p.year}</p>
            <h3 className="mt-2 text-xl">{p.title}</h3>
            <p className="mt-2 text-sm text-muted">{p.summary}</p>
          </article>
        ))}
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {capabilities.map((c) => (
          <article key={c.id}>
            <h3 className="text-xl">{c.title}</h3>
            <p className="mt-2 text-sm text-muted">{c.description}</p>
          </article>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted">{stack.join(" · ")}</p>
    </div>
  );
}
