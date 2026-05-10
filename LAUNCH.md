# LAUNCH.md — submission day runbook

> Один документ на весь шлях від «v3.7.3 у master» до «Unsplash production application submitted».
> Виконується **сьогодні**. Орієнтовний час — 4-6 годин активної роботи + 30-45 хв чекань (EAS build, Play Console review).

---

## ⏱️ Critical path (стрілка часу)

```
0:00  PR merge + tag v3.7.3                    [5 хв]
0:05  Keystore generation                       [20 хв]
0:25  GitHub Pages enable                       [5 хв]   ┐ паралель
0:30  Screenshots (8 шт.) на пристрої           [60 хв]  ├ можеш робити
0:30  Feature graphic (Figma/Canva/AI)          [45 хв]  │ поки EAS build
0:30  EAS production build start (~25 хв чекати)         ┘
0:55  EAS build готовий — .aab файл
1:00  Demo video (15-30 сек, для Unsplash)      [30 хв]
1:30  Play Console: створити app + listing      [60 хв]
2:30  Upload .aab → Internal Testing track      [10 хв]
2:40  Дочекатись «Available»                    [15-30 хв]
3:10  Unsplash production application form      [20 хв]
3:30  ✅ SUBMITTED
```

---

## STEP 0 — Pre-flight (5 хв)

### 0.1. Merge PR

Відкрий: https://github.com/Goorilaas/Goorilaas/pull/new/feat/v3.7.3-stabilization

Якщо PR ще не створений — клікай той посилання, paste title/body що я підготував раніше, **Squash and merge** (або Merge — без різниці, для one-man-band).

### 0.2. Pull master + tag

```powershell
git switch master
git pull origin master
git tag -a v3.7.3 -m "v3.7.3 — stabilization release"
git push origin v3.7.3
```

Тег потрібен як snapshot для production build. Якщо щось зламається — повернемось.

---

## STEP 1 — Keystore (20 хв) ⚠️ Critical

