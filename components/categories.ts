export type Photo = {
    id: string;
    urls: { small: string; full: string; regular: string };
    links?: { html?: string; download?: string; download_location?: string };
    user: { name: string; username: string; profile_image?: { small: string; medium?: string; large?: string }; links?: { html?: string } };
    description?: string;
    alt_description?: string;
    tags?: { title: string }[];
};

export type Category = {
    id: string;
    label: string;
    labelKey?: string;
    query: string;
    icon: string;
    excludePeople?: boolean;
};

const PEOPLE_TAGS = ['person', 'people', 'human', 'man', 'woman', 'girl', 'boy', 'face', 'portrait', 'model', 'selfie'];

export function filterNoPeople<T extends Photo>(photos: T[]): T[] {
    return photos.filter(p => {
        const haystack = [
            ...(p.tags ?? []).map(t => t.title.toLowerCase()),
            (p.alt_description ?? '').toLowerCase(),
            (p.description ?? '').toLowerCase(),
        ].join(' ');
        return !PEOPLE_TAGS.some(t => haystack.includes(t));
    });
}

// Demo Unsplash Access Key. Production: read from .env (EXPO_PUBLIC_UNSPLASH_KEY).
// Hardcoded fallback тут лишається на час перехідного періоду — щоб додаток не вмер
// у юзерів, які оновляться без .env (вони через BYO key все одно ставлять свій).
//
// TODO(v3.8.0): ВИДАЛИТИ ХАРДКОДЕД FALLBACK після Unsplash production approval.
//   Інакше якщо .env поламається у юзера, додаток мовчки повернеться на shared demo →
//   ліміт 50 req/h розпиляється на всіх юзерів → масовий 403. Замінити рядок на:
//   export const UNSPLASH_KEY = process.env.EXPO_PUBLIC_UNSPLASH_KEY ?? '';
//   Якщо ключ порожній — `unsplashKey.ts` уже коректно тригерить BYO dialog.
export const UNSPLASH_KEY = process.env.EXPO_PUBLIC_UNSPLASH_KEY ?? 'iSQX5zC1pV52N6iXfn8SMajIdHJoR4J7SqNX67hEahI';

