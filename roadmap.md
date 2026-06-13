# 🗺 StellarShift — Roadmap 2.0

> **Продукт для себе і друзів.** Без store-дедлайнів, без черг модерації.
> Дистрибуція: APK-лінки з EAS + локальний `gradlew assembleRelease` (production-підпис — взаємозамінні).
> Ключі: demo + BYO. Play Store — заморожений трек, повернемось свідомо (секція 🧊 внизу).
> Документ живий — оновлюємо разом з кожним релізом.

---

## ✅ DONE — Що вже зроблено

### Фундамент (v1.0.x — v2.1.0)
| v | Що |
|---|---|
| 1.0.x | Expo-only прототип |
| 1.1.0–1.2.0 | Kotlin rewrite: WallpaperModule + WorkManager, auto-save settings, favorites UX |
| 2.0.0 | 🎯 **Milestone:** background rotation працює на Samsung. Battery exemption, double-tap favorites |
| 2.1.0 | Full SVG UI — emoji → власні іконки |

### Розквіт (v3.x)
| v | Що |
|---|---|
| 3.2.x–3.3.0 | Easter eggs (благословення, Хаос), +11 категорій, ConfirmDialog |
| 3.4.x | BYO Unsplash key, Улюблені як категорія автозміни |
| 3.5.x | Bottom-sheet picker категорій |
| 3.6.x | Block photos (Sauron), Undo toasts, empty states |
| 3.7.0 | 🌍 i18n EN+UK |
| 3.7.1 | 🦄 Unsplash compliance (download tracking, UTM, attribution) + Sentry + .env |
| 3.7.2 | Onboarding, Share app, Rate prompt, Privacy Policy, ProGuard/R8, store-асети |
| 3.7.3 | Стабілізація: Хаос-запити, fetch-помилки в toast, variety, author в Улюблених, toast queue |
| 3.7.4 | Polish: slogan rebrand, About-footer, cheer toasts, drop Anime, locale-sort, adaptive icon fix |
| 3.7.5 | 🌌 **Soul wave:** blessings 20+20, 13 нових іконок, launch greeting |
| 3.7.6 | 🤲 **Catalog in-hand:** фото-пейджер у модалці, категорійний свайп, search history, haptics, race fix, −9 deps (**APK 90→75 MB!**) |
| 3.7.7 | 📌 **Catalog yours:** pin/hide категорій + Settings restore, search suggestions, локальний production-підпис |
| 3.7.8 | 🖼 **Wallpaper control:** картка «Зараз на екрані», історія з WorkManager-тіків, «Гидоту прибрано» |

---

## 🚀 NEXT — Нові версії

### v3.8.0 — 🔔 Notification companion
Продовження wallpaper control: керуй шпалерами **не відкриваючи застосунок**. ✅ **Реалізовано 2026-06-11.**
- [x] Нотифікація при автозміні: collapsed = тамбнейл + кнопки, expanded = BigPicture на весь банер; тихий канал, один ID — оновлюється на місці
- [x] Kotlin: NotificationHelper + NotificationActionReceiver, постинг на кожен apply (тік + changeNow)
- [x] **Settings toggle «Сповіщення автозміни»** (default ON) + runtime POST_NOTIFICATIONS на Android 13+ (запит на enable toggle і на enable автозміни)
- [x] Дії синхронні: ❤️ → pendingFavorites буфер → drain на focus (GET /photos/:id, офлайн-fallback — лайк не губиться) + мітка 💜 у шторці; 🚫 → pendingBlocked + миттєве вирізання з native-пулу + наступна шпалера прямо з шторки; ⏭ → applyNext
- [x] Бонус: поточне фото кешується у `filesDir/current_wallpaper.jpg` — **готовий фундамент v4.0.0 LW**
- 💎 *Premium-кандидат при поверненні в Store*

