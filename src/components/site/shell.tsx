import { Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SignedIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isOwnerEmail } from "@/lib/owner";
import { lockEnterMotion } from "@/lib/enter";
import { nav, profile, site } from "@/data/folio";
import { useDhakaClock } from "@/hooks/use-dhaka-clock";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { springUi } from "./motion";
import { CausticField } from "./caustic";
import { LooksMenu, LooksPanel, ThemeHydrate } from "./looks";
import { GlassCursor } from "./cursor";
import { Mark } from "./mark";

function isActivePath(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}

function SiteProgress() {
  const progress = useScrollProgress();
  return <div className="site-progress" style={{ ["--progress" as string]: `${progress * 100}%` }} />;
}

function DhakaClock() {
  const clock = useDhakaClock();
  if (!clock) return <span className="hidden h-3 w-16 rounded-full bg-fg/5 lg:block" />;
  return (
    <p className="hidden px-2 font-mono text-[10px] tracking-[0.14em] text-muted lg:block">
      {clock.time} · DHK
    </p>
  );
}

function WarmPublicRoutes() {
  const router = useRouter();
  useEffect(() => {
    const warm = () => {
      for (const item of nav) {
        void router.preloadRoute({ to: item.to }).catch(() => {});
      }
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm);
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warm, 180);
    return () => window.clearTimeout(id);
  }, [router]);
  return null;
}

export function Shell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const firstPath = useRef(true);
  const { user, isPending } = useCurrentUserState();
  const owner = isOwnerEmail(user?.primaryEmail);

  useEffect(() => {
    setOpen(false);
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    lockEnterMotion();
  }, [pathname]);

  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
      >
        Skip to content
      </a>
      <CausticField />
      <GlassCursor />
      <ThemeHydrate />
      <WarmPublicRoutes />
      <SiteProgress />

      <header className="site-chrome pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="glass glass-spec pointer-events-auto flex w-full max-w-5xl items-center gap-2 rounded-full p-1.5 pl-3 pr-2">
          <Link to="/" className="flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-medium">
            <Mark className="size-6" />
            <span className="hidden tracking-tight sm:inline">S.I.I.</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-0.5 md:flex" aria-label="Primary">
            {nav.map((item) => {
              const active = isActivePath(pathname, item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  preload="intent"
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
            <DhakaClock />
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
            <div className="hidden md:block">
              <LooksMenu />
            </div>
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
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={springUi}
            style={{ transformOrigin: "top right" }}
            className="glass glass-heavy fixed inset-x-3 top-20 z-40 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-[28px] p-3 md:hidden"
          >
            <nav className="flex flex-col" aria-label="Mobile">
              {nav.map((item) => {
                const active = isActivePath(pathname, item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    preload="intent"
                    className={`flex min-h-12 items-center rounded-2xl px-4 text-base font-medium ${
                      active ? "bg-fg text-bg" : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link to="/studio" className="flex min-h-12 items-center rounded-2xl px-4 text-muted">
                Studio
              </Link>
            </nav>
            <div className="looks-sheet mt-1 px-2 pt-4 pb-2">
              <LooksPanel layoutId="looks-seg-sheet" />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div id="content" className="relative z-10">
        <Outlet />
      </div>

      <footer className="relative z-10 mt-4">
        <div className="page flex flex-col gap-6 py-12 md:flex-row md:items-end md:justify-between">
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