// Порядок: Мікс — особлива категорія, завжди перша.
// Решта — за українським алфавітом по label (автосортування через localeCompare).
const _CATEGORIES_RAW = [
    { id: 'mix', labelKey: 'categories.mix', label: 'Мікс', query: '', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" fill="#AFA9EC"/><circle cx="8" cy="8" r="6" fill="none" stroke="#534AB7" stroke-width="1" stroke-dasharray="2 2"/><circle cx="8" cy="2" r="1" fill="#7F77DD"/><circle cx="14" cy="5" r="0.8" fill="#AFA9EC"/><circle cx="2" cy="11" r="1" fill="#7F77DD"/><circle cx="13" cy="12" r="0.7" fill="#AFA9EC"/></svg>` },
    { id: 'abstract', labelKey: 'categories.abstract', label: 'Абстракції', query: 'abstract art geometric pattern colorful', excludePeople: true, icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="5" cy="5" r="3.5" fill="#D4537E" opacity="0.85"/><rect x="7" y="7" width="6" height="6" rx="0.5" fill="#7F77DD" opacity="0.85" transform="rotate(15 10 10)"/><path d="M2,12 L6,15 L0,15 Z" fill="#EF9F27" opacity="0.85"/><circle cx="12" cy="4" r="1.5" fill="#FFD9E8"/><line x1="0" y1="8" x2="16" y2="6" stroke="#534AB7" stroke-width="0.6" opacity="0.7"/></svg>` },
    { id: 'anime', labelKey: 'categories.anime', label: 'Аніме', query: 'anime art illustration manga drawing', excludePeople: true, icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="9" r="5" fill="#FFD9E8"/><path d="M3,7 Q3,3 6,3 Q5,5 4.5,7 Z" fill="#7F77DD"/><path d="M13,7 Q13,3 10,3 Q11,5 11.5,7 Z" fill="#7F77DD"/><ellipse cx="6" cy="9" rx="0.9" ry="1.4" fill="#534AB7"/><ellipse cx="10" cy="9" rx="0.9" ry="1.4" fill="#534AB7"/><circle cx="6.2" cy="8.7" r="0.3" fill="white"/><circle cx="10.2" cy="8.7" r="0.3" fill="white"/><path d="M7,12 Q8,12.5 9,12" stroke="#D4537E" stroke-width="0.6" fill="none" stroke-linecap="round"/></svg>` },
    { id: 'mountains', labelKey: 'categories.mountains', label: 'Гори', query: 'mountains peaks', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="0" y="0" width="16" height="10" fill="#BA7517" opacity="0.25"/><circle cx="8" cy="9" r="3.5" fill="#EF9F27" opacity="0.4"/><path d="M0,16 L2,8 L5,12 L8,6 L11,10 L14,7 L16,9 L16,16 Z" fill="#185FA5" opacity="0.3"/><path d="M0,16 L3,10 L5,13 L8,5 L11,9 L13,7 L16,10 L16,16 Z" fill="#2C2C2A" opacity="0.85"/><path d="M8,5 L10,8.5 L6,8.5 Z" fill="white" opacity="0.85"/><path d="M13,7 L14.5,9.5 L11.5,9.5 Z" fill="white" opacity="0.5"/><path d="M6,8.5 L10,8.5" stroke="#EF9F27" stroke-width="0.4" opacity="0.6"/></svg>` },
    { id: 'food', labelKey: 'categories.food', label: 'Їжа', query: 'food drink aesthetic', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><line x1="5" y1="2" x2="5" y2="14" stroke="#EF9F27" stroke-width="1.3" stroke-linecap="round"/><path d="M3,2 L3,6 Q3,8 5,8 Q7,8 7,6 L7,2" fill="none" stroke="#EF9F27" stroke-width="1.3" stroke-linecap="round"/><line x1="11" y1="2" x2="11" y2="14" stroke="#BA7517" stroke-width="1.3" stroke-linecap="round"/><path d="M9,2 Q9,5 11,6" fill="none" stroke="#BA7517" stroke-width="1.3" stroke-linecap="round"/><path d="M13,2 Q13,5 11,6" fill="none" stroke="#BA7517" stroke-width="1.3" stroke-linecap="round"/></svg>` },
    { id: 'flowers', labelKey: 'categories.flowers', label: 'Квіти', query: 'flowers bloom', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><line x1="8" y1="8" x2="8" y2="15" stroke="#3B6D11" stroke-width="1"/><path d="M5,12 Q7,11 8,12" stroke="#3B6D11" stroke-width="0.8" fill="none"/><circle cx="8" cy="5" r="2" fill="#FFD9E8"/><circle cx="5" cy="7" r="2" fill="#FFD9E8"/><circle cx="11" cy="7" r="2" fill="#FFD9E8"/><circle cx="6.5" cy="9.5" r="2" fill="#FFD9E8"/><circle cx="9.5" cy="9.5" r="2" fill="#FFD9E8"/><circle cx="8" cy="7.5" r="1.3" fill="#EF9F27"/></svg>` },
    { id: 'cyberpunk', labelKey: 'categories.cyberpunk', label: 'Кіберпанк', query: 'cyberpunk neon cityscape skyline night architecture', excludePeople: true, icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="0" y="0" width="16" height="16" fill="#0a0a1a"/><rect x="2" y="6" width="2" height="9" fill="#D4537E" opacity="0.85"/><rect x="5" y="3" width="2" height="12" fill="#7F77DD" opacity="0.9"/><rect x="8" y="5" width="2" height="10" fill="#D4537E" opacity="0.85"/><rect x="11" y="2" width="2" height="13" fill="#378ADD" opacity="0.9"/><rect x="2.3" y="7" width="0.5" height="0.5" fill="#FFD9E8"/><rect x="5.3" y="5" width="0.5" height="0.5" fill="#FFD9E8"/><rect x="8.3" y="6" width="0.5" height="0.5" fill="#FFD9E8"/><rect x="11.3" y="4" width="0.5" height="0.5" fill="#FFD9E8"/><rect x="0" y="14.5" width="16" height="0.5" fill="#D4537E" opacity="0.5"/></svg>` },
    { id: 'space', labelKey: 'categories.space', label: 'Космос', query: 'space galaxy stars', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#0a0a1a"/><ellipse cx="7" cy="8" rx="5" ry="3" fill="#4433aa" opacity="0.4" transform="rotate(-20 7 8)"/><ellipse cx="9" cy="8" rx="4" ry="2" fill="#aa2266" opacity="0.3" transform="rotate(15 9 8)"/><path d="M8,8 Q10,6 12,7 Q13,9 11,11 Q9,12 8,10 Q6,8 7,6 Q9,4 11,5" fill="none" stroke="#7F77DD" stroke-width="0.8" stroke-linecap="round"/><circle cx="3" cy="3" r="0.7" fill="white" opacity="0.9"/><circle cx="13" cy="4" r="0.5" fill="white" opacity="0.7"/><circle cx="2" cy="11" r="0.6" fill="#AFA9EC" opacity="0.8"/><circle cx="8" cy="8" r="1.2" fill="#AFA9EC"/><circle cx="8" cy="8" r="0.5" fill="white"/></svg>` },
    { id: 'nature', labelKey: 'categories.nature', label: 'Природа', query: 'nature landscape wildlife meadow', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="7" y="10" width="2" height="5" rx="1" fill="#3B6D11"/><circle cx="8" cy="7" r="5" fill="#639922" opacity="0.8"/><circle cx="5" cy="9" r="3" fill="#97C459" opacity="0.7"/><circle cx="11" cy="9" r="3" fill="#3B6D11" opacity="0.7"/><circle cx="8" cy="5" r="3" fill="#97C459" opacity="0.6"/><ellipse cx="12" cy="5" rx="1" ry="1.3" fill="#BA7517" opacity="0.8"/><rect x="11.5" y="3.5" width="1" height="0.8" rx="0.3" fill="#3B6D11"/></svg>` },
    { id: 'animals', labelKey: 'categories.animals', label: 'Тварини', query: 'wildlife animals', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3,8 Q1,3 4,2 Q5,5 6,7" fill="#EF9F27" opacity="0.9"/><path d="M13,8 Q15,3 12,2 Q11,5 10,7" fill="#EF9F27" opacity="0.9"/><path d="M3.5,7 Q2,4 4,3 Q4.5,5 5.5,6.5" fill="#D4537E" opacity="0.5"/><path d="M12.5,7 Q14,4 12,3 Q11.5,5 10.5,6.5" fill="#D4537E" opacity="0.5"/><ellipse cx="8" cy="10" rx="4" ry="3.5" fill="#EF9F27" opacity="0.9"/><ellipse cx="8" cy="11.5" rx="2" ry="1.5" fill="#BA7517" opacity="0.4"/><ellipse cx="8" cy="11" rx="0.7" ry="0.5" fill="#333"/><circle cx="6.2" cy="9.5" r="0.9" fill="#1a0a00"/><circle cx="9.8" cy="9.5" r="0.9" fill="#1a0a00"/><circle cx="6.5" cy="9.2" r="0.3" fill="white"/><circle cx="10.1" cy="9.2" r="0.3" fill="white"/></svg>` },
    { id: 'cities', labelKey: 'categories.cities', label: 'Міста', query: 'city skyline urban street downtown', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="1.5" rx="0.5" fill="#D4537E" opacity="0.9"/><rect x="2" y="6.5" width="12" height="1" rx="0.3" fill="#D4537E" opacity="0.7"/><rect x="3" y="4" width="1.5" height="11" rx="0.5" fill="#99223c" opacity="0.85"/><rect x="11.5" y="4" width="1.5" height="11" rx="0.5" fill="#99223c" opacity="0.85"/><circle cx="8" cy="2.5" r="1.5" fill="#EF9F27" opacity="0.9"/><circle cx="8" cy="2.5" r="0.7" fill="#fff" opacity="0.6"/><rect x="0" y="14.5" width="16" height="1" fill="#99223c" opacity="0.3"/></svg>` },
    { id: 'ocean', labelKey: 'categories.ocean', label: 'Океан', query: 'ocean sea waves', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="0" y="0" width="16" height="16" rx="1" fill="#185FA5" opacity="0.1"/><circle cx="13" cy="3" r="1.8" fill="#EF9F27" opacity="0.7"/><path d="M0,10 Q4,8 8,10 Q12,12 16,10 L16,16 L0,16 Z" fill="#185FA5" opacity="0.6"/><path d="M0,12 Q4,10 8,12 Q12,14 16,12" fill="none" stroke="#378ADD" stroke-width="0.5" opacity="0.5"/><path d="M3,16 L3,11 Q4,10 5,11 L5,16 Z" fill="#444441" opacity="0.8"/><rect x="3.5" y="5" width="1" height="6" fill="#D3D1C7" opacity="0.9"/><path d="M3,5 L5,5 L4.5,3.5 L3.5,3.5 Z" fill="#D4537E" opacity="0.9"/><path d="M4,4 L14,7" stroke="#EF9F27" stroke-width="0.5" opacity="0.4" stroke-linecap="round"/><path d="M4,4 L13,3" stroke="#EF9F27" stroke-width="0.5" opacity="0.3" stroke-linecap="round"/><rect x="3.5" y="6.5" width="1" height="0.5" fill="#D4537E" opacity="0.6"/><rect x="3.5" y="8" width="1" height="0.5" fill="#D4537E" opacity="0.6"/></svg>` },
    { id: 'minimal', labelKey: 'categories.minimal', label: 'Мінімалізм', query: 'minimalism abstract', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1,13 Q4,12 8,13 Q12,14 15,13" fill="none" stroke="#B5D4F4" stroke-width="0.5" opacity="0.5"/><path d="M1,14.5 Q4,13.5 8,14.5 Q12,15.5 15,14.5" fill="none" stroke="#B5D4F4" stroke-width="0.5" opacity="0.3"/><ellipse cx="8" cy="13" rx="3.5" ry="1" fill="#444441" opacity="0.7"/><ellipse cx="8" cy="11.5" rx="2.5" ry="0.9" fill="#5F5E5A" opacity="0.8"/><ellipse cx="8" cy="10.2" rx="2" ry="0.8" fill="#444441" opacity="0.7"/><ellipse cx="8" cy="9.1" rx="1.5" ry="0.7" fill="#5F5E5A" opacity="0.8"/><ellipse cx="8" cy="8.1" rx="1.1" ry="0.6" fill="#444441" opacity="0.7"/><ellipse cx="8" cy="7.3" rx="0.8" ry="0.5" fill="#5F5E5A" opacity="0.8"/><circle cx="13" cy="5" r="2" fill="#EF9F27" opacity="0.5"/></svg>` },
    { id: 'seasons', labelKey: 'categories.seasons', label: 'Сезони', query: 'autumn winter spring summer season landscape', excludePeople: true, icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="5" cy="5" r="2.5" fill="#EF9F27" opacity="0.9"/><line x1="11" y1="3" x2="11" y2="13" stroke="#378ADD" stroke-width="1.2" stroke-linecap="round"/><line x1="8.5" y1="5.5" x2="13.5" y2="10.5" stroke="#378ADD" stroke-width="1" stroke-linecap="round" opacity="0.7"/><line x1="8.5" y1="10.5" x2="13.5" y2="5.5" stroke="#378ADD" stroke-width="1" stroke-linecap="round" opacity="0.7"/><line x1="9" y1="8" x2="13" y2="8" stroke="#378ADD" stroke-width="1" stroke-linecap="round" opacity="0.7"/></svg>` },
    { id: 'bw', labelKey: 'categories.bw', label: 'Ч/Б', query: 'black white monochrome photography portrait street', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" fill="#2C2C2A"/><path d="M8,2 A6,6 0 0,1 8,14 Z" fill="#D3D1C7"/><circle cx="8" cy="5" r="1.5" fill="#D3D1C7"/><circle cx="8" cy="11" r="1.5" fill="#2C2C2A" stroke="#D3D1C7" stroke-width="0.5"/></svg>` },
    { id: 'cars', labelKey: 'categories.cars', label: 'Транспорт', query: 'cars motorcycles supercars vehicles', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2,11 L2,8 Q2,7 3,7 L4,5 Q4.3,4 5.5,4 L10.5,4 Q11.7,4 12,5 L13,7 Q14,7 14,8 L14,11 Z" fill="#D4537E" opacity="0.9"/><rect x="4.5" y="5.5" width="3" height="1.7" rx="0.3" fill="#B5D4F4" opacity="0.8"/><rect x="8.5" y="5.5" width="3" height="1.7" rx="0.3" fill="#B5D4F4" opacity="0.8"/><circle cx="4.5" cy="11.5" r="1.5" fill="#1a1a1a"/><circle cx="11.5" cy="11.5" r="1.5" fill="#1a1a1a"/><circle cx="4.5" cy="11.5" r="0.6" fill="#888"/><circle cx="11.5" cy="11.5" r="0.6" fill="#888"/></svg>` },
    { id: 'yachts', labelKey: 'categories.yachts', label: 'Яхти', query: 'yacht sailing ocean luxury travel', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M0,12 Q4,11 8,12 Q12,13 16,12 L14.5,15 L1.5,15 Z" fill="#185FA5" opacity="0.85"/><path d="M0,13.5 Q4,12.5 8,13.5 Q12,14.5 16,13.5" fill="none" stroke="#378ADD" stroke-width="0.5" opacity="0.6"/><line x1="8" y1="2" x2="8" y2="11.5" stroke="#D3D1C7" stroke-width="0.7"/><path d="M8,2 L13,10 L8,10 Z" fill="#D3D1C7" opacity="0.95"/><path d="M8,3 L4,10 L8,10 Z" fill="#B5D4F4" opacity="0.85"/><circle cx="13.5" cy="3" r="1.3" fill="#EF9F27" opacity="0.85"/></svg>` },
    { id: 'architecture', labelKey: 'categories.architecture', label: 'Архітектура', query: 'architecture facade interior modern design building', excludePeople: true, icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2,15 L2,7 L8,3 L14,7 L14,15 Z" fill="#5F5E5A" opacity="0.9"/><path d="M2,7 L8,3 L14,7" stroke="#2C2C2A" stroke-width="0.6" fill="none"/><rect x="3.5" y="9" width="1.8" height="3" fill="#B5D4F4" opacity="0.85"/><rect x="6.6" y="9" width="1.8" height="3" fill="#B5D4F4" opacity="0.85"/><rect x="9.7" y="9" width="1.8" height="3" fill="#B5D4F4" opacity="0.85"/><rect x="6.5" y="12.5" width="3" height="2.5" fill="#2C2C2A"/></svg>` },
    { id: 'forest', labelKey: 'categories.forest', label: 'Ліс', query: 'forest woods trees canopy woodland deep green', excludePeople: true, icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.5,12 L5,7.5 L7.5,12 Z" fill="#3B6D11"/><path d="M2.5,9.5 L5,5 L7.5,9.5 Z" fill="#639922"/><path d="M2.5,7 L5,2.5 L7.5,7 Z" fill="#97C459"/><rect x="4.6" y="11.5" width="0.8" height="3" fill="#BA7517"/><path d="M8.5,13 L11,9 L13.5,13 Z" fill="#3B6D11"/><path d="M8.5,10.5 L11,6.5 L13.5,10.5 Z" fill="#639922"/><rect x="10.6" y="12.5" width="0.8" height="2.5" fill="#BA7517"/></svg>` },
    { id: 'travel', labelKey: 'categories.travel', label: 'Мандри', query: 'travel destinations landmarks tourism backpack', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="6" width="10" height="9" rx="1.5" fill="#BA7517" opacity="0.95"/><path d="M6,6 L6,3.5 Q6,2.5 7,2.5 L9,2.5 Q10,2.5 10,3.5 L10,6" stroke="#5F5E5A" stroke-width="1" fill="none"/><line x1="3" y1="10" x2="13" y2="10" stroke="#2C2C2A" stroke-width="0.6"/><rect x="10.5" y="7" width="1.5" height="1.2" fill="#EF9F27"/><circle cx="8" cy="12.5" r="0.6" fill="#2C2C2A"/></svg>` },
    { id: 'mist', labelKey: 'categories.mist', label: 'Туман', query: 'mist fog foggy haze atmospheric', excludePeople: true, icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1,4 Q4,3 8,4 Q12,5 15,4" stroke="#B5D4F4" stroke-width="1.3" fill="none" stroke-linecap="round" opacity="0.65"/><path d="M1,7 Q5,6 9,7 Q13,8 15,7" stroke="#D3D1C7" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.9"/><path d="M1,10 Q4,9 8,10 Q12,11 15,10" stroke="#B5D4F4" stroke-width="1.3" fill="none" stroke-linecap="round" opacity="0.7"/><path d="M2,13 Q6,12.5 10,13 Q13,13.5 15,13" stroke="#D3D1C7" stroke-width="1.1" fill="none" stroke-linecap="round" opacity="0.55"/></svg>` },
    { id: 'noir', labelKey: 'categories.noir', label: 'Нуар', query: 'dark moody cinematic shadows atmospheric', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="0" y="0" width="16" height="16" rx="1" fill="#0a0a1a"/><circle cx="6" cy="6" r="4" fill="#D3D1C7" opacity="0.95"/><circle cx="8" cy="5" r="3.5" fill="#0a0a1a"/><circle cx="2" cy="2.5" r="0.4" fill="#D3D1C7" opacity="0.6"/><circle cx="13" cy="3" r="0.3" fill="#D3D1C7" opacity="0.5"/><circle cx="11.5" cy="11" r="0.3" fill="#D3D1C7" opacity="0.4"/><path d="M0,12 L16,12 L16,16 L0,16 Z" fill="#2C2C2A" opacity="0.7"/></svg>` },
    { id: 'rain', labelKey: 'categories.rain', label: 'Дощ', query: 'rain rainy storm raindrops wet street', excludePeople: true, icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="5" rx="6" ry="2.3" fill="#5F5E5A" opacity="0.9"/><circle cx="5" cy="4.5" r="2" fill="#5F5E5A" opacity="0.9"/><circle cx="11" cy="4.5" r="2" fill="#5F5E5A" opacity="0.9"/><line x1="4" y1="9" x2="3" y2="12.5" stroke="#378ADD" stroke-width="1.1" stroke-linecap="round"/><line x1="7" y1="9" x2="6" y2="14" stroke="#378ADD" stroke-width="1.1" stroke-linecap="round"/><line x1="10" y1="9" x2="9" y2="12.5" stroke="#378ADD" stroke-width="1.1" stroke-linecap="round"/><line x1="12.5" y1="9" x2="11.5" y2="14" stroke="#378ADD" stroke-width="1.1" stroke-linecap="round"/></svg>` },
    { id: 'rural', labelKey: 'categories.rural', label: 'Сільське', query: 'rural countryside village farm cottage field', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2,8 L8,3 L14,8 L14,14 L2,14 Z" fill="#BA7517" opacity="0.95"/><path d="M2,8 L8,3 L14,8" stroke="#2C2C2A" stroke-width="0.6" fill="none"/><rect x="6.5" y="9.5" width="3" height="4.5" fill="#3B6D11" opacity="0.9"/><rect x="3.5" y="9.5" width="2" height="2" fill="#FFD700" opacity="0.85"/><rect x="10.5" y="9.5" width="2" height="2" fill="#FFD700" opacity="0.85"/><line x1="0" y1="14" x2="16" y2="14" stroke="#639922" stroke-width="1.5"/></svg>` },
];

export const CATEGORIES = [
    ..._CATEGORIES_RAW.filter(c => c.id === 'mix'),
    ..._CATEGORIES_RAW
        .filter(c => c.id !== 'mix')
        .sort((a, b) => a.label.localeCompare(b.label, 'uk')),
];

// Прихована категорія — розблоковується через пасхалку (7 тапів по лого).
// Не входить в CATEGORIES за замовчуванням; додається в каталог тільки
// якщо AsyncStorage 'easter_unlocked' === 'true'. Запит підбирається
// випадково з CHAOS_QUERIES при кожному завантаженні.
export const CHAOS_CATEGORY: Category = {
    id: 'chaos',
    labelKey: 'categories.chaos',
    label: 'Хаос',
    query: '', // динамічний
    excludePeople: true,
    icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5C8 1.5 4 4 4 8.5C4 11 6 13 8 13C10 13 12 11 12 8.5C12 7 11 6 11 6C11 6 10.5 7 9.5 7C9.5 4.5 8 1.5 8 1.5Z" fill="#EF9F27"/><path d="M8 4.5C8 4.5 6 6.5 6 9C6 10.5 7 11.5 8 11.5C9 11.5 10 10.5 10 9C10 8 9.5 7.5 9.5 7.5C9.5 7.5 9 8 8.5 8C8.5 6.5 8 4.5 8 4.5Z" fill="#D4537E"/><circle cx="8" cy="9.5" r="1.2" fill="#FFD9E8"/></svg>`,
};

// Спецкатегорія — фото з AsyncStorage `favorites_data`. Не йде в Unsplash,
// працює офлайн. Інжектиться в settings categoryList/mixCategoryList,
// але НЕ в catalog (там окремий /favorites таб).
export const FAVORITES_CATEGORY: Category = {
    id: 'favorites',
    labelKey: 'categories.favorites',
    label: 'Улюблені',
    query: '', // не використовується — пул береться з AsyncStorage
    icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 14s-5-3.2-5-7.5A3 3 0 0 1 8 4a3 3 0 0 1 5 2.5C13 10.8 8 14 8 14z" fill="#cc3355" stroke="#FFD9E8" stroke-width="0.6"/></svg>`,
};

// Запити для прихованої категорії «Хаос». Цілимось у візуальний chaos:
// глічі, фрактали, ліминальні простори, eldritch horror, аналогова жуть,
// дзеркальна симетрія. Не використовуємо одинокі слова на кшталт
// "psychedelic" або "surreal dreamscape" — Unsplash повертає на них
// канабіс / банальні дерева відповідно.
export const CHAOS_QUERIES = [
    'glitch art digital corruption',
    'fractal abstract dark',
    'liminal space empty backrooms',
    'analog horror static distortion',
    'lovecraftian eldritch dark',
    'liquid chrome iridescent abstract',
    'vaporwave neon retro grid',
    'kaleidoscope symmetry abstract',
    'data moshing pixel corruption',
    'occult esoteric symbol dark',
    'feverdream surreal abstract',
    'cosmic void dread abstract',
    'broken shattered glass abstract',
    'holographic iridescent metal abstract',
    'crystal cave surreal abstract',
    'glowing fractal pattern abstract',
    'cyberdelic neon pink abstract',
    'noise static analog texture',
];