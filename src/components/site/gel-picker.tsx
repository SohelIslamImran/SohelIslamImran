import { useEffect, useState } from "react";
import { applyGel, gels, readGelId, type Gel } from "@/lib/gel";

export function GelPicker() {
  const [active, setActive] = useState(gels[0]!.id);

  useEffect(() => {
    const id = readGelId();
    setActive(id);
    applyGel(id);
    const onGel = (e: Event) => {
      const gel = (e as CustomEvent<Gel>).detail;
      if (gel?.id) setActive(gel.id);
    };
    window.addEventListener("folio-gel", onGel);
    return () => window.removeEventListener("folio-gel", onGel);
  }, []);

  return (
    <div
      className="gel-tray pointer-events-auto"
      role="radiogroup"
      aria-label="Accent gel"
    >
      <p className="kicker px-1">Gels</p>
      <div className="flex items-center gap-1">
        {gels.map((gel) => {
          const on = gel.id === active;
          return (
            <button
              key={gel.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={gel.name}
              title={gel.name}
              onClick={() => applyGel(gel.id)}
              className={`gel-swatch${on ? " is-on" : ""}`}
              style={{ background: gel.hex }}
            />
          );
        })}
      </div>
    </div>
  );
}
