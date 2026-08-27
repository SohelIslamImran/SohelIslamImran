# Cloudflare Workers

This is a React Router Framework Mode application deployed to Cloudflare Workers.

- Retrieve current Cloudflare documentation before changing Workers, D1, R2, or Access behavior.
- Run `npm run cf-typegen` after changing bindings in `wrangler.jsonc`.
- Keep public portfolio reads separate from owner-only draft and publishing actions.
- Never log Access JWTs, cookies, draft content, private media keys, or personal contract data.
- Keep D1 migrations explicit and versioned under `migrations/`.

## Validation

Run these before handoff:

```sh
npm run typecheck
npm run build
```

Use the in-app browser for visual, responsive, keyboard, and reduced-motion QA.
