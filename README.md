# Sohel Islam Imran — Folio

Personal site: an optical light table. **TanStack Start**, React 19, **Bun**.

```bash
bun install
bun run dev
```

Public pages (`/`, `/work`, `/story`, `/field-notes`, `/resume`, `/links`) are prerendered to static HTML and never wait on the database. Navigation preloads on hover and warms the rest of the public routes while the page is idle.

The caustic field and the portrait glass overlay use a tiny raw WebGL shader — no Three.js on the critical path. First paint is the real page, not an empty canvas.

Appearance and accent **gels** live in the header (and the phone menu). Studio is owner-gated.