### v3.9.0 — 😴 Sleep hours ✅
Шпалери, що поважають твій сон. **Реалізовано 2026-06-11.**
- [x] Тихі години: плановий тік пропускається у вікні (default 00:00–07:00, налаштовується). Вікно через північ — ок (start > end), час локальний на момент тіка (таймзона сама себе лікує)
- [x] **Settings toggle** (default OFF) + системні пікери часу (`@react-native-community/datetimepicker` 8.4.4 з SDK-піна)
- [x] Kotlin: `applyNext(manual=false)` перевіряє вікно; **ручні дії сильніші за розклад** — «Змінити зараз», ⏭/🚫 з шторки працюють і вночі
- [x] Бонус: нотифікація-компаньйон теж «спить» (нема apply — нема оновлення)
- [→] Розклад по часу доби (ранок=сонце, ніч=зорі) — свідомо НЕ в цій версії: множення пулів на слоти = окремий звір, лишається в IDEAS BANK
- [→] Точне прокидання рівно в кінці вікна (AlarmManager) — не робимо: зміна на найближчому тіку після вікна, складність будильника не варта цінності
- 💎 *Premium-кандидат при поверненні в Store*

### v3.10.0 — 🌌 Live Wallpaper MVP ✅
**Реалізовано 2026-06-12.** Перший реліз живої шпалери — двіжок у проді.
- [x] **Bitmap з власного файлу** — LW читає `current_wallpaper.jpg`, кожен apply (включно з ручними!) оновлює файл, engine підхоплює через FileObserver
- [x] **Choreographer vsync-рендер** + draw-on-demand (спокій = нуль перемальовок)
- [x] **Fade-переходи** між шпалерами (~600мс crossfade)
- [x] **LW-aware пайплайн**: активна LW → файл замість `wm.setBitmap` (не вибиваємо engine); lock — окремо за станом системи
- [x] Settings: статус Активна/Вимкнена + кнопка → системний preview в один тап
- [x] Battery: сенсор/Choreographer/FileObserver повністю знімаються при невидимості

