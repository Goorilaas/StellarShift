# ТЗ: Feature Graphic для Google Play Store

> Документ для графічного дизайнера або як основа для AI-генерації.
> Призначення: горизонтальний банер на сторінці застосунку StellarShift у Play Store.

---

## 1. Контекст проєкту

**Назва:** StellarShift
**Платформа:** Android (Google Play)
**Категорія:** Personalization / Wallpapers
**Мова релізу:** українська + англійська

**Короткий опис застосунку:**
Wallpaper-додаток для Android з автоматичною зміною шпалер. Юзер обирає категорії
(космос, природа, океан, абстракт, кіберпанк, гори, тощо — 24 категорії), застосунок
кожні 15 хвилин / годину / день автоматично змінює фон на свіже HD-фото з
Unsplash. Без реклами, без акаунтів, без трекерів. Pet-проєкт зроблений в Україні.

**Емоційний тон бренду:**
- 🪄 Магічний, поетичний, soulful
- 🤍 Тихий, доброзичливий, без агресії
- ⭐ Premium-feeling, але не корпоративний
- 🇺🇦 Український — обережно, без overt-патріотики на цьому конкретному артефакті

---

## 2. Призначення цього артефакту

**Feature Graphic** — це перше що бачить людина коли клікає на сторінку застосунку
у Google Play. Розташовується у самому верху, перед іконкою/назвою/кнопкою Install.
Виглядає як wide hero-banner.

**Завдання банера за 2 секунди:**
1. Сказати **що це** (wallpaper-додаток)
2. Передати **vibe** (premium, спокійний, beautiful)
3. Натякнути на **breadth** (багато різних шпалер)
4. Не виглядати дешево, не виглядати корпоративно

**Цей банер не повинен:**
- Перерахувати всі фічі (для цього є description)
- Показувати UI самого застосунку (заборонено правилами Play Store)
- Мати CTA-кнопки на кшталт «Download now» (заборонено)

---

## 3. Технічні вимоги (тверді)

| Параметр | Значення |
|---|---|
| Розмір | **1024 × 500 px** (точно, не пропорційно) |
| Формат | PNG або JPEG (PNG переважно) |
| Розмір файлу | до 1 MB |
| Колірний профіль | sRGB |
| Альфа-канал | **немає** (фон має бути замазаний) |
| Безпечна зона | 95% від центру — головні елементи мають бути в межах ~970×475 px |
| Ім'я файлу | `feature-graphic.png` |

**Чому safe zone:** Play Store обрізає краї банера на різних device формфакторах.
Всі важливі елементи (текст, ключові visuals) тримаймо подалі від країв.

---

## 4. Бренд-гайдлайни

### Кольорова палітра

**Основні (фон, акценти):**
- `#0a0a1a` — глибокий чорно-синій (основний фон)
- `#1a1a2e` — темно-фіолетовий (середній тон)
- `#3a2a5e` — насичений фіолетовий (акцентна частина gradient)
- `#534AB7` — primary brand purple
- `#7F77DD` — secondary brand purple (lighter)
- `#AFA9EC` — tertiary, для tonal contrast

**Акценти:**
- `#FFD700` — золотий (для активних станів, glow)
- `#cc3355` — приглушений рожевий (рідко)

**Типографічний колір:**
- `#FFFFFF` (white) — для назви бренду
- `#FFFFFF` з opacity 0.7 — для слогану

### Типографіка

**Назва бренду «StellarShift»:**
- Шрифт: **Inter ExtraBold** (1-й вибір) або Manrope ExtraBold / SF Pro Display Bold (fallback)
- Розмір: 88-100 px (під 1024×500 канвас)
- Колір: `#FFFFFF`
- Letter-spacing: -1px (трішки tighter)
- Без uppercase — пишемо як є: `StellarShift`

**Слоган:**
- Шрифт: **Inter Medium** (або Manrope Medium / SF Pro Display Medium)
- Розмір: 26-32 px
- Колір: `#FFFFFF` з opacity 0.7
- Letter-spacing: 0
- Український варіант: «**Тисячі настроїв, що оновлюються самі**»
- Англійський варіант: «**A thousand moods, refreshing themselves**»

> Обираємо **одну мову для одного банера**. Play Console дозволяє завантажити
> локалізовані версії — тоді робимо два файли. Якщо тільки один — то англійський
> для глобальної аудиторії.

### Логотип

Існуючий SVG-логотип StellarShift (фіолетове ядро з orbiting rings + зірки навколо).
Файли:
- `assets/images/logo.png` (1024×1024, повний дизайн)
- `assets/images/icon.png` (той самий)

Розмір логотипа на банері: **140-180 px** діаметру.

---

## 5. Композиція і компоненти

