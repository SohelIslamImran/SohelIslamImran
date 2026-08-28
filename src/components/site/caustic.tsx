import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { useIdleMount } from "@/hooks/use-idle-mount";
import { useReducedMotion } from "@/hooks/use-reduced";
import { LightField } from "./light-field";

export function CausticField() {
  const reduced = useReducedMotion();
  const idle = useIdleMount(280);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 70, damping: 22, mass: 0.9 });
  const sy = useSpring(y, { stiffness: 70, damping: 22, mass: 0.9 });
  const halo = useMotionTemplate`translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%)`;
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    if (!mq.matches || reduced) {
      return () => mq.removeEventListener("change", sync);
    }
    x.set(window.innerWidth * 0.62);
    y.set(window.innerHeight * 0.28);
    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduced, x, y]);

  return (
    <div className="atmosphere" aria-hidden="true">
      {idle && !reduced ? <LightField /> : null}
      <div className="atmosphere-orb atmosphere-orb-a" />
      <div className="atmosphere-orb atmosphere-orb-b" />
      <div className="atmosphere-orb atmosphere-orb-c" />
      {fine && !reduced ? (
        <motion.div className="atmosphere-halo" style={{ transform: halo }} />
      ) : null}
      <div className="atmosphere-frost" />
    </div>
  );
}
