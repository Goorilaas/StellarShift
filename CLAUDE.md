# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
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

## Commands

```bash
npx expo start            # JS-only changes (no native code touched)
npx expo run:android      # Full rebuild — required when Kotlin/manifest/assets change
npm run lint              # ESLint
```

There are no automated tests in this project.

## Architecture

StellarShift is an Expo (React Native) wallpaper app targeting **Android only**. Uses **expo-router** with a file-based tab layout under `app/`.

**Three tabs:**
- `app/index.tsx` — Catalog: Unsplash API, category filtering, search (SVG icon), infinite scroll, long-press (grid) or double-tap (modal, `Pressable`) to **add** to favorites with heart animation (`Animated` spring+fade). Double-tap only adds, never removes. Set wallpaper button with loading state, closes modal + toast "Красу встановлено!" on success. All buttons use SVG icons from `ICON`.
- `app/favorites.tsx` — Favorites: reads from AsyncStorage, full-screen preview (absoluteFill), buttons absolutely positioned at bottom via `useSafeAreaInsets`. [wallpaper SVG Встановити] + [heartBroken SVG Зняти з улюблених]. Title row uses SVG heart.
- `app/settings.tsx` — Settings: language switcher, launch-greeting toggle, auto-change toggle (triggers pool load + WorkManager), interval, target screen (SVG icons: lock/phone/both). **No save button — auto-saves.** Battery optimization on first enable. "Про застосунок" section at bottom with logo SVG + version + "Зроблено з ❤️ в Україні".

**`services/wallpaperService.ts`** — Thin bridge to the native `WallpaperModule`. Exports:
- `startWallpaperRotation(pool, intervalMinutes, target, wifiOnly, chargingOnly)`
- `stopWallpaperRotation()`
- `setWallpaperFromUrl(url, target)`
- `changeWallpaperNow()`
- `isIgnoringBatteryOptimization()`
- `requestIgnoreBatteryOptimization()`

**`components/categories.ts`** — Single source of truth for `CATEGORIES`, `MIX_QUERIES`, `UNSPLASH_KEY` (reads `EXPO_PUBLIC_UNSPLASH_KEY` from env, hardcoded demo fallback), `Photo` type.

**`components/icons.ts`** — All UI + blessing SVG icons as string constants (`ICON.*`), viewBox 20×20, brand palette. No emoji in UI — everything is SVG. The blessing/easter icon set grows over releases (e.g. +13 in v3.7.5 Soul wave).

**`components/blessings.ts`** — Blessing phrase pools (UA 20 / EN 20) + `nextBlessingFromQueue` shuffle-without-repeats helper. Shared by settings/catalog easter eggs and the launch greeting.

**`components/SkeletonCard.tsx`** — Shimmer loading placeholder for the 2-column photo grid.

## Native Kotlin modules (`android/app/src/main/java/com/gorilas/StellarShift/`)

- **`WallpaperWorker.kt`** — `CoroutineWorker` (WorkManager). Reads pool from `WallpaperPrefs` SharedPreferences, downloads via `HttpURLConnection`, scales bitmap to screen dimensions (center-crop by height), sets via `WallpaperManager` with `cropHint` = full bitmap bounds.
- **`WallpaperModule.kt`** — React Native bridge. Methods: `startRotation`, `stopRotation`, `setFromUrl`, `changeNow`, `isIgnoringBatteryOptimization`, `requestIgnoreBatteryOptimization`.
- **`WallpaperPackage.kt`** — Registers `WallpaperModule`.
- **`BootReceiver.kt`** — Restores WorkManager schedule after device reboot.

## SharedPreferences keys (`WallpaperPrefs`)

- `photoPool` — JSON array of `{id, url}`
- `poolIndex` — current position in pool
- `target` — `"home"` | `"lock"` | `"both"`
- `intervalMinutes`, `wifiOnly`, `chargingOnly` (last two always `false` since v3.7.5 — UI toggles removed, native signature kept)

## AsyncStorage keys (JS side)

- `favorites` — array of photo IDs
- `favorites_data` — array of full photo objects
- `settings` — serialized settings object

## Key constraints

- **Android-only.** No iOS support.
- **Full rebuild required** after any Kotlin, manifest, or asset change.
- **Battery optimization** must be disabled for reliable Samsung background work — prompted automatically on first autoChange enable.
- **WorkManager minimum interval is 15 minutes** — Android enforces this.
- Pool: 60 photos/category (2 requests × 30), deduplicated by ID, shuffled.
- **Double-tap** uses `lastTapRef` (350ms window) + `Pressable` — NOT `TouchableOpacity` (breaks in new architecture).
- **Favorites modal buttons** use `position: absolute` + `useSafeAreaInsets` to stay above nav bar.
- **Android launcher icons** are `.webp` in `mipmap-*` — regenerate with `sharp` script (replacing `icon.png` alone is not enough).
- `reactCompiler: true` — avoid mutating refs during render.

## Version history

| Version | Highlights |
|---|---|
| 3.3.0 | +7 категорій (Архітектура, Ліс, Мандри, Туман, Нуар, Дощ, Сільське) + 3 chaos queries; Хаос у settings-гридах; easter на лого головної (tap=blessing, 3=spin); re-lock через long-press 2с у settings; чистка overlap у cities/nature/seasons/bw; `components/blessings.ts` shared |
| 3.2.1 | Parallax research cleanup (Samsung One UI Home не панорамить статичні шпалери); blessing easter polish — SVG-іконки для всіх 10 фраз, custom Ukraine flag SVG, shuffle-без-повторів, fix truncation, fix tiny heart у модалці (180px SVG), silence keep-awake dev warning |
| 3.1.0 | +4 категорії (Транспорт, Аніме, Кіберпанк, Квіти); історія шпалер у settings (20 останніх); share через `expo-sharing`; save в галерею через `expo-media-library`; Toast винесено в окремий компонент; чистка застарілих storage permissions |
| 2.1.0 | Full SVG UI — all emoji replaced with custom SVG icons (`icons.ts`), double-tap only adds to favorites |
| 2.0.1 | Toast "Красу встановлено", double-tap fix |
| 2.0.0 | **Milestone:** background wallpaper rotation works on Samsung. "Про застосунок" section, heart animation, double-tap favorites, swipe-back fixed, crop fix, battery optimization exemption |
| 1.2.0 | Native Kotlin WallpaperModule + WorkManager replacing expo-background-fetch, auto-save settings, favorites UX overhaul, icon regeneration via sharp |
| 1.1.0 | Initial Kotlin rewrite |
| 1.0.x | Expo-only prototype |