### Варіант A — «Розкладена сітка» (рекомендований)

**Лейаут (зліва направо):**

```
┌──────────────────────────────────────────────────────────┐
│  [grid 3×2 thumbnails]    ┌─[logo orbits]─┐              │
│  [galaxy] [mountain]      │  StellarShift │              │
│  [ocean]  [flowers]       │   ──────       │             │
│  [forest] [animals]       │  A thousand moods,           │
│                           │  refreshing themselves       │
│                                                          │
└──────────────────────────────────────────────────────────┘
       ←40% area→             ←60% area→
```

**Деталі:**
- Background: лінійний gradient від `#0a0a1a` (top-left) до `#3a2a5e` (bottom-right) під ~135°
- Suggested overlay: very subtle stars/dots scattered across whole canvas (1-3px white dots, opacity 0.3-0.6) — додає космічного відчуття без візуального шуму
- **Зліва (~40%):** сітка 3 колонки × 2 рядки = 6 wallpaper-thumbnail'ів
  - Розмір кожного: ~150 × 80 px з border-radius 12 px
  - Gap між: 8 px
  - Контент: різні «настрої» — космічна туманність, гірський пейзаж, океан з висоти, neon-кіберпанк місто, лісова глибина, abstract gradient art
  - Опційно: один центральний з glow-обводкою у `#FFD700` — «активна» картка
- **Справа (~60%):**
  - Опційно: малий логотип StellarShift зліва від назви (140×140px), **АБО** просто ядро без orbits, **АБО** взагалі без логотипа (бо праворуч від банера у Play Store ВЖЕ є app icon)
  - Назва **StellarShift** — Inter ExtraBold 88px, white
  - Слоган під назвою — Inter Medium 28px, white opacity 0.7

### Варіант B — «Phone mockup»

Реалістичний моковап Pixel 8 / Galaxy S23 під легким кутом (5-10°), на екрані —
одна epic HD-шпалера (наприклад космічна туманність з нашого каталогу). Над/під
телефоном — назва і слоган. Декілька прозоро-затінених thumbnail-ів «вилітають»
з телефона по краях.

> Цей варіант **продає краще**, але вимагає якісного 3D mockup (Ramotion-стиль).
> Використати lightroom-style рендер. Без UI-обвʼязки на екрані телефона —
> тільки шпалера на full-bleed.

### Варіант C — «Cosmic abstract без mockup'а»

Абстрактна космічна сцена: туманність, орбіти, частки. По центру плаває логотип
StellarShift (можна великий, 200+ px). Назва над, слоган під. Без thumbnails —
суто атмосферний банер.

> **Найменш інформативний** з трьох — не каже що це wallpaper-додаток. Підходить
> якщо хочемо уникнути візуальної інформації і покластися на іконку + опис у
> Play Store. Як на мене, ризиковано.

### Я рекомендую варіант A

A показує і breadth (різні категорії як thumbnails), і брендинг (назва + слоган),
і premium-feel (gradient + типографіка). Найбалансованіший за функцією.

---

## 6. Текстовий контент

**Назва бренду** (точно як написано, з camelCase):

```
StellarShift
```

**Слоган — обери одну мову для банера:**

```
Українською:  Тисячі настроїв, що оновлюються самі
English:      A thousand moods, refreshing themselves
```

**Не пиши на банері:**
- App descriptions (для цього є description нижче)
- «Free», «No ads», «New» — не CTA
- «Download», «Install» — заборонено правилами
- Версії, дати релізу

---

## 7. Що НЕ робити

