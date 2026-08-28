import { animate, motion, useMotionValue } from "motion/react";
import { useRef, useState, type KeyboardEvent, type PointerEvent as RE } from "react";
import { systemDomains } from "@/data/folio";
import { project, wrap } from "@/lib/gesture";
import { springFlick, springUi } from "@/components/site/motion";

export function FocusBarrel() {
  const n = systemDomains.length;
  const [active, setActive] = useState(0);
  const rot = useMotionValue(0);
  const drag = useRef<{ id: number; x: number; lastX: number; lastT: number; rot: number } | null>(null);
  const domain = systemDomains[active];
  const slot = 360 / n;

  const select = (index: number, velocity = 0) => {
    const next = wrap(index, n);
    setActive(next);
    animate(rot, next * slot, {
      ...(Math.abs(velocity) > 0.4 ? springFlick : springUi),
      velocity,
    });
  };

  const onDown = (e: RE<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, lastX: e.clientX, lastT: e.timeStamp, rot: rot.get() };
  };
  const onMove = (e: RE<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const next = d.rot + (e.clientX - d.x) * 0.48;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    rot.set(next);
    setActive(wrap(Math.round(next / slot), n));
  };
  const onUp = (e: RE<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const velocity = (e.clientX - d.lastX) / Math.max(16, e.timeStamp - d.lastT);
    const projected = rot.get() + project(velocity * 1000) * 0.12;
    select(Math.round(projected / slot), velocity);
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      select(active + 1);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      select(active - 1);
    }
  };

  return (
    <section className="mt-20 grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]" id="system-lens">
      <div
        role="slider"
        tabIndex={0}
        aria-valuemin={1}
        aria-valuemax={n}
        aria-valuenow={active + 1}
        aria-label="System domain focus"
        className="relative mx-auto aspect-square w-full max-w-md cursor-grab touch-none outline-none active:cursor-grabbing"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
      >
        <motion.div className="tick absolute inset-0 rounded-full opacity-20" style={{ rotate: rot }} />
        <div className="glass glass-spec absolute inset-[12%] grid place-items-center rounded-full text-center">
          <div>
            <p className="kicker">
              {domain.index} / {domain.label}
            </p>
            <p className="mt-3 font-display text-4xl">{domain.label} in focus</p>
          </div>
        </div>
        <p className="kicker absolute inset-x-0 -bottom-2 text-center">Drag to rotate</p>
      </div>
      <div>
        <p className="kicker">One product, three distances</p>
        <h2 id="focus-title" className="mt-3 text-4xl md:text-5xl">
          The part of the work I keep coming back to.
        </h2>
        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Kuno system domains">
          {systemDomains.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active === index}
              className={`relative rounded-full px-4 py-2 text-sm transition-colors duration-150 ${
                active === index ? "text-bg" : "glass text-muted"
              }`}
              onClick={() => select(index)}
            >
              {active === index ? (
                <motion.span layoutId="barrel-pill" className="absolute inset-0 rounded-full bg-fg" transition={springUi} />
              ) : null}
              <span className="relative z-10">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-6" role="tabpanel" aria-live="polite">
          <h3 className="text-3xl">{domain.title}</h3>
          <p className="mt-3 text-muted">{domain.description}</p>
          <p className="mt-4 text-sm text-faint">{domain.signal}</p>
        </div>
      </div>
    </section>
  );
}
