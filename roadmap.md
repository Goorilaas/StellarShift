# 🗺 StellarShift — Roadmap

> Повна дорожня карта: де були → де зараз → куди йдемо.
> Документ живий — оновлюємо разом з кожним релізом.

---

## ✅ DONE — Що вже зроблено

### Фундамент (v1.0.x — v2.0.0)
| v | Що |
|---|---|
| 1.0.x | Expo-only прототип |
| 1.1.0 | Перший Kotlin rewrite |
| 1.2.0 | Native WallpaperModule + WorkManager (заміна expo-background-fetch). Auto-save settings. Favorites UX overhaul. Іконки через sharp |
| 2.0.0 | 🎯 **Milestone:** background wallpaper rotation працює на Samsung. "Про застосунок", heart animation, double-tap favorites, swipe-back fix, crop fix, battery optimization exemption |
| 2.0.1 | Toast "Красу встановлено", double-tap fix |
| 2.1.0 | Full SVG UI — emoji → SVG іконки (`icons.ts`), double-tap тільки додає в улюблені |

### Easter eggs + UX (v3.x)
| v | Що |
|---|---|
| 3.2.0 | Easter egg на логотипі (благословення, спін на 3 тапах, розблокування "Хаос" на 7), themed `ConfirmDialog`, heart anim |
| 3.2.1 | 10 фраз благословень, SVG прапор України, shuffle-без-повторів, fix серця у модалці (180px), keep-awake warning |
| 3.3.0 | (детальніше в CHANGELOG) |
| 3.4.0 | **BYO Unsplash key** — юзер може вставити свій |
| 3.4.1 | **Улюблені як категорія** для autoChange |
| 3.5.0 | **Bottom-sheet picker категорій** з 2 секціями (active + inactive) |
| 3.5.1 | Прибрали drag-to-reorder (не працює в RN Modal) |
| 3.6.0 ✅ | **Block photos** — Sauron eye, AsyncStorage, manager в Settings, cross-screen sync |
| 3.6.1 ✅ | **Polish:** Undo toasts (block / unfavorite / clear-blocked), кращі empty states (Favorites CTA + Blocked icon), gold-tinted pull-to-refresh |
| 3.7.0 ✅ | **i18n EN+UK** — i18next + react-i18next, Intl-детекція без rebuild'а, language switcher у Settings, всі екрани і компоненти перекладено, EN-пул blessings (6 фраз), варіантний about-footer (UA: «з Братаном» / EN: «from Ukraine») |
| **3.7.1** ✅ | **Unsplash compliance + Sentry + .env** — `services/unsplashTracking.ts`, download tracking (catalog/favorites/settings/WorkManager), UTM на всіх лінках Unsplash, clickable author profile + photo, «Powered by Unsplash» link в About. API key переїхав у `.env` (EXPO_PUBLIC_UNSPLASH_KEY). Sentry crash reporting через config plugin |

---

## 🚀 NEXT — Шлях до Play Store

### Phase 1: Стабілізація і compliance (~5 днів)

