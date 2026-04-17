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
};
