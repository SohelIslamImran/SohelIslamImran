import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SignedIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isOwnerEmail } from "@/lib/owner";
import { nav, profile, site } from "@/data/folio";
import { useDhakaClock } from "@/hooks/use-dhaka-clock";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { springUi } from "./motion";
import { CausticField } from "./caustic";
import { GelPicker } from "./gel-picker";
import { GlassCursor } from "./cursor";
import { Mark } from "./mark";


export function Shell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const progress = useScrollProgress();
  const clock = useDhakaClock();
  const [open, setOpen] = useState(false);
  const [iris, setIris] = useState(false);
  const { user, isPending } = useCurrentUserState();
  const owner = isOwnerEmail(user?.primaryEmail);

  useEffect(() => {
    setOpen(false);
    setIris(true);
    const t = window.setTimeout(() => setIris(false), 280);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
      >
        Skip to content
      </a>
      <div className="site-sheen" aria-hidden="true" />
      <CausticField />
      <GlassCursor />
      <GelPicker />
      <div className={`iris${iris ? " is-on" : ""}`} aria-hidden="true" />
      <div className="site-progress" style={{ ["--progress" as string]: `${progress * 100}%` }} />

      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="glass glass-spec pointer-events-auto flex w-full max-w-5xl items-center gap-2 rounded-full p-1.5 pl-3 pr-2">
          <Link to="/" className="flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-medium">
            <Mark className="size-6" />
            <span className="hidden tracking-tight sm:inline">S.I.I.</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-0.5 md:flex" aria-label="Primary">
            {nav.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative rounded-full px-3.5 py-2 text-sm transition-colors duration-150 ${
                    active ? "text-bg" : "text-muted hover:text-fg"
                  }`}
                >
                  {active ? (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-fg"
                      transition={springUi}
                    />
                  ) : null}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1 md:ml-2">
            {clock ? (
              <p className="hidden px-2 font-mono text-[10px] tracking-[0.14em] text-muted lg:block">
                {clock.time} · DHK
              </p>
            ) : (
              <span className="hidden h-3 w-16 rounded-full bg-fg/5 lg:block" />
            )}
            {isPending ? (
              <span className="size-8 rounded-full bg-fg/10" />
            ) : owner ? (
              <SignedIn>
                <Link to="/studio" className="btn-ghost btn min-h-9 px-3 text-xs">
                  Studio
                </Link>
              </SignedIn>
            ) : null}
            <SignedIn>
              <div className="user-chip">
                <UserButton />
              </div>
            </SignedIn>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full md:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="sheet"
            initial={{ opacity: 0, y: -10, scale: 0.97, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, scale: 0.97, filter: "blur(6px)" }}
            transition={springUi}
            style={{ transformOrigin: "top right" }}
            className="fixed inset-x-3 top-20 z-40 rounded-[28px] p-3 glass glass-heavy md:hidden"
          >
            <nav className="flex flex-col" aria-label="Mobile">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex min-h-12 items-center rounded-2xl px-4 text-base font-medium"
                >
                  {item.label}
                </Link>
              ))}
              <Link to="/studio" className="flex min-h-12 items-center rounded-2xl px-4 text-muted">
                Studio
              </Link>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div id="content" className="relative z-10">
        <Outlet />
      </div>

      <footer className="relative z-10 mt-8 border-t border-line/60">
        <div className="page flex flex-col gap-6 py-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="kicker">Colophon</p>
            <p className="mt-3 max-w-sm font-display text-3xl">{profile.name}</p>
            <p className="mt-2 text-sm text-muted">
              {profile.city} · {profile.title}, {profile.company}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            <Link to="/work" className="hover:text-fg">
              Work
            </Link>
            <Link to="/field-notes" className="hover:text-fg">
              Notes
            </Link>
            <Link to="/links" className="hover:text-fg">
              Links
            </Link>
            <Link to="/studio" className="hover:text-fg">
              Studio
            </Link>
            <a href={`mailto:${site.email}`} className="hover:text-fg">
              Email
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
