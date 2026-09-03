---
last_verified: 2026-09-03
---

# Other public work

## ghosttime

### Overview

An npm CLI that recreates a Ghostty-style terminal animation with selectable ANSI colors, a timer, focus-aware pause and resume, centering, and efficient frame rendering.

### Role and evidence

Creator and maintainer. The initial commit is dated January 8, 2025. An external contributor authored the synchronized-output flicker fix in PR #4, so do not attribute that patch to Sohel. Current adoption and version figures live in [achievements.md](../achievements.md).

Sources: [GitHub](https://github.com/SohelIslamImran/ghosttime), [npm](https://www.npmjs.com/package/ghosttime).

## expo-import-cost

### Overview

A VS Code extension that uses Expo Atlas to show imported package and file size inline for JavaScript and TypeScript.

### Role and evidence

Creator. The first public release dates to October 21, 2024. Its README calls the extension unstable, so present it as an experiment rather than a mature production tool. Current adoption figures live in [achievements.md](../achievements.md).

Source: [GitHub](https://github.com/SohelIslamImran/expo-import-cost).

## TailSync

### Overview

An experimental native iOS utility for sending photos, videos, and shared files to devices on the user's Tailscale network through Taildrop's local PeerAPI.

### Technical details

The app records delivery per device, avoids duplicate sends, checks reachability, retries with backoff, supports a share extension, and keeps automatic deletion off by default. It waits for all enabled destinations to report success before deleting an original.

### Role and evidence

Creator. The public repository has Swift app, macOS, and share-extension targets. The README labels it an experimental personal utility.

Source: [GitHub](https://github.com/SohelIslamImran/TailSync).

## Android Mac Display

### Overview

A macOS and Android prototype that mirrors a Mac display to an Android phone over USB. The macOS side uses screen capture and H.264 encoding. ADB port forwarding connects it to an Android client that decodes the stream.

### Role and evidence

Creator. The repository uses Swift and Kotlin. Public releases were published in December 2025. The README says the project was built with Antigravity, so describe it as AI-assisted.

Source: [GitHub](https://github.com/SohelIslamImran/AndroidMacDisplay).

## Early web projects

LinkedIn and a 2021 resume document the learning-stage projects below. They are useful evidence of progression, not current flagship work.

- [Gerez](https://github.com/SohelIslamImran/gerez): car-repair service booking, Firebase authentication, private routes, user/admin dashboards, Node, Express, MongoDB, and Stripe.
- [Electro Shop](https://github.com/SohelIslamImran/electro-shop): electronic-commerce workflow with authentication, orders, and admin CRUD.
- [E-Ticket](https://github.com/SohelIslamImran/e-ticket): ticket booking with Firebase login and a Google Map.
- DoneWithIt, FocusTime, and `data-tables`: React Native and React learning/application projects listed in the historical resume or email record.

Source: [LinkedIn projects](https://www.linkedin.com/in/sohelislamimran/details/projects/).

## External contributions

- [React Native Directory PR #1342](https://github.com/react-native-community/directory/pull/1342), merged October 30, 2024, updated New Architecture compatibility for `expo-in-app-updates`.
- [React Native Firebase PR #6898](https://github.com/invertase/react-native-firebase/pull/6898), closed without merge, added Expo custom-domain documentation for Dynamic Links. Do not call it a merged contribution.
- [React Native Hold Menu PR #77](https://github.com/enesozturk/react-native-hold-menu/pull/77), closed without merge, proposed bug fixes. Do not call it shipped upstream.
