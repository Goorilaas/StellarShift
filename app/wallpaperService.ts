import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

export type PoolItem = { id: string; url: string };
export type HistoryEntry = { id: string; url: string; small?: string; target: string; appliedAt: number };

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

export const stopWallpaperRotation = (): Promise<void> =>
    WallpaperModule.stopRotation();

export const setWallpaperFromUrl = async (
    url: string,
    target: string,
    meta?: { id: string; small?: string }
): Promise<boolean> => {
    const result = await WallpaperModule.setFromUrl(url, target);
    if (meta) {
        await recordHistory({ id: meta.id, url, small: meta.small, target, appliedAt: Date.now() });
    }
    return result;
};

export const changeWallpaperNow = (): Promise<boolean> =>
    WallpaperModule.changeNow();

export const isIgnoringBatteryOptimization = (): Promise<boolean> =>
    WallpaperModule.isIgnoringBatteryOptimization();

export const requestIgnoreBatteryOptimization = (): Promise<void> =>
    WallpaperModule.requestIgnoreBatteryOptimization();

export const getHistory = async (): Promise<HistoryEntry[]> => {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
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