### v4.0.0 — 🌌 Live Wallpaper: фінал
Полірування MVP за фідбеком з One UI 8.5.
- [x] Пресети інтенсивності в Settings (М'яко/Звичайно/Сильно = 30/60/100) — зроблено у v3.10.2, міняється наживо
- [ ] Перевірити на **One UI 8.5** (S23 Ultra): tilt, fade, поведінка пікера
- [ ] Scroll parallax (`onOffsetsChanged`) — перевірити чи live-режим отримує offset events на One UI
- [ ] Тюнинг за відчуттям: чутливість (`/3f`), fade-тривалість
- 💎 *Premium-headliner при поверненні в Store*

### v4.1.0 — 🎨 Collections + favorites UX
- [ ] **Колекції / mood-паки** — référенс Walpy: куровані добірки hero-картками (велике фото + «N Photos» + назва + куратор), всередині — грид. Наші: «Шлях чумацький», «Неонова ніч», «Тиша гір»…
- [ ] **Серце прямо на тайлах гриду** (каталог) — улюблені без відкриття модалки. Référенс Walpy: анімація — контур серця обводиться і заповнюється
- [ ] Smart shuffle: пул автозміни вчиться на лайках (улюблені категорії отримують більшу вагу)

---

## 💡 IDEAS BANK

> Без зобов'язань. Дописуємо щоразу як приходить нова ідея.

### 🎨 UI/UX
- [ ] Pinch-to-zoom + pan у модалці — відкладено свідомо: конфлікт жестів зі swipe-пейджером, робити scale-aware жестом окремим заходом
- [ ] Color palette extraction з фото (3 домінуючі кольори)
- [ ] Кращі error states — карточка з причиною (частково є з v3.7.3)
- [ ] Dark/light theme switcher (зараз dark-only by design)

### 🚀 Середні
- [ ] Bulk actions у Favorites (multi-select → mass delete/share)
- [ ] Photo info screen — full credit + EXIF-вайби
- [ ] "Wallpaper of the day" — головний екран пропонує 1 фото

### 🔥 Великі
- [ ] **Quick Settings Tile** — «Наступна шпалера» в шторці
- [ ] **Home screen widget** — поточна шпалера + Skip
- [ ] **TalkBack accessibility** + WCAG AA контрастність
- [ ] **Backup/restore** (export/import JSON) — 💎 Premium-кандидат
- [ ] **Розклад по часу доби** (може злитись із v3.9.0)
- [ ] **Pixabay/Pexels fallback** коли Unsplash у ліміті
- [ ] **Локальна папка як джерело** («Мої фото» як категорія)
- [ ] **Weather-based** (дощ → ноктюрни)
- [ ] **AI-generated** через Replicate / Stable Diffusion
- [ ] **Multi-device sync** (Firebase / Supabase)
- [ ] **Tasker / Macrodroid** integration

### 🎁 Easter eggs
- [ ] Easter egg в LW (тап у певне місце шпалери = шторм зірок)
- [ ] Holiday themes (24 грудня — снігопад, 24 серпня — салют)
- [ ] Hidden achievements («100 шпалер змінено», «30 днів autoChange»)

### ⚙️ Технічний борг
- [ ] Unit tests для `services/blocked.ts`, `services/unsplashKey.ts` (jest з нуля)
- [ ] E2E через Maestro / Detox
- [ ] i18n namespace splitting — на момент 4-ї мови (locales по ~300 рядків стануть боляче рости)
- [ ] Localization PL/DE/ES — PL першою (найбільша діаспора)

### 🛡 Security / privacy
- [ ] BYO ключ: `expo-secure-store` замість plaintext — відкладено свідомо (особистий ключ на власному пристрої, ризик мінімальний)
- [ ] Опціональний PIN-lock на застосунок
- [ ] Audit network requests — нічого зайвого не іде

---

## 🧊 ЗАМОРОЖЕНО — Play Store трек

> Свідомо на паузі (2026-06-10): спершу продукт для себе і друзів. Повернення = розморозити цю секцію, все готове.

**Готові асети (нічого не робити повторно):**
- ✅ Release keystore (E:\Coding_Projects\Secrets\ + Bitwarden + EAS)
- ✅ Production-підпис локально і в EAS — взаємозамінний
- ✅ STORE.md (повний листинг UA+EN), LAUNCH.md (runbook), RELEASE.md (keystore-гайд)
- ✅ Feature graphic ×3, 8 скріншотів (img/), Privacy Policy live на GH Pages
- ✅ Unsplash compliance в коді (download tracking, UTM, attribution)
- ✅ ProGuard/R8, Sentry

**Кроки при розморозці (за [LAUNCH.md](LAUNCH.md)):**
1. Дочекатись/перевірити Play Console identity verification
2. Demo video 15–30 сек (єдиний відсутній артефакт!)
3. `eas build --profile production` (AAB) → Internal Testing track
4. Unsplash production application (STEP 8 LAUNCH.md)
5. ⏳ Unsplash review 5–14 днів → production key у `.env` → видалити hardcoded fallback (`components/categories.ts`)
6. Staged rollout 10% → 50% → 100%

**Монетизація (тільки після Store):**
- RevenueCat + `react-native-purchases`, IAP product
- 💎 Premium-набір уже росте органічно: Notification companion (v3.8.0), Sleep hours (v3.9.0), **LW як headliner (v4.0.0)**, Backup/restore, Collections
- Ціна: ₴99 → ₴199 з LW
- ProductHunt / Reddit / TikTok — після LW

---

## 📅 Зведена timeline (без дедлайнів)

```
       3.7.8  ✅ Wallpaper control (картка + історія тіків)
       3.8.0  ✅ Notification companion (❤️/🚫/⏭ у шторці)
       3.9.x  ✅ Sleep hours (тихі години)
NOW →  3.10.0 ✅ Live Wallpaper MVP (tilt у проді!)
next   4.0.0  🌌 LW фінал (інтенсивність, scroll, One UI 8.5 тюнинг)
потім  4.1.0  🎨 Collections + favorites UX
…      🧊 Store — коли самі захочемо
```

---

## 🎯 Принципи

1. **Продукт для себе і друзів перш за все.** Store — коли дозріємо, не навпаки.
2. **Дедлайнів немає.** Це не спринт, це ремесло.
3. **Якість > швидкість.** Кожна версія має почуватись cared for.
4. **Друзі — основний фідбек-канал.** Якщо їм заходить — заходить всім.
5. **Easter eggs зберігаємо.** Це душа застосунку.
6. **Українська ідентичність — частина бренду.** Прапор у благословеннях, «Зроблено з ❤️ в Україні».
7. **Premium має давати магію, не просто QoL.** Тому LW = headliner. Premium-кандидати позначаємо 💎 уже зараз.

---

*Last updated: 2026-06-12 (v3.10.0 Live Wallpaper MVP закрито)*
*Next update: після v4.0.0 — фінал LW за фідбеком з One UI 8.5*
