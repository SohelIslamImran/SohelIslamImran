# Prism Route portfolio

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

## Validation

Run these before handoff:

```sh
bun run typecheck
bun run check
bun run test
bun run build
```

Use the in-app browser for visual, responsive, keyboard, and reduced-motion QA.
