---
layout: default
title: Privacy Policy — StellarShift
permalink: /privacy-en/
---

# StellarShift Privacy Policy

**Effective:** April 30, 2026
**App:** StellarShift (Android, package `com.gorilas.StellarShift`)
**Developer:** Serhii Holubchuk
**Contact:** [sergholubchuk@gmail.com](mailto:sergholubchuk@gmail.com)

[Українська версія]({{ '/privacy/' | relative_url }})

---

## 1. TL;DR

- StellarShift **does not create accounts**, **does not register you**, **shows no ads**, and **does not share personal data** with third parties for marketing.
- All your settings, favorites, and wallpaper history live **only on your device** (Android AsyncStorage). The developer holds no data about you on any server.
- The app talks to the Unsplash API to show its wallpaper catalog. Requests are anonymous (just by your IP) and are not tied to any personal information.
- If you allow it, the app sends anonymous crash reports through Sentry so that we can fix bugs.

---

## 2. What data the app processes

### 2.1. Data stored only on your device

Through `AsyncStorage` (Android local storage) we keep:

- the IDs of your favorite wallpapers and their thumbnails;
- auto-rotation settings (interval, target screen);
- the list of categories you've selected;
- the last 20 applied wallpapers as history (ID + URL + timestamp);
- the list of «hidden» wallpapers you don't want to see again;
- interface language (Ukrainian / English);
- a flag that you've completed onboarding;
- a counter of successful wallpaper applications (for the one-time Play Store rating prompt);
- your personal Unsplash API key, if you've added one (stored in clear text — don't put third-party keys here).

**This data is never sent to the developer.** It exists only while the app is installed and is wiped when you uninstall it or clear app data via system settings.

### 2.2. Network requests

The app makes network requests only to:

- **Unsplash API** (`api.unsplash.com`) — to fetch photo lists for your categories and search queries. The request only contains search text and the API key. Your name, email, or other personal data are not transmitted.
- **Unsplash CDN** (`images.unsplash.com`) — to download the actual images.
- **Unsplash Download tracking** — per Unsplash API ToS, when you apply / save / share a photo, we send a short «download» signal to an address provided by Unsplash itself. This is needed for photo author statistics.
- **Sentry** (`*.sentry.io`) — **only** if a DSN is configured in the build. In that case, on a crash we send a stack trace, app version, Android version, and an anonymous device identifier. We do **not** send AsyncStorage contents, your Unsplash key, your favorite photos, or any other personal data.

### 2.3. Data we do **not** collect

- name, email, phone, address;
- location, photos from your gallery, contacts, calendars, microphone, camera;
- your browsing history in other apps;
- advertising identifiers;
- your Google account.

---

## 3. Android permissions and why we need them

| Permission | Reason |
|---|---|
| `android.permission.SET_WALLPAPER` | To set the chosen image as your wallpaper (home screen / lock screen). |
| `android.permission.READ_MEDIA_IMAGES` | To save an image to your gallery **only at the moment** when you explicitly tap «Save». Access is not used to read, view, or scan any of your other photos. |
| `android.permission.INTERNET`, `ACCESS_NETWORK_STATE` | To download images from Unsplash. |
| Battery optimization exemption (optional) | So that automatic wallpaper rotation runs reliably in the background (especially on Samsung One UI). Requested only with your consent the first time you enable auto-change. |

You can revoke these permissions at any time via **Android Settings → Apps → StellarShift**.

---

## 4. Third parties

- **Unsplash** ([unsplash.com/privacy](https://unsplash.com/privacy)) — photo provider. On their side requests are logged according to their own policy.
- **Sentry** ([sentry.io/privacy](https://sentry.io/privacy)) — anonymous crash report processing, if configured.

We have no integrations with ad networks, behavioral analytics, or social platforms. No Facebook SDK, Google Analytics, AppsFlyer, etc.

---

## 5. Children

The app **is not targeted** at children under 13 and does not knowingly collect any data about them. If you are a parent and believe your child installed the app without your knowledge, you can simply uninstall it — nothing remains on the device that could identify the child.

---

## 6. Storage and deletion

Everything StellarShift stores lives **locally** on your device. To wipe it completely:

1. Android Settings → Apps → StellarShift → **Clear data** (all local storage is removed).
2. Or simply uninstall — Android removes the data with the app.

The developer holds no copy of your data on any server, so there is no separate «server-side deletion» request to make.

---

## 7. Security

- All network requests go over HTTPS.
- We do not pass your information to marketing services or ad networks.
- The BYO Unsplash key is currently stored in clear text in local `AsyncStorage`. Since this is your personal Unsplash developer key, the risk is contained to your device. A future version will add encryption.

---

## 8. Changes to this policy

If we ever make material changes (e.g. adding analytics or new integrations), we'll update this document and bump the «Effective» date at the top. Minor editorial fixes don't change the substance — please check back periodically.

---

## 9. Feedback

Questions, complaints, or deletion requests (if we ever do store something on a server — at the time of writing, we don't) — write to:

📧 [sergholubchuk@gmail.com](mailto:sergholubchuk@gmail.com)

I reply personally.

---

*Last updated: 2026-04-30 (for app version 3.7.2)*
