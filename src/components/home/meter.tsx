import { LayoutGroup, motion } from "motion/react";
import { useState } from "react";
import { metrics } from "@/data/folio";
import { springUi } from "@/components/site/motion";

export function LightMeter() {
  const [active, setActive] = useState(0);

  return (
    <section className="film-rebate mt-20" aria-label="Exposure readings">
      <div className="film-rebate-sprocket hidden sm:block" aria-hidden="true" />
      <LayoutGroup>
        <div className="meter min-w-0 flex-1">
          {metrics.map((item, i) => (
            <button
              key={item.label}
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className="relative z-10 px-4 py-5 text-left"
            >
              {i === active ? (
                <motion.span
                  layoutId="meter-pill"
                  className="absolute inset-1 rounded-[18px] bg-white/70"
                  transition={springUi}
                />
              ) : null}
              <p className="relative font-display text-3xl tracking-tight md:text-4xl">{item.value}</p>
              <p className="relative mt-1 text-sm text-muted">{item.label}</p>
            </button>
          ))}
        </div>
      </LayoutGroup>
      <div className="film-rebate-sprocket hidden sm:block" aria-hidden="true" />
    </section>
  );
}
