import { NativeModules } from 'react-native';

export type PoolItem = { id: string; url: string };

const { WallpaperModule } = NativeModules;

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

export const setWallpaperFromUrl = (url: string, target: string): Promise<boolean> =>
    WallpaperModule.setFromUrl(url, target);

export const changeWallpaperNow = (): Promise<boolean> =>
    WallpaperModule.changeNow();

export const isIgnoringBatteryOptimization = (): Promise<boolean> =>
    WallpaperModule.isIgnoringBatteryOptimization();

export const requestIgnoreBatteryOptimization = (): Promise<void> =>
    WallpaperModule.requestIgnoreBatteryOptimization();
