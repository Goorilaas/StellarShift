# Changelog

## 3.10.2 — 2026-06-12

Полір живої шпалери, раунд 2: контроль інтенсивності + чесний фідбек на вимкнення.

> ⚠️ **Потребує повного rebuild'а** — Kotlin-зміни.

### Додано
- **Пресети сили ефекту** в секції «Жива шпалера»: **М'яко (30) / Звичайно (60) / Сильно (100)** px зсуву. Тап → engine міняє інтенсивність **наживо** (через `OnSharedPreferenceChangeListener`, який заклали в MVP) — крутиш прямо на активній шпалері й одразу відчуваєш різницю. Збереження в AsyncStorage + native prefs.

### Виправлено
- **Глухий тап на «Вимкнути живу шпалеру».** Хендлер тепер читає boolean-результат native-методу і показує правильний toast: успіх → «Живу шпалеру вимкнено», помилка → «Не вдалось вимкнути». Раніше при будь-якому результаті міг мовчки спрацювати catch-гілка з повідомленням про пікер (або взагалі непомітно) — звідси відчуття мертвого тапа.

## 3.10.1 — 2026-06-12

Полір живої шпалери + дискаверабельність дій в історії — за фідбеком з реального юзу.

> ⚠️ **Потребує повного rebuild'а** — Kotlin-зміни.

### Додано
- **Вимкнення живої шпалери.** Android не дає програмно «зняти» live wallpaper — її витісняє лише інша шпалера. Тому при активній LW у секції «Жива шпалера» з'являється кнопка **«Вимкнути живу шпалеру»**: поточне фото стає статичним (з кешу `current_wallpaper.jpg`), engine витісняється, статус → «Вимкнена». Автозміна продовжує працювати на статиці.

