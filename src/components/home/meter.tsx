import { useState } from "react";
import { metrics } from "@/data/folio";

export function LightMeter() {
  const [active, setActive] = useState(0);

  return (
    <section className="film-rebate mt-20" aria-label="Exposure readings">
      <div className="film-rebate-sprocket hidden sm:block" aria-hidden="true" />
      <div className="meter min-w-0 flex-1">
        {metrics.map((item, i) => (
          <button
            key={item.label}
            type="button"
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            className={`meter-cell${i === active ? " is-on" : ""}`}
          >
            <p className="relative font-display text-3xl tracking-tight md:text-4xl">{item.value}</p>
            <p className="relative mt-1 text-sm text-muted">{item.label}</p>
          </button>
        ))}
      </div>
      <div className="film-rebate-sprocket hidden sm:block" aria-hidden="true" />
    </section>
  );
}
