# StellarShift — Play Store listing

> Цей файл — джерело істини для Play Console. Усі тексти готові до копіювання.
> Якщо щось редагуємо — редагуємо тут, потім переносимо в Console.

---

## 1. App name (max 30 chars)

| Locale | Назва | chars |
|---|---|---|
| Українська (uk) | `StellarShift` | 12 |
| English (en) | `StellarShift` | 12 |

Мінімалізм бренду — додаткові слова ускладнюють впізнаваність і виглядають менш upscale.

---

## 2. Short description (max 80 chars)

| Locale | Текст | chars |
|---|---|---|
| Українська | `Свіжі шпалери кожні 15 хвилин. Космос, природа — на ваш вибір.` | 62 |
| English | `Fresh wallpapers every 15 minutes. Space, nature — your call.` | 61 |

Це найважливіший текст у всьому листингу — видно одразу під назвою без розгортання.

---

## 3. Full description (max 4000 chars)

### Українська

```
🌌 Тисячі настроїв, що оновлюються самі.

StellarShift — це автоматична зміна шпалер, яка робить твій день іншим.
Поки ти спиш, чай заварюється, чи автобус везе на роботу — твій телефон
тихо підбирає нову HD-картинку зі всесвіту Unsplash. Без реклами,
без акаунтів, без зайвого галасу.


✨ ЩО ВМІЄ

• Автозміна шпалер за розкладом: 15 хвилин, година, день — на твій смак
• Десятки тисяч HD-фото з 20+ категорій: Космос, Природа,
  Кіберпанк, Архітектура, Океан, Мінімалізм, Ч/Б…
• Подвійний тап → у серце. Окремий екран Улюблених завжди під рукою
• Застосовуй на головний екран, локскрін або одразу обидва
• Збережи фото в галерею або поділись з друзями за два тапи
• Сховай фото яке не подобається — більше ніколи не з'явиться


🔋 РОЗУМНА АВТОЗМІНА

Працює у фоні через нативний WorkManager — чесно, надійно, без жертв
батареї. Можна обмежити зміну тільки коли є Wi-Fi або коли телефон
заряджається.


🔒 ПРИВАТНІСТЬ ЯК ВОНА Є

Жодних акаунтів. Жодного збору даних. Жодної реклами. Жодних трекерів.
Усі твої налаштування, обране й історія живуть тільки на твоєму
пристрої. Видалив застосунок — все зникло.


🎨 ВЛАСНИЙ КЛЮЧ UNSPLASH

Хочеш необмежено? Встав свій безкоштовний API-ключ Unsplash у налаштуваннях
і застосунок використає його замість загального. Це опційно — все
працює і без цього.


🌍 ДВІ МОВИ

Інтерфейс українською та англійською. Перемикається в один тап,
визначається автоматично при першому запуску.


💛 ВІД АВТОРА

StellarShift — це pet-проект, зроблений з душею в Україні. Якщо щось
ламається або є ідея — пиши на пошту з налаштувань.

Розроблено з Братаном 🤝
```

### English

```
🌌 A thousand moods, refreshing themselves.

StellarShift is an auto-rotating wallpaper app that makes every day
look different. While you sleep, your tea brews, or the bus rolls into
the office — your phone quietly picks a fresh HD shot from the Unsplash
universe. No ads, no sign-ups, no noise.


✨ WHAT IT DOES

• Auto-rotation on a schedule: 15 minutes, hourly, daily — your call
• Tens of thousands of HD photos across 20+ categories: Space, Nature,
  Cyberpunk, Architecture, Ocean, Minimal, B&W…
• Double-tap to favorite. A dedicated Favorites screen always one tap away
• Apply to home screen, lock screen, or both at once
• Save to gallery or share with friends in two taps
• Hide a photo you don't like — it'll never come back


🔋 BACKGROUND THAT RESPECTS YOUR BATTERY

Powered by native Android WorkManager — reliable, no battery drama.
You can limit rotation to Wi-Fi only, or to when the phone is charging.


🔒 PRIVACY, FOR REAL

No accounts. No data collection. No ads. No trackers. Every setting,
favorite, and history entry lives only on your device. Uninstall the
app — everything goes with it.


🎨 BRING YOUR OWN UNSPLASH KEY

Want unlimited? Drop your free Unsplash API key into settings and the
app will use yours instead of the shared one. Optional — works fine
without it.


🌍 TWO LANGUAGES

Interface in English and Ukrainian. One-tap switch, auto-detected on
first launch.


💛 FROM THE MAKER

StellarShift is a pet project, made with care in Ukraine. If something
breaks or you have an idea — drop a line via the email in settings.
```

---

## 4. Feature graphic (1024 × 500 px)

**Концепт A — «Розкладена сітка»**

Темно-космічний фон (gradient `#0a0a1a` → `#1a1a2e` → `#3a2a5e`). Зліва — невелика сітка з 4-6 wallpaper-thumbnail'ів (різні категорії: галактика, гори, океан, кіберпанк) із plus-1 «активною» в центрі сітки з підсвіткою #FFD700. Справа — назва **StellarShift** великим (Inter ExtraBold, 88px) + slogan «Тисячі настроїв, що оновлюються самі» / «A thousand moods, refreshing themselves» (Inter Medium, 28px, opacity 0.7) + dot-pagination внизу.

