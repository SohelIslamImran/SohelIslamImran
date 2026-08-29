import { useEffect, useState } from "react";

/**
 * Decorative work must wait until the document is complete AND idle.
 * Passing a short `timeout` to requestIdleCallback used to fire while
 * hydration was still parsing modules, which froze the first clicks.
 */
export function useIdleMount(minDelay = 1800) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let idleId = 0;
    let timerId = 0;

    const go = () => {
      if (!cancelled) setReady(true);
    };

    const armIdle = () => {
      if (cancelled) return;
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(go, { timeout: 2500 });
      } else {
        timerId = window.setTimeout(go, 0);
      }
    };

    const start = () => {
      timerId = window.setTimeout(armIdle, minDelay);
    };

    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", start);
      window.clearTimeout(timerId);
      if (idleId && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [minDelay]);

  return ready;
}

export function canAffordFx() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  if (nav.connection?.saveData) return false;
  if (nav.connection?.effectiveType === "slow-2g" || nav.connection?.effectiveType === "2g") {
    return false;
  }
  return true;
}
