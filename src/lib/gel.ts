export type Gel = {
  id: string;
  name: string;
  hex: string;
};

export const gels: Gel[] = [
  { id: "lacquer", name: "Lacquer", hex: "#c2473a" },
  { id: "sky", name: "Sky", hex: "#38bdf8" },
  { id: "azure", name: "Azure", hex: "#0a84ff" },
  { id: "aqua", name: "Aqua", hex: "#22d3ee" },
  { id: "mint", name: "Mint", hex: "#34d399" },
  { id: "violet", name: "Violet", hex: "#818cf8" },
  { id: "amber", name: "Amber", hex: "#f5a524" },
  { id: "graphite", name: "Graphite", hex: "#3f3c39" },
];

export const DEFAULT_GEL = "lacquer";
const KEY = "folio-gel";

export function hexToRgb(hex: string): [number, number, number] {
  const raw = hex.replace("#", "").trim();
  const h = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = Number.parseInt(h, 16);
  if (Number.isNaN(n)) return [0.76, 0.278, 0.227];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function gelById(id: string | null | undefined): Gel {
  return gels.find((g) => g.id === id) ?? gels[0]!;
}

export function readGelId(): string {
  try {
    const id = localStorage.getItem(KEY);
    if (id && gels.some((g) => g.id === id)) return id;
  } catch {
    /* private mode */
  }
  return DEFAULT_GEL;
}

export function applyGel(id: string) {
  const gel = gelById(id);
  document.documentElement.style.setProperty("--color-primary", gel.hex);
  document.documentElement.dataset.gel = gel.id;
  try {
    localStorage.setItem(KEY, gel.id);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new CustomEvent("folio-gel", { detail: gel }));
}

export function currentGelHex(): string {
  if (typeof document === "undefined") return gelById(DEFAULT_GEL).hex;
  const fromCss = getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim();
  return fromCss || gelById(readGelId()).hex;
}