### Змінено
- **Тап по фото в історії → багате меню** (прев'ю + В улюблені / Більше ніколи / Застосувати знову) замість простого діалогу «Застосувати?». Раніше ці дії були лише на long-press — недискаверабельно. Тепер один тап відкриває всі три, видимо.

### Не баг (роз'яснено)
- **Затримка зміни > інтервалу** (напр. 43 хв при «30 хв») — це не помилка, а природа Android WorkManager: інтервал означає «не частіше ніж», система батчить фонову роботу заради батареї (на MIUI/Xiaomi ще агресивніше). Точний AlarmManager-будильник свідомо не робимо.
- **Застарілий вигляд системного пікера** при встановленні LW — це OS WallpaperPicker (білий лист «Зробити фоном»), рендериться самою системою, не застосунком. SDK не дає його перестилізувати.

## 3.10.0 — 2026-06-12

🌌 **Live Wallpaper MVP** — перший реліз живої шпалери: фон реагує на нахил телефона, а вся машинерія ротації працює поверх без жодних змін. Це передостання зупинка перед v4.0.0 (інтенсивність, scroll-parallax, полірування за фідбеком з One UI 8.5).

> ⚠️ **Потребує повного rebuild'а** — новий Kotlin-service + manifest.

### Додано
- **`LiveWallpaperService`** — прод-версія R&D-движка: tilt parallax по акселерометру поверх **поточного фото ротації** (`filesDir/current_wallpaper.jpg` — той самий файл, що пише кожен apply з v3.8.0).
- **Choreographer vsync-рендер** — фікс 120Гц-шиммера з R&D + «малюємо тільки коли є рух»: у спокої кадри пропускаються повністю, батарея не гріється.
- **Гаряча зміна фото з fade:** FileObserver на файлі → тік автозміни / «Змінити зараз» / дії з шторки переписали файл → crossfade ~600мс на нове фото. Жодних broadcast'ів.
- **🔑 LW-aware apply-пайплайн:** при активній нашій LW `wm.setBitmap` НЕ викликається (вибив би живу шпалеру назад у static!) — пишеться лише файл. Локскрін: якщо в системі окремий static-lock — оновлюється по target як раніше; якщо lock дзеркалить LW — не чіпаємо. Автозміна, тихі години, шторка — працюють як були.
- **Ручні встановлення тепер теж кешують файл** — перемикання на LW завжди стартує з останнього застосованого фото (раніше файл писали тільки тіки).
- **Settings → «Жива шпалера»:** статус Активна/Вимкнена (оновлюється на focus і при поверненні з системного preview) + кнопка «Увімкнути живу шпалеру» → системний preview нашого service в один тап (fallback на загальний chooser).
- Інтенсивність уже читається з prefs наживо (`lwIntensity`, default 60px) — пресети в UI приїдуть у v4.0.0.

### Технічні деталі
- Зникнення видимості → сенсор, Choreographer і FileObserver знімаються повністю; повернення видимості → файл перечитується без fade (міг змінитись поки не було видно).
- Відсутній файл → бренд-темний фон #0a0a1a (без синтетичних тест-сіток у проді).
- `applyFromUrl` розкладений на `downloadBitmap` + `applyStatic` + `applyLockIfSeparate`, єдиний вхід — `applyWallpaper` для тіків і ручних встановлень.

## 3.9.1 — 2026-06-12

Патч за фідбеком з реального юзу шторки.

### Виправлено
- **«Зараз на екрані» оновлюється при поверненні з фону.** Сценарій: застосунок згорнутий на Settings → ⏭/❤️ у шторці → тап по нотифікації → картка показувала старе фото. `useFocusEffect` стріляє при навігації між табами, але не при resume з фону — додано `AppState`-слухач: на `active` проганяється sync native-історії + drain дій з шторки. Ref-патерн проти stale-closure (reactCompiler-safe).

### Змінено
- **«Зараз на екрані» + «Історія шпалер» злиті в один блок:** заголовок з «Очистити» справа, картка поточної, стрічка решти історії одразу під нею (без другого заголовка). Всі взаємодії як були: тап = застосувати, long-press = меню. Осиротілий i18n-ключ `settings.section.history` прибрано.

> Відтепер **кожен merged PR з поведінковими змінами отримує власну версію** (фікси → patch, фічі → minor) — два різні білди ніколи не носять один номер.

## 3.9.0 — 2026-06-11

😴 **Sleep hours** — шпалери, що поважають твій сон: у тихі години автозміна не смикається.

> ⚠️ **Потребує повного rebuild'а** — Kotlin-зміни + нова native-залежність (`@react-native-community/datetimepicker`).

### Додано
- **Тихі години** — секція в Settings (іконка місяця 🌙): toggle (default OFF) + вікно часу «00:00 — 07:00» (default), тап по часу → системний діалог годинника. Збереження миттєве (auto-save), без рестарту ротації.
- **Плановий тік у вікні — тихий skip:** Worker перевіряє локальний час перед кожним apply. Вікно через північ працює природно (`start > end`), нульове вікно (`start == end`) не діє, зміна таймзони сама себе лікує — нічого не зберігається в абсолюті.
- **Ручний намір сильніший за розклад:** «Змінити зараз», ⏭ і 🚫 з шторки працюють і вночі (`applyNext(manual = true)`). Спить тільки таймер.
- **Бонус:** нотифікація-компаньйон уночі теж мовчить — нема apply, нема оновлення шторки.

### Технічні деталі
- Вікно в хвилинах від півночі у `WallpaperPrefs` (`sleepEnabled` / `sleepStart` / `sleepEnd`), пуш через новий bridge-метод `setSleepHours`.
- Після кінця вікна шпалера зміниться на **найближчому тіку** (не рівно в хвилину кінця) — точний AlarmManager-будильник свідомо не робимо, складність не варта цінності.
- `@react-native-community/datetimepicker` 8.4.4 — версія з Expo SDK 54 піна.

### Не зроблено (свідомо)
- **Розклад по часу доби** (ранок=сонячне, ніч=зоряне) — множення пулів на слоти, окремий великий звір. Лишається в IDEAS BANK.

## 3.8.0 — 2026-06-11

🔔 **Notification companion** — керуй шпалерами не відкриваючи застосунок. Після кожного тіка автозміни у шторці — тиха нотифікація з поточним фото і діями.

> ⚠️ **Потребує повного rebuild'а** — нові Kotlin-класи + manifest (POST_NOTIFICATIONS, receiver).

### Додано
- **Нотифікація на кожен apply** (тік автозміни + «Змінити зараз»): згорнуто — тамбнейл + заголовок + кнопки; розгорнуто — фото на весь банер (BigPictureStyle). Тихий канал (без звуку), один фіксований ID — оновлюється на місці, шторка не засмічується. Тап по тілу → відкрити застосунок.
- **Дії прямо з шторки:**
  - **❤️ В улюблені** — мітка «💜 Додано в улюблені» з'являється одразу (кнопка ❤️ зникає), а саме фото досипається в улюблені при наступному відкритті застосунку (`pendingFavorites`-буфер → `GET /photos/:id` за повним обʼєктом; офлайн → мінімальний запис, лайк не губиться).
  - **🚫 Більше ніколи** — фото миттєво вирізається з native-пулу, блокування досипається в store при відкритті (`pendingBlocked`), і **наступна шпалера стає одразу** — «гидоту прибрано» тепер працює прямо з шторки.
  - **⏭ Далі** — наступне фото з пулу, нотифікація оновлюється.
- **Settings → «Сповіщення»** — toggle (default ON) з дзвіночком. Вимкнення прибирає і живу нотифікацію.
- **Android 13+ permission flow** — `POST_NOTIFICATIONS` запитується при вмиканні toggle (відмова → toggle лишається off + toast) і best-effort при вмиканні автозміни (поряд з battery-промптом — обидві передумови ротації в одному місці).
- **Локалізація нотифікації без i18n у Kotlin** — JS пише поточні переклади (заголовок, кнопки, назва каналу) у native prefs при відкритті Settings і зміні мови; UA-фолбеки зашиті на випадок чистого старту.
- **Кеш поточного фото** — `filesDir/current_wallpaper.jpg` (даунскейл 1440px): потрібен для мітки 💜 з фонового receiver'а, а заодно це **готовий file-based bitmap фундамент для v4.0.0 Live Wallpaper**.

### Технічні деталі
- `applyFromUrl` тепер повертає `Bitmap` — кеш і нотифікація без повторного декодування.
- Буфери шторки дедуплікують по id і обмежені 50 записами — подвійний тап no-op, тижні лайків без відкриття застосунку не розростуться.
- Помилка нотифікації/кешу ніколи не ламає сам apply (silent catch на кожному шарі).
- Порожній пул після 🚫 останнього фото → нотифікація знімається.

## 3.7.8 — 2026-06-11

🖼 **Wallpaper control** — нарешті видно, ЩО автозміна поставила на екран, і можна цим керувати. Закриває найгостріший біль реального юзу: «що це за картинка і як її забанити / зберегти».

> ⚠️ **Потребує повного rebuild'а** — зміни в Kotlin (`WallpaperWorker`, `WallpaperModule`).

### Корінь проблеми
Історія писалась **тільки** при ручному встановленні (JS-обгортка `setWallpaperFromUrl`). WorkManager-тіки — саме ті рандомні авто-шпалери — не лишали сліду взагалі. «Змінити зараз» теж.

### Додано
- **Worker пише історію.** Кожен apply (тік або changeNow) додає `{id, url, target, appliedAt}` у `pendingHistory`-буфер (WallpaperPrefs, ліміт 30, best-effort — помилка історії ніколи не ламає apply). Новий bridge-метод `drainPendingHistory()`.
- **`syncNativeHistory()`** — на focus Settings зливає native-буфер у `wallpaper_history` (dedup по id, sort по часу, ліміт 20). AsyncStorage лишається єдиним джерелом відображення.
- **Картка «Зараз на екрані»** — зверху секції історії: portrait-тамбнейл, «N хв тому · ціль», дії **❤️ В улюблені** (heartFilled якщо вже там) та **🚫 Більше ніколи**.
- **«🧹 Гидоту прибрано!»** — бан поточної шпалери при увімкненій автозміні: пул перебудовується **без** заблокованого фото → `changeWallpaperNow()` → гидота зникає з екрана негайно, картка показує нову. При вимкненій автозміні — просто бан.
- **Long-press на тамбнейл історії** → міні-меню з прев'ю: В улюблені / Більше ніколи / Застосувати знову (tap = reapply, як і було). Той самий патерн взаємодії, що й чіпи категорій.
- **Favorite з історії** — `GET /photos/:id` (1 запит: улюбленим треба повний обʼєкт для attribution автора), офлайн → toast помилки. Бан тихо знімає з улюблених — дзеркало каталожного flow.

### Виправлено
- Тамбнейли історії з native-записів (без `small`) рендерилися б сірими — fallback на `url`.
- Стрічка історії більше не дублює поточну шпалеру (вона живе в картці зверху).

### Виміряно
- **APK 90 → 75 MB** після deps-тріму v3.7.6 — мінус 15 MB на universal APK (reanimated + expo-image на 4 ABI важили значно більше за прогноз).

## 3.7.7 — 2026-06-10

Каталог стає твоїм: закріплюй улюблені категорії, ховай зайві, отримуй підказки пошуку. Плюс локальні release-білди нарешті підписуються бойовим ключем.

### Додано
- **Long-press на чіп категорії → міні-меню** «Закріпити / Приховати» (Mix — якір, не чіпається). Закріплені стрибають одразу після Mix у порядку закріплення, з золотою шпилькою на чіпі. Приховані зникають з ряду і свайп-циклу; ховання активної категорії стрибає на Mix; toast підказує де повертати. Pin і hide взаємовиключні. Chaos можна і закріпити, і сховати (hide ≠ re-lock). AsyncStorage `pinned_categories` / `hidden_categories`.
- **Settings → «Сховані категорії»** — секція з плюралізованим лічильником (видима тільки коли щось приховано) → bottom-sheet `HiddenCategoriesSheet`: рядок на категорію (своя іконка + локалізована назва) з кнопкою «Повернути», знизу «Повернути всі». Sheet закривається сам коли повернули останню. Каталог перечитує обидва списки на focus — повернення підхоплюються без перезапуску.
- **Search suggestions** — коли поле пошуку у фокусі, порожнє і історії ще нема: рандомні 6 із пулу 12 курованих EN-запитів (milky way, northern lights, rainy window…) чіпами-іскорками. Тап → пошук → запит лягає в історію, підказки природно поступаються їй. Пул `SEARCH_SUGGESTIONS` у `components/categories.ts`.

### Інфраструктура
- **Локальний release-підпис production-ключем.** RN-шаблон підписував `assembleRelease` debug-ключем — звідси конфлікт підписів з EAS-білдами (перевстановлення замість оновлення). Тепер release-конфіг читає `STELLARSHIFT_UPLOAD_*` credentials з глобального `~/.gradle/gradle.properties` (поза репо): з ними локальний APK = той самий підпис що EAS → оновлення взаємозамінні; без них — fallback на debug як було. EAS не зачеплений (інжектить свої managed credentials).

### Не зроблено (свідомо)
- **Crop preview перед setWallpaper** — закрито без реалізації: модалка вже рендерить фото cover-кропом на весь екран, лишався б тільки мок-лаунчер поверх — не вартий півдня. Зафіксовано в roadmap щоб не повертатись.

## 3.7.6 — 2026-06-10

Каталог, який слухається рук: свайпи всюди, тактильний відгук, історія пошуку. Плюс закритий race-фікс і APK на ~2-4 MB легший після чистки залежностей.

### Додано
- **Swipe між фото в модалці** — зона фото стала горизонтальним пейджером по видимих фото каталогу: гортаєш вліво/вправо не закриваючи перегляд. Автор, кнопки, стан улюбленого і блюр-фон слідують за поточним фото. Подвійний тап-у-улюблені працює на кожній сторінці. Чистий ScrollView-paging — без gesture-handler у Modal (пастка v3.5.1).
- **Swipe по гриду → сусідня категорія** — горизонтальний свайп по сітці перемикає категорію в порядку чіп-рядка. Стоп на краях (без закільцювання), легкий haptic-тік, активний чіп авто-доїжджає у видиму зону. У режимі пошуку вимкнено. RNGH Pan з `activeOffsetX ±24` / `failOffsetY ±12` — вертикальний скрол і pull-to-refresh не зачеплені.
- **Search history** — останні 5 унікальних запитів чіпами під полем пошуку (видно при фокусі на порожньому полі): тап → повторний пошук, ✕ → очистити. AsyncStorage `search_history`.
- **Haptics на ключові дії** — додавання в улюблені (легкий impact), успішне встановлення шпалери (Success-вібро, каталог + улюблені), блокування фото (Warning — деструктивне відчувається важче). Всі виклики fail-safe.

### Виправлено
- **Pool-fetch race закрито** (техдовг з 2026-05-01): `loadPhotoPool` тепер абортить попередній in-flight запит — якщо юзер міняє дві настройки поспіль, застарілий пул фізично не може перезаписати свіжіший у native prefs. Abort тихий (без error-toast), спінер гасить тільки актуальний виклик.

### Прибирання
- **−9 залежностей** (37 → 28). Expo autolinking компілює в APK всі native-модулі незалежно від імпортів, тому мертві deps = реальні мегабайти: `expo-image` (тягнув Coil — найжирніший), `react-native-reanimated` + `worklets` (сироти drag-to-reorder з v3.5.1), `expo-network`, `expo-web-browser`, `expo-symbols` (iOS-only у Android-only застосунку), `react-native-web` + `react-dom` + `expo-status-bar` (гігієна, web не шипимо). Свідомо лишили peer-залежності: `expo-linking` (router scheme), `expo-font` (vector-icons), `expo-system-ui` (userInterfaceStyle). Очікувана економія ~2-4 MB APK.

### Не зроблено (свідомо)
- **Pinch-to-zoom у модалці** — конфлікт жестів зі свайп-пейджером (pan при зумі ≠ гортання), піде окремим заходом зі scale-aware жестом.
- **i18n-ключі для search history** — статичного тексту в рядку нема (чіпи = запити юзера), перекладати нічого.

## 3.7.5 — 2026-06-10

🌌 **Soul wave** — душевне розширення пасхалки-благословень + щоденний ритуал привітання. Плюс прибирання техборгу що накопичився.

### Додано
- **Blessing pool 2× більший:** UA 10 → 20 фраз, EN 6 → 20. EN-набір отримав **«Stand with Ukraine»** (бренд-сигнал, дзеркало UA-фрази «Все буде Україна»). Shuffle-без-повторів тепер крутить 20 фраз перед повтором.
- **13 нових унікальних SVG-іконок** у бренд-палітрі (`stardust`, `moonCradle`, `beacon`, `cosmicShield`, `pathToStar`, `gentleOrbit`, `constellation`, `stillness`, `starClock`, `goodReturns`, `rootingStar`, `prism`, `dayOrbit`). Повна унікальність у межах пулу, який бачить юзер — UA та EN окремі пули, тому тематичні пари ділять іконку.
- **Launch greeting** — при холодному старті, якщо минуло ≥6 годин від минулого показу: банер-благословення з'їжджає згори (іконка + фраза), авто-зникнення через 5с. **НЕ кожен запуск** — ритуал «раз на день» без frequency fatigue. Новий toggle «Привітання при запуску» в Settings (default ON), `components/LaunchGreeting.tsx`. Не накладається на onboarding (гейт `active={!showOnboarding}`).

### Змінено
- **Прибрано Wi-Fi-only / Charging-only toggles** з Settings — друг давно казав що зайве, було в pending-idea. Native-сигнатура `startWallpaperRotation` незмінна (передаємо `false, false` → WorkManager без констрейнтів = міняти завжди). `ICON.wifi/battery` лишились у каталозі (не використовуються, але нешкідливі).

### Прибирання
- **`android/app/debug.keystore` untracked** — був закомічений до появи `*.keystore` у `.gitignore`. Файл лишається на диску для локальних debug-білдів, з git прибраний.
- **`app-example/`** позначено виконаним у roadmap — папки давно немає, лишався тільки no-op запис у `.gitignore`.
- **Синхронізація документації** після видалення Wi-Fi/charging: прибрано стале згадки про фільтри з README, STORE.md (UA + EN описи Play Store), `docs/privacy.md` + `docs/privacy-en.md`, та архітектурної секції `CLAUDE.md` (правила недоторкані). Виправлено неправильні шляхи (`app/components` → `components`, `app/services` → `services` — вони в корені репо). Прибрано untracked-дублікат `AGENTS.md`.

### Не зроблено (свідомо)
- **Шифрування BYO ключа** (`expo-secure-store`) — лишили plaintext: це особистий Unsplash dev-ключ на власному пристрої юзера, ризик мінімальний. Хешування неможливе (ключ треба слати в API). Відкладено.
- **PL/DE/ES локалізація** — лишається в IDEAS BANK.

## 3.7.4 — 2026-05-12

Polish-реліз після реального тесту на пристрої. Брендинг, контент, manifest — все що різало око при щоденному використанні. Без нових великих фіч; замість цього — десяток дрібних правок, кожна про увагу до деталей.

### Додано
- **Cheer toast** при збереженні в галерею і встановленні шпалери. Замість сухого «⏳ Завантажуємо…» — рандомна тепла фраза з пулу 5 (UA + EN) через `services/cheer.ts`. Set-wallpaper теж тепер cheer'ить миттєво при тапі, перед фінальним «✅ Красу встановлено». Брендова мікро-нагорода замість стерильного індикатора прогресу.
- **[docs/feature-graphic-brief.md](docs/feature-graphic-brief.md)** — ТЗ для дизайнера / AI на Play Store feature graphic 1024×500: бренд-палітра, типографіка, 3 варіанти композиції (A/B/C), AI-prompts для Midjourney / Imagen / Leonardo, чек-лист перед export. Готове до paste.
- **README.md** переписано з чотирьох правил розробки на справжній GitHub-readme: tagline, фічі, стек, dev-команди, структура, індекс документації. Правила лишились лише у [CLAUDE.md](CLAUDE.md).
- **`scripts/regen-adaptive-foreground.js`** — sharp-скрипт для регенерації adaptive-icon foreground у всіх mipmap-щільностях. Ідемпотентний (через `.original.png` backup).

### Змінено — бренд і копія
- **Slogan rebrand.** «Космос у твоїй кишені і не тільки» був релікт з space-only концепту — суфікс «і не тільки» виглядав як вибачення за розширення каталогу. Заміна: **«Тисячі настроїв, що оновлюються самі»** / **«A thousand moods, refreshing themselves»** — симетричні 39 символів, схоплюють і variety, і автоматизм. Оновлено в `STORE.md` (UA + EN full descriptions + feature graphic + screenshot caption) і `LAUNCH.md`.
- **About-footer** перебудовано на симетричні дзеркальні рядки: **«Зроблено з ❤️ в Україні»** / **«Made with ❤️ from Ukraine»**. Попереднє «Розроблено з 🤝 Братаном» було inside-joke для нашої розмови — milue для cold-reading stranger'а в Play Store. ICON_HANDSHAKE прибрано, серце — єдина іконка.
- **«Зроблено» → «Створено»** на UA після перегляду живого рендеру: «Створено» читається як творчість, «Зроблено» — як виробництво. Gap між текстом і серцем затиснуто 8→4px (внутрішній padding SVG додавав фантомні 4px).
- **Cheer phrase R2** після А/В: UA «Гарне око!» → «Бачиш красу!» (буквальна калька з англ. «good eye» не звучить природно укр), EN «Good eye!» → «You see beauty!» (м'якше, ближче до брендового тону).

### Змінено — контент
- **Категорія Anime прибрана.** Unsplash під query `anime` повертає переважно cosplay-портрети (відфільтровуються `excludePeople`, лишається крихітний пул) + низькоякісний AI-art. Тримали з v3.1.0 у надії на покращення queries — не сталось. Краще прибрати ніж розчаровувати. Юзери з anime в `mixCategories`/`activeCategories` тихо втратять цей вибір (CATEGORIES.find() для відсутнього id повертає undefined, ігнорується). Видалено з `components/categories.ts`, `i18n/locales/*`, `STORE.md`, `LAUNCH.md` Unsplash application.
- **Catalog tab name** — «StellarShift» (бренд) → **«Каталог»** / **«Catalog»** (функція). При v3.7.0 i18n-міграції tab tab випадково ребрендовано — втратилась паралель з «Улюблені» / «Налаштування». Бренд лишається в title-row каталогу через нову окрему ключ `catalog.brand` (попередня правка `catalog.title` плутала tab і header — розділили на два ключі).
- **Сортування категорій** тепер по локалі. Раніше `_CATEGORIES_RAW.sort(localeCompare('uk'))` запікав UA-алфавіт у module load — англомовний юзер бачив «Abstract / Architecture / Mountains / Rain / Food» (українська абетка спроєктована на англ. labels = безсенс). Helper `sortCategoriesByLabel(cats, t, locale)` робить sort на render-time через `Intl.Collator(i18n.language)`. Mix / Favorites / Chaos лишаються на семантичних позиціях (не алфавітних). Викликають: catalog top-bar, settings auto-change picker, settings mix picker. Автоматично покриває майбутні PL / DE / ES.

### Змінено — UX
- **Bug-2 hint:** після того як юзер дав permission через системні «Налаштування», JS не отримував callback'у — здавалось що нічого не сталось. Replacement: текст Alert'а тепер закінчується «…тоді натисни Зберегти ще раз». Дешевший fix ніж AppState listener + saved-intent state для краєвого випадку.
- **`granularPermissions: ['photo']`** в `services/galleryPermission.ts` — defense-in-depth, навіть якщо майбутня lib потягне audio/video у manifest, наш runtime call просить тільки фото.

### Виправлено
- **Manifest cleanup.** `READ_MEDIA_AUDIO`, `READ_MEDIA_VIDEO`, `READ_MEDIA_VISUAL_USER_SELECTED` стирались з AndroidManifest.xml прямою surgical-правкою. `app.json blockedPermissions` був documentation-only бо `/android/` папка трекається (custom Kotlin) — `expo prebuild` skip'ається, manifest не регенерується. ⚠️ Потрібен повний rebuild (Gradle / EAS).
- **Adaptive-icon foreground** перемасштабовано до 80% canvas (819×819 на прозорому 1024×1024). One UI / Pixel launcher squircle-mask обрізав ~17% — orbits + stars зникали, лишався тільки центральний blob. Регенерація через `scripts/regen-adaptive-foreground.js`; для всіх mipmap-щільностей webp. Picked up наступним EAS build автоматично.
- **GitHub Pages 404.** `_config.yml baseurl: /StellarShift` + Liquid `{{ '/path/' | relative_url }}` у `docs/index.md`, `privacy.md`, `privacy-en.md`. Project repos на GH Pages серверять'ся під `/REPONAME/`, наші absolute paths `/privacy/` падали в root domain і давали 404. App-side URL у `settings.tsx` уже хардкодив повну форму — не торкався.

### Інфраструктура
- **`.gitignore` harden** — defensive patterns щоб майбутній `git add -A` не зловив: `**/.idea/`, `android/app/.cxx/`, `*.aab`, `*.apk`, `Thumbs.db`, `desktop.ini`, `*.log`, `img/`, `blocked-preview.html`.
- **Untrack `img/`** (8 jpg-скріншотів) + видалено `blocked-preview.html` (Sauron icon variants — артефакт v3.6.0, рішення давно прийнято і в CHANGELOG записано). Scratch-папка лишається локально для re-edit'ів.

### Не зроблено в цій версії (свідомо)
- **Soul wave** (blessing pool 10→20 UA + 6→20 EN, launch-greeting toast, PL/DE/ES прогон) — план зафіксовано в roadmap (070bab2), але реалізація не входила в polish-sweep. Перенесено в наступну окрему версію.

## 3.7.3 — 2026-05-01

Стабілізаційний реліз. Реальне тестування на пристрої виявило кілька больових точок — ловимо їх по черзі, з діагностикою першою.

### Виправлено
- **Категорія «Хаос»** повертала канабіс і нудні дерева замість обіцяного хаосу. Запити переписані: одиночні слова на кшталт `psychedelic` / `surreal dreamscape` (магніт для канабісу й банальних краєвидів) замінені на 3-4-словні таргетовані запити: glitch art, фрактали, liminal space, analog horror, eldritch, vaporwave grid, kaleidoscope, data corruption, occult symbology.

### Змінено
- **Catalog fetch errors більше не німі.** Раніше всі помилки крім 403 / ERR_CANCELED тихо ковтались — юзер бачив порожню сітку без жодного пояснення. Тепер маплимо axios-помилки в конкретні toast-и: 401 → «API ключ недійсний», 429 → «Ліміт Unsplash вибито», network/timeout → «Немає інтернету», інше → «Не вдалось завантажити». Ділиться один helper `mapFetchError()` між трьома call-сайтами (loadMix, loadChaos, loadPhotos). i18n UA + EN.
- **Variety на категоріях.** На першому завантаженні `loadPhotos` тепер бере рандомну сторінку 1-3 з Unsplash замість завжди page=1. Infinite-scroll continue звідти, тож типова категорія тепер дає пул 60-90 різних фото замість 24-30 повторюваних. `loadMix` і `loadChaos` уже мали це.
- **Empty state на гриді.** Якщо після завантаження список фото порожній (помилка, нічого не знайдено) — замість мовчазного порожнього екрану показуємо центрований блок: search-іконка, «Тут поки порожньо», підказка, і кнопка «Спробувати ще» з refresh-іконкою. Кнопка тригерить правильний loader (mix / chaos / категорія). i18n UA + EN.
- **Author attribution в Улюблених.** В preview-modal у favorites раніше не було жодної згадки автора фото — порушення Unsplash API ToS і ризик відмови від модерації. Тепер у top-left видно chip з аватаром, ім'ям та `@username · Unsplash ›`; тап → openAuthorProfile (UTM-tagged профіль).
- **Запит дозволу на музику/відео прибрано.** При спробі зберегти фото в галерею Android запитував `READ_MEDIA_AUDIO` (бо `expo-media-library` декларує всі media-permission'и). Додано `blockedPermissions` у `app.json` для `READ_MEDIA_AUDIO` і `READ_MEDIA_VIDEO` — у манифесті залишається тільки `READ_MEDIA_IMAGES`. ⚠️ Потрібен native rebuild (`expo prebuild --clean` + `expo run:android` або `eas build`).
- **Onboarding system-back handler.** Android system back на онбордингу раніше міг закрити застосунок замість попереднього слайду. Тепер на слайдах 1+ — повертає на попередній, на слайді 0 — поглинає подію щоб не закрити застосунок випадково (для явного виходу є кнопка «Пропустити»). `BackHandler.addEventListener('hardwareBackPress', ...)` з cleanup.
- **Toast queue (FIFO).** Раніше два undo-toast-и підряд (наприклад, два блокування за 3 сек) — другий «з'їдав» перший разом з кнопкою Undo, юзер втрачав можливість відкатити першу дію. Додано `useToastQueue()` hook у `components/Toast.tsx`: `showToast` тепер enqueue'ить, після закінчення поточного автоматично грає наступний. `dismissToast` чистить чергу повністю (для після-undo). `app/index.tsx`, `app/settings.tsx`, `app/favorites.tsx` переключені на хук — мінус ~30 рядків boilerplate, мінус 5 lint warnings.

## 3.7.2 — 2026-04-30

### Додано
- **Onboarding** — 3 слайди при першому запуску (Каталог → Улюблені → Автозміна) з SVG-іконками (`galaxy`, `heartFilled`, `refresh`), pagination dots, «Пропустити» / «Далі» / «Поїхали!». Прапорець `onboarding_seen` в AsyncStorage. Повна i18n-підтримка (UA + EN).
- `components/Onboarding.tsx` — full-screen overlay над табами, FlatList horizontal pagingEnabled (без нових залежностей).
- **Share app** — рядок «Поділитися застосунком» у Settings перед розділом «Про застосунок». Системний share sheet через `Share.share` з Play Store URL (`https://play.google.com/store/apps/details?id=com.gorilas.StellarShift`). i18n-повідомлення UA + EN.
- **Rate prompt** — після 10-го успішного user-initiated `setWallpaper` запускаємо нативний in-app review (`expo-store-review`). Лічильник у AsyncStorage (`setwallpaper_count`), one-shot прапорець (`rate_prompted`) щоб не питати повторно. WorkManager-тіки не рахуються — це не момент задоволення.
- **Permission rationale для галереї** — перед system prompt'ом показуємо людський Alert «Доступ до галереї» з поясненням нащо нам дозвіл. Якщо юзер раніше відмовив назавжди (`canAskAgain=false`) — другий Alert з кнопкою «Відкрити налаштування» (через `Linking.openSettings()`). Хелпер `services/galleryPermission.ts` замінює inline `MediaLibrary.requestPermissionsAsync()` у каталозі та улюблених. i18n UA + EN.
- **Privacy Policy** — повний документ написаний руками під реалії застосунку (AsyncStorage local-only, Unsplash API + download tracking, Sentry опційно, без реклами/аналітики/акаунтів) у `docs/privacy.md` (UA) та `docs/privacy-en.md` (EN). `docs/_config.yml` + `docs/index.md` готові до GitHub Pages (Settings → Pages → branch `master`, folder `/docs`). У Settings → Про застосунок з'явилось посилання «Політика конфіденційності» — відкриває локалізовану сторінку в браузері.
- **R8 / ProGuard увімкнено** у release builds (`android.enableMinifyInReleaseBuilds=true` + `enableShrinkResources`). Keep-rules для нашого пакету `com.gorilas.StellarShift.**`, для `WorkManager.Worker`/`CoroutineWorker` (інстанціюються рефлексією), для `kotlin.Metadata` і для `SourceFile`/`LineNumberTable` (Sentry stack-trace). Очікуване зменшення APK на 10-30%, легка обфускація.
- **`RELEASE.md`** — інструкція по генерації release keystore: `keytool` команда (PKCS12, 4096-bit, 25000-day), завантаження в EAS (`eas credentials`), three-location backup checklist, рекомендація Play App Signing як страхувальну сітку, troubleshooting-табличка.
- **`STORE.md`** — повний Play Store listing (UA + EN): назва, short / full description, концепти feature graphic (1024×500), список 8 рекомендованих скріншотів, відповіді для Data Safety form, ASO-keywords, чек-лист перед submission.
- `.gitignore` зміцнено: додано `*.keystore` і `google-services.json` (раніше було тільки `*.jks`).

### Змінено
- `app/_layout.tsx` — gate показу onboarding до того як рендеряться таби; чекаємо паралельно `initI18n()` та `AsyncStorage.getItem('onboarding_seen')`.

### Виправлено
- TS-помилка в `app/index.tsx:814` — `Photo.user.profile_image` розширено до `{ small; medium?; large? }` (Unsplash API віддає всі три розміри; код у попапі автора використовує `medium` з fallback на `small`).
- **Кнопка «Фото на Unsplash» прибрана** з author-popup-у. У деяких випадках photo-page вантажилась повільно або 404'ила (видалені/перенесені фото), створювало враження зламаної кнопки. Залишено лише «Профіль автора» — він стабільний і виконує attribution за Unsplash ToS. Видалено `openPhotoOnUnsplash` сервіс і i18n-ключі `catalog.author.openPhoto`.
- **Easter-egg благословення обрізалось** на довгих EN-фразах («You shine like a…»). Layout-фікс: `blessingRow` тепер `alignSelf: 'stretch'`, текст `flex: 1` + `flexWrap: 'wrap'` — фраза переноситься на другий рядок замість обрізки.
- **Іконка «Made with … from Ukraine»** для EN-локалі тепер серце, для UA — рукостискання (як і раніше). Локаль-залежний рендер у footer About-секції.

## 3.7.1 — 2026-04-30

🦄 **Unsplash production compliance + Sentry + .env.** Підготовка до Play Store: API ключі більше не в git, Unsplash API ToS виконується (download tracking + UTM + clickable author + «Powered by Unsplash»), додано crash reporting через Sentry.

> ⚠️ **Потребує повного rebuild'а** (`npx expo run:android`) — новий Sentry config plugin + Kotlin зміни в `WallpaperWorker`/`WallpaperModule`.

### Додано
- **`.env`** (gitignored) + **`.env.example`** (committed) — `EXPO_PUBLIC_UNSPLASH_KEY`, `EXPO_PUBLIC_SENTRY_DSN`. Expo SDK 54 нативно підтримує `EXPO_PUBLIC_*` без додаткових babel-плагінів.
- **`services/unsplashTracking.ts`** — централізована логіка compliance:
  - `withUtm(url)` — додає `?utm_source=stellarshift&utm_medium=referral` (idempotent)
  - `trackDownload(downloadLocation)` — fire-and-forget GET з Authorization, тихо ловить помилки
  - `openAuthorProfile(username)` — `https://unsplash.com/@user` + UTM
  - `openPhotoOnUnsplash(htmlLink)` — пряме посилання на фото з UTM
  - `openUnsplashHome()` — для «Powered by Unsplash»
- **`Photo` type** розширено: `links: { html?, download?, download_location? }` + `user.links?` — підтримка Unsplash API response.
- **`PoolItem` + `HistoryEntry`** отримали опціональний `downloadLocation` — переїжджає по всьому пайплайну: API → loadPhotoPool → WallpaperPrefs → WallpaperWorker.
- **`WallpaperModule.setUnsplashKey(key)`** native-метод + JS-обгортка `setUnsplashKeyNative(key)`. `loadAndStart` синхронізує поточний ключ у prefs перед запуском rotation, щоб Worker міг трекати download'и в фоні.
- **`WallpaperWorker.trackUnsplashDownload(context, location)`** — Kotlin-side ping після успішного `applyFromUrl`. Читає key з prefs, fire-and-forget, тихо мовчить при помилках.
- **Sentry** через `@sentry/react-native` з expo config plugin (`app.json`). `Sentry.init()` на module-load в `_layout.tsx`, DSN з env, debug=__DEV__, traces 10% у release / 100% у dev. Root-export через `Sentry.wrap(TabLayout)` для error boundary + navigation tracing.
- **Clickable author** в catalog модалці — кнопки «Профіль автора →» та «Фото на Unsplash →» в author-info попапі. Ключі: `catalog.author.openProfile|openPhoto`.
- **«Powered by Unsplash» link** у Settings → Про застосунок. «Unsplash» в footer-тексті тепер клікабельний (Linking → unsplash.com з UTM).

### Змінено
- **`UNSPLASH_KEY`** в `components/categories.ts` тепер читає `process.env.EXPO_PUBLIC_UNSPLASH_KEY` з fallback на старий hardcoded ключ (для перехідного періоду — щоб юзери, що оновляться без `.env`, не вмерли).
- **Catalog (`app/index.tsx`)** — `setAsWallpaper` / `saveToGallery` / `sharePhoto` пушать `downloadLocation` через `setWallpaperFromUrl({ ...meta, downloadLocation })` або викликають `trackDownload(...)` напряму.
- **Favorites (`app/favorites.tsx`)** — той же pattern: track при set/save/share.
- **Settings (`app/settings.tsx`)** — `loadPhotoPool` тепер мапить `downloadLocation` для favorites-pool і API-pool. `confirmReapply` пушить `entry.downloadLocation` з історії.
- **`setWallpaperFromUrl`** робить ping автоматично якщо передали `meta.downloadLocation` — single source of truth для JS-side. Worker ping робиться окремо в Kotlin.

### Безпека
- **API key out of git** — `.env` ігнорується. Старі юзери з hardcoded fallback продовжують працювати, нові деплої беруть з env.
- **`sentry.properties`** в gitignore — для майбутніх auth-token'ів source-maps.

### Технічні деталі
- **Циклічна імпорт-проблема**: `wallpaperService.ts` → `unsplashTracking.ts` → `unsplashKey.ts` → `categories.ts` (UNSPLASH_KEY). Чисто, без циклу.
- **Worker download tracking timing**: ping шле ПІСЛЯ `applyFromUrl` — якщо apply впав, не трекаємо. Якщо ping впав — apply все одно зарахований.
- **Unsplash key in native prefs**: пишеться через `setUnsplashKey()` в `loadAndStart()` (settings). При зміні BYO key користувачем — наступний `loadAndStart` (debounced reload) синхронізує. Manual flush не потрібен.
- **Sentry sampling**: 10% traces у production щоб не злити безкоштовний quota (5K errors/місяць).
- **Pre-existing** TS-warning `selectedPhoto.user.profile_image?.medium` — старий tech-debt, не наш.

### Не зроблено в цій версії (свідомо)
- **Source maps upload до Sentry** — потребує `sentry-cli` auth token + EAS env var. Перенесено в техдовг — стек-трейси без source maps все одно мають package + line, але мінімізовані. Підключимо при першому release-збиранні в EAS.
- **«Photo by X on Unsplash»** як окремий рядок під фото в модалці — поки що зробили через author-row (тап → попап з лінками). Якщо Unsplash review-team захоче explicit credit-line — додамо.
- **Submit to Unsplash for production approval** — це v3.7.3 (бета + Play Console internal track).

## 3.7.0 — 2026-04-30

🌍 **i18n EN+UK** — повна локалізація інтерфейсу. Англомовні юзери більше не дивляться на «Налаштування» крізь Google Translate. Українська ідентичність бренду збережена: «Розроблено з 🤝 Братаном» лишається для UA, для EN — «Made with ❤️ from Ukraine».

### Стек
- **`i18next` ^26 + `react-i18next` ^17** — pure-JS, **без rebuild'а**.
- **Детекція мови** через вбудоване `Intl.DateTimeFormat().resolvedOptions().locale` — `uk` / `ru` → `uk`, інакше `en`. Без `expo-localization` і без native рекомпіляції.
- **Persist** через AsyncStorage (`app_language`) — ручний оверрайд переживає рестарт.

### Додано
- **`i18n/index.ts`** — `initI18n()`, `setAppLanguage()`, `getAppLanguage()`, `SUPPORTED_LANGS = ['uk', 'en']`, тип `Lang`.
- **`i18n/locales/uk.json` + `en.json`** — повний набір ключів: `common`, `settings.*`, `catalog.*`, `favorites.*`, `blockedSheet.*`, `categoryPicker.*`, `byoReminder.*`, `categories.*` (26 категорій включно з `chaos`, `favorites`, `search`).
- **Language switcher** як перша секція в Settings — два чіпи `Українська` / `English`, миттєвий перемкач + persist.
- **`labelKey?: string`** на типі `Category` — кожна з 26 категорій має свій ключ. `label` (UA) лишається як fallback на випадок відсутнього перекладу.
- **`BLESSINGS_EN`** — короткий пул (6 фраз) для англомовного користувача. UA-only прапор України та фрази «Все буде Україна» лишаються в `BLESSINGS_UK`. `nextBlessingFromQueue()` тепер читає поточну мову через `getAppLanguage()` і обирає відповідний пул.

### Перекладено
- **`app/_layout.tsx`** — titles табів через `t()`. Async `initI18n()` перед рендером (loader-spinner 50мс).
- **`app/settings.tsx`** — повна локалізація: 13 toast'ів, всі секційні label'и, toggle/picker/btn-action, BYO-блок (intro, status, кнопки, help-steps), 5 ConfirmDialog'ів (target в reapply теж локалізується), about-секція з варіантним footer, INTERVALS/APPLY_TO labels через `labelKey`.
- **`app/index.tsx` (Catalog)** — toast'и (apply / save / share / block / undo), share-dialog title, модалка фото (favorite/wallpaper кнопки, fallback опис автора), ConfirmDialog «Більше не показувати?», search-mode active category тепер інжектує `labelKey: 'categories.search'`, chip text — `t(item.labelKey)`.
- **`app/favorites.tsx`** — title, всі toast'и, modal кнопка set/setting, empty state (title + sub + CTA).
- **`components/CategoryPickerSheet.tsx`** — обидві секції (Active / Available) рендерять перекладені назви через helper `labelOf(c)`. «Готово», «Активні · N», «Доступні · N» — все через `t()`.
- **`components/BlockedManagerSheet.tsx`** — title, кнопка «Повернути», «Готово», «Розблокувати все ({count})», empty state.
- **`components/ConfirmDialog.tsx`** — defaults `confirmLabel`/`cancelLabel` тепер беруться з `t('common.confirm|cancel')` якщо проп не передано.
- **`components/ByoReminderDialog.tsx`** — `COPY` константи замінено на `t('byoReminder.{soft|urgent}.{title|message|confirm|cancel}')`. Acent-кольори лишилися hardcoded (UI-shape, не текст).

### Технічні деталі
- **Plural-форми** через i18next `_one`/`_other` для `settings.blocked.title` («1 фото приховано» / «{count} photos hidden»).
- **Інтерполяція** для `version`, `target` в reapply, `count` в clear-blocked.
- **Брендинг** не перекладається: «StellarShift» лишається як є на обох мовах. About-footer варіантний:
  - UA: `Розроблено з {handshake-icon} Братаном`
  - EN: `Made with {handshake-icon} from Ukraine`
- **TS:** `useState<Category>(...)` явно — фікс infered type union, який не сприймав `CHAOS_CATEGORY` (де `labelKey` опціональний).
- **`handleCategory`** тепер приймає `Category` замість `typeof CATEGORIES[0]` — той же фікс.
- **Pre-existing** `app/index.tsx:811 — profile_image?.medium` — старий tech-debt з roadmap, не наш.

### Не зроблено в цій версії (свідомо)
- **Сортування категорій** наразі завжди UA-алфавіт (через `_CATEGORIES_RAW.sort(label.localeCompare(...,'uk'))`). Для EN-юзерів порядок сталий, але не алфавітний. Виправити = render-time sort через `t()`. Перенесено в техдовг — не блокер.
- **Sentry** — все ще чекає на v3.7.1 разом з `.env`/`expo-constants`, як і планувалось.

## 3.6.1 — 2026-04-29

Polish-реліз перед i18n. Усі destructive дії (block, unfavorite, clear-all-blocked, unblock) тепер мають **Undo toast** — 5 секунд, золота кнопка «Скасувати», state-snapshot. Емпті-стейти Favorites та Blocked manager стали людськими — з іконкою, текстом-обіцянкою і CTA до каталогу. Pull-to-refresh у каталозі забарвлено в палітру проєкту.

### Додано
- **`Toast` action API** (`components/Toast.tsx`) — опційний `action={{ label, onPress }}` з золотою (`#FFD700`) кнопкою справа від тексту, розділеною лівою рамкою. `pointerEvents` стає `auto` коли є action, `none` коли тоста-нотифікації.
- **`setBlockedAll(list)`** в `services/blocked.ts` — атомарна заміна списку (потрібно для restore-after-clear).
- **CTA «Знайти красу»** в порожньому Favorites — кнопка веде в каталог через `router.push('/')`. Іконка серця-outline + лагідний текст.
- **Empty state в `BlockedManagerSheet`** — іконка ока Саурона 56×56 + заголовок «Нічого не сховано» + пояснення. Замінив рядок-курсив «Поки нічого не приховано».

### Змінено
- **Block photo** (`app/index.tsx`) — після ховання toast «✓ Більше неʼявиться» + Undo. На undo: `unblockPhoto`, відновлення favorites якщо було там, `pool_dirty=1`, локальні `blockedIds`/`favorites` повертаються до попереднього стану.
- **Remove favorite** (`app/favorites.tsx`) — `removeFavorite` спочатку знімає snapshot всього списку, потім видаляє. Toast «💔 Прибрали з улюблених» + Undo відновлює snapshot повністю.
- **Unblock single** (`app/settings.tsx`) — toast «↺ Розблоковано» + Undo додає фото назад через `setBlockedAll`. Pool перезбирається.
- **Clear all blocked** — `confirmClearBlocked` робить snapshot перед `clearBlocked()`, toast «🗑 Розблоковано N» + Undo через `setBlockedAll(snapshot)`.
- **`showToast` сигнатура** в усіх трьох екранах: `(msg, action?, duration=3000)`. Існуючі callsites без action зберігають 3-сек fade. Undo передає 5000 мс. Додано `dismissToast()` + `toastTimerRef` щоб таймер коректно скасовувався при ручному dismiss.
- **Favorites empty state** — більше простору (gap 14, paddingHorizontal 32), додано CTA-кнопку, текст-сабтайтл переписано на «Утримуй картинку в каталозі або двічі тапни в перегляді — і вона буде тут».
- **Pull-to-refresh у каталозі** — замінено `refreshing`/`onRefresh` props на явний `<RefreshControl>` з `colors={['#FFD700', '#534AB7', '#7F77DD']}`, `progressBackgroundColor='#15152a'`, `tintColor='#FFD700'`. Android тепер фарбує спіннер у бренд-золото на темному кружку.

### Не зроблено в цій версії (свідомо)
- **Sentry/Crashlytics** — потребує DSN + повний rebuild. Перенесено в **v3.7.1** разом з `.env`/`expo-constants` для Unsplash compliance — один rebuild замість двох.
- **Кастомний spinner з SVG-логотипом** для pull-to-refresh — Android `RefreshControl` не дає кастомний `progressView`. Свій refresh через жести = 2-3 години + ризик зачепити scroll. Свідомо обрано варіант «фарбування рідного» — чесна вартість/користь.
- **Empty state в каталозі** (нульовий результат пошуку / 0 фото з категорії) — не входило в roadmap-пункт «Favorites та Blocked», scope не розширюємо.

## 3.6.0 — 2026-04-24

«Більше не показувати» — фічa щоб назавжди прибрати з каталогу й автозміни картинки які не подобаються. Іконка ока Саурона з перекресленням у модалці фото + менеджер схованих в Налаштуваннях.

### Додано
- **`services/blocked.ts`** — AsyncStorage `blocked_photos` (масив `{id, small}`). Helpers: `getBlocked`, `getBlockedIds`, `blockPhoto`, `unblockPhoto`, `clearBlocked`, `isBlocked`.
- **`ICON.blocked`** в `components/icons.ts` — стилізоване око Саурона (вертикальна зіниця в амбер-золотому німбі) + червона діагональна риска. Палітра проєкту: `#FFD700`, `#EF9F27`, `#0a0a1a`, `#cc3355`.
- **Кнопка «Сховати» в модалці фото** (`app/index.tsx`) — третя іконка в action row поряд з save і share. Тап → `ConfirmDialog` «Більше не показувати?» → silent видалення з улюблених (якщо там було) + додавання в blocked + закриття модалки + toast «✓ Більше не зʼявиться».
- **Фільтр в каталозі** — `visiblePhotos = photos.filter(p => !blockedIds.has(p.id))`. Заблоковані миттєво зникають з grid (Mix, Chaos, категорії, пошук — все).
- **Фільтр в `loadPhotoPool`** (`app/settings.tsx`) — пул автозміни виключає заблоковані ID при складанні (favorites + API).
- **Секція «Сховані фото» в Settings** — зʼявляється тільки коли `blocked.length > 0`. Карточка з іконкою Саурона + лічильник → відкриває менеджер.
- **`components/BlockedManagerSheet.tsx`** — bottom-sheet (85%) з grid 3-в-ряд thumbnail (small URL) + кнопка «Повернути» під кожним. Знизу — destructive «Розблокувати все» з ConfirmDialog.

### Технічна деталь
Cross-screen sync пулу автозміни: catalog при блокуванні пише `pool_dirty=1` в AsyncStorage. Settings на focus читає прапор → якщо autoChange увімкнено, викликає `loadAndStart()` для перебудови пулу з відфільтрованими ID. Інакше пул оновиться при наступній зміні налаштувань.

### Поведінка
- Заблоковане фото → миттєво зникає з каталогу (filter at render)
- Якщо було в улюблених → silent видаляється (без warning, без toast — як домовлено)
- Якщо autoChange увімкнено → пул перезбирається при поверненні в Settings
- «Розблокувати» (індивідуально або все) → пул також перезбирається якщо autoChange on
- Дані переживають перевстановлення (AsyncStorage)

## 3.5.1 — 2026-04-24

Прибрано неробочий drag-to-reorder з category picker — long-press всередині Modal не реагував (gesture-handler конфліктує з RN Modal). Юзер може змінювати порядок через toggle off/on (зняти → додати → стає в кінець). Простіше і працює.

### Видалено
- **`react-native-draggable-flatlist`** — npm uninstall.
- `DraggableFlatList` → звичайний `FlatList` в `components/CategoryPickerSheet.tsx`.
- Prop `draggable` з `CategoryPickerSheet` (більше не диференціюємо active vs mix sheets — обидва однакові).
- Підказка `(затисни і тягни)` в заголовку секції.

### Залишено
- `react-native-gesture-handler` + `GestureHandlerRootView` обгортка — peer-dep Reanimated, корисні для майбутнього (live wallpaper тощо). Code cost = 0.

### Архітектурний урок
Drag-and-drop всередині RN Modal — відомий gotcha (gesture events не пропадають крізь Modal layer без custom GestureDetector). Якщо колись захочемо reorder — треба або:
- Замінити Modal на custom slide-up View (не RN Modal)
- Використати `@gorhom/bottom-sheet` (важка дeрибаня, але правильна)
- Або edit-mode з ↑↓ кнопками (zero-risk fallback)

## 3.5.0 — 2026-04-24

Категорії в Settings — bottom-sheet picker з drag-to-reorder. Усуваємо проблему великого блоку чіпів та додаємо можливість сортувати «улюблені» категорії на першому місці.

### Додано
- **`components/CategoryPickerSheet.tsx`** — bottom-sheet модалка (85% висоти екрану) з двома секціями:
  - «Активні» — категорії в порядку юзера. Long-press (180ms) на рядку → drag-to-reorder. Тап → видаляє з активних.
  - «Доступні» — решта в алфавітному порядку. Тап → додає в кінець активних.
  - Galaxy-handle зверху, заголовок + «Готово».
- **Compact preview cards** замість старих grid-блоків чіпів. Показує перші 5 активних + «+N» якщо більше + стрілка `›`.
- **`react-native-draggable-flatlist` ^4.0.3** — для drag UX. Залежить від уже встановлених `reanimated` + `gesture-handler`.
- **`GestureHandlerRootView`** обгортає весь додаток у `app/_layout.tsx` (без цього drag не працює — expo-router не обгортає автоматично).

### Змінено UX
- В **«Категорії для автозміни»** — drag увімкнений (`draggable=true`), бо порядок впливає на пріоритет у пулі.
- В **«Що міксувати»** — drag вимкнений, бо порядок не має значення (всі категорії рівноправні в шаффлі).
- **Min selected = 1** — не даємо зняти останню категорію (захист від empty pool, як було і раніше).

### Технічно
- `selectedCats` рендеряться через `DraggableFlatList` обернений в `View` з `maxHeight: 50%` — щоб довгий список не виштовхував Inactive секцію за екран.
- `activationDistance={9999}` коли `draggable=false` — фактично відключаємо drag без рендера двох різних компонентів.
- `Animated.timing` translateY — slide-up/down 240ms, без додаткових бібліотек.
- Видалено старі `toggleCategory` / `toggleMixCategory` callbacks — більше не потрібні (sheet робить replace всього масиву через `setActiveCategories`).

## 3.4.1 — 2026-04-24

Hotfix: «Улюблені» як категорія для автозміни. Очевидна функціональна дірка — друзі лайкали фото і очікували що зможуть поставити їх у автозміну, а такої опції не було.

### Додано
- **`FAVORITES_CATEGORY`** в `components/categories.ts` — спецкатегорія (id `'favorites'`, label «Улюблені», червоне SVG-серце). Пул береться напряму з AsyncStorage `favorites_data`, без Unsplash-запитів — **працює офлайн**.
- Інжектиться в Settings одразу після Mix у обидва списки: «Категорії для автозміни» та «Що міксувати». В каталозі НЕ показується (там є окремий /favorites таб).
- **Empty-state toast**: якщо обрати тільки «Улюблені» а вони порожні → `💜 Додай фото в улюблені — будуть в автозміні`.
- **Combine flow**: якщо обрати «Улюблені» + інші категорії — пул мерджиться (favorites йдуть першими в чергу, потім shuffle).

### Технічно
- В `loadPhotoPool` додано `wantsFavorites` flag — пропускаємо API-запит якщо тільки favorites.
- API call робиться лише коли `queryJobs.length > 0` (раніше завжди).
- Дедуп по id між favorites і API pool (на випадок коли юзер лайкнув фото з активної категорії).

## 3.4.0 — 2026-04-23

BYO Unsplash API key. Перший крок до шарингу другам/Play Store: усуваємо bottleneck спільного демо-ключа (50 req/h на всіх).

### Додано
- **`services/unsplashKey.ts`** — Context + hooks (`UnsplashKeyProvider`, `useUnsplashKey`, `useHasUserKey`), helpers (`getUnsplashKey`, `setUserKey`, `clearUserKey`, `validateKey`). Динамічний резолвер ключа: якщо є user key → використовує його, інакше fallback на бандлений демо-ключ.
- **`components/ByoReminderDialog.tsx`** — themed Modal з двома варіантами:
  - `soft` — м'яке нагадування з 2-го запуску, після «Пізніше» 3 дні cooldown.
  - `urgent` — після реального 403 від API (cooldown 30 хв) АБО після 5-го «Пізніше» (на КОЖЕН запуск, без cooldown).
- **BYO секція в Settings** (над «Про застосунок»): TextInput → «Перевірити» → «Зберегти». Складаний блок «Як отримати ключ?» з 4 кроками + кнопка-посилання на `unsplash.com/oauth/applications`. Бейдж стану («свій ключ» / «демо»).
- **Yellow dot на табі Налаштування** (`tabBarBadge`) — горить поки не встановлено власний ключ.
- **Auto-scroll до BYO секції** через `?scrollTo=byo` URL param (з діалогу «Налаштувати»).
- **AsyncStorage keys**: `unsplash_user_key`, `app_open_count`, `byo_dismiss_count`, `byo_last_dismissed_at`, `byo_last_403_at`.

### Змінено
- **Динамічна авторизація**: всі 4 axios-виклики до Unsplash (3 в `app/index.tsx` + 1 в `app/settings.tsx`) тепер `await getUnsplashKey()` замість статичного `UNSPLASH_KEY`.
- **403-обробка**: `Alert.alert('Ліміт запитів'...)` → `trigger403()` з контексту → urgent ByoReminderDialog. Прибрано `Alert` import з `app/index.tsx`.
- **`app/_layout.tsx`** обгорнуто в `UnsplashKeyProvider`. На mount: інкремент `app_open_count`, перевірка soft-показу.

### UX-логіка nag (узгоджено з користувачем)
1. Soft: з 2-го запуску, після кожного «Пізніше» — 3 дні тиші.
2. Після 5-го «Пізніше» → urgent на КОЖЕН запуск (максимальний тиск).
3. Реальний 403 → urgent одразу (з 30-хв cooldown), має пріоритет над soft.
4. Зберігши ключ — лічильники резетяться, бейдж зникає.

### Технічно
- `_cachedUserKey` in-memory кеш в сервісі — щоб `getUnsplashKey()` не йшов в AsyncStorage на кожен запит.
- `validateKey()` робить тестовий запит до `/photos?per_page=1` — розрізняє 401 (invalid), 403 (rate_limit), network error.
- При `setUserKey()` всі лічильники nag (dismiss count, last dismissed, last 403) очищаються.

## 3.3.0 — 2026-04-19

Розширення каталогу + друга easter-локація. Нічого з Native не чіпали — JS-only.

### Додано — категорії
- **7 нових категорій** (24 + Хаос разом): Архітектура, Ліс, Мандри, Туман, Нуар, Дощ, Сільське. Сортуються українським алфавітом автоматично через `localeCompare('uk')`.
- **9 нових SVG-іконок** в `components/icons.ts` для нових категорій (architecture, forest, travel, mist, noir, rain, rural) — у фірмовій палітрі додатку.
- **3 нові chaos-запити** до `CHAOS_QUERIES`: `'3d render octane'`, `'mystery occult ritual'`, `'horror dark eerie'`.
- **Хаос у налаштуваннях**: тепер з'являється в обох гридах («Категорії для автозміни» та «Що міксувати») коли розблокований. `loadPhotoPool` тягне 6 random запитів з `CHAOS_QUERIES` коли `chaos` обраний (напряму або через mix).

### Додано — easter
- **Easter на лого головної** (`app/index.tsx`): tap по логотипу → blessing-попап по центру екрану з SVG-іконкою; 3+ тапи → також spin лого 360°. Без unlock-механіки на 7 тапів — це лишається ексклюзивно у settings.
- **Re-lock через long-press 2с** (`app/settings.tsx`): затиснути лого «Про застосунок» 2 секунди → `ConfirmDialog` «Заблокувати Хаос?». На confirm — `relockChaos()` чистить AsyncStorage flag, прибирає `'chaos'` з `activeCategories` (з guard'ом — мінімум 1 категорія) та `mixCategories`.

### Змінено
- **Существуючі queries — менше overlap між категоріями:**
  - `cities`: `city architecture night` → `city skyline urban street downtown` (без architecture/night, щоб не перетиналось з новою «Архітектурою»).
  - `nature`: `nature landscape` → `nature landscape wildlife meadow` (конкретніше, менший overlap з forest/mist/rural).
  - `seasons`: `autumn winter season landscape forest` → `autumn winter spring summer season landscape` (+spring/summer для повних 4 сезонів, −forest бо тепер окрема категорія).
  - `bw`: `black white photography landscape architecture nature` (excludePeople=true) → `black white monochrome photography portrait street` (фокус на стиль фото, портрети тепер OK).
- **Refactor**: `BLESSINGS` + `nextBlessingFromQueue` винесено в окремий `components/blessings.ts`. Тепер обидва екрани (settings + index) ділять одне джерело фраз.

### Конфлікти, лишені умисно
- `cyberpunk` все ще містить `architecture` і `cities` — лишили без змін за рішенням QA-сесії, поспостерігаємо чи перетинається на практиці.
- `yachts` містить `travel` — теж без змін з тих самих міркувань.

## 3.2.1 — 2026-04-19

Patch до 3.2.0 — прибирання експерименту з parallax + полірування пасхалки.

### Додано
- **9 нових SVG-іконок** в `components/icons.ts`: `ukraineFlag` (горизонтальний синь+жовтий 30×20), `shootingStar` (зірка з хвостом), `sun`, `starsTwo`, `orbit`, `clover` (4-листна), `crown`, `lightbulb`, плюс заміна emoji 🇺🇦 на справжній SVG-прапор.
- **Іконка біля кожної з 10 фраз пасхалки** — `BLESSINGS` тепер `{text, icon}[]`. Рендер: `flexDirection: row` з SVG 20×20 ліворуч і текстом праворуч.
- **Shuffle-без-повторів** для пасхалок: queue-based — після того як усі 10 показано, перешафлюється новий цикл. Жодного повтору поки не побачив усі.
- **Live Wallpaper епік** документовано для v4.0.0 (memory) — об'єднує tilt-parallax + scroll-parallax, бо обидва ефекти вимагають `WallpaperService`.

### Виправлено
- **Серце на double-tap у модалці** було emoji `❤️` 14px (Animated.Text без fontSize) — замінено на той самий `SvgXml ICON.heartGlow` 180×180, що вже був у grid. Уніфіковано рендер.
- **Truncation пасхалки** («Загадай», «🇺🇦 Все Буде», «Удача вже поруч простягни») — `Animated.View` колапсував коли текст переносився на 2-й рядок. Fix: `minHeight: 44`, `width: '100%'`, `lineHeight: 20`, прибрано неефективні `flexShrink/flexWrap` з Text.
- **Dev warning `Unable to activate keep awake`** заглушено через `LogBox.ignoreLogs` у `_layout.tsx`. Тригериться `expo-keep-awake` як транзитивна залежність, у release-збірці не з'являється.

### Змінено
- `'🇺🇦 Все Буде Україна'` → `'Все буде Україна'` (з малої «буде», emoji переїхав в окремий SVG).
- `'Один тап — і світ став ярчіший'` → `'Один тап і ти став яскравішим'`.

### Прибрано (parallax research cleanup)
- **Phase-1 експеримент завершився негативно**: Samsung One UI Home не панорамить статичні шпалери незалежно від ширини bitmap (тестували з 6000×3986) і `SET_WALLPAPER_HINTS`. Та сама APK на Nova Launcher панорамить ідеально → це обмеження лаунчера, не баг коду.
- Видалено: `setParallaxTest()` з `WallpaperModule.kt`, `applyParallaxTest()` з `WallpaperWorker.kt`, експорт + тип з `services/wallpaperService.ts` та `declarations.d.ts`, тестова кнопка зі `settings.tsx`, `SET_WALLPAPER_HINTS` permission з `app.json`.
- Висновок збережено в memory: справжній parallax піде в v4.0.0 через власний `WallpaperService`.

## 3.1.0 — 2026-04-18

### Додано
- **4 нові категорії**: Транспорт (авто/супер-кари), Аніме, Кіберпанк, Квіти. `MIX_QUERIES` теж розширено — мікс підхоплює нові теми.
- **Історія шпалер у налаштуваннях** — горизонтальний рядок з останніми 20 застосованими шпалерами. Тап на картку → «Застосувати знову» (target береться з налаштувань).
- **Поділитись фото** через системний share sheet (`expo-sharing`) — кнопка в модалках каталогу і улюблених.
- **Зберегти в галерею** через `expo-media-library` — кнопка в модалках каталогу і улюблених.
- SVG-іконки `ICON.save`, `ICON.share`, `ICON.trash`.

### Змінено
- **Toast** виділено в окремий компонент `components/Toast.tsx` з фейд-анімацією (Animated opacity), замість inline-блоку у трьох екранах.
- **Видалення з улюблених** перенесено з окремої primary-кнопки в action-row з іконкою trash (поряд з save/share).

### Виправлено
- **Застарілі Android дозволи** `READ_EXTERNAL_STORAGE`/`WRITE_EXTERNAL_STORAGE` прибрані з `app.json` — Android 13+ їх ігнорує, лишився коректний `READ_MEDIA_IMAGES`.

### Залишилось без змін (але важливо нагадати)
- Native Kotlin engine (`WallpaperModule` + WorkManager) — нічого не чіпали, історія пишеться JS-обгорткою над `setFromUrl`.
- HD parallax вже автоматичний на стороні `WallpaperManager.setBitmap(bitmap, cropHint=full, …)` — окремий тогл не потрібен.
- Target picker лишається в налаштуваннях (lock/home/both) — застосування з модалок та з історії бере його звідти, без per-apply вибору.

### Відкладено
- iPhone-style **tilt-parallax** (зсув по акселерометру) — потребує власного Android `WallpaperService`/Kotlin і виходу з Expo managed workflow. Запланований як окремий епік.
- Crash/bug reporting (Sentry/Crashlytics) — перед публікацією в Play Store.

## 2.1.0
- Full SVG UI — всі emoji замінено на власні SVG-іконки (`icons.ts`), double-tap у модалці лише додає в улюблені.

## 2.0.0
- Native Kotlin `WallpaperModule` + WorkManager (заміна expo-background-fetch). Background rotation працює на Samsung. Battery optimization exemption, double-tap в улюблені, swipe-back fix.

## 1.x
- Експо-прототип: каталог Unsplash, улюблені, авто-зміна шпалер.
