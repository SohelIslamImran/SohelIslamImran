import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Folio" }] }),
  component: lazyRouteComponent(() => import("@/components/studio/login-page"), "LoginPage"),
});
