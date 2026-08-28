import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { profile } from "@/data/folio";
import { useReducedMotion } from "@/hooks/use-reduced";
import type { LensPointer } from "./lens-scene";

const LensScene = lazy(() => import("./lens-scene"));

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    const ok = Boolean(gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

export function OpticalLens() {
  const wrap = useRef<HTMLDivElement>(null);
  const pointer = useRef<LensPointer>({ x: 0, y: 0 });
  const reduced = useReducedMotion();
  const [webgl, setWebgl] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setWebgl(hasWebGL());
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = wrap.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    pointer.current = {
      x: ((e.clientX - b.left) / b.width - 0.5) * 2,
      y: ((e.clientY - b.top) / b.height - 0.5) * 2,
    };
  };

  return (
    <div>
      <div
        ref={wrap}
        onPointerMove={onMove}
        onPointerLeave={() => {
          pointer.current = { x: 0, y: 0 };
        }}
        className="relative mx-auto aspect-square w-full max-w-[min(100%,28rem)]"
        data-cursor="press"
        role="img"
        aria-label={`${profile.name}, photographed through a crown-glass objective`}
      >
        {webgl ? (
          <>
            <div className="lens-standin">
              <img
                src={profile.portrait}
                alt=""
                className="size-full object-cover"
                width={640}
                height={640}
              />
            </div>
            <div className="lens-object absolute inset-0">
              <Suspense fallback={null}>
                <LensScene
                  pointer={pointer as MutableRefObject<LensPointer>}
                  reduced={reduced}
                  playing={visible && !reduced}
                />
              </Suspense>
            </div>
          </>
        ) : (
          <div className="lens-rim glass absolute inset-[4%] overflow-hidden rounded-full">
            <img src={profile.portrait} alt="" className="size-full object-cover" width={640} height={640} />
          </div>
        )}
      </div>
      <p className="mt-3 text-center font-mono text-[10px] tracking-[0.18em] text-faint">
        OBJECTIVE · CROWN GLASS · MgF₂ COAT
      </p>
    </div>
  );
}
