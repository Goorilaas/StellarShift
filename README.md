# StellarShift

> **Тисячі настроїв, що оновлюються самі.**

Android-застосунок для добірок і автоматичної зміни шпалер. Без реклами та обов'язкового акаунта користувача. Pet-проєкт, зроблений в Україні.

Поточний напрямок: надійність ротації, якість контенту, завершені колекції та власна бібліотека. Документація 4.0.11 спирається на кодову базу 4.0.10; APK на паузі. Публічний запуск і погодження джерел контенту — окремий напрямок у [Roadmap](roadmap.md).

---

## ✨ Що вміє

- **Автозміна шпалер** за розкладом: 15 хвилин → день, на вибір.
- **20+ категорій** HD-фото з Unsplash: космос, природа, кіберпанк, архітектура, океан, ч/б тощо.
- **Улюблені** з подвійним тапом, окремий екран з обраним.
- **Цільовий екран:** головний, локскрін або обидва.
- **Сховати фото** яке не подобається — більше ніколи не з'явиться.
- **BYO Unsplash API key** — опційний власний ключ; його квота також обмежена.
- **Колекції за настроями:** збереження на свою полицю та окреме ввімкнення в автозміну.
- **Кеш добірок на 24 години** для повторного перегляду з меншою кількістю API-запитів.
- **Привітання при запуску** — благословення раз на день (опційний ритуал).
- **i18n:** українська + англійська, авто-детект з override.
- **Локальне збереження вподобань і налаштувань:** AsyncStorage та Android SharedPreferences; контент завантажується з Unsplash.

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
npm ci
npx expo start            # Metro для сумісної development-збірки
npm run lint
```

`.env` (gitignored) — взяти з `.env.example`:

```
EXPO_PUBLIC_UNSPLASH_KEY=...
EXPO_PUBLIC_SENTRY_DSN=...
```

Є 4 набори JS-регресійних тестів і native-перевірки приховування. Команди, умови запуску та порядок PR/версій — у [Розробці та випуску версій](docs/development.md). Власні Kotlin-модулі потребують відповідної збірки; звичайний Expo Go не замінює її.

---

## 📂 Структура

```
app/         tabs (index / collections / favorites / settings) + _layout
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
- [roadmap.md](roadmap.md) — єдиний актуальний план, статуси та критерії перевірки; точна копія підтримується в Obsidian.
- [docs/development.md](docs/development.md) — актуальний порядок роботи, версій, PR і погоджених збірок.
- [STORE.md](STORE.md) — історичні тексти магазину; перед публікацією потребують перегляду.
- [LAUNCH.md](LAUNCH.md) — історичний сценарій запуску, не поточна інструкція.
- [RELEASE.md](RELEASE.md) — історичні нотатки підпису, не команда створити новий ключ.
- [docs/privacy.md](docs/privacy.md) — Політика конфіденційності (UA).
- [docs/privacy-en.md](docs/privacy-en.md) — Privacy Policy (EN).

---

## 📧 Контакт

[sergholubchuk@gmail.com](mailto:sergholubchuk@gmail.com)

Зроблено з ❤️ в Україні.
