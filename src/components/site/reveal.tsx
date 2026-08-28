import type { CSSProperties, ReactNode } from "react";

/**
 * Enter motion must never hide SSR HTML. Opacity 0 + a slow JS bundle was
 * the blank-canvas-on-reload bug: the page was in the document, invisible
 * until hydration. These wrappers only nudge transform, and only when the
 * user has not asked for reduced motion.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={className ? `folio-enter ${className}` : "folio-enter"}
      style={delay ? ({ animationDelay: `${delay}s` } as CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}

export function RevealIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={className ? `folio-in ${className}` : "folio-in"}
      style={delay ? ({ animationDelay: `${delay}s` } as CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
