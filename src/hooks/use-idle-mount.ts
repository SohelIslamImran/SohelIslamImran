import { useEffect, useState } from "react";

/** Mount decorative work after first paint so SSR HTML is never blocked. */
export function useIdleMount(timeout = 240) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setReady(true), { timeout });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setReady(true), Math.min(timeout, 80));
    return () => window.clearTimeout(id);
  }, [timeout]);

  return ready;
}
