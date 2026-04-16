# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npx expo start          # Start dev server (scan QR with Expo Go)
npx expo run:android    # Build and run on Android device/emulator
npm run lint            # Run ESLint
```

There are no automated tests in this project.

## Architecture

StellarShift is an Expo (React Native) wallpaper app targeting Android. It uses **expo-router** with a file-based tab layout under `app/`.

**Three tabs:**
- `app/index.tsx` — Catalog: fetches photos from Unsplash API, supports category filtering, search, infinite scroll, favorites toggle, and saving to gallery. The Unsplash API key is hardcoded here and in `settings.tsx`.
- `app/favorites.tsx` — Favorites: reads from AsyncStorage (`favorites_data` key), supports full-screen preview and deletion.
- `app/settings.tsx` — Settings: configures auto-wallpaper-change interval, target screen, Wi-Fi/charging constraints, and categories. On save, fetches a photo pool from Unsplash and stores it in AsyncStorage (`wallpaper_pool`).

**`app/wallpaperService.ts`** — Background task logic using `expo-background-fetch` + `expo-task-manager`. Registers a background task (`BACKGROUND_WALLPAPER_UPDATE`) that cycles through the pre-fetched pool and applies wallpapers via `react-native-manage-wallpaper`. Exports: `startWallpaperRotation`, `stopWallpaperRotation`, `changeWallpaperNow`.

**AsyncStorage keys used across the app:**
- `favorites` — array of favorite photo IDs
- `favorites_data` — array of full photo objects
- `settings` — serialized settings object
- `wallpaper_pool` — array of `{id, url}` for background rotation
- `wallpaper_pool_index` — current position in the pool

**`app/components/SkeletonCard.tsx`** — Loading placeholder with shimmer animation, shown in a 2-column grid while photos load.

## Key constraints

- Android-only: wallpaper setting uses `react-native-manage-wallpaper` which is Android-specific. The `android` directory contains the native project.
- `expo-file-system/legacy` import is intentional — the non-legacy API has a different interface.
- The `CATEGORIES` array is duplicated between `index.tsx` and `settings.tsx` with slight differences (the mix category query differs). Keep them in sync when modifying.
- Background fetch on Android is unreliable at short intervals due to OS battery optimization; the UI notes this implicitly through the interval options starting at 15 min.
- `newArchEnabled: true` and `reactCompiler: true` are enabled in `app.json` — avoid patterns incompatible with React Compiler (e.g., manually mutating refs during render).

1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

State your assumptions explicitly. If uncertain, ask.
If multiple interpretations exist, present them - don't pick silently.
If a simpler approach exists, say so. Push back when warranted.
If something is unclear, stop. Name what's confusing. Ask.
2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

No features beyond what was asked.
No abstractions for single-use code.
No "flexibility" or "configurability" that wasn't requested.
No error handling for impossible scenarios.
If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

3. Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:

Don't "improve" adjacent code, comments, or formatting.
Don't refactor things that aren't broken.
Match existing style, even if you'd do it differently.
If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:

Remove imports/variables/functions that YOUR changes made unused.
Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

4. Goal-Driven Execution
Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

"Add validation" → "Write tests for invalid inputs, then make them pass"
"Fix the bug" → "Write a test that reproduces it, then make it pass"
"Refactor X" → "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.