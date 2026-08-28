import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { springCursor, springCursorLag } from "./motion";

export function GlassCursor() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, springCursor);
  const sy = useSpring(y, springCursor);
  const rx = useSpring(x, springCursorLag);
  const ry = useSpring(y, springCursorLag);
  const scale = useMotionValue(1);
  const scaleSpring = useSpring(scale, { stiffness: 700, damping: 32, mass: 0.16 });
  const [fine, setFine] = useState(false);
  const ring = useMotionTemplate`translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
  const dot = useMotionTemplate`translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%) scale(${scaleSpring})`;

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    if (!mq.matches) return () => mq.removeEventListener("change", sync);

    document.documentElement.classList.add("has-glass-cursor");
    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const el = e.target as HTMLElement | null;
      scale.set(el?.closest("a, button, [data-cursor='press']") ? 1.55 : 1);
    };
    const down = () => scale.set(0.78);
    const up = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      scale.set(el?.closest("a, button, [data-cursor='press']") ? 1.55 : 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      document.documentElement.classList.remove("has-glass-cursor");
      mq.removeEventListener("change", sync);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, [scale, x, y]);

  if (!fine) return null;

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="glass-cursor pointer-events-none fixed top-0 left-0 z-[90] size-9 rounded-full"
        style={{
          transform: ring,
          background: "color-mix(in oklab, white 28%, transparent)",
          border: "1px solid color-mix(in oklab, white 80%, var(--color-fg) 8%)",
          boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.7)",
          backdropFilter: "blur(8px)",
          willChange: "transform",
        }}
      />
      <motion.div
        aria-hidden="true"
        className="glass-cursor pointer-events-none fixed top-0 left-0 z-[91] size-2.5 rounded-full mix-blend-multiply"
        style={{
          transform: dot,
          background: "color-mix(in oklab, var(--color-primary) 72%, white)",
          boxShadow: "0 0 0 1px rgb(255 255 255 / 0.7), 0 8px 18px -10px rgb(26 25 23 / 0.4)",
          willChange: "transform",
        }}
      />
    </>
  );
}
