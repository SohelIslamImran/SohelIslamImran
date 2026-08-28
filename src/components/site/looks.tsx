import * as Popover from "@radix-ui/react-popover";
import { Moon, Sun, SunMoon } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { applyGel, gels, readGelId, type Gel } from "@/lib/gel";
import {
  appearances,
  applyAppearance,
  bindThemeMedia,
  readAppearance,
  type Appearance,
} from "@/lib/theme";
import { springUi } from "./motion";

export function ThemeHydrate() {
  useEffect(() => {
    applyGel(readGelId());
    applyAppearance(readAppearance(), { transition: false });
    bindThemeMedia();
  }, []);
  return null;
}

function useLooks() {
  const [gelId, setGelId] = useState(gels[0]!.id);
  const [appearance, setAppearance] = useState<Appearance>("light");

  useEffect(() => {
    setGelId(readGelId());
    setAppearance(readAppearance());
    const onGel = (e: Event) => {
      const next = (e as CustomEvent<Gel>).detail;
      if (next?.id) setGelId(next.id);
    };
    const onTheme = (e: Event) => {
      const next = (e as CustomEvent<{ appearance: Appearance }>).detail;
      if (next?.appearance) setAppearance(next.appearance);
    };
    window.addEventListener("folio-gel", onGel);
    window.addEventListener("folio-theme", onTheme);
    return () => {
      window.removeEventListener("folio-gel", onGel);
      window.removeEventListener("folio-theme", onTheme);
    };
  }, []);

  return { gelId, appearance };
}

const appearanceIcon = {
  light: Sun,
  dark: Moon,
  system: SunMoon,
} as const;

export function LooksPanel({ layoutId }: { layoutId: string }) {
  const { gelId, appearance } = useLooks();
  const gel = gels.find((g) => g.id === gelId) ?? gels[0]!;

  return (
    <div className="looks">
      <p className="kicker">Appearance</p>
      <div className="looks-seg mt-2" role="radiogroup" aria-label="Appearance">
        {appearances.map((item) => {
          const on = item.id === appearance;
          const Icon = appearanceIcon[item.id];
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={item.name}
              className={on ? "is-on" : undefined}
              onClick={(e) =>
                applyAppearance(item.id, { origin: { x: e.clientX, y: e.clientY } })
              }
            >
              {on ? (
                <motion.span layoutId={layoutId} className="looks-seg-pill" transition={springUi} />
              ) : null}
              <Icon className="relative z-10 size-4" strokeWidth={1.75} />
              <span className="relative z-10">{item.name}</span>
            </button>
          );
        })}
      </div>

      <p className="kicker mt-5">Accent</p>
      <div className="looks-gels mt-2" role="radiogroup" aria-label="Accent gel">
        {gels.map((item) => {
          const on = item.id === gelId;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={item.name}
              title={item.name}
              className={`looks-swatch${on ? " is-on" : ""}`}
              onClick={() => applyGel(item.id)}
            >
              <span className="looks-swatch-dot" style={{ background: item.hex }} />
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs text-muted">{gel.name}</p>
    </div>
  );
}

export function LooksMenu() {
  const { gelId } = useLooks();
  const gel = gels.find((g) => g.id === gelId) ?? gels[0]!;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="looks-trigger"
          aria-label="Appearance and accent"
          title={`${gel.name} · Appearance`}
        >
          <span className="looks-trigger-dot" style={{ background: gel.hex }} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={10}
          align="end"
          collisionPadding={12}
          className="looks-pop glass glass-heavy glass-spec z-50 w-72 rounded-[28px] p-4 outline-none"
        >
          <LooksPanel layoutId="looks-seg-menu" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