Робиш у PowerShell у будь-якій папці **поза репо** (наприклад `D:\secrets\stellarshift\`):

```powershell
mkdir D:\secrets\stellarshift
cd D:\secrets\stellarshift

keytool -genkeypair -v `
  -storetype PKCS12 `
  -keystore stellarshift-release.jks `
  -alias stellarshift `
  -keyalg RSA `
  -keysize 4096 `
  -validity 25000
```

Питання які задасть:

| Поле | Що писати |
|---|---|
| Keystore password | **довгий** (16+ символів) → одразу в Bitwarden, не запам'ятовуй |
| Key password | той самий що keystore (для PKCS12 однакові) |
| First and last name | `Serhii Holubchuk` |
| Organizational unit | `StellarShift` |
| Organization | `Goorilaas` |
| City | твоє місто |
| State | твоя область |
| Country code | `UA` |
| Correct? | `yes` |

**ОДРАЗУ зберегти в Bitwarden** запис «StellarShift Release Keystore»:
- keystore password
- key alias = `stellarshift`
- шлях до файлу
- дата створення = сьогодні

Перевірка:

```powershell
keytool -list -v -keystore stellarshift-release.jks -alias stellarshift
```

Має вивести SHA1, SHA256 — це нормально.

### 1.1. Завантажити keystore в EAS

```powershell
cd C:\Users\sergh\Desktop\StellarShift
eas credentials
```

Інтерактивно:
- Platform: **Android**
- Profile: **production**
- → **Keystore: Set up a new keystore**
- → **Use my own existing keystore**
- Path: `D:\secrets\stellarshift\stellarshift-release.jks`
- Keystore password: (з Bitwarden)
- Key alias: `stellarshift`
- Key password: (той самий)

Готово. EAS тепер знає твій keystore.

---

## STEP 2 — GitHub Pages (5 хв)

Браузер:
1. https://github.com/Goorilaas/StellarShift/settings/pages
2. **Source:** Deploy from a branch
3. **Branch:** `master`, **Folder:** `/docs`
4. **Save**

Через 1-2 хв перевір:
- https://goorilaas.github.io/StellarShift/ — головна
- https://goorilaas.github.io/StellarShift/privacy/ — UA Privacy Policy
- https://goorilaas.github.io/StellarShift/privacy-en/ — EN Privacy Policy

**Critical:** Privacy URL мусить бути живий ДО Unsplash submission і ДО Play Console listing.

---

## STEP 3 — EAS production build start (1 хв стартує, ~25 хв чекає)

```powershell
cd C:\Users\sergh\Desktop\StellarShift
eas build --platform android --profile production
```

Дасть посилання типу `https://expo.dev/accounts/.../builds/<id>`. Не закривай вкладку — там видно лог.

**Поки build біжить, паралельно роби STEPS 4-6.**

---

## STEP 4 — Screenshots (60 хв) — паралельно з EAS build

### 4.1. Підготовка

Запусти dev build на емуляторі або підключеному пристрої:

```powershell
npx expo run:android
```

(Не plut'ai в EAS build — той вже біжить у клауді.)

Налаштуй:
- Розмір вікна емулятора: Pixel 8 → 1080×2400 (Settings → Display)
- Заповни Favorites 5-6 фото (зайди в каталог, double-tap)
- Заповни History 5 шпалер (постав кілька з каталогу)
- Заблокуй 6+ фото для секції «Сховані»

### 4.2. Зйомка (8 кадрів за списком STORE.md розділ 5)

Для кожного:

```powershell
adb exec-out screencap -p > shot_NN.png
```

де NN = 01...08. Список:

| # | Що зняти | Notes |
|---|---|---|
| 01 | Каталог з підсвіченою активною категорією (Mix або Space) | grid 2-col видно |
| 02 | Модалка перегляду фото (з кнопкою Встановити) | epic фото у фоні |
| 03 | Settings → Автозміна toggle ON + інтервал | первинний value-prop |
| 04 | Favorites — 5+ фото у сітці | сердечком на тайтлі |
| 05 | Каталог з відкритим search, текст «space» | search field у фокусі |
| 06 | Settings → Сховані фото manager | bottom sheet відкритий |
| 07 | About-section з зірочками (тапни 3 раз по лого) | easter egg блисне |
| 08 | Onboarding slide 1 (треба `AsyncStorage.removeItem('onboarding_seen')` для reset) | hero shot |

### 4.3. Caption-overlay (опційно але рекомендовано)

Запусти Figma → новий файл 1080×2400 → накладай скрін + текст підпису зверху (або знизу) із STORE.md розділ 5. Якщо часу мало — здавай голі скріни без підписів. Play Console приймає.

---

## STEP 5 — Feature graphic (45 хв) — паралельно

**Концепт A (рекомендую — швидше):**

Figma: новий файл 1024×500.
1. Background: gradient #0a0a1a → #3a2a5e
2. Зліва: 4-6 thumbnail-ів реальних wallpaper-ів з твого каталогу (export з пристрою)
3. Один центральний з підсвіткою #FFD700 (border 3px)
4. Справа: текст
   - **StellarShift** — Inter ExtraBold, 88px, white
   - **Космос у твоїй кишені і не тільки** — Inter Medium, 28px, opacity 0.7

Export як PNG → `feature-graphic.png` (1024×500).

**Концепт AI-generated (швидше — 5 хв):**

Midjourney / Imagen / Leonardo prompt:

```
Wide horizontal banner 1024x500 pixels, dark cosmic gradient
background (deep space blue to purple), small grid of wallpaper
thumbnails on the left showing diverse photography (galaxy, mountains,
neon city, ocean), bold modern typography "StellarShift" on the right
with subtle slogan below, premium minimalist app store feature
graphic, --ar 1024:500 --no people, faces, text-errors
```

Доводиш у Figma — додаєш текст «StellarShift» поверх якщо AI його зіпсував.

---

## STEP 6 — Demo video (30 хв) — після EAS build

Потрібен 15-30 сек відеоролик для Unsplash submission (також придасться для Play Store пізніше).

### Запис

```powershell
adb shell screenrecord --bit-rate 8000000 --time-limit 30 /sdcard/demo.mp4
adb pull /sdcard/demo.mp4
```

Сценарій ~25 сек:
1. (3s) Відкрив каталог, видно сітку, тапнув категорію
2. (3s) Long-press → серце → у favorites
3. (3s) Відкрив фото в модалці
4. (4s) Тап «Встановити» → toast «Красу встановлено» → home screen видно нову шпалеру
5. (3s) Settings → Автозміна toggle ON
6. (3s) Назад в каталог
7. (3s) Логотип StellarShift на закінчення (можна тримати)

Для UX-полісу — обріж в DaVinci Resolve / Shotcut / навіть онлайн через clideo.com. Експорт MP4 H.264, ~720p, ≤50 MB.

Загрузи на YouTube як **Unlisted**. Збережи URL для Unsplash form.

---

## STEP 7 — Play Console (60 хв) — після EAS build готовий

### 7.1. Створити app

1. https://play.google.com/console
2. Якщо ще не платив $25 розробника — заплати зараз. **Без цього submission неможливий.**
3. Create app:
   - App name: `StellarShift`
   - Default language: English (United States) — потім додаси UK
   - Type: **App**
   - Free / Paid: **Free**
   - Прийняти декларації

### 7.2. Заповнити мінімум для Internal Testing

Liva sidebar — пройти всі обов'язкові пункти (червоні точки):

**Privacy Policy**
- URL: `https://goorilaas.github.io/StellarShift/privacy-en/`

**App access**
- All functionality available without restrictions

**Ads**
- No ads

**Content rating**
- Заповни questionnaire → Everyone (PEGI 3)

**Target audience**
- 13+ через GDPR

**News app**
- No

**COVID-19 contact tracing and status**
- No

**Data safety** — копіюй з [STORE.md розділ 7](STORE.md):
- App activity → App interactions (anonymized via Sentry, optional)
- Device or other IDs → Crash logs (Sentry)
- Photos and videos → **NOT collected** (saved to user's gallery via system API)
- Encryption in transit: Yes
- Data deletion: User can wipe via uninstall

**Government apps**
- No

### 7.3. Store listing

Скопіюй з [STORE.md розділ 1-3](STORE.md):

- **App name:** StellarShift
- **Short description:** Fresh wallpapers every 15 minutes. Space, nature — your call.
- **Full description:** EN-блок з STORE.md
- **App icon:** автоматично з твого build
- **Feature graphic:** upload `feature-graphic.png` (STEP 5)
- **Phone screenshots:** upload 4-8 PNG (STEP 4)
- **App category:** Personalization
- **Tags:** wallpapers, HD, auto-change, space
- **Contact email:** sergholubchuk@gmail.com
- **External marketing:** Off

Save → Send for review (для main store) — **це не зараз, спочатку Internal Testing.**

### 7.4. Internal Testing track

Liva sidebar → Testing → Internal testing:
1. **Create new release**
2. Upload .aab з EAS build (path → `eas-build-output.aab` чи з консолі завантажиш)
3. Release notes (UA + EN): `Initial internal testing release v3.7.3`
4. **Save** → **Review release** → **Start rollout to internal testing**

5. **Testers tab** → Create email list → додай свою email + 2-3 друзів (мінімум 1 тестер потрібен для активації треку)
6. **Copy opt-in URL** — це і є твій «live URL» для Unsplash submission

Очікуй ~15-30 хв до «Available to testers».

---

## STEP 8 — Unsplash production application (20 хв)

URL: https://unsplash.com/oauth/applications → твій застосунок → **Apply for Production**

Поля:

**Application name:** StellarShift

**Description (~150 words):**

```
StellarShift is an Android wallpaper app that lets users browse tens
of thousands of HD photos from Unsplash across 20+ curated categories
(Space, Nature, Anime, Cyberpunk, Architecture, etc.) and apply them
to home and lock screens with one tap. The app supports automatic
wallpaper rotation on a schedule (15 min to daily) running through
native Android WorkManager.

Photos are displayed full-screen with author attribution: name, avatar,
and tappable Unsplash profile link in both catalog modal and favorites
preview. Every wallpaper application, save-to-gallery, share action,
and background rotation tick triggers Unsplash's download_location
endpoint as required by API guidelines. All links to unsplash.com
include UTM parameters (?utm_source=stellarshift&utm_medium=referral).

The app has zero ads, no user accounts, no tracking. It's open-source
on GitHub. Privacy Policy is hosted at goorilaas.github.io/StellarShift.
```

**How is the API used (~100 words):**

```
The app calls /search/photos with user-selected category queries and
displays results in an infinite-scroll grid. On wallpaper application
or save-to-gallery, the app fires a GET to photo.links.download_location
with the user's Client-ID for tracking. Author profile links use UTM-
tagged unsplash.com URLs. The native Android WorkManager fires the
same download-tracking call on each background rotation tick. The app
ships with a Bring-Your-Own-Key option in settings — power users can
plug in their own Unsplash API key. Demo key (50 req/h) is fallback;
production deployment will use the production key from this approval.
```

**Live URL:** твій internal testing opt-in URL з Play Console (STEP 7.4)

**Demo video URL:** YouTube unlisted з STEP 6

**Privacy policy URL:** `https://goorilaas.github.io/StellarShift/privacy-en/`

**Screenshots (5+):** твої з STEP 4

**Submit.**

Чекаємо 5-14 днів. Email-нотифікація з Unsplash.

---

## ✅ Done checklist

Постав галочки коли крок завершений:

- [ ] PR merged, master is at v3.7.3
- [ ] `git tag v3.7.3` pushed
- [ ] Keystore згенерований і у Bitwarden + EAS
- [ ] GitHub Pages live (3 URL працюють)
- [ ] EAS production build → .aab отриманий
- [ ] 8 скріншотів готові
- [ ] Feature graphic 1024×500 готовий
- [ ] Demo video на YouTube (unlisted)
- [ ] Play Console: app створений
- [ ] Play Console: всі обов'язкові секції зеленим
- [ ] Play Console: AAB у Internal Testing
- [ ] Internal Testing opt-in URL працює
- [ ] Unsplash form submitted
- [ ] Email від Unsplash отриманий (підтвердження submission, не approval)

---

## 🆘 Якщо щось пішло не так

**EAS build failed:**
- Подивись лог на expo.dev. Найчастіше — Gradle/R8 keep-rule miss.
- Першу лінію error скопіюй у наш чат, я диагностую.

**Play Console відмовляє:**
- Найчастіша причина — Data Safety form неповний. Пройдись ще раз.
- Privacy Policy URL має повертати 200, не 404. Перевір через `curl -I`.

**Keystore забув пароль:**
- ❌ Пропав. Згенеруй новий, починай з нуля. Урок: ВЖЕ після Step 1 у Bitwarden.

**Unsplash review fails:**
- Зазвичай причини: відсутній download tracking (у нас є), відсутній UTM (у нас є), відсутня атрибуція автора (у нас є). Дочекайся reviewer-листа з конкретикою.

---

## 📨 Контакти на чорний день

- **Expo support:** https://expo.dev/support
- **Play Console support:** https://support.google.com/googleplay/android-developer
- **Unsplash API team:** api@unsplash.com

---

*Створено: 2026-05-01 для submission v3.7.3*
*Версія runbook'а — 1.0. Якщо submission піде не так і будемо повторювати через 2 тижні — апдейтну.*
