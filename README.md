<div align="center">
  <img src="./public/images/sohel-linkedin-400.webp" width="128" height="128" alt="Sohel Islam Imran" />
  <h1>Sohel Islam Imran</h1>
  <p><strong>Lead Full Stack Engineer at Kuno</strong><br />Product systems, mobile infrastructure, and delivery from Dhaka for teams everywhere.</p>
  <p>
    <a href="https://sohelislamimran.com">Portfolio</a> ·
    <a href="https://www.linkedin.com/in/sohelislamimran/">LinkedIn</a> ·
    <a href="https://github.com/SohelIslamImran">GitHub</a> ·
    <a href="https://x.com/SohelIslamImran">X</a> ·
    <a href="mailto:sohelislamimran@gmail.com">Email</a>
  </p>
</div>

## What I build

I follow product problems through the whole stack: interface behavior, services, data, authorization, release systems, and the feedback loops that keep software dependable.

At Kuno, I lead full-stack engineering across secure enterprise learning flows, role-aware product behavior, localized interfaces, internal tooling, CI/CD, observability, and platform operations. Public descriptions stay intentionally general where the product itself is private.

### Experience

| Period | Company | Role |
| --- | --- | --- |
| Mar 2026 — present | Kuno | Lead Full Stack Engineer |
| Jan 2025 — Mar 2026 | Kuno | Full Stack Engineer |
| Dec 2023 — Jan 2025 | Kuno | Mobile Application Developer |
| Jun 2021 — Jan 2024 | Tilleli | React Native Developer |
| Jul 2021 — Sep 2021 | Bugfixers | Frontend Developer |

### Selected public work

- [`expo-in-app-updates`](https://github.com/SohelIslamImran/expo-in-app-updates) — native Android and iOS update flows behind one compact Expo API.
- [`ghosttime`](https://github.com/SohelIslamImran/ghosttime) — a customizable Ghostty-style animation for any terminal.
- [`TailSync`](https://github.com/SohelIslamImran/TailSync) — private iOS transfers to personal Tailscale Taildrop devices.
- [`AndroidMacDisplay`](https://github.com/SohelIslamImran/AndroidMacDisplay) — a local USB path for using an Android phone as a secondary Mac display.

The current toolkit includes TypeScript, React, React Native, Expo, TanStack, ElysiaJS, Bun, PostgreSQL, Redis, Swift, Kotlin, containers, and Cloudflare. The tools change; clear product behavior and safe delivery do not.

## Beyond the code

I started learning on a phone in Bangladesh before I owned a computer. That path now runs through full-stack engineering, open source, mentoring, and a growing wish to work remotely while seeing more of the world.

- [Read the full story](https://sohelislamimran.com/story)
- [Follow the travel journal](https://sohelislamimran.com/field-notes)
- [Find every public link](https://sohelislamimran.com/links)

## This repository

This profile repository contains the source for `sohelislamimran.com`, a Kuno-first portfolio called **Prism Route**. The public surface is intentionally quiet: a white/paper foundation, cobalt route markers, orange signal states, restrained glass, and one keyboard-accessible route-orbit interaction.

### Stack

- **TanStack Start + TanStack Router** — file-based routes, typed loaders/search params, server functions, full-document SSR, and streaming-ready boundaries.
- **React 19 + TypeScript 7** — the UI and shared content contracts.
- **Vite 8 + Bun** — local development and the canonical lockfile.
- **Cloudflare Workers + D1 + R2** — edge runtime, published content, and optional media storage.
- **Cloudflare Access** — owner-only CMS authentication with GitHub as the Access identity provider.
- **Tailwind CSS 4, Oxlint, Oxfmt, Vitest** — styling tokens, checks, formatting, and focused tests.

The former React Router app remains under `app/` as a rollback/reference path while the TanStack build is validated. Public routes are SSR-first and read published content only; drafts remain behind the CMS boundary.

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

The target CMS hostname is `https://cms.sohelislamimran.com`. Cloudflare Access should protect it with a default-deny policy that allows only `sohelislamimran@gmail.com` through GitHub OAuth. The Worker still verifies the Access JWT and owner allowlist, checks origin and CSRF on mutations, and keeps draft/publish revisions safe.

Setup and rollout details live in [`docs/CLOUDFLARE.md`](./docs/CLOUDFLARE.md). Deployment is intentionally not claimed by this repository: the owner must authenticate Wrangler, create/attach the production resources, configure Access and DNS, and validate a preview before switching the apex domain.

The configuration stays within Cloudflare’s free-compatible product shapes, but the repository cannot guarantee an account will never be billed. Verify the account plan, usage alerts, Workers/D1/R2 quotas, and add-ons in the Cloudflare dashboard before deploying. Domain renewal is separate and is not changed here.

## Privacy and publishing

The public story is generalized and does not publish salary, addresses, signatures, IDs, contract terms, private customer details, or private repositories. The CMS publishes only the validated document revision; public loaders never read drafts. Redirect utilities under `/links/:linkId` are allowlisted and marked `noindex`.

## License

The portfolio content and visual identity are personal. Source code is shared for reference; contact me before reusing personal copy, photographs, or brand assets.
