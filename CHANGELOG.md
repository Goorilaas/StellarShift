# Changelog

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