**Концепт B — «Phone mockup»**

Темний фон. По центру — реалістичний моковап Pixel/Samsung телефона під лeгким кутом, на екрані — одна epic HD wallpaper (космос або neon-кіберпанк). Над/під телефоном — «StellarShift» + slogan. По краях — кілька прозоро-затінених thumbnail'ів з інших wallpaper'ів, ніби «вилітають» з телефона.

**Що краще:** A — простіше зробити, читається одразу. B — продає краще, але треба якісний моковап.

**Інструменти:** Figma (безкоштовно), Canva, або згенерувати в Midjourney/Imagen промптом «Android phone mockup, dark cosmic gradient background, glowing space wallpaper on screen, minimalist, premium, 1024x500».

---

## 5. Screenshots (мінімум 4, рекомендовано 8)

Оптимальний набір (порядок важливий — перші 2-3 видно одразу в Play Store):

1. **Каталог з тегованими категоріями** (з підсвіченою активною). Підпис зверху: «Десятки тисяч HD-шпалер»
2. **Модалка перегляду фото** з кнопкою «Встановити». Підпис: «Один тап — одна шпалера»
3. **Settings → Автозміна** з включеним свічем + інтервал. Підпис: «Свіжа шпалера кожні 15 хвилин»
4. **Favorites** — заповнений сердечками. Підпис: «Улюблені завжди під рукою»
5. **Каталог з відкритим search** і пошуком «space». Підпис: «Шукай за настроєм»
6. **Settings → Сховані фото** manager. Підпис: «Те що не подобається — зникає назавжди»
7. **About-section** з easter egg (зірочки навколо логотипа). Підпис: «Зроблено з душею» 💛
8. **Onboarding slide 1** як hero-shot. Підпис: «Тисячі настроїв» / «A thousand moods»

**Формат:** Portrait 9:16 → 1080×1920 (або 1080×2400 для devices з вищим співвідношенням). Підписи робимо як окремий шар у Figma — НЕ скріним системний UI.

**Підказка:** першу версію скрінів можна зняти в emulator'і Pixel 8 (1080×2400) через `adb exec-out screencap -p > shot.png`.

---

## 6. Категоризація

| Поле | Значення |
|---|---|
| Category | Personalization |
| Tags | wallpapers, HD, auto-change, space |
| Content rating | Everyone (PEGI 3) — без насильства, наготи, азартних ігор. Anti-bigotry статусу не потребує. |
| Target audience | 13+ (через GDPR/COPPA-зручність, фактично all-ages) |
| Ads | No |
| In-app purchases | No (поки. v3.9.0 додасть Premium) |

---

## 7. Data Safety form (Play Console)

| Розділ | Що відповідати |
|---|---|
| Data collected | **App activity → App interactions** — анонімно, через Sentry, опційно |
| | **Device info → Crash logs** — через Sentry |
| | **Photos and videos** — НЕ збираємо. Зображення йдуть тільки в галерею юзера через системний API. |
| Data shared | **Crash logs** з Sentry (анонімно). Більше нічого. |
| Encryption in transit | Yes (HTTPS) |
| Data deletion request | Користувач може видалити дані просто видаливши застосунок або очистивши data в системних налаштуваннях. Серверних даних не існує. |

---

## 8. ASO keywords (для довідки)

**UA:** шпалери, hd шпалери, фото на телефон, космос, природа, автозміна, шпалери для android, шпалери щодня, фоновий малюнок

**EN:** wallpapers, hd wallpapers, auto wallpaper, space wallpaper, daily wallpaper, wallpaper changer, background, lock screen wallpaper

**Не пихаємо в title** (anti-pattern за Play Console rules), а розкидуємо органічно в short + full description.

---

## 9. Localization beyond UA + EN (на майбутнє)

Якщо буде сильний відгук — мови з найбільшим українським діаспоральним пенетром:
- 🇵🇱 PL — польська (Польща)
- 🇩🇪 DE — німецька
- 🇪🇸 ES — іспанська (LatAm великий)

Поки не пріоритет — тримаємо в IDEAS BANK у roadmap.

---

## 10. Чек-лист перед submission

- [ ] App name (12 chars) встановлено в обох locales
- [ ] Short description (UA + EN) встановлено
- [ ] Full description (UA + EN) встановлено
- [ ] Feature graphic 1024×500 завантажено
- [ ] 5+ скріншотів завантажено для phone (portrait 9:16)
- [ ] App icon уже на місці через `app.json` adaptive-icon
- [ ] Privacy Policy URL = `https://goorilaas.github.io/StellarShift/privacy/`
- [ ] Category = Personalization
- [ ] Content rating questionnaire пройдено → Everyone
- [ ] Data Safety form заповнений за п. 7
- [ ] Target audience = 13+
- [ ] Ads = No
- [ ] In-app purchases = No
- [ ] Data deletion contact email = sergholubchuk@gmail.com

---

*Створено: 2026-04-30 (v3.7.2)*
*Оновлюй перед кожною major публікацією. Тримай Play Console у синхроні з цим файлом.*
