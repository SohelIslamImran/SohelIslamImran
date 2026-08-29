import { useEffect, useState, type ComponentType } from "react";
import { canAffordFx, useIdleMount } from "@/hooks/use-idle-mount";
import { useReducedMotion } from "@/hooks/use-reduced";

export function CausticField() {
  const reduced = useReducedMotion();
  const idle = useIdleMount(2200);
  const [Field, setField] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (!idle || reduced || !canAffordFx()) return;
    if (window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 720) return;
    let alive = true;
    void import("./light-field").then((m) => {
      if (alive) setField(() => m.LightField);
    });
    return () => {
      alive = false;
    };
  }, [idle, reduced]);

  return (
    <div className="atmosphere" aria-hidden="true">
      {Field ? <Field /> : null}
      <div className="atmosphere-caustic" />
      <div className="atmosphere-orb atmosphere-orb-a" />
      <div className="atmosphere-orb atmosphere-orb-b" />
      <div className="atmosphere-orb atmosphere-orb-c" />
      <div className="atmosphere-frost" />
    </div>
  );
}
