import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import uk from './locales/uk.json';

export const SUPPORTED_LANGS = ['uk', 'en'] as const;
export type Lang = typeof SUPPORTED_LANGS[number];
const STORAGE_KEY = 'app_language';

function detectDeviceLang(): Lang {
    try {
        const locale = new Intl.DateTimeFormat().resolvedOptions().locale ?? 'en';
        const base = locale.toLowerCase().split(/[-_]/)[0];
        if (base === 'uk' || base === 'ru') return 'uk';
        return 'en';
    } catch {
        return 'en';
    }
}

export async function initI18n(): Promise<Lang> {
    let lang: Lang;
    try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        lang = (saved === 'uk' || saved === 'en') ? saved : detectDeviceLang();
    } catch {
        lang = detectDeviceLang();
    }
    await i18n
        .use(initReactI18next)
        .init({
            resources: {
                en: { translation: en },
                uk: { translation: uk },
            },
            lng: lang,
            fallbackLng: 'en',
            interpolation: { escapeValue: false },
            returnNull: false,
        });
    return lang;
}

export async function setAppLanguage(lang: Lang): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
    await i18n.changeLanguage(lang);
}

export function getAppLanguage(): Lang {
    const cur = (i18n.language ?? 'en').toLowerCase().split(/[-_]/)[0];
    return cur === 'uk' ? 'uk' : 'en';
}

export default i18n;