**Hard правила від Google:**
- ❌ Не накладай скріншоти UI застосунку
- ❌ Не пиши «Download Now», «Install», «Buy» — будь-які CTA
- ❌ Не додавай awards-бейджі чи сторонні логотипи (Google Play, Editor's Choice etc.)
- ❌ Не дублюй назву Google Play чи інших store-іконок

**Бренд-правила:**
- ❌ Не використовуй emoji-стиль ілюстрації — застосунок premium, не дитячий
- ❌ Не роби надто яскравий чи неонова — тримайся темної космічної палітри
- ❌ Не додавай людей, обличчя, портретів — бренд про природу/космос, не про людей
- ❌ Не використовуй комічні шрифти (Comic Sans, Papyrus, etc.)
- ❌ Не клади UA-прапор великим — це не патріотичний застосунок, це wallpaper-додаток. Прапор живе в easter-egg-фразах, не на офіційному банері.

**Дрібниці:**
- ❌ Не роби текст ближче ніж 30 px до країв канвасу
- ❌ Не використовуй stock-фото з watermark'ами
- ❌ Не клади важливі елементи у нижні 60-80 px (Play Store overlays UI controls)

---

## 8. Стилістичні референси

Шукай натхнення у:
- **Apple App Store featured banners** — premium, мінімалізм, простір
- **Spotify Wrapped 2023** — gradient, типографіка, глибина
- **Linear app marketing** — clean, technical-yet-warm
- **Notion landing page** — спокій, ритм, soft shadows
- **Headspace banners** — wellness, breathing, gentle gradients

Уникай:
- Game banners (вибухи, неон, агресія)
- Утилітарні застосунки (Calculator, ToDo) — занадто стерильно
- Indie illustrative styles — не наш бренд

---

## 9. Deliverables (що очікується від виконавця)

1. **`feature-graphic.png`** — фінальний 1024×500 PNG, без альфа, sRGB
2. **`feature-graphic-en.png`** — той самий з англомовним слоганом (опційно якщо
   плануємо локалізовані версії)
3. **Source файл:** `.fig` (Figma) або `.psd` (Photoshop) — для майбутніх правок
4. **3 варіанти** на вибір (опційно, бажано)

---

## 10. AI-prompts (готові до paste)

> Для AI image generators. Кожен prompt згенерує background + composition.
> Текст «StellarShift» і слоган часто рендеряться помилково на цьому розмірі —
> тому **накладай типографіку поверх у Figma/Photoshop вручну**.

### Midjourney v6+ / Niji 6

```
Wide horizontal banner, dark cosmic gradient background flowing from
deep navy to rich purple, scattered tiny stars and dust particles, on
the left a subtle 3x2 grid of wallpaper thumbnails showing diverse
scenery (galaxy nebula, snowy mountain peak, ocean from above, neon
cyberpunk city, deep forest, abstract gradient art), each thumbnail
softly rounded, on the right side empty negative space for typography,
premium minimalist app store feature graphic, ambient, atmospheric,
high contrast, professional design, refined typography aesthetic
--ar 41:20 --no people, faces, text, watermarks, ui-elements, app-screenshots
--style raw --stylize 200
```

### Imagen 3 / Ideogram (better text rendering)

```
A premium wide banner image, 1024 by 500 pixels, dark cosmic gradient
background flowing diagonally from #0a0a1a in top-left corner to
#3a2a5e in bottom-right. Scattered fine stars give a subtle galaxy
texture. On the left third, six small rounded wallpaper thumbnail
tiles arranged in a 3x2 grid: a purple nebula, a snow-capped mountain,
an ocean wave from above, a pink-and-cyan cyberpunk skyline, a misty
forest path, an abstract aurora gradient. Each tile has soft inner
glow. The right two-thirds is mostly empty cosmic space, ready for
typography overlay. Style: refined, atmospheric, app-store premium,
inspired by Apple's hero imagery. No people, no faces, no text,
no UI elements, no watermarks, no logos.
```

### Leonardo.ai / FLUX.1

```
A 1024x500 horizontal banner. Background: smooth dark gradient,
deep navy blue transitioning to rich purple, with scattered tiny
star particles. Left third: a 3x2 grid of small rounded wallpaper
preview tiles, each showing a different aesthetic (cosmic nebula,
mountain peak, ocean aerial, cyberpunk neon city, forest path,
abstract gradient). Right two-thirds: empty atmospheric cosmic
space. Mood: premium, minimalist, ambient, app-store feature
quality. Negative prompt: text, letters, words, faces, people,
ui, app screenshot, watermark, logo, brand mark, low quality.
```

### Composition tweaks (post-AI):

Після генерації:
1. Open in Figma → import PNG as 1024×500 frame
2. Crop / position thumbnails якщо AI поклав їх криво
3. Add typography:
   - **StellarShift** — Inter ExtraBold 88px white, з position приблизно (560, 200)
   - Слоган — Inter Medium 28px white opacity 0.7, з position (560, 270)
4. Verify safe zone: всі важливі елементи в межах [25,25] до [999,475]
5. Export → PNG → 1024×500

---

## 11. Чек-лист перед фінальним export

- [ ] Розмір рівно 1024×500 px
- [ ] Без alpha-каналу (background фактично замазаний)
- [ ] Файл < 1 MB
- [ ] Текст «StellarShift» і слоган читаються (контраст ≥ 4.5:1 проти фону)
- [ ] Жодного UI-скріншоту, кнопок, watermark'ів
- [ ] Безпечна зона ≥ 25 px від країв
- [ ] Палітра в межах brand colors
- [ ] Тон — premium, спокійний, не корпоративний

---

## 12. Контакти

Питання, варіанти, ітерації — пиши на:
📧 sergholubchuk@gmail.com

Дедлайн: gentle, без тиску. Якість > швидкість.

---

*Створено: 2026-05-10 для StellarShift v3.7.3 Play Store launch*
