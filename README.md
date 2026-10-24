<div align="center">
  <img src="./public/images/sohel-linkedin-400.webp" width="128" height="128" alt="Sohel Islam Imran" />
  <h1>Sohel Islam Imran</h1>
  <p><strong>Lead Full Stack Engineer</strong><br />I follow product problems all the way through the stack.</p>
  <p>
    <a href="https://sohelislamimran.com">Portfolio</a> ·
    <a href="https://www.linkedin.com/in/sohelislamimran/">LinkedIn</a> ·
    <a href="https://github.com/SohelIslamImran">GitHub</a> ·
    <a href="https://x.com/SohelIslamImran">X</a> ·
    <a href="mailto:sohelislamimran@gmail.com">Email</a>
  </p>
</div>

## What I do

I'm a full-stack engineer in Dhaka. I started on React Native apps in 2021 and kept going: into the APIs, data, access rules, infrastructure, and release paths that decide whether a feature actually holds up.

Today I'm Lead Full Stack Engineer at [Kuno](https://www.kuno-ai.com/), a B2B professional-development platform, where I work across product architecture, application security, and delivery. Before that I spent nearly three years building a React Native events app at Tilleli, starting as an intern.

### Experience

| Period              | Company   | Role                         |
| ------------------- | --------- | ---------------------------- |
| Mar 2026 — present  | Kuno      | Lead Full Stack Engineer     |
| Jan 2025 — Mar 2026 | Kuno      | Full Stack Engineer          |
| Dec 2023 — Jan 2025 | Kuno      | Mobile Application Developer |
| Jun 2021 — Jan 2024 | Tilleli   | React Native Developer       |
| Jul 2021 — Sep 2021 | Bugfixers | Frontend Developer           |

### Open source

- [`expo-in-app-updates`](https://github.com/SohelIslamImran/expo-in-app-updates): one API for native in-app updates on Android (Play Core) and iOS (App Store lookup), written in Kotlin, Swift, and TypeScript. 72,220 npm downloads in the week of Oct 5–11, 2026.

Smaller builds and experiments: [`ghosttime`](https://github.com/SohelIslamImran/ghosttime), [TailSync](https://github.com/SohelIslamImran/TailSync), and [Android Mac Display](https://github.com/SohelIslamImran/AndroidMacDisplay).

**Day to day:** TypeScript, React, TanStack, Elysia on Bun, Drizzle, PostgreSQL, Redis, React Native and Expo, AWS and Terraform, Cloudflare.

## Beyond the code

I wrote my first code in late 2020, on the first computer my family could afford. The [longer story](https://sohelislamimran.com/story) covers how that turned into a career.

- [Follow the travel journal](https://sohelislamimran.com/field-notes)
- [Find every public link](https://sohelislamimran.com/links)

## This repository

This profile repository contains the source for `sohelislamimran.com`, my personal portfolio. The public surface is intentionally quiet: a white/paper foundation, cobalt route markers, orange signal states, restrained glass, and one keyboard-accessible route-orbit interaction.

### Stack

- **TanStack Start + TanStack Router** — file-based routes, typed loaders/search params, server functions, full-document SSR, and streaming-ready boundaries.
- **React 19 + TypeScript 7** — the UI and shared content contracts.
- **Vite 8 + Bun** — local development and the canonical lockfile.
- **Cloudflare Workers + D1** — edge runtime and revisioned published content; optional R2 media storage remains disabled.
- **Cloudflare Access** — owner-only CMS authentication, currently using Cloudflare's account identity provider.
- **Tailwind CSS 4** — the source of truth for theme tokens, responsive utilities, glass surfaces, and motion-friendly component primitives in `src/styles/tailwind.css`.
- **Oxlint, Oxfmt, Vitest** — fast static checks, formatting, and focused tests.

Public routes are SSR-first and read published content only. Drafts and private travel entries remain behind the CMS boundary, and public responses never expose R2 object keys.

### Styling migration

The former route stylesheet has been replaced by `tailwind.css`. Components now use Tailwind utilities, shadcn Base UI primitives, CVA variants, and `cn()` backed by semantic tokens (`canvas`, `ink`, `muted`, `line`, `primary`, and `surface`). The authored CSS that remains is limited to theme tokens, accessibility fallbacks, and print layout; no separate named stylesheet or custom visual utility layer is required.

### Local development

```sh
bun install
bun dev
```

Useful commands:

```sh
bun run build       # production client + SSR/Worker build
bun run typecheck   # Wrangler bindings + strict TypeScript
bun run check       # Oxlint + Oxfmt
bun run test        # focused Vitest tests
bun run preview     # preview the Vite build
bun run deploy      # build, then wrangler deploy
```

Copy `.dev.vars.example` to `.dev.vars` for local values. Never commit Access tokens, CSRF material, database credentials, R2 keys, or contract information.

## CMS and Cloudflare

The portfolio is deployed at `https://sohelislamimran.com`. The `www` hostname redirects to the apex, and `https://cms.sohelislamimran.com` is protected by an owner-only Cloudflare Access policy. The Worker also verifies the Access JWT and owner allowlist, checks origin and CSRF on mutations, and keeps draft/publish revisions safe.

Setup and rollout details live in [`docs/CLOUDFLARE.md`](./docs/CLOUDFLARE.md).

The single production Worker is named `portfolio`; it owns the D1 binding, three custom domains, Access application, and security settings. The CMS uses Cloudflare's account identity provider behind an owner-only email policy; no separate GitHub OAuth credential is required. R2 remains off because the current release uses static media and does not need usage-based object storage.

Production remains on the last verified Worker release while UI and interaction changes are reviewed on this branch. Deploy only after the preview and acceptance checks in [`docs/CLOUDFLARE.md`](./docs/CLOUDFLARE.md) pass.

The zone is on Cloudflare's Free Website plan, and this release did not enable Workers Paid, R2, or paid security add-ons. Free quotas may throttle traffic instead of providing unlimited capacity. Domain renewal is separate, remains enabled, and was not changed by this deployment.

## Privacy and publishing

The public story is generalized and does not publish salary, addresses, signatures, IDs, contract terms, private customer details, or private repositories. The CMS publishes only the validated document revision; public loaders never read drafts. Redirect utilities under `/links/:linkId` are allowlisted and marked `noindex`.

## License

The portfolio content and visual identity are personal. Source code is shared for reference; contact me before reusing personal copy, photographs, or brand assets.
