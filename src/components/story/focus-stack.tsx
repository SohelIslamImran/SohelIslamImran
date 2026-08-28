import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import type { Chapter } from "@/data/folio";
import { useReducedMotion } from "@/hooks/use-reduced";
import { easeOut } from "@/components/site/motion";

export function FocusStack({ chapters }: { chapters: Chapter[] }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const plane = useTransform(scrollYProgress, [0, 1], [0, Math.max(0, chapters.length - 1)]);
  const [focus, setFocus] = useState(0);

  useMotionValueEvent(plane, "change", (v) => setFocus(v));

  if (reduced) {
    return (
      <div className="mt-16 space-y-10">
        {chapters.map((chapter) => (
          <article key={chapter.id} className="glass rounded-[28px] p-6 md:p-8">
            <p className="kicker">{chapter.kicker}</p>
            <h2 className="mt-3 text-3xl md:text-5xl">{chapter.title}</h2>
            {chapter.paragraphs.map((p) => (
              <p key={p} className="mt-4 max-w-2xl text-muted">
                {p}
              </p>
            ))}
            <p className="mt-5 text-sm text-primary">{chapter.artifact}</p>
          </article>
        ))}
      </div>
    );
  }

  const current = Math.round(focus);
  const chapter = chapters[current] ?? chapters[0];

  return (
    <div ref={ref} className="relative mt-8" style={{ height: `${chapters.length * 88}vh` }}>
      <div className="sticky top-24 grid h-[min(64vh,36rem)] grid-cols-1 gap-6 md:grid-cols-[4.5rem_1fr]">
        <ol className="relative hidden md:block" aria-label="Focus planes">
          {chapters.map((item, i) => {
            const dist = i - focus;
            const abs = Math.abs(dist);
            return (
              <li
                key={item.id}
                className="glass absolute inset-x-0 h-16 overflow-hidden rounded-2xl"
                style={{
                  top: `calc(50% + ${dist * 28}px - 2rem)`,
                  opacity: abs > 2.2 ? 0 : 1 - abs * 0.28,
                  filter: `blur(${Math.min(8, abs * 3)}px)`,
                  transform: `scale(${1 - Math.min(0.12, abs * 0.05)})`,
                  zIndex: 10 - Math.round(abs * 3),
                }}
              >
                <span
                  className={`grid h-full place-items-center font-mono text-sm tracking-widest ${
                    i === current ? "text-fg" : "text-faint"
                  }`}
                >
                  {item.id}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="relative min-w-0">
          {chapters.map((item, i) => {
            const dist = i - focus;
            const abs = Math.abs(dist);
            if (abs > 1.25) return null;
            return (
              <div
                key={item.id}
                aria-hidden
                className="glass pointer-events-none absolute inset-x-0 top-6 bottom-6 rounded-[32px]"
                style={{
                  transform: `translateY(${dist * 18}px) scale(${1 - abs * 0.04})`,
                  opacity: i === current ? 0 : Math.max(0.08, 0.32 - abs * 0.12),
                  filter: `blur(${6 + abs * 6}px)`,
                }}
              />
            );
          })}

          <AnimatePresence mode="wait">
            <motion.article
              key={chapter.id}
              initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
              transition={{ duration: 0.32, ease: easeOut }}
              className="glass glass-spec relative z-10 h-full overflow-auto rounded-[32px] p-6 md:p-10"
            >
              <p className="kicker">
                Plane {chapter.id} · {chapter.kicker}
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl md:text-5xl">{chapter.title}</h2>
              {chapter.paragraphs.map((p) => (
                <p key={p} className="mt-4 max-w-2xl text-muted">
                  {p}
                </p>
              ))}
              <p className="mt-5 text-sm text-primary">{chapter.artifact}</p>
            </motion.article>
          </AnimatePresence>
        </div>
      </div>
      <p className="kicker pointer-events-none absolute inset-x-0 bottom-6 text-center">Scroll to rack focus</p>
    </div>
  );
}