#### 🔧 v3.6.1 — Stability + polish ✅
- [x] Undo toast для destructive дій (block, unfavorite, clear-all-blocked, unblock single) — 5 сек, золота «Скасувати»
- [x] Кращі empty states для Favorites (CTA «Знайти красу») і Blocked (Sauron icon + текст)
- [x] Pull-to-refresh — забарвлений у бренд-палітру (#FFD700 + #534AB7 + #7F77DD на темному фоні)
- [→] **Sentry перенесено в v3.7.1** разом з `.env` для Unsplash compliance — один rebuild замість двох
- [→] Кастомний SVG-spinner у RefreshControl — Android API не дозволяє, не робимо

#### 🌍 v3.7.0 — i18n EN+UK ✅
- [x] `i18next` + `react-i18next` (без `expo-localization` — використали вбудоване `Intl` для детекції, без rebuild'а)
- [x] Структура `i18n/locales/{en,uk}.json` — повний набір ключів
- [x] Витягнули ~120 hardcoded строк → JSON (3 чанки: Settings → Catalog+Categories → Favorites+Components)
- [x] Language switcher в Settings (перша секція)
- [x] Auto-detect locale (uk/ru → uk, інакше en), fallback EN, persist через AsyncStorage
- [x] Категорії: додано `labelKey?: string` на типі (label лишається як UA fallback)
- [x] Easter eggs: BLESSINGS_EN — короткий пул (6 фраз), UA-only прапор лишається
- [→] Категорії досі сортуються UA-алфавітом — render-time sort через `t()` перенесено в техдовг (не блокер)

#### 🦄 v3.7.1 — Unsplash Production compliance + Sentry ✅
- [x] **Sentry** через `@sentry/react-native` config plugin, DSN з `.env`, debug у dev / 10% traces у release
- [x] **Download tracking**: GET `photo.links.download_location` при setWallpaper / save / share / WallpaperWorker tick (Kotlin)
- [x] `PoolItem` + `HistoryEntry` розширено `downloadLocation` (опціонально, переходить до native prefs)
- [x] **UTM-параметри** на всіх Unsplash-лінках через `withUtm()` helper
- [x] **Clickable author** → попап у каталозі з кнопками «Профіль автора →» / «Фото на Unsplash →»
- [x] **API key в `.env`** через нативний `EXPO_PUBLIC_UNSPLASH_KEY` (Expo SDK 54), fallback на hardcoded для перехідного періоду
- [x] **«Powered by Unsplash»** в About-footer — клікабельний
- [→] «Photo by X on Unsplash» окремим рядком — наразі через author-row + попап. Додамо якщо Unsplash review запросить explicit credit
- [→] Source maps upload до Sentry — техдовг, при першому EAS release

### Phase 2: Store-готовність (~5 днів)

#### 🎨 v3.7.2 — Store assets + onboarding (3 дні)
- [x] Onboarding screen (3 слайди: Каталог → Улюблені → Автозміна) — first launch only
- [x] Share app button у Settings (`Share.share` з Play Store URL)
- [x] Rate app prompt через `expo-store-review` (після 10 успішних setWallpaper)
- [x] Privacy Policy (написана руками, у `docs/`, готово до GitHub Pages)
- [x] Permission rationale dialogs (для READ_MEDIA_IMAGES — пояснити чому)
- [→] Store listing assets — тексти готові в [STORE.md](STORE.md):
  - [x] App name: `StellarShift` (UA + EN, 12 chars)
  - [x] Short description: «Свіжі шпалери кожні 15 хвилин. Космос, природа — на ваш вибір.» (UA + EN)
  - [x] Full description (UA + EN, ~1700 chars кожна)
  - [ ] Feature graphic 1024×500 — концепт A/B описано, треба намалювати у Figma або згенерити
  - [ ] 8 скріншотів 1080×2400 — список кадрів є, треба зняти на emulator'і
  - [x] Іконка через `app.json` adaptive-icon
  - [x] ASO keywords UA + EN
  - [x] Data Safety form — відповіді готові
- [→] Generate release keystore + backup в bitwarden — інструкція готова в [RELEASE.md](RELEASE.md), виконуєш сам коли підемо на launch
- [x] ProGuard/R8 rules — minify+shrink ввімкнено, keep-rules для `com.gorilas.StellarShift.**`, WorkManager, Kotlin metadata, Sentry SourceFile

#### 🪞 v3.7.4 — Polish wave ✅
- [x] Slogan rebrand → «Тисячі настроїв, що оновлюються самі» / «A thousand moods, refreshing themselves»
- [x] About-footer симетричне «Зроблено з ❤️ в Україні» / «Made with ❤️ from Ukraine»
- [x] Cheer toast на save-to-gallery + set-wallpaper (рандомна фраза з пулу 5)
- [x] Drop Anime category (Unsplash content mismatch — лишали з v3.1.0 даремно)
- [x] Catalog tab «Каталог» / «Catalog» (бренд лишився в title через окремий ключ `catalog.brand`)
- [x] Sort categories by current-locale alphabet (Intl.Collator замість хардкоду UA)
- [x] Adaptive-icon foreground rescale 80% — launcher safe-zone fix
- [x] Manifest cleanup: прибрано READ_MEDIA_AUDIO / VIDEO / VISUAL_USER_SELECTED через surgical edit (custom Kotlin folder bypass-ить expo prebuild)
- [x] Bug-2 fix: Alert text підказує натиснути «Зберегти» знову після grant'а через системні налаштування
- [x] [feature-graphic-brief.md](docs/feature-graphic-brief.md) ТЗ для дизайнера/AI
- [x] README rewrite з rules-doc у справжній GitHub README
- [x] GitHub Pages baseurl fix (404 на privacy URL до v3.7.4)
- [→] Soul wave (blessing pool expansion + launch greeting + PL/DE/ES roadmap) — план у roadmap, реалізація в наступну окрему версію

#### 🧪 v3.7.5 — Beta + Unsplash submission (2 дні)
- [ ] Production build через EAS
- [ ] Internal testing track в Play Console (20 тестерів)
- [ ] Data Safety Form в Play Console
- [ ] **Submit to Unsplash for Production approval**
  - Demo video 30-60 сек (YouTube unlisted)
  - App description (~150 слів англ)
  - How API used (~100 слів)
  - Live URL = internal track
  - Screenshots
  - Privacy policy URL
- [ ] Bug-полювання від тестерів

### Phase 3: ⏳ Чекання (1-2 тижні)
- ⏳ Unsplash review (типово 5-14 днів)
- ⏳ Internal QA (паралельно)
- 🛠 **Паралельна робота:** Premium foundation R&D, RevenueCat setup, LW prototype experiments

### Phase 4: 🚀 LAUNCH 1 (1 день)

#### v3.8.0 — Public Play Store release
- [ ] Production Unsplash API key → в `.env`
- [ ] BYO стає **optional** ("Розширені налаштування → Свій ключ Unsplash")
- [ ] Final QA на trio devices (Samsung Android 12, Pixel 14, бюджетник 11)
- [ ] Production rollout staged: 10% → 50% → 100%
- [ ] 🎉 Public!

---

## 💰 Phase 5: Монетизація

### v3.9.0 — Premium foundation (1 тиждень)
- [ ] RevenueCat setup + `react-native-purchases`
- [ ] Play Console — створити IAP product (₴99 одноразово)
- [ ] Paywall screen дизайн
- [ ] **Premium фічі (валідуємо funnel):**
  - [ ] Sleep hours (не міняти 23:00-7:00)
  - [ ] Collections / mood packs (3-5 curated)
  - [ ] Backup/restore (export/import JSON)
  - [ ] 15 хв інтервал
  - [ ] Кілька BYO ключів з ротацією
- [ ] Премі-індикатор в Settings ("⭐ StellarShift Premium")
- [ ] Restore purchases flow

### v3.9.1 — Premium production launch (2 дні)
- [ ] Beta тестування Premium з 5-10 юзерами
- [ ] Update store listing з premium згадкою
- [ ] 🎉 Premium live!

---

## 🌌 Phase 6: KILLER FEATURE

### v4.0.0 — Live Wallpaper (2 тижні)
- [ ] **R&D prototype** (1-2 дні ПЕРЕД full scope) — підтвердити технічну здійсненність на Samsung One UI
- [ ] Custom Android `WallpaperService` (Kotlin)
- [ ] **Tilt parallax** через gyroscope (~3 дні)
- [ ] **Scroll parallax** через `onOffsetsChanged` (~2 дні) — Nova/Lawnchair/Pixel
- [ ] Samsung One UI fallback на tilt-only
- [ ] **Smooth transitions** між шпалерами (fade) — 1 день
- [ ] Battery optimization (`onVisibilityChanged`, FPS cap 30) — 1 день
- [ ] Settings: інтенсивність ефекту (slider), tilt/scroll on/off — 1 день
- [ ] Performance test на 5 девайсах
- [ ] **Demo video** для Play Store (15 сек, продає сам себе)
- [ ] **Підняти ціну Premium до ₴199**
- [ ] Update store listing — LW як headliner
- [ ] PR-event: announce в дев-спільнотах, можливо прес-реліз

---

## 🔮 Phase 7+: Beyond v4

### v4.1.x — LW polish (ongoing)
- [ ] Easter egg в LW (тап у певне місце шпалери = шторм зірок)
- [ ] Анімовані переходи між пулом (різні стилі: zoom, slide, dissolve)
- [ ] Custom intensity presets (Subtle / Normal / Intense)

### v4.2+ — Tier S фічі
- [ ] Шпалера дня (curated, push о 8:00)
- [ ] Smart shuffle (адаптується під лайки)
- [ ] Колекції grow (10+ mood packs)
- [ ] Weather-based (інтеграція з weather API)

### v5.0 — Major rethink
- [ ] iOS port? (якщо userbase виправдає)
- [ ] Multi-device sync (Firebase/Supabase)
- [ ] AI-generated wallpapers (Stable Diffusion / Replicate)
- [ ] Web version для preview

---

# 💡 IDEAS BANK

> Окремий блок — все що ми обговорили + додатково. Без зобов'язань зробити.
> Сюди дописуємо щоразу як приходить нова ідея.

## 🎨 UI/UX дрібниці (швидкі, 1-2 год кожна)
- [ ] Swipe між фото в модалці (left/right через каталог)
- [ ] Pinch-to-zoom + pan у модалці
- [ ] Long-press на категорію в каталозі → швидке меню "закріпити / приховати"
- [ ] Search history — останні 5 запитів під полем
- [ ] Search suggestions (популярні запити)
- [ ] Кращі error states (карточка з причиною + retry, не emoji-toast)
- [ ] Color palette extraction з фото (3 домінуючі кольори)
- [ ] Dark/light theme switcher (хоча додаток зараз dark-only by design)
- [ ] Haptic feedback на ключові дії (вже частково через expo-haptics)

## 🚀 Середні фічі (півдня)
- [ ] Bulk actions у Favorites (multi-select → mass delete/share/setWallpaper)
- [ ] Permission rationale screens (custom UI перед system prompt)
- [ ] Photo info screen — full credit + Open on Unsplash
- [ ] Crop preview перед setWallpaper (показати як саме обріжеться)
- [ ] "Wallpaper of the day" — головний екран запропонує 1 photo

## 🔥 Великі фічі (день+)
- [ ] **Quick Settings Tile** (Android) — кнопка "Наступні шпалери" в шторці
- [ ] **Home screen widget** — поточні шпалери + Skip button
- [ ] **Notification з поточним фото** для autoChange + Like/Skip/Block
- [ ] **TalkBack accessibility** + WCAG AA контрастність
- [ ] **Sleep hours** ⭐ (Premium)
- [ ] **Колекції / mood packs** ⭐ (Premium)
- [ ] **Backup/restore** ⭐ (Premium)
- [ ] **Smart shuffle** (адаптується під лайки)
- [ ] **Розклад по часу доби** (ранок=сонце, ніч=зорі)
- [ ] **Pixabay/Pexels fallback** API коли Unsplash впав у ліміт
- [ ] **Локальна папка як джерело** ("Мої фото" як категорія)
- [ ] **Weather-based** (дощ → ноктюрни)
- [ ] **AI-generated** через Replicate / Stable Diffusion
- [ ] **Multi-device sync** улюблених (Firebase / Supabase)
- [ ] **Tasker / Macrodroid** integration
- [ ] **Family sharing** колекцій

## 🎁 Easter eggs (low priority, fun)
- [ ] **v3.7.4 — Soul wave** (всі три разом):
  - [ ] Розширити blessing pool: UA 10 → 20, EN 6 → 20 (~14 нових EN-фраз)
  - [ ] EN-набір включає `"Stand with Ukraine"` — бренд-сигнал, не агресивно політичний
  - [ ] Кожна нова фраза = нова SVG-іконка в палітрі `#7F77DD / #AFA9EC / #FFD700 / #1D9E75 / #cc3355`
  - [ ] **Launch greeting blessing** — при cold start після ≥6 годин від минулого показу: slide-from-top toast із blessing, auto-dismiss 5с. Settings toggle «Привітання при запуску» (default ON). НЕ кожен запуск — frequency fatigue. Ритуал «один раз на день» = м'яка магія + не задовбує.
- [ ] Easter egg в LW (тап в певне місце шпалери = шторм зірок)
- [ ] Holiday themes (24 грудня — снігопад в каталозі, 24 серпня — салют)
- [ ] Hidden achievements ("100 шпалер змінено", "30 днів autoChange")

## ⚙️ Технічний борг / cleanup
- [ ] Прибрати `app-example/` папку (boilerplate, шумить TS errors)
- [ ] Прибрати Wi-Fi-only / Charging-only toggles з Settings (друг каже зайве)
- [ ] Unit tests для `services/blocked.ts`, `services/unsplashKey.ts`
- [ ] E2E тести через Maestro / Detox
- [ ] Bundle size audit (видалити неюзані deps)
- [ ] **`loadAndStart` race window у settings.tsx** — `loadPhotoPool` не абортить in-flight axios при повторному виклику. Якщо юзер змінює дві настройки протягом ~2с і перший pool-fetch повертається після другого — native side тримає stale parameters. Self-healing наступною свідомою зміною. Severity: low. Fix: AbortController у `loadPhotoPool` + reuse у `loadAndStart`. Розслідувано в session 2026-05-01, claim про stale closure через deps виявився false positive (cleanup pattern працює). Деталі — TODO-коментар біля `loadAndStart`.

## 💼 Бізнес / маркетинг
- [ ] ProductHunt запуск після v4.0.0
- [ ] Reddit r/Android запуск
- [ ] DTF / Habr стаття "Як я зробив live wallpaper з parallax"
- [ ] TikTok / Instagram reels з демо LW
- [ ] App Store Optimization (ASO) — keyword research для UA + EN
- [ ] Localization PL/DE/ES (велика українська діаспора). Брати PL першою — найбільша діаспора, спільне коріння робить переклад швидшим. На момент 4-ї мови — i18n namespace splitting (settings.json / catalog.json / common.json) — поточні locales по 281 рядку стануть боляче рости.
- [ ] iOS port (якщо успіх на Android)

## 🛡 Security / privacy
- [ ] Hash BYO ключа в AsyncStorage (зараз plain text)
- [ ] Опціональний PIN-lock на додаток (для приватних колекцій)
- [ ] GDPR compliance audit (для EU юзерів)
- [ ] Audit network requests — нічого зайвого не іде

## 📊 Analytics (опційно, після Sentry)
- [ ] PostHog або Plausible для product analytics
- [ ] Funnel: install → first wallpaper → first favorite → autoChange enabled → premium
- [ ] Heatmap які категорії популярні
- [ ] Conversion rate Free → Premium

---

## 📅 Зведена timeline

```
            3.6.0  ✅ Block photos
            3.6.1  ✅ Undo toasts, empty states, gold refresh
            3.7.0  ✅ i18n EN+UK
            3.7.1  ✅ Unsplash compliance + Sentry + .env
NOW →       3.7.2  Onboarding, store assets, Privacy Policy
+3 дні      3.7.2  Onboarding, store assets
+2 дні      3.7.3  Beta + Unsplash submit
+1-2 тижні  ⏳     Чекаємо Unsplash review
+1 день     3.8.0  🚀 PUBLIC LAUNCH (free)
+1 тиждень  3.9.0  💰 Premium foundation
+2 дні      3.9.1  Premium launch (₴99)
+2 тижні    4.0.0  🌌 Live Wallpaper (₴199)
                   = killer feature
```

**До public launch:** ~3 тижні роботи + 2 тижні чекання = **~5 тижнів календарно**
**До монетизації:** +1 тиждень = **~6-7 тижнів**
**До killer-feature LW:** +2 тижні = **~8-9 тижнів**

---

## 🎯 Принципи

1. **Дедлайнів немає.** Це не спринт, це ремесло.
2. **Якість > швидкість.** Кожна версія має почуватись cared for.
3. **Друзі — основний фідбек-канал.** Якщо їм заходить — заходить всім.
4. **Easter eggs зберігаємо.** Це душа додатку.
5. **Українська ідентичність — частина бренду.** Прапор у благословеннях, "Розроблено з 🤝 Братаном".
6. **Premium має давати магію, не просто QoL.** Тому LW = headliner.

---

*Last updated: 2026-04-30 (v3.7.2 — onboarding done)*
*Next update: після завершення v3.7.2 (Share/Rate/Privacy/Permission rationale/Store assets)*
