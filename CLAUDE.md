# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- `app/settings.tsx` — Settings: auto-change toggle (triggers pool load + WorkManager), interval, target screen (SVG icons: lock/phone/both), Wi-Fi/charging (SVG wifi/battery). **No save button — auto-saves.** Battery optimization on first enable. "Про застосунок" section at bottom with logo SVG + version + "Розроблено з 🤝 Братаном".

**`app/wallpaperService.ts`** — Thin bridge to the native `WallpaperModule`. Exports:
- `startWallpaperRotation(pool, intervalMinutes, target, wifiOnly, chargingOnly)`
- `stopWallpaperRotation()`
- `setWallpaperFromUrl(url, target)`
- `changeWallpaperNow()`
- `isIgnoringBatteryOptimization()`
- `requestIgnoreBatteryOptimization()`

**`app/components/categories.ts`** — Single source of truth for `CATEGORIES`, `MIX_QUERIES`, `UNSPLASH_KEY`, `Photo` type.

**`app/components/icons.ts`** — All UI SVG icons as string constants (`ICON.*`). No emoji in UI — everything is SVG. Keys: `heartFilled`, `heartOutline`, `heartBroken`, `search`, `wallpaper`, `refresh`, `wifi`, `battery`, `lock`, `phone`, `both`, `gear`, `galaxy`.

**`app/components/SkeletonCard.tsx`** — Shimmer loading placeholder for the 2-column photo grid.

## Native Kotlin modules (`android/app/src/main/java/com/gorilas/StellarShift/`)

- **`WallpaperWorker.kt`** — `CoroutineWorker` (WorkManager). Reads pool from `WallpaperPrefs` SharedPreferences, downloads via `HttpURLConnection`, scales bitmap to screen dimensions (center-crop by height), sets via `WallpaperManager` with `cropHint` = full bitmap bounds.
- **`WallpaperModule.kt`** — React Native bridge. Methods: `startRotation`, `stopRotation`, `setFromUrl`, `changeNow`, `isIgnoringBatteryOptimization`, `requestIgnoreBatteryOptimization`.
- **`WallpaperPackage.kt`** — Registers `WallpaperModule`.
- **`BootReceiver.kt`** — Restores WorkManager schedule after device reboot.

## SharedPreferences keys (`WallpaperPrefs`)

- `photoPool` — JSON array of `{id, url}`
- `poolIndex` — current position in pool
- `target` — `"home"` | `"lock"` | `"both"`
- `intervalMinutes`, `wifiOnly`, `chargingOnly`

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
- **Pending idea:** remove Wi-Fi-only and charging-only toggles from Settings.

## Version history

| Version | Highlights |
|---|---|
| 2.1.0 | Full SVG UI — all emoji replaced with custom SVG icons (`icons.ts`), double-tap only adds to favorites |
| 2.0.1 | Toast "Красу встановлено", double-tap fix |
| 2.0.0 | **Milestone:** background wallpaper rotation works on Samsung. "Про застосунок" section, heart animation, double-tap favorites, swipe-back fixed, crop fix, battery optimization exemption |
| 1.2.0 | Native Kotlin WallpaperModule + WorkManager replacing expo-background-fetch, auto-save settings, favorites UX overhaul, icon regeneration via sharp |
| 1.1.0 | Initial Kotlin rewrite |
| 1.0.x | Expo-only prototype |
