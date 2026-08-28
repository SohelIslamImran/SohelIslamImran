import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Shell } from "@/components/site/shell";
import appCss from "../styles.css?url";

const APP_NAME = "Sohel Islam Imran — Folio";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Instrument+Serif:ital@0;1&display=swap";

const THEME_BOOT = `(function(){var r=document.documentElement;try{var g={lacquer:"#c2473a",sky:"#38bdf8",azure:"#0a84ff",aqua:"#22d3ee",mint:"#34d399",violet:"#818cf8",amber:"#f5a524",graphite:"#8e8a85"};var id=localStorage.getItem("folio-gel");if(id&&g[id]){r.style.setProperty("--color-primary",g[id]);r.setAttribute("data-gel",id);}var a=localStorage.getItem("folio-theme")||"light";if(a!=="light"&&a!=="dark"&&a!=="system")a="light";var dark=a==="dark"||(a==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);r.setAttribute("data-theme",dark?"dark":"light");r.setAttribute("data-appearance",a);r.style.colorScheme=dark?"dark":"light";}catch(e){r.setAttribute("data-theme","light");}})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "Lead Full Stack Engineer at Kuno. Dhaka-based. TypeScript, React, React Native, Elysia, Bun.",
      },
      { name: "theme-color", content: "#f5f5f7", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#000000", media: "(prefers-color-scheme: dark)" },

    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preload", href: "/portrait.png", as: "image", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preload", href: FONT_HREF, as: "style" },
      { rel: "stylesheet", href: FONT_HREF },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Shell />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
