# StellarShift

> **Тисячі настроїв, що оновлюються самі.**

Android-застосунок, який автоматично змінює шпалери на свіжі HD-фото з Unsplash. Без реклами, без акаунтів, без трекерів. Pet-проєкт, зроблений в Україні.

---

## ✨ Що вміє

- **Автозміна шпалер** за розкладом: 15 хвилин → день, на вибір.
- **20+ категорій** HD-фото з Unsplash: космос, природа, кіберпанк, архітектура, океан, ч/б тощо.
- **Улюблені** з подвійним тапом, окремий екран з обраним.
- **Цільовий екран:** головний, локскрін або обидва.
- **Сховати фото** яке не подобається — більше ніколи не з'явиться.
- **BYO Unsplash API key** для зняття rate-limit'у.
- **Привітання при запуску** — благословення раз на день (опційний ритуал).
- **i18n:** українська + англійська, авто-детект з override.
- **Локально first:** усі дані тільки в AsyncStorage пристрою.

---

## 🛠 Стек

- **Expo SDK 54** + React Native + expo-router (file-based tabs).
- **Native Kotlin module** — `WallpaperModule` + `WallpaperWorker` (CoroutineWorker) над `WorkManager` для фонової зміни шпалер. Прокидається після reboot через `BootReceiver`.
- **i18next + react-i18next** — без `expo-localization`, детекція через вбудоване `Intl`.
- **@sentry/react-native** — crash reporting через config plugin, DSN з `.env`.
- **AsyncStorage** (JS) + `SharedPreferences` (Kotlin) — поділ стану між мовами.
- **TypeScript** + ESLint.

Тільки Android. iOS не планується.

---

## 🚀 Розробка

```bash
npm install
npx expo start            # JS-only зміни
npx expo run:android      # повний rebuild (Kotlin / manifest / assets)
npm run lint
```

`.env` (gitignored) — взяти з `.env.example`:

```
EXPO_PUBLIC_UNSPLASH_KEY=...
EXPO_PUBLIC_SENTRY_DSN=...
```

Автоматичних тестів немає.

---

## 📂 Структура

```
app/         tabs (index / favorites / settings) + _layout
components/  UI-компоненти, SVG-іконки, категорії, blessings, LaunchGreeting
services/    blocked, unsplashKey, unsplashTracking, galleryPermission, wallpaperService
i18n/        locales/{uk,en}.json + init
android/app/src/main/java/com/gorilas/StellarShift/   native Kotlin
docs/        Privacy Policy (UA+EN), feature-graphic brief
```

Архітектурні деталі та правила розробки — у [CLAUDE.md](CLAUDE.md).

---

## 📚 Документація

- [CHANGELOG.md](CHANGELOG.md) — повна історія релізів.
- [roadmap.md](roadmap.md) — куди йдемо: Phase 3 (Beta + Unsplash submit) → 3.8.0 public launch → 3.9.0 Premium → 4.0.0 Live Wallpaper.
- [STORE.md](STORE.md) — тексти для Play Store listing (UA + EN).
- [LAUNCH.md](LAUNCH.md) — submission-day runbook.
- [RELEASE.md](RELEASE.md) — інструкція по keystore.
- [docs/privacy.md](docs/privacy.md) — Політика конфіденційності (UA).
- [docs/privacy-en.md](docs/privacy-en.md) — Privacy Policy (EN).

---

## 📧 Контакт

[sergholubchuk@gmail.com](mailto:sergholubchuk@gmail.com)

Зроблено з ❤️ в Україні.
