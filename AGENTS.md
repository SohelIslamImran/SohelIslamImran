# Portfolio

This is a TanStack Start application with file-based TanStack Router routes,
full-document SSR, streaming, and a Cloudflare Workers runtime.

- Retrieve current Cloudflare documentation before changing Workers, D1, R2, or Access behavior.
- Run `bun run cf-typegen` after changing bindings in `wrangler.jsonc`.
- Keep public portfolio reads separate from owner-only draft and publishing actions.
- Never log Access JWTs, cookies, draft content, private media keys, or personal contract data.
- Keep D1 migrations explicit and versioned under `migrations/`.
- Keep server-only Cloudflare work in `.server.ts` modules or typed server
  functions; route loaders must remain safe to execute during hydration.
- Use Bun as the canonical package manager and keep `bun.lock` in sync with
  exact dependency versions.

## Animation

- Tailwind v4 `translate-*`, `scale-*`, and `rotate-*` utilities emit the CSS
  longhand properties `translate`, `scale`, and `rotate`. A custom
  `transition-[...]` that lists only `transform` will not animate those
  properties. Include the matching longhands, or use `transition-transform`,
  which covers `transform`, `translate`, `scale`, and `rotate`. Check the
  generated or computed CSS for hover, active, focus, and data-state motion.

## Validation

Run these before handoff:

```sh
bun run typecheck
bun run check
bun run test
bun run build
```

Use the in-app browser for visual, responsive, keyboard, and reduced-motion QA.
