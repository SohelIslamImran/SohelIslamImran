import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as RE } from "react";
import type { FieldNote } from "@/data/folio";
import { project, wrap } from "@/lib/gesture";
import { useReducedMotion } from "@/hooks/use-reduced";
import { springUi } from "@/components/site/motion";

export function Viewfinder({ notes }: { notes: FieldNote[] }) {
  const [index, setIndex] = useState(0);
  const [rot, setRot] = useState(0);
  const reduced = useReducedMotion();
  const drag = useRef<{ id: number; x: number; lastX: number; lastT: number; rot: number } | null>(null);
  const note = notes[index];
  const hue = Math.round(18 + note.temp * 28);
  const ticks = useMemo(() => Array.from({ length: 56 }, (_, i) => i), []);
  const slot = 360 / notes.length;

  const select = (next: number) => {
    const i = wrap(next, notes.length);
    setIndex(i);
    setRot(i * slot);
  };

  const onDown = (e: RE<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, lastX: e.clientX, lastT: e.timeStamp, rot };
  };
  const onMove = (e: RE<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const nextRot = d.rot + (e.clientX - d.x) * 0.42;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    setRot(nextRot);
    setIndex(wrap(Math.round(nextRot / slot), notes.length));
  };
  const onUp = (e: RE<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const velocity = (e.clientX - d.lastX) / Math.max(16, e.timeStamp - d.lastT);
    const projected = rot + project(velocity * 1000) * 0.08;
    const next = wrap(Math.round(projected / slot), notes.length);
    setIndex(next);
    setRot(next * slot);
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      select(index + 1);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      select(index - 1);
    }
  };

  return (
    <div>
      <div
        role="group"
        tabIndex={0}
        aria-label="Field notes viewfinder"
        className="relative mx-auto aspect-square w-full max-w-[min(100%,34rem)] cursor-grab touch-none outline-none active:cursor-grabbing"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
      >
        <motion.div
          className="absolute inset-0"
          animate={reduced ? undefined : { rotate: rot }}
          transition={springUi}
        >
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute top-1/2 left-1/2 h-[46%] w-px origin-top bg-fg/10"
              style={{ transform: `rotate(${(t / ticks.length) * 360}deg)` }}
            />
          ))}
          {notes.map((item, i) => (
            <span
              key={item.id}
              className={`absolute top-1/2 left-1/2 h-2.5 w-2.5 origin-center rounded-full ${
                i === index ? "bg-primary" : "bg-fg/30"
              }`}
              style={{
                transform: `rotate(${i * slot}deg) translate(0, -48%) rotate(${-i * slot}deg)`,
              }}
            />
          ))}
        </motion.div>

        <div
          className="glass absolute inset-[11%] overflow-hidden rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.88), hsl(${hue} 32% 62% / 0.58) 55%, hsl(${hue} 28% 36% / 0.62))`,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={note.id}
              initial={reduced ? false : { opacity: 0, scale: 0.97, filter: "blur(6px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={reduced ? undefined : { opacity: 0, scale: 0.97, filter: "blur(6px)" }}
              transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
              className="flex h-full flex-col items-center justify-center px-8 text-center optic-copy"
            >
              <p className="font-mono text-[0.625rem] tracking-[0.2em] uppercase opacity-80">
                {String(index + 1).padStart(2, "0")} / {String(notes.length).padStart(2, "0")} · {note.coords}
              </p>
              <p className="mt-3 font-display text-5xl md:text-6xl">{note.place}</p>
              <p className="mt-2 text-sm opacity-80">
                {note.region} · {note.status} · {note.season}
              </p>
              <p className="mt-5 max-w-sm font-display text-xl leading-snug">{note.title}</p>
              <p className="mt-3 max-w-sm text-sm opacity-85">{note.summary}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <blockquote className="glass mx-auto mt-8 max-w-xl rounded-[28px] p-5 text-center text-sm text-muted">
        {note.reflection}
      </blockquote>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {notes.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => select(i)}
            className={`min-w-32 rounded-2xl px-4 py-3 text-left text-sm contact-frame ${
              i === index ? "ring-1 ring-fg" : ""
            }`}
          >
            <span className="kicker">{item.status}</span>
            <span className="mt-1 block font-medium">{item.place}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
