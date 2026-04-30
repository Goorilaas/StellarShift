import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const COUNT_KEY = 'setwallpaper_count';
const PROMPTED_KEY = 'rate_prompted';
const THRESHOLD = 10;

/**
 * Викликати ПІСЛЯ кожного успішного user-initiated setWallpaper.
 * Background-rotation ticks (WorkManager) не рахуємо — це не момент задоволення.
 *
 * Коли лічильник досягає THRESHOLD і ми ще не питали — запускаємо
 * нативний in-app review prompt. Android/Google теж має свій throttle,
 * наш прапорець страхує що ми навіть не пробуємо двічі.
 */
export async function bumpSetWallpaperCount(): Promise<void> {
    try {
        const [countRaw, promptedRaw] = await Promise.all([
            AsyncStorage.getItem(COUNT_KEY),
            AsyncStorage.getItem(PROMPTED_KEY),
        ]);
        if (promptedRaw === '1') return;

        const count = (parseInt(countRaw ?? '0', 10) || 0) + 1;
        await AsyncStorage.setItem(COUNT_KEY, String(count));
        if (count < THRESHOLD) return;

        const available = await StoreReview.isAvailableAsync();
        if (!available) return;

        await StoreReview.requestReview();
        await AsyncStorage.setItem(PROMPTED_KEY, '1');
    } catch {
        // прозорий фейл — rate prompt не блокує жодного UX
    }
}
