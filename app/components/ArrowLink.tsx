import type { ReactNode } from "react";
import { Link } from "react-router";

export function ArrowLink({
  to,
  children,
  external = false,
  className = "",
}: {
  to: string;
  children: ReactNode;
  external?: boolean;
  className?: string;
}) {
  const content = (
    <>
      <span>{children}</span>
      <span className="arrow-link__glyph" aria-hidden="true">
        ↗
      </span>
    </>
  );

  return external ? (
    <a className={`arrow-link ${className}`} href={to} rel="noreferrer">
      {content}
    </a>
  ) : (
    <Link className={`arrow-link ${className}`} to={to}>
      {content}
    </Link>
  );
}
