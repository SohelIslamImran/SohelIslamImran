---
project: expo-in-app-updates
last_verified: 2026-09-03
repository: https://github.com/SohelIslamImran/expo-in-app-updates
---

# expo-in-app-updates

## Overview

An open-source Expo module that exposes native app-update behavior for Android and iOS through a small JavaScript and TypeScript API.

## My role

Creator and maintainer. The npm package metadata names `SohelIslamImran` as author and links to Sohel's repository. Git history begins on October 22, 2024.

## Problem

Android provides flexible and immediate in-app update flows through Play Core. iOS does not provide the same native flow, so apps need store-version lookup and an App Store handoff. React Native and Expo applications need one interface that respects those platform differences.

## Solution

- Android module built around Play Core update availability, allowed update types, staleness, priority, and progress events.
- iOS module that checks the iTunes Search API and opens the App Store product page.
- Shared methods for checking, starting, and combining update checks with update start.
- Event listeners for start, download, cancellation, and completion where the platform supports them.
- Configuration for App Store ID and country.
- Example application and release tooling.

## My contributions

The repository history shows Sohel-authored Android and iOS implementations, the shared API, event handling, Expo SDK upgrades, examples, and build fixes. A merged React Native Directory contribution records New Architecture compatibility. [Directory PR #1342](https://github.com/react-native-community/directory/pull/1342), merged October 30, 2024.

## Technologies

TypeScript, Kotlin, Swift, Expo Modules API, Android Play Core, iTunes Search API, Expo module scripts, Bun, oxlint, oxfmt, and release-it.

## Impact

GitHub and npm provide public adoption signals. Use the canonical dated figures in [achievements.md](../achievements.md). Downloads are not active-user counts or proof that every download reached production.

## Evidence

- [GitHub repository](https://github.com/SohelIslamImran/expo-in-app-updates)
- [npm package](https://www.npmjs.com/package/expo-in-app-updates)
- [npm period download endpoint](https://api.npmjs.org/downloads/point/2026-08-23:2026-08-29/expo-in-app-updates)
- [React Native Directory contribution](https://github.com/react-native-community/directory/pull/1342)

## Confidence and notes

High confidence in authorship, architecture, release version, and dated metrics. Refresh stars, forks, version, and downloads before using them publicly.
