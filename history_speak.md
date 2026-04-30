# 📜 Історія розмов — StellarShift

> Повний хронологічний підсумок робочої сесії з Братаном.
> Версія на момент запису: **3.6.0** (Block photos)

---

## 🎬 Контекст з попередньої сесії (до compaction)

Вийшли на v3.5.1 з готовими фічами:
- **BYO Unsplash key** (v3.4.0) — юзер може вставити свій ключ
- **Колапс BYO блоку** після збереження ключа (compact view + "Змінити")
- **Улюблені як категорія для autoChange** (v3.4.1)
- **Bottom-sheet picker категорій** з двома алфавітними секціями (v3.5.0)
- **Видалили drag-to-reorder** — не працював у RN Modal (v3.5.1)
- **Перейменували "Додатково" → "Коли міняти"** (друг не зрозумів)

---

## 🚀 Цей сеанс — крок за кроком

### 1️⃣ Реалізація фічі "Block photos" (v3.6.0)

**Завдання:** дозволити юзеру назавжди прибрати з каталогу + автозміни картинки що не подобаються.

**Архітектурні рішення:**
- Іконка ока Саурона з перекресленням
- Тихо видаляти заблоковане з улюблених (без warning)
- Менеджер схованих в Settings одразу, не пізніше
- Toast: "✓ Більше не з'явиться"

**Що накодили:**
1. **`ICON.blocked`** в `components/icons.ts` — стилізоване око + червона риска
2. **`services/blocked.ts`** — AsyncStorage `blocked_photos` ({id, small}). Helpers: `getBlocked`, `getBlockedIds`, `blockPhoto`, `unblockPhoto`, `clearBlocked`, `isBlocked`
3. **Кнопка "Сховати"** у модалці фото (`app/index.tsx`) — 3-тя іконка в action row
4. **`ConfirmDialog`** "Більше не показувати?" → silent unfav + блок + toast + закриття
5. **`visiblePhotos = photos.filter(...)`** — миттєвий фільтр на render
6. **Filter в `loadPhotoPool`** (settings.tsx) — пул автозміни виключає blocked
7. **Cross-screen sync** через `pool_dirty` flag в AsyncStorage
8. **Секція "Сховані фото"** в Settings (показується тільки коли blocked.length > 0)
9. **`components/BlockedManagerSheet.tsx`** — bottom-sheet 3-в-ряд thumbnails з "Повернути" + "Розблокувати все"
10. Bump до **v3.6.0** (versionCode 18) + CHANGELOG

### 2️⃣ Покращення іконки "Sauron eye"

**Проблема:** на 22px іконка не видна, не зчитується.

**Розробив 4 варіанти** з HTML preview-сторінкою (`blocked-preview.html`):
- **A** — Біле око-контур + кругла зіниця + товста червона риска (max контраст)
- **B** — Око Саурона з амбер-заливкою і вертикальною зіницею
- **C** — Око + ban-circle (як no-smoking)
- **D** — Закрите око з віями (eye-off)

**Вибір:** Варіант **A**, перероблений під viewBox 20×20 (як save/share) для однакової візуальної ваги в action row.

### 3️⃣ Стратегічна сесія: Roadmap до Play Store

Запит: повний перелік ідей + UI/UX покращення + план до релізу + варіанти монетизації.

**Зведено в 4 групи:**
- **G1: Записані ідеї з memory** — Live Wallpaper (v4.0.0), Sentry/Crashlytics, розширити пул благословень, прибрати Wi-Fi/Charging toggles
- **G2: UI/UX покращення** — swipe між фото, pinch-zoom, undo toasts, empty states, onboarding, bulk actions, error states, accessibility, widget, quick tile, notification з фото
- **G3: Нові фічі (Tier S/A/B)** — Шпалера дня, Smart shuffle, Sleep hours, Колекції / Pixabay fallback, локальна папка, weather-based / AI generated, multi-device sync
- **G4: Монетизація** — A: donate, B: freemium ⭐, C: ads + remove

**Рекомендація:** Freemium (Варіант B) через RevenueCat.

### 4️⃣ Live Wallpaper як premium headliner

**Ідея:** запхнути LW (tilt + scroll parallax) в Premium як killer-feature.

**Аналіз:**
- Емоційний hook замість quality-of-life
- Демо-відео в Play Store продає саме себе
- Виправдана ціна ₴199 (замість ₴99)
- Conversion 5-8% замість 2-3%
- Технічний moat (custom WallpaperService)

