---
last_verified: 2026-09-03
---

# Technical skills

This file separates demonstrated use from profile keywords. A repository can prove that a technology was used. It does not prove mastery by itself.

## Strongest evidence

| Area                  | Technologies and practices                                                                                  | Evidence                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Full-stack TypeScript | TypeScript, React, TanStack Router and Query, Bun, Elysia, Drizzle, PostgreSQL, Redis                       | Public profile plus [R-KUNO-ARCH] and [R-KUNO-PRODUCT]              |
| React Native and Expo | React Native, Expo, EAS Build and Update, native modules                                                    | Public role history, restricted work records, `expo-in-app-updates` |
| Product architecture  | Vertical slices, monorepos, shared packages, typed API boundaries, role-aware workflows                     | [R-KUNO-ARCH] and [R-KUNO-PRODUCT]                                  |
| Security              | Authorization, privacy boundaries, webhook trust, secret scanning, PII minimization, service authentication | [R-KUNO-SECURITY]                                                   |
| Delivery and cloud    | CI/CD, release metadata, rollback, AWS, Terraform, and deployment identity                                  | [R-KUNO-DELIVERY]                                                   |
| Testing and quality   | Bun tests, API contract tests, route probes, Playwright E2E, oxlint, oxfmt, Vite+                           | [R-KUNO-DELIVERY]                                                   |
| Localization          | Lingui catalogs, English/French UI, localized artifacts and errors                                          | [R-KUNO-PRODUCT]                                                    |

## Mobile and native evidence

- **Firebase:** Authentication, Firestore, Storage, Functions, Analytics, Crashlytics, Dynamic Links, and Remote Config appear in the Tilleli application and LinkedIn role description.
- **Mobile integrations:** Stripe, RevenueCat, Algolia, Google Maps and Places, push notifications, chat/video, and app-store release work appear in Tilleli and historical Kuno evidence.
- **Kotlin and Swift:** both are present in `expo-in-app-updates`; Swift is the main language for TailSync and the macOS side of Android Mac Display; Kotlin is used in the Android client.
- **Native platform APIs:** Android Play Core in-app updates, iTunes Search API, Tailscale PeerAPI, ScreenCaptureKit, VideoToolbox, Android MediaCodec, ADB forwarding, PhotoKit, and iOS share extensions are demonstrated in public repositories.

## Backend, data, and operations evidence

- Elysia APIs on Bun, Drizzle-backed data work, PostgreSQL, Redis, background jobs, and scheduled jobs.
- Authentication, account-linking, session, and role-aware authorization workflows.
- AWS deployment, Terraform infrastructure, deployment identity, release, and rollback work.
- Operator tooling for deployment, promotion, rollback, configuration, and database operations.
- Analytics, privacy-aware error tracking, and mobile observability.

## Earlier and supporting skills

The 2021 resume and public projects show JavaScript, HTML, CSS, Sass, Bootstrap, React, Node.js, Express, MongoDB, Redux, Firebase, Netlify, and Heroku. These are valid historical skills. They should not dominate the current profile.

## Evidence limits

- Kuno uses AI-assisted product features and Sohel has authored integration, localization, access-control, and service-auth changes. The evidence does not support "machine-learning engineer" or model-training claims.
- AWS and Terraform work is substantial enough to support cloud and infrastructure experience. Use "contributed to" or name the shipped change unless formal infrastructure ownership is needed.
- The current Lead title and cross-repository work support technical leadership. The evidence does not establish line management.

[R-KUNO-ARCH]: sources.md#restricted-source-classes
[R-KUNO-PRODUCT]: sources.md#restricted-source-classes
[R-KUNO-SECURITY]: sources.md#restricted-source-classes
[R-KUNO-DELIVERY]: sources.md#restricted-source-classes
