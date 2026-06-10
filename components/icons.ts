// All UI icons as inline SVG strings for SvgXml
// viewBox 20x20, stroke-based, app color palette

export const ICON = {

  heartFilled: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 17S2.5 12 2.5 7c0-2.2 1.7-3.8 4-3.8 1.3 0 2.6.7 3.5 1.9C10.9 3.9 12.2 3.2 13.5 3.2c2.3 0 4 1.6 4 3.8C17.5 12 10 17 10 17z" fill="#ff4466" stroke="#ff4466" stroke-width="0.5" stroke-linejoin="round"/>
  </svg>`,

  heartOutline: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 17S2.5 12 2.5 7c0-2.2 1.7-3.8 4-3.8 1.3 0 2.6.7 3.5 1.9C10.9 3.9 12.2 3.2 13.5 3.2c2.3 0 4 1.6 4 3.8C17.5 12 10 17 10 17z" stroke="#aaa" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`,

  heartBroken: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 17S2.5 12 2.5 7c0-2.2 1.7-3.8 4-3.8 1.3 0 2.6.7 3.5 1.9" stroke="#cc3355" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M10 5l-1.2 2.8 2 1-2 3" stroke="#cc3355" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M10 5c.9-1.1 2.2-1.8 3.5-1.8 2.3 0 4 1.6 4 3.8C17.5 12 10 17 10 17" stroke="#cc3355" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  search: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8.5" cy="8.5" r="5" stroke="#7F77DD" stroke-width="1.5"/>
    <path d="M13 13L17 17" stroke="#7F77DD" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  wallpaper: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="16" height="13" rx="2" stroke="#fff" stroke-width="1.4"/>
    <circle cx="7" cy="8" r="1.5" stroke="#fff" stroke-width="1.2"/>
    <path d="M2 13.5l4-4 3 3 2.5-3L18 14" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  refresh: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.5 10A6.5 6.5 0 0015.5 14M16.5 10A6.5 6.5 0 004.5 6" stroke="#7F77DD" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M16.5 6l.5-3-3 .5" stroke="#7F77DD" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3.5 14l-.5 3 3-.5" stroke="#7F77DD" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  wifi: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.5 7.5a12 12 0 0117 0" stroke="#7F77DD" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M4.5 11a7.5 7.5 0 0111 0" stroke="#7F77DD" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M7.5 14.5a3.5 3.5 0 015 0" stroke="#7F77DD" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="10" cy="17.5" r="1.2" fill="#7F77DD"/>
  </svg>`,

  battery: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.5" y="7" width="14" height="6" rx="1.5" stroke="#7F77DD" stroke-width="1.4"/>
    <path d="M17 9v2" stroke="#7F77DD" stroke-width="2" stroke-linecap="round"/>
    <rect x="3.5" y="9" width="5.5" height="2" rx="0.5" fill="#7F77DD"/>
  </svg>`,

  lock: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="9" width="12" height="9" rx="2" stroke="#fff" stroke-width="1.4"/>
    <path d="M7 9V7a3 3 0 016 0v2" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="10" cy="14" r="1.5" fill="#fff"/>
  </svg>`,

  phone: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5.5" y="1.5" width="9" height="17" rx="2" stroke="#fff" stroke-width="1.4"/>
    <line x1="8" y1="4" x2="12" y2="4" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="10" cy="16.5" r="1" fill="#fff"/>
  </svg>`,

  both: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.1 4.1l1.4 1.4M14.5 14.5l1.4 1.4M4.1 15.9l1.4-1.4M14.5 5.5l1.4-1.4" stroke="#AFA9EC" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="10" cy="10" r="2.5" fill="#534AB7"/>
    <circle cx="10" cy="10" r="1" fill="#AFA9EC"/>
  </svg>`,

  gear: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="2.5" stroke="#fff" stroke-width="1.4"/>
    <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.4 4.4l1.4 1.4M14.2 14.2l1.4 1.4M4.4 15.6l1.4-1.4M14.2 5.8l1.4-1.4" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`,

  save: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 3v9M6 8.5l4 4 4-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3 14v2a1.5 1.5 0 001.5 1.5h11A1.5 1.5 0 0017 16v-2" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  share: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="5" cy="10" r="2" stroke="#fff" stroke-width="1.5"/>
    <circle cx="15" cy="4.5" r="2" stroke="#fff" stroke-width="1.5"/>
    <circle cx="15" cy="15.5" r="2" stroke="#fff" stroke-width="1.5"/>
    <path d="M6.8 9L13.2 5.5M6.8 11L13.2 14.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  trash: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.5 5.5h13M8 3h4M5 5.5l1 11.5a1.5 1.5 0 001.5 1.4h5a1.5 1.5 0 001.5-1.4l1-11.5" stroke="#cc3355" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8.5 9v6M11.5 9v6" stroke="#cc3355" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`,

  // Heart with white fill + purple stroke + glow — visible on будь-якому фоні
  heartGlow: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="hg" cx="50%" cy="45%" r="55%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
        <stop offset="70%" stop-color="#FFD9E8" stop-opacity="1"/>
        <stop offset="100%" stop-color="#AFA9EC" stop-opacity="0.95"/>
      </radialGradient>
    </defs>
    <path d="M12 21S2 14 2 7.5C2 4.5 4.3 2.5 7 2.5c1.7 0 3.4 1 5 3 1.6-2 3.3-3 5-3 2.7 0 5 2 5 5C22 14 12 21 12 21z" fill="url(#hg)" stroke="#7F77DD" stroke-width="1.4" stroke-linejoin="round"/>
  </svg>`,

  // Хаос — вогник для секретної категорії
  chaos: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1.5C8 1.5 4 4 4 8.5C4 11 6 13 8 13C10 13 12 11 12 8.5C12 7 11 6 11 6C11 6 10.5 7 9.5 7C9.5 4.5 8 1.5 8 1.5Z" fill="#EF9F27"/>
    <path d="M8 4.5C8 4.5 6 6.5 6 9C6 10.5 7 11.5 8 11.5C9 11.5 10 10.5 10 9C10 8 9.5 7.5 9.5 7.5C9.5 7.5 9 8 8.5 8C8.5 6.5 8 4.5 8 4.5Z" fill="#D4537E"/>
    <circle cx="8" cy="9.5" r="1.2" fill="#FFD9E8"/>
  </svg>`,

  // Зірочка-іскра для пасхалки
  sparkle: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 1 L11.5 8.5 L19 10 L11.5 11.5 L10 19 L8.5 11.5 L1 10 L8.5 8.5 Z" fill="#AFA9EC"/>
    <circle cx="10" cy="10" r="1.5" fill="#fff"/>
  </svg>`,

  // Прапор України — синь зверху, жовтий знизу, тонке темне обведення
  ukraineFlag: `<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="29" height="9.5" fill="#0057B7"/>
    <rect x="0.5" y="10" width="29" height="9.5" fill="#FFD700"/>
    <rect x="0.5" y="0.5" width="29" height="19" fill="none" stroke="#1a1a3e" stroke-width="1"/>
  </svg>`,

  // Падаюча зірка — для "Загадай бажання"
  shootingStar: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 18 L9 11" stroke="#AFA9EC" stroke-width="1.4" stroke-linecap="round" opacity="0.5"/>
    <path d="M4 17 L8 13" stroke="#AFA9EC" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
    <path d="M13 3 L14.2 7 L18 8 L14.2 9 L13 13 L11.8 9 L8 8 L11.8 7 Z" fill="#FFD700" stroke="#FFA500" stroke-width="0.5" stroke-linejoin="round"/>
    <circle cx="13" cy="8" r="0.8" fill="#fff"/>
  </svg>`,

  // Сонце
  sun: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="3.5" fill="#FFD700" stroke="#FFA500" stroke-width="0.8"/>
    <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.4 4.4l1.4 1.4M14.2 14.2l1.4 1.4M4.4 15.6l1.4-1.4M14.2 5.8l1.4-1.4" stroke="#FFD700" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,

  // Дві зорі
  starsTwo: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2.5 L7 6 L10.5 6.8 L7 7.6 L6 11 L5 7.6 L1.5 6.8 L5 6 Z" fill="#AFA9EC"/>
    <path d="M14 9 L14.8 11.5 L17.5 12 L14.8 12.5 L14 15 L13.2 12.5 L10.5 12 L13.2 11.5 Z" fill="#7F77DD"/>
    <circle cx="6" cy="6.8" r="0.6" fill="#fff"/>
  </svg>`,

  // Орбіта (кільце з планетою)
  orbit: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="10" cy="10" rx="8" ry="4" stroke="#7F77DD" stroke-width="1.2" transform="rotate(-25 10 10)"/>
    <circle cx="10" cy="10" r="2.5" fill="#534AB7"/>
    <circle cx="10" cy="10" r="1" fill="#AFA9EC"/>
    <circle cx="16" cy="6" r="1.2" fill="#FFD700"/>
  </svg>`,

  // Конюшина 4-листна — удача
  clover: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 10 C10 6 7 3 5 5 C3 3 1 6 3 8 C1 9 2 12 5 11 C5 13 8 13 10 10 Z" fill="#2EBE85" stroke="#0a4d3a" stroke-width="0.5" stroke-linejoin="round"/>
    <path d="M10 10 C10 6 13 3 15 5 C17 3 19 6 17 8 C19 9 18 12 15 11 C15 13 12 13 10 10 Z" fill="#2EBE85" stroke="#0a4d3a" stroke-width="0.5" stroke-linejoin="round"/>
    <path d="M10 10 C10 14 7 17 5 15 C3 17 1 14 3 12 C1 11 2 8 5 9 C5 7 8 7 10 10 Z" fill="#1D9E75" stroke="#0a4d3a" stroke-width="0.5" stroke-linejoin="round"/>
    <path d="M10 10 C10 14 13 17 15 15 C17 17 19 14 17 12 C19 11 18 8 15 9 C15 7 12 7 10 10 Z" fill="#1D9E75" stroke="#0a4d3a" stroke-width="0.5" stroke-linejoin="round"/>
    <circle cx="10" cy="10" r="0.9" fill="#FFD700"/>
    <path d="M10 12 Q11 16 13 19" stroke="#0a4d3a" stroke-width="1" stroke-linecap="round" fill="none"/>
  </svg>`,

  // Корона — головний герой
  crown: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 7 L5 12 L10 5 L15 12 L18 7 L17 15 L3 15 Z" fill="#FFD700" stroke="#FFA500" stroke-width="1" stroke-linejoin="round"/>
    <circle cx="2" cy="7" r="1" fill="#AFA9EC"/>
    <circle cx="10" cy="5" r="1" fill="#ff4466"/>
    <circle cx="18" cy="7" r="1" fill="#AFA9EC"/>
  </svg>`,

  // Лампочка — ідея/яскравий
  lightbulb: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 2 C6.5 2 4 4.5 4 8 C4 10 5 11.5 6.5 12.5 L6.5 14 L13.5 14 L13.5 12.5 C15 11.5 16 10 16 8 C16 4.5 13.5 2 10 2 Z" fill="#FFD700" stroke="#FFA500" stroke-width="1" stroke-linejoin="round"/>
    <rect x="7" y="14.5" width="6" height="2" rx="0.5" fill="#888"/>
    <rect x="7.8" y="17" width="4.4" height="1.5" rx="0.5" fill="#666"/>
    <path d="M8 6 L9 9 L11 9 L12 6" stroke="#FFA500" stroke-width="0.8" stroke-linecap="round" fill="none"/>
  </svg>`,

  // Шпилька — закріплена категорія в каталозі (рендериться ~10px на чіпі)
  pin: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="13" cy="7" r="3.6" fill="#FFD700" stroke="#FFA500" stroke-width="0.8"/>
    <path d="M10.4 9.6 L4 16" stroke="#AFA9EC" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,

  // "Не показувати" — око з рискою, viewBox 20x20 (як save/share)
  blocked: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.5 10 C3.5 6 6.5 4.2 10 4.2 C13.5 4.2 16.5 6 18.5 10 C16.5 14 13.5 15.8 10 15.8 C6.5 15.8 3.5 14 1.5 10 Z" fill="none" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="10" cy="10" r="2.5" fill="#fff"/>
    <line x1="2.5" y1="17.5" x2="17.5" y2="2.5" stroke="#cc3355" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`,

  galaxy: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="30" fill="#0a0a1a" stroke="#1a1a3e" stroke-width="1.5"/>
    <circle cx="15" cy="15" r="1" fill="#aaa" opacity="0.7"/>
    <circle cx="49" cy="13" r="0.8" fill="#9988ee" opacity="0.8"/>
    <circle cx="9" cy="38" r="0.7" fill="#fff" opacity="0.5"/>
    <circle cx="54" cy="42" r="1" fill="#7766dd" opacity="0.7"/>
    <circle cx="28" cy="55" r="0.7" fill="#aaa" opacity="0.5"/>
    <circle cx="55" cy="27" r="0.6" fill="#fff" opacity="0.5"/>
    <circle cx="12" cy="48" r="0.8" fill="#cc99ff" opacity="0.5"/>
    <path d="M32 32 Q40 20 50 27 Q60 36 50 48 Q40 56 32 52 Q18 44 16 32 Q16 14 28 9 Q44 2 50 14" fill="none" stroke="#534AB7" stroke-width="1.6" opacity="0.9" stroke-linecap="round"/>
    <path d="M32 32 Q24 44 14 37 Q6 28 12 16 Q22 6 32 11 Q48 20 50 32 Q50 52 36 58 Q18 62 10 50" fill="none" stroke="#7F77DD" stroke-width="1" opacity="0.35" stroke-linecap="round"/>
    <circle cx="32" cy="32" r="8" fill="#1a1050" opacity="0.8"/>
    <circle cx="32" cy="32" r="5.5" fill="#534AB7" opacity="0.95"/>
    <circle cx="32" cy="32" r="2.8" fill="#AFA9EC"/>
    <circle cx="32" cy="32" r="1.2" fill="white"/>
  </svg>`,

  // ── Soul wave (v3.7.5) — нові blessing-іконки ──

  // Зоряний пил — розсип частинок по діагоналі
  stardust: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="5" cy="6" r="1.1" fill="#FFD700"/><circle cx="9" cy="4" r="0.7" fill="#AFA9EC"/>
    <circle cx="13" cy="7" r="0.9" fill="#7F77DD"/><circle cx="7" cy="10" r="0.6" fill="#fff"/>
    <circle cx="11" cy="11" r="1.2" fill="#FFD700"/><circle cx="15" cy="12" r="0.7" fill="#AFA9EC"/>
    <circle cx="6" cy="14" r="0.8" fill="#7F77DD"/><circle cx="10" cy="15" r="0.6" fill="#fff"/>
    <circle cx="14" cy="16" r="0.9" fill="#FFD700"/>
  </svg>`,

  // Місяць-колиска тримає зірку — "Всесвіт тримає тобі місце"
  moonCradle: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 3 A7 7 0 1 0 11 17 A5.5 5.5 0 1 1 11 3 Z" fill="#7F77DD"/>
    <path d="M13 8 L13.7 10 L15.7 10.3 L13.7 10.6 L13 12.6 L12.3 10.6 L10.3 10.3 L12.3 10 Z" fill="#FFD700"/>
  </svg>`,

  // Маяк — концентричні дуги світла назовні
  beacon: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="2" fill="#FFD700"/><circle cx="10" cy="10" r="1" fill="#fff"/>
    <path d="M10 4 A6 6 0 0 1 16 10" stroke="#FFD700" stroke-width="1.1" stroke-linecap="round" opacity="0.7"/>
    <path d="M10 1 A9 9 0 0 1 19 10" stroke="#AFA9EC" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
    <path d="M10 16 A6 6 0 0 1 4 10" stroke="#FFD700" stroke-width="1.1" stroke-linecap="round" opacity="0.7"/>
    <path d="M10 19 A9 9 0 0 1 1 10" stroke="#AFA9EC" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
  </svg>`,

  // Щит із зіркою — "Всесвіт за тебе"
  cosmicShield: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 2 L17 5 V10 C17 14.5 13.5 17.5 10 18.5 C6.5 17.5 3 14.5 3 10 V5 Z" fill="#534AB7" stroke="#7F77DD" stroke-width="1" stroke-linejoin="round"/>
    <path d="M10 6.5 L11 9 L13.5 9.3 L11.6 11 L12.1 13.5 L10 12.2 L7.9 13.5 L8.4 11 L6.5 9.3 L9 9 Z" fill="#FFD700"/>
  </svg>`,

  // Пунктирна стежка до зірки — "ближче до мрії"
  pathToStar: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 17 L7 13 L10 14 L14 8" stroke="#7F77DD" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="0.2 2.2" opacity="0.85"/>
    <circle cx="3" cy="17" r="1" fill="#AFA9EC"/>
    <path d="M15 3 L16 6 L19 6.5 L16.7 8.3 L17.3 11 L15 9.5 L12.7 11 L13.3 8.3 L11 6.5 L14 6 Z" fill="#FFD700"/>
  </svg>`,

  // Орбіта з сердечком — "орбіта лагідна"
  gentleOrbit: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="10" cy="10" rx="8" ry="3.8" stroke="#7F77DD" stroke-width="1.1" transform="rotate(-20 10 10)" opacity="0.9"/>
    <path d="M15.5 6.2 C15.5 5.3 14.2 5 14 6 C13.8 5 12.5 5.3 12.5 6.2 C12.5 7.1 14 8 14 8 C14 8 15.5 7.1 15.5 6.2 Z" fill="#cc3355"/>
    <circle cx="10" cy="10" r="1.6" fill="#534AB7"/>
  </svg>`,

  // Сузір'я — з'єднані зорі
  constellation: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 5 L8 8 L13 4 L17 9 L11 13 L6 11" stroke="#7F77DD" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
    <circle cx="3" cy="5" r="1.1" fill="#AFA9EC"/><circle cx="8" cy="8" r="0.9" fill="#fff"/>
    <circle cx="13" cy="4" r="1.2" fill="#FFD700"/><circle cx="17" cy="9" r="1" fill="#AFA9EC"/>
    <circle cx="11" cy="13" r="1.3" fill="#FFD700"/><circle cx="6" cy="11" r="0.9" fill="#7F77DD"/>
  </svg>`,

  // Місяць над тихою водою — "тиша і світло"
  stillness: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3 A6 6 0 1 0 12 13 A4.7 4.7 0 1 1 12 3 Z" fill="#AFA9EC"/>
    <line x1="3" y1="16" x2="17" y2="16" stroke="#7F77DD" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
    <line x1="5" y1="18.2" x2="15" y2="18.2" stroke="#7F77DD" stroke-width="0.8" stroke-linecap="round" opacity="0.4"/>
  </svg>`,

  // Зірка-годинник — "зорі звіряють час по тобі"
  starClock: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="11.5" r="6" stroke="#7F77DD" stroke-width="1.1" fill="#1a1050"/>
    <path d="M10 11.5 L10 8.5" stroke="#fff" stroke-width="1" stroke-linecap="round"/>
    <path d="M10 11.5 L12.5 12.5" stroke="#FFD700" stroke-width="1" stroke-linecap="round"/>
    <path d="M10 1 L10.8 3.2 L13 3.5 L11.2 5 L11.7 7.2 L10 6 L8.3 7.2 L8.8 5 L7 3.5 L9.2 3.2 Z" fill="#FFD700"/>
  </svg>`,

  // Кругова стрілка + блиск — "добро повертається"
  goodReturns: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 7 A7 7 0 1 0 17 11.5" stroke="#1D9E75" stroke-width="1.4" stroke-linecap="round" fill="none"/>
    <path d="M15.6 2.8 L16.6 7 L12.6 6 Z" fill="#1D9E75"/>
    <path d="M10 7 L10.8 9.2 L13 10 L10.8 10.8 L10 13 L9.2 10.8 L7 10 L9.2 9.2 Z" fill="#FFD700"/>
  </svg>`,

  // Зірка з сердечком — "зірка вболіває за тебе"
  rootingStar: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 2 L10.6 6.5 L15.5 6.8 L11.7 9.8 L13 14.5 L9 11.8 L5 14.5 L6.3 9.8 L2.5 6.8 L7.4 6.5 Z" fill="#FFD700" stroke="#FFA500" stroke-width="0.6" stroke-linejoin="round"/>
    <path d="M15.5 13 C15.5 12 14 11.7 14 12.8 C14 11.7 12.5 12 12.5 13 C12.5 14 14 15.2 14 15.2 C14 15.2 15.5 14 15.5 13 Z" fill="#cc3355"/>
  </svg>`,

  // Призма розкладає світло — "ти згинаєш світло"
  prism: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 4 L13 15 L1 15 Z" fill="#1a1050" stroke="#AFA9EC" stroke-width="1" stroke-linejoin="round"/>
    <path d="M2 8 L7 9.5" stroke="#fff" stroke-width="1.1" stroke-linecap="round"/>
    <path d="M11 10 L19 8.5" stroke="#cc3355" stroke-width="0.9" stroke-linecap="round"/>
    <path d="M11.3 11 L19 11" stroke="#FFD700" stroke-width="0.9" stroke-linecap="round"/>
    <path d="M11.5 12 L19 13.5" stroke="#1D9E75" stroke-width="0.9" stroke-linecap="round"/>
    <path d="M11.7 13 L18.5 15.5" stroke="#7F77DD" stroke-width="0.9" stroke-linecap="round"/>
  </svg>`,

  // Сонце на орбіті — "сьогодні твоя орбіта"
  dayOrbit: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="10" cy="10" rx="8.5" ry="3.5" stroke="#7F77DD" stroke-width="1" transform="rotate(-18 10 10)" opacity="0.8"/>
    <circle cx="10" cy="10" r="3" fill="#FFD700" stroke="#FFA500" stroke-width="0.7"/>
    <path d="M10 4.5v-2M10 17.5v-2M3.5 10h-2M18.5 10h-2" stroke="#FFD700" stroke-width="1.3" stroke-linecap="round"/>
    <circle cx="2.5" cy="8" r="1" fill="#AFA9EC"/>
  </svg>`,
};
