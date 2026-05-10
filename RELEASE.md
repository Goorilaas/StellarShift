# Release keystore — інструкція

> **Це найважливіший файл у твоєму проекті після коду.**
> Втратиш keystore — назавжди втратиш можливість оновлювати StellarShift у Play Store.
> Google не зможе допомогти, навіть якщо попросиш. Усі юзери залишаться з "мертвою" версією.
> Тому до цього кроку ставимось серйозно: бекапи в трьох місцях, паролі в менеджері паролів.

---

## 1. Чому це one-shot рішення

Play Store ідентифікує застосунок за двома речами:
1. `applicationId` (`com.gorilas.StellarShift`)
2. **підписом APK/AAB** (тобто хешем твого keystore)

Якщо при наступному оновленні підпис не співпаде — Google Play відмовиться публікувати оновлення.

> 🛡 **Google Play Signing** (опційно при першій публікації) дає страхувальну сітку: ти віддаєш Google свій upload-key, а Google підписує реліз своїм власним app-key. Якщо втратиш upload-key, можеш запросити reset через Google Support. **Рекомендується ввімкнути Play App Signing у Play Console при першій публікації.**

---

## 2. Дві стратегії keystore при EAS Build

### A) EAS-managed (швидко, мінімум контролю) ⭐ для першого релізу

Expo генерує і зберігає keystore у себе. При першому `eas build --platform android --profile production` тобі запропонують створити новий keystore — погоджуйся.

Плюси:
- Нічого ручного.
- Експорт через `eas credentials` коли треба.

Мінуси:
- Live в чужій інфраструктурі (Expo).
- Якщо колись захочеш мігрувати на не-EAS workflow — треба експортувати окремим кроком.

### B) Self-managed (повний контроль) — для довгого horizon

Генеруєш сам, завантажуєш в EAS, тримаєш `.jks` файл у персональних бекапах.

---

## 3. Self-managed keystore — крок за кроком

### 3.1. Згенеруй keystore локально

PowerShell у будь-якій папці (НЕ в репо! Файл нікуди не комічу):

```powershell
keytool -genkeypair -v `
  -storetype PKCS12 `
  -keystore stellarshift-release.jks `
  -alias stellarshift `
  -keyalg RSA `
  -keysize 4096 `
  -validity 25000
```

`keytool` приходить з JDK. Якщо немає — постав через `winget install Microsoft.OpenJDK.21` або візьми Android Studio (там JDK вкладений).

Тебе спитає:
- **Keystore password** (1) — придумай довгий, збережи в Bitwarden одразу.
- **Key password** (2) — можеш зробити такий самий як keystore password (для PKCS12 вони збігаються).
- **First and last name** — твоє ім'я або «Serhii Holubchuk».
- Решта (org, city, country) — заповни як для StellarShift.

`-validity 25000` = ~68 років. Це має покривати весь життєвий цикл.

### 3.2. Перевір що keystore справний

```powershell
keytool -list -v -keystore stellarshift-release.jks -alias stellarshift
```

Має вивести SHA1, SHA256 fingerprints і expiration. Запиши SHA256 у нотатку — він знадобиться для Firebase / OAuth / inApp testing.

### 3.3. Завантаж keystore в EAS

```powershell
eas credentials
```

Інтерактивний майстер:
- Platform: **Android**
- Profile: **production**
- Action: **Set up a new keystore** → **Use my own existing keystore**
- Path: повний шлях до `stellarshift-release.jks`
- Keystore password: (1) з Bitwarden
- Key alias: `stellarshift`
- Key password: (2)

Після цього EAS використовує твій keystore при `eas build --platform android --profile production`.

---

## 4. Бекап (КРИТИЧНО)

Тримай keystore у **трьох незалежних місцях**:

1. **Локально на робочому ПК** — в окремій папці (наприклад `D:\secrets\stellarshift\`), НЕ в репо.
2. **Зашифрований архів у хмарі** — наприклад 7z з паролем у Google Drive / Dropbox, або просто в Bitwarden Send.
3. **Фізичний носій** — USB-flash у безпечному місці, або зашифрований розділ зовнішнього диска.

В Bitwarden окремим записом «StellarShift Release Keystore» збережи:
- keystore password
- key alias (`stellarshift`)
- key password (якщо відрізняється)
- SHA256 fingerprint
- посилання на хмарний бекап
- дата генерації

> ❌ **НІКОЛИ не комічай keystore у git.** `.gitignore` уже має правило `*.jks`/`*.keystore`? Якщо ні — додай:
> ```
> *.jks
> *.keystore
> google-services.json
> ```

---

## 5. Як отримати keystore назад з EAS (якщо локально втратив)

```powershell
eas credentials
```

→ Android → production → **Download keystore**.

EAS збереже його у тебе на ПК. **Це лайфлайн — поки EAS-credentials живуть, keystore не загублений.**

---

## 6. Production build — як виглядає типовий цикл

```powershell
# Bump version
# (вручну в app.json + package.json або через еxpo `npm version`)

eas build --platform android --profile production
# чекаємо ~10-15 хв, EAS повертає посилання на .aab

eas submit --platform android --latest
# завантажує .aab у Play Console (потрібен service account JSON)
```

Service account для `eas submit` — окрема історія, налаштуємо коли підемо в Phase 4 (LAUNCH 1, v3.8.0).

> ⚠️ **Source maps в Sentry.** R8/ProGuard увімкнений у v3.7.2 (`gradle.properties`).
> Це означає що JS stack traces у release будуть obfuscated. Перед першим production
> build встанови expo Sentry plugin + EAS pre-build hook для upload source maps:
> див. https://docs.expo.dev/guides/using-sentry/#source-maps. Без цього кроку
> Sentry-репорти з продакшену будуть нечитабельні.

---

## 7. Чек-лист перед першою публікацією

- [ ] Keystore згенеровано (`-keysize 4096`, `-validity 25000`).
- [ ] Keystore в EAS (`eas credentials` показує його під android/production).
- [ ] `.jks` файл існує у трьох незалежних місцях.
- [ ] Паролі в Bitwarden, з міткою «StellarShift».
- [ ] SHA256 fingerprint записаний (на майбутнє).
- [ ] Перший build пройшов: `eas build --platform android --profile production`.
- [ ] У Play Console при першій публікації увімкнено **Play App Signing** як страхувальну сітку.

---

## 8. Якщо щось пішло не так

| Проблема | Що робити |
|---|---|
| `keytool` не знайдено | Постав JDK: `winget install Microsoft.OpenJDK.21` |
| EAS просить пароль і він не підходить | Перевір що зберігав саме keystore-pwd, не key-pwd. Для PKCS12 вони мали бути однакові. |
| Втратив `.jks` локально, але EAS досі має | `eas credentials` → Download keystore. Кризи нема. |
| Втратив все: і `.jks`, і паролі, і EAS-credentials | Якщо ще не публікував — згенеруй новий, продовжуй. Якщо публікував і Play App Signing вимкнено → проект «помер», нова публікація буде новим застосунком з нуля. **Тому й потрібен Play App Signing.** |

---

*Створено: 2026-04-30 (v3.7.2)*
*Не редагуй цей файл після першого релізу — він стане історичним документом твого підпису.*