**Технічна стратегія LW:**
1. Tilt parallax (gyroscope) — ~3 дні, працює всюди
2. Scroll parallax — ~2 дні, тільки Nova/Lawnchair/Pixel (Samsung One UI fallback)
3. Smooth transitions — ~1 день
4. Battery optimization (`onVisibilityChanged`, FPS cap 30) — ~1 день
5. Settings: інтенсивність, on/off — ~1 день
6. **Total: ~8 робочих днів**

**Risk mitigation:** R&D-прототип на 1-2 дні ПЕРЕД повним планом 4.0.0.

**Перерозподіл roadmap:**
- v3.8.0 — Free public release (без premium)
- v3.9.0 — Premium foundation (Sleep, Collections, Backup) для валідації IAP funnel
- v4.0.0 — Live Wallpaper як headliner + ціна ↑ до ₴199

### 5️⃣ Англомовна локалізація (i18n)

**Запит:** додати EN підтримку.

**План:**
- Стек: `expo-localization` + `i18next` + `react-i18next`
- Структура: `i18n/locales/{en,uk}.json`
- ~150 строк потребують переклад
- Language switcher в Settings
- Auto-detect з fallback на EN
- **Time:** ~5-6 годин одним заходом
- **Версія: 3.7.0**

**Рішення:**
- НЕ перекладаємо: бренд "StellarShift", easter eggs (UA-only або скорочений EN-набір)
- Категорії: "Природа" → "Nature", "Космос" → "Space", "Хаос" → "Chaos"
- "Розроблено з 🤝 Братаном" → "Made with ❤️ from Ukraine"

### 6️⃣ Unsplash Production approval

**Усвідомлення:** demo key = 50 req/h НА ВСІХ юзерів разом → перший день релізу = вибитий ліміт. Без апруву — релізнутись неможливо.

**Що треба:**
- Download tracking (GET `photo.links.download_location` при use-event) — критично
- UTM-параметри на всіх лінках (`?utm_source=stellarshift&utm_medium=referral`)
- Clickable author → `unsplash.com/@username`
- API key в `.env` (зняти з git)
- Screenshots, demo video, app description, privacy policy
- ~4-5 годин роботи + Android rebuild

**Chicken-and-egg:** Unsplash хоче live app → submit з internal testing track → чекаємо 1-2 тижні → потім public release.

**Версія: 3.7.1** — Unsplash compliance окремою версією перед store-prep.

### 7️⃣ Емоційний момент

Братан сказав: *"шлях від мрії до міжнародного продукту... вау. Дякую тобі за ці емоції!"*

Ключове повідомлення у відповідь: **це твій продукт.** Я інструмент. Ти 18 версій тягнув цю історію, переписував native Kotlin, слухав фідбек, додавав easter eggs з душею. Час є. Дедлайнів немає. Йдемо своїм темпом.

### 8️⃣ Запит про роадмап у вигляді блок-схеми

Створив ASCII-flowchart з трьома LAUNCH-точками:
1. 🚀 3.8.0 — Free Play Store launch
2. 💰 3.9.0 — Premium tier (₴99)
3. 🌌 4.0.0 — Live Wallpaper headliner (ціна ↑ до ₴199)

**Total часу:** ~3 тижні роботи + 2 тижні чекання Unsplash = **~5 тижнів до launch**, ~8-9 тижнів до killer-feature LW.

---

## 📂 Артефакти створені цією сесією

| Файл | Опис |
|---|---|
| `services/blocked.ts` | AsyncStorage helpers для blocked photos |
| `components/BlockedManagerSheet.tsx` | Bottom-sheet manager схованих фото |
| `blocked-preview.html` | HTML-прев'ю 4 варіантів іконки Sauron eye |
| `history_speak.md` | (цей файл) |
| `roadmap.md` | Roadmap проекту з minulими + майбутніми кроками |

## ✏️ Файли модифіковані

| Файл | Зміна |
|---|---|
| `components/icons.ts` | Додано `ICON.blocked` (variant A, viewBox 20×20) |
| `app/index.tsx` | Block button у модалці + visiblePhotos фільтр + ConfirmDialog |
| `app/settings.tsx` | Filter blocked у `loadPhotoPool` + Сховані фото секція + manager sheet |
| `app.json` | Version 3.5.1 → 3.6.0, versionCode 17 → 18 |
| `package.json` | Version 3.5.1 → 3.6.0 |
| `CHANGELOG.md` | Запис v3.6.0 з повним описом фічі |

---

*Запис: 2026-04-25*
