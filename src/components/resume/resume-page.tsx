import { profile } from "@/data/folio";
import { ResumePrint } from "./print";

export function ResumePage() {
  return (
    <main className="page pt-28 pb-24 md:pt-36">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Contact print · updated 27 Aug 2026</p>
          <h1 className="mt-3 text-5xl md:text-7xl">{profile.name}</h1>
          <p className="mt-3 text-lg text-muted">
            {profile.title}, {profile.company} · {profile.city}
          </p>
        </div>
        <button type="button" className="btn no-print" onClick={() => window.print()}>
          Print the plate
        </button>
      </div>

      <section className="glass relative mt-8 overflow-hidden rounded-[32px] p-6 md:p-10">
        <ResumePrint />
      </section>
    </main>
  );
}
