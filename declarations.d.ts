import 'react-native';

declare module 'react-native' {
    interface NativeModulesStatic {
        WallpaperModule: {
            startRotation(
                poolJson: string,
                intervalMinutes: number,
                target: string,
                wifiOnly: boolean,
                chargingOnly: boolean
            ): Promise<void>;
            updateRotationSettings(intervalMinutes: number, target: string): Promise<boolean>;
            stopRotation(): Promise<void>;
            setFromUrl(url: string, target: string): Promise<boolean>;
            setUnsplashKey(key: string): Promise<void>;
            setPoolRecipe(recipeJson: string): Promise<void>;
            setActiveCollections(json: string): Promise<void>;
            refreshPool(): Promise<boolean>;
            changeNow(): Promise<boolean>;
            drainPendingHistory(): Promise<string>;
            setSleepHours(enabled: boolean, startMin: number, endMin: number): Promise<void>;
            isLiveWallpaperActive(): Promise<boolean>;
            openLiveWallpaperPicker(): Promise<void>;
            disableLiveWallpaper(): Promise<boolean>;
            setLiveIntensity(px: number): Promise<void>;
            setNotificationsEnabled(enabled: boolean): Promise<void>;
            setNotificationStrings(title: string, fav: string, block: string, next: string, favDone: string, channelName: string): Promise<void>;
            drainPendingActions(): Promise<string>;
            getBlockedPhotos(legacyJson: string): Promise<string>;
            mutateBlockedPhotos(operation: string, photosJson: string): Promise<string>;
            isIgnoringBatteryOptimization(): Promise<boolean>;
            requestIgnoreBatteryOptimization(): Promise<void>;
        };
    }
}
