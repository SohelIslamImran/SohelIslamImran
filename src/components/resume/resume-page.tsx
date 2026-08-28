import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { profile } from "@/data/folio";
import { PageEnter } from "@/components/site/page-enter";
import { useReducedMotion } from "@/hooks/use-reduced";
import { springCursorLag } from "@/components/site/motion";
import { ResumePrint } from "./print";

const LOUPE = 180;
const ZOOM = 1.65;

export function ResumePage() {
  const reduced = useReducedMotion();
  const sheet = useRef<HTMLElement>(null);
  const glass = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 900, h: 1200 });
  const x = useMotionValue(240);
  const y = useMotionValue(140);
  const sx = useSpring(x, springCursorLag);
  const sy = useSpring(y, springCursorLag);

  useLayoutEffect(() => {
    const el = sheet.current;
    if (!el) return;
    const measure = () => {
      const b = el.getBoundingClientRect();
      setBox({ w: b.width, h: b.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const apply = () => {
      const el = glass.current;
      if (!el) return;
      const lx = sx.get();
      const ly = sy.get();
      el.style.transform = `translate(${LOUPE / 2 - lx * ZOOM}px, ${LOUPE / 2 - ly * ZOOM}px) scale(${ZOOM})`;
    };
    apply();
    const a = sx.on("change", apply);
    const b = sy.on("change", apply);
    return () => {
      a();
      b();
    };
  }, [sx, sy]);

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const el = sheet.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    x.set(e.clientX - b.left);
    y.set(e.clientY - b.top);
  };

  return (
    <PageEnter>
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
        <p className="kicker no-print mt-6 hidden md:block">
          A loupe sits on the print — move across the sheet.
        </p>

        <section
          ref={sheet}
          onPointerMove={onMove}
          className="glass relative mt-8 overflow-hidden rounded-[32px] p-6 md:p-10"
        >
          <ResumePrint />
          {reduced ? null : (
            <motion.div
              className="loupe no-print max-md:hidden"
              style={{ left: sx, top: sy, x: "-50%", y: "-50%" }}
              aria-hidden="true"
            >
              <div
                ref={glass}
                className="p-6 md:p-10"
                style={{
                  width: box.w,
                  height: box.h,
                  transformOrigin: "0 0",
                }}
              >
                <ResumePrint />
              </div>
              <span className="loupe-rim" />
            </motion.div>
          )}
        </section>
      </main>
    </PageEnter>
  );
}
