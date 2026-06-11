import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import { bumpSetWallpaperCount } from './rateApp';
import { trackDownload } from './unsplashTracking';

export type PoolItem = { id: string; url: string; downloadLocation?: string };
export type HistoryEntry = { id: string; url: string; small?: string; target: string; appliedAt: number; downloadLocation?: string };

const { WallpaperModule } = NativeModules;
const HISTORY_KEY = 'wallpaper_history';
const HISTORY_LIMIT = 20;

export const startWallpaperRotation = (
    pool: PoolItem[],
    intervalMinutes: number,
    target: string,
    wifiOnly: boolean,
    chargingOnly: boolean
): Promise<void> =>
    WallpaperModule.startRotation(JSON.stringify(pool), intervalMinutes, target, wifiOnly, chargingOnly);

export const setUnsplashKeyNative = (key: string): Promise<void> =>
    WallpaperModule.setUnsplashKey(key);

export const stopWallpaperRotation = (): Promise<void> =>
    WallpaperModule.stopRotation();

export const setWallpaperFromUrl = async (
    url: string,
    target: string,
    meta?: { id: string; small?: string; downloadLocation?: string }
): Promise<boolean> => {
    const result = await WallpaperModule.setFromUrl(url, target);
    if (meta) {
        await recordHistory({ id: meta.id, url, small: meta.small, target, appliedAt: Date.now(), downloadLocation: meta.downloadLocation });
        // Fire Unsplash download-tracking ping (required by API ToS for "use" events).
        if (meta.downloadLocation) trackDownload(meta.downloadLocation);
    }
    if (result) {
        // user-initiated setWallpaper → лічильник для rate prompt
        bumpSetWallpaperCount();
    }
    return result;
};

export const changeWallpaperNow = (): Promise<boolean> =>
    WallpaperModule.changeNow();

export const isIgnoringBatteryOptimization = (): Promise<boolean> =>
    WallpaperModule.isIgnoringBatteryOptimization();

export const requestIgnoreBatteryOptimization = (): Promise<void> =>
    WallpaperModule.requestIgnoreBatteryOptimization();

export type PendingAction = { id: string; url: string };

export const setNotificationsEnabledNative = (enabled: boolean): Promise<void> =>
    WallpaperModule.setNotificationsEnabled(enabled);

// Локалізовані рядки нотифікації-компаньйона: Kotlin читає їх з prefs.
// Викликати на mount Settings і при зміні мови.
export const setNotificationStrings = (s: {
    title: string; fav: string; block: string; next: string; favDone: string; channelName: string;
}): Promise<void> =>
    WallpaperModule.setNotificationStrings(s.title, s.fav, s.block, s.next, s.favDone, s.channelName);

// Дії з шторки (❤️/🚫), накопичені поки застосунок не відкривали.
export const drainPendingActions = async (): Promise<{ favorites: PendingAction[]; blocked: PendingAction[] }> => {
    try {
        const raw: string = await WallpaperModule.drainPendingActions();
        const parsed = JSON.parse(raw || '{}');
        return { favorites: parsed.favorites ?? [], blocked: parsed.blocked ?? [] };
    } catch {
        return { favorites: [], blocked: [] };
    }
};

export const getHistory = async (): Promise<HistoryEntry[]> => {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
};

/**
 * Зливає native-буфер (WorkManager-тіки + changeNow, пишуться в Kotlin)
 * у AsyncStorage-історію. Викликати перед getHistory() на focus екрана.
 * Після drain native-буфер порожній — AsyncStorage лишається єдиним
 * джерелом правди для відображення.
 */
export const syncNativeHistory = async (): Promise<void> => {
    try {
        const raw: string = await WallpaperModule.drainPendingHistory();
        const pending: { id: string; url: string; target: string; appliedAt: number }[] = JSON.parse(raw || '[]');
        if (pending.length === 0) return;
        const existing = await getHistory();
        // native-записи новіші за однаковим id → перезаписують; сортуємо за часом
        const byId = new Map<string, HistoryEntry>();
        for (const e of existing) byId.set(e.id, e);
        for (const p of pending) byId.set(p.id, { id: p.id, url: p.url, target: p.target, appliedAt: p.appliedAt });
        const merged = [...byId.values()]
            .sort((a, b) => b.appliedAt - a.appliedAt)
            .slice(0, HISTORY_LIMIT);
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
    } catch {
        // історія — best effort, не ламаємо екран
    }
};

export const recordHistory = async (entry: HistoryEntry): Promise<void> => {
    const existing = await getHistory();
    const filtered = existing.filter(e => e.id !== entry.id);
    const next = [entry, ...filtered].slice(0, HISTORY_LIMIT);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
};

export const clearHistory = async (): Promise<void> => {
    await AsyncStorage.removeItem(HISTORY_KEY);
};
