import { animate, motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { useRef, useState, type KeyboardEvent, type PointerEvent as RE } from "react";
import type { Role } from "@/data/folio";
import { clamp, constrain, project } from "@/lib/gesture";
import { useReducedMotion } from "@/hooks/use-reduced";
import { springFlick, springUi } from "@/components/site/motion";

function Plate({
  role,
  index,
  focus,
  reduced,
  onPick,
}: {
  role: Role;
  index: number;
  focus: MotionValue<number>;
  reduced: boolean;
  onPick: () => void;
}) {
  const dist = useTransform(focus, (f) => index - f);
  const y = useTransform(dist, (d) => d * 22);
  const scale = useTransform(dist, (d) => 1 - Math.min(0.08, Math.abs(d) * 0.04));
  const opacity = useTransform(dist, (d) => {
    const a = Math.abs(d);
    if (a < 0.45) return 1;
    if (a < 1.15) return 0.38;
    if (a < 2.1) return 0.16;
    return 0;
  });
  const filter = useTransform(dist, (d) => `blur(${Math.min(16, Math.abs(d) * 10)}px)`);
  const textOpacity = useTransform(dist, (d) => Math.max(0, 1 - Math.abs(d) * 2.4));

  if (reduced) {
    return (
      <button
        type="button"
        onClick={onPick}
        data-cursor="press"
        className="glass w-full rounded-[28px] p-6 text-left"
      >
        <p className="kicker">{role.org}</p>
        <h3 className="mt-2 text-3xl">{role.title}</h3>
        <p className="mt-2 text-sm text-muted">{role.dates}</p>
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onPick}
      data-cursor="press"
      style={{ y, scale, opacity, filter }}
      className="glass glass-spec absolute inset-x-0 top-0 h-56 overflow-hidden rounded-[28px] p-6 text-left md:h-64 md:p-8"
    >
      <motion.div style={{ opacity: textOpacity }}>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <time>{role.dates}</time>
          {role.current ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">In focus</span>
          ) : (
            <span className="kicker">Plate {String(index + 1).padStart(2, "0")}</span>
          )}
        </div>
        <p className="kicker mt-4">{role.org}</p>
        <h3 className="mt-2 text-3xl md:text-4xl">{role.title}</h3>
        <p className="mt-3 max-w-2xl text-muted">{role.summary}</p>
      </motion.div>
    </motion.button>
  );
}

export function OpticalBench({ roles }: { roles: Role[] }) {
  const n = roles.length;
  const focus = useMotionValue(0);
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const drag = useRef<{
    id: number;
    startY: number;
    startF: number;
    lastF: number;
    lastT: number;
  } | null>(null);
  const didDrag = useRef(false);

  useMotionValueEvent(focus, "change", (v) => {
    setIndex(clamp(Math.round(v), 0, n - 1));
  });

  const snapTo = (target: number, velocity = 0) => {
    const next = clamp(Math.round(target), 0, n - 1);
    animate(focus, next, {
      ...(Math.abs(velocity) > 1.2 ? springFlick : springUi),
      velocity,
    });
  };

  const onDown = (e: RE<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    didDrag.current = false;
    drag.current = {
      id: e.pointerId,
      startY: e.clientY,
      startF: focus.get(),
      lastF: focus.get(),
      lastT: e.timeStamp,
    };
  };

  const onMove = (e: RE<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const next = constrain(d.startF + (e.clientY - d.startY) / 86, 0, n - 1, 1.15);
    if (Math.abs(e.clientY - d.startY) > 8) didDrag.current = true;
    d.lastF = focus.get();
    d.lastT = e.timeStamp;
    focus.set(next);
  };

  const onUp = (e: RE<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dt = Math.max(16, e.timeStamp - d.lastT);
    const v = ((focus.get() - d.lastF) / dt) * 1000;
    const projected = focus.get() + project(v);
    snapTo(projected, v);
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      snapTo(index + 1);
    }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      snapTo(index - 1);
    }
  };

  const role = roles[index];

  return (
    <section className="mt-24 scroll-mt-28" id="kuno-work">

      <p className="kicker">Optical bench · {n} career plates</p>
      <h2 className="mt-3 max-w-2xl text-4xl md:text-5xl">Rack the work into focus.</h2>
      <p className="mt-4 max-w-xl text-muted">
        Drag the stack. The current plane is sharp; the others fall into bokeh. Arrows work too.
      </p>

      {reduced ? (
        <div className="mt-10 space-y-4">
          {roles.map((item, i) => (
            <Plate key={item.id} role={item} index={i} focus={focus} reduced onPick={() => snapTo(i)} />
          ))}
        </div>
      ) : (
        <div
          className="bench relative mt-10 h-64 cursor-grab outline-none active:cursor-grabbing md:h-72"
          role="slider"
          tabIndex={0}
          aria-valuemin={1}
          aria-valuemax={n}
          aria-valuenow={index + 1}
          aria-label="Career focus"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
        >
          {roles.map((item, i) => (
            <Plate
              key={item.id}
              role={item}
              index={i}
              focus={focus}
              reduced={false}
              onPick={() => {
                if (didDrag.current) return;
                snapTo(i);
              }}
            />
          ))}
        </div>
      )}

      <div className="mt-6" aria-live="polite">
        <ul className="flex flex-wrap gap-2">
          {roles.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => snapTo(i)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors duration-150 ${
                i === index ? "bg-fg text-bg" : "glass text-muted"
              }`}
            >
              {item.org}
            </button>
          ))}
        </ul>
        <ul className="mt-5 space-y-2 text-sm text-muted">
          {role.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <ul className="mt-5 flex flex-wrap gap-2">
          {role.stack.map((s) => (
            <li key={s} className="rounded-full bg-fg/5 px-3 py-1 text-xs">
              {s}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
