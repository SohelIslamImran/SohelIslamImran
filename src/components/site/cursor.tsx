import { useEffect, useRef } from "react";

/** Trailing gel dot. Never hides the system cursor — that was the "dead" feel. */
export function GlassCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches) {
      el.hidden = true;
      return;
    }
    let x = 0;
    let y = 0;
    let sx = 0;
    let sy = 0;
    let raf = 0;
    const loop = () => {
      sx += (x - sx) * 0.22;
      sy += (y - sy) * 0.22;
      el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <div ref={ref} className="glass-cursor-dot" aria-hidden="true" />;
}
