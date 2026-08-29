import { useEffect, useRef, useState, type ComponentType } from "react";
import type { MutableRefObject } from "react";
import { profile } from "@/data/folio";
import { canAffordFx } from "@/hooks/use-idle-mount";
import { useReducedMotion } from "@/hooks/use-reduced";
import { Tilt } from "@/components/site/tilt";
import type { LensPointer } from "./lens-scene";

type GlassProps = {
  pointer: MutableRefObject<LensPointer>;
  reduced: boolean;
  playing: boolean;
};

export function OpticalLens({ compact = false }: { compact?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const pointer = useRef<LensPointer>({ x: 0, y: 0 });
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [Glass, setGlass] = useState<ComponentType<GlassProps> | null>(null);
  const loading = useRef(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const ensureGlass = () => {
    if (loading.current || Glass || reduced || !canAffordFx()) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    loading.current = true;
    void import("./lens-scene").then((m) => setGlass(() => m.LensGlass));
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    ensureGlass();
    const el = wrap.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    const px = (e.clientX - b.left) / b.width - 0.5;
    const py = (e.clientY - b.top) / b.height - 0.5;
    pointer.current = { x: px * 2, y: py * 2 };
    el.style.setProperty("--gx", `${px * 10}px`);
    el.style.setProperty("--gy", `${py * 8}px`);
    el.style.setProperty("--lx", `${(px + 0.5) * 100}%`);
    el.style.setProperty("--ly", `${(py + 0.5) * 100}%`);
  };

  const onLeave = () => {
    pointer.current = { x: 0, y: 0 };
    const el = wrap.current;
    if (!el) return;
    el.style.setProperty("--gx", "0px");
    el.style.setProperty("--gy", "0px");
    el.style.setProperty("--lx", "32%");
    el.style.setProperty("--ly", "22%");
  };

  return (
    <div>
      <Tilt max={compact ? 5 : 6}>
        <div
          ref={wrap}
          onPointerEnter={ensureGlass}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          className={`lens-stand relative mx-auto aspect-square w-full ${
            compact ? "max-w-72" : "max-w-[min(100%,26rem)]"
          }`}
          data-cursor="press"
          role="img"
          aria-label={`${profile.name}, photographed on a crown-glass plate`}
        >
          <div className="lens-plate">
            <img
              src={profile.portrait}
              alt=""
              className="lens-plate-photo"
              width={640}
              height={640}
              fetchPriority={compact ? "low" : "high"}
              loading={compact ? "lazy" : "eager"}
              decoding="async"
            />
            <div className="lens-plate-glass" />
            {Glass ? (
              <div className="lens-object">
                <Glass
                  pointer={pointer as MutableRefObject<LensPointer>}
                  reduced={reduced}
                  playing={visible && !reduced}
                />
              </div>
            ) : null}
          </div>
        </div>
      </Tilt>
      <p className="mt-4 text-center font-mono text-[10px] tracking-[0.18em] text-faint">
        {compact ? `${profile.city} · UTC+6` : "CONTACT PRINT · CROWN GLASS · MgF₂ COAT"}
      </p>
    </div>
  );
}
