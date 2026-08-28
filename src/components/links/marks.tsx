import type { ReactNode } from "react";
import type { ProfileLink } from "@/data/folio";

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      {children}
    </svg>
  );
}

export function LinkMark({ id, className }: { id: ProfileLink["id"]; className?: string }) {
  switch (id) {
    case "email":
      return (
        <Svg className={className}>
          <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="M4 7.5 12 13l8-5.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </Svg>
      );
    case "github":
      return (
        <Svg className={className}>
          <path
            fill="currentColor"
            d="M12 2.2A9.8 9.8 0 0 0 2.2 12c0 4.33 2.8 8 6.7 9.3.5.1.67-.22.67-.48v-1.7c-2.73.6-3.3-1.16-3.3-1.16-.45-1.14-1.1-1.44-1.1-1.44-.9-.62.07-.6.07-.6 1 .07 1.53 1.04 1.53 1.04.89 1.53 2.33 1.09 2.9.83.09-.65.35-1.09.63-1.34-2.18-.25-4.47-1.1-4.47-4.88 0-1.08.38-1.96 1.02-2.65-.1-.25-.44-1.27.1-2.64 0 0 .84-.27 2.75 1.01a9.5 9.5 0 0 1 5 0c1.9-1.28 2.74-1.01 2.74-1.01.55 1.37.21 2.39.1 2.64.64.69 1.02 1.57 1.02 2.65 0 3.79-2.3 4.63-4.49 4.87.36.31.68.92.68 1.86v2.76c0 .26.18.59.68.48A9.81 9.81 0 0 0 21.8 12 9.8 9.8 0 0 0 12 2.2Z"
          />
        </Svg>
      );
    case "linkedin":
      return (
        <Svg className={className}>
          <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8 10.5V17M8 7.4v.02M12.5 17v-3.6c0-1.3.7-2 1.85-2s1.85.8 1.85 2V17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </Svg>
      );
    case "x":
      return (
        <Svg className={className}>
          <path d="M5 5.5 19 18.5M10.2 5.5 19 18.5M5 18.5 13.8 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </Svg>
      );
    case "instagram":
      return (
        <Svg className={className}>
          <rect x="4" y="4" width="16" height="16" rx="4.5" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="16.4" cy="7.6" r="0.9" fill="currentColor" />
        </Svg>
      );
    case "bluesky":
      return (
        <Svg className={className}>
          <path
            fill="currentColor"
            d="M7.2 5.4c2.1 1.6 4.4 4.8 4.8 6.5.4-1.7 2.7-4.9 4.8-6.5 1.5-1.1 3.9-2 3.9 1.1 0 .6-.4 5.2-.6 5.9-.8 2.4-3.4 3-5.8 2.6 4.2.7 5.2 3 2.9 5.3-4.3 4.3-6.2-1.1-6.7-2.5-.1-.3-.2-.4-.2-.4s-.1.1-.2.4c-.5 1.4-2.4 6.8-6.7 2.5-2.3-2.3-1.3-4.6 2.9-5.3-2.4.4-5-.2-5.8-2.6-.2-.7-.6-5.3-.6-5.9 0-3.1 2.4-2.2 3.9-1.1Z"
          />
        </Svg>
      );
    case "facebook":
      return (
        <Svg className={className}>
          <path
            fill="currentColor"
            d="M14.2 21v-7.2h2.4l.4-2.8h-2.8V9.3c0-.8.2-1.4 1.4-1.4H17V5.4c-.2 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.6v2.1H9v2.8h2.4V21h2.8Z"
          />
        </Svg>
      );
    case "stack-overflow":
      return (
        <Svg className={className}>
          <path d="M6.8 14.2v4.2H17V14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M9 17.2h6M9.3 14.3l5.9.9M10.2 11.2l5.6 2.1M12 8.4l5 3.2M14.4 5.8l3.8 4.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </Svg>
      );
    default:
      return (
        <Svg className={className}>
          <path d="M6 7.5h12M6 12h12M6 16.5h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </Svg>
      );
  }
}
