export type Appearance = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const appearances: { id: Appearance; name: string }[] = [
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
  { id: "system", name: "Auto" },
];

export const DEFAULT_APPEARANCE: Appearance = "light";
const KEY = "folio-theme";

export const themeColor = {
  light: "#f5f5f7",
  dark: "#000000",
} as const;

export function isAppearance(v: string | null | undefined): v is Appearance {
  return v === "light" || v === "dark" || v === "system";
}

export function readAppearance(): Appearance {
  try {
    const v = localStorage.getItem(KEY);
    if (isAppearance(v)) return v;
  } catch {
    /* private mode */
  }
  return DEFAULT_APPEARANCE;
}

export function resolveTheme(appearance: Appearance): ResolvedTheme {
  if (appearance === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return appearance;
}

export function currentTheme(): ResolvedTheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function syncThemeColor(theme: ResolvedTheme) {
  const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
  if (metas.length === 0) {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", themeColor[theme]);
    document.head.appendChild(meta);
    return;
  }
  metas.forEach((meta, i) => {
    meta.setAttribute("content", themeColor[theme]);
    meta.removeAttribute("media");
    if (i > 0) meta.remove();
  });
}


type ThemeOrigin = { x: number; y: number };

function commitAppearance(appearance: Appearance, theme: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.appearance = appearance;
  root.style.colorScheme = theme;
  try {
    localStorage.setItem(KEY, appearance);
  } catch {
    /* private mode */
  }
  syncThemeColor(theme);
  window.dispatchEvent(
    new CustomEvent("folio-theme", { detail: { appearance, theme } }),
  );
}

function supportsViewTransition(): boolean {
  return typeof document.startViewTransition === "function";
}

function supportsTransitionTypes(): boolean {
  return Boolean(window.CSS?.supports?.("selector(:active-view-transition-type(a))"));
}

export function applyAppearance(
  appearance: Appearance,
  opts?: { transition?: boolean; origin?: ThemeOrigin },
) {
  if (typeof document === "undefined") return;
  const theme = resolveTheme(appearance);
  const root = document.documentElement;
  const prev = root.dataset.theme;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const shouldTransition =
    (opts?.transition ?? true) &&
    supportsViewTransition() &&
    !reduced &&
    Boolean(prev) &&
    prev !== theme;

  const run = () => commitAppearance(appearance, theme);

  if (!shouldTransition) {
    run();
    return;
  }

  if (opts?.origin) {
    root.style.setProperty("--vt-x", `${Math.round(opts.origin.x)}px`);
    root.style.setProperty("--vt-y", `${Math.round(opts.origin.y)}px`);
  }

  root.classList.add("vt-theme");
  const types = ["folio-theme", theme === "dark" ? "folio-theme-dark" : "folio-theme-light"];
  const start = document.startViewTransition.bind(document) as (input: unknown) => {
    finished: Promise<void>;
  };

  try {
    const vt = supportsTransitionTypes() ? start({ update: run, types }) : start(run);
    void vt.finished.finally(() => root.classList.remove("vt-theme"));
  } catch {
    root.classList.remove("vt-theme");
    run();
  }
}

let mediaBound = false;

export function bindThemeMedia() {
  if (mediaBound || typeof window === "undefined") return;
  mediaBound = true;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (readAppearance() === "system") applyAppearance("system");
  };
  mq.addEventListener("change", onChange);
}
