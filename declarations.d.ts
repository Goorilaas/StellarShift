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
            stopRotation(): Promise<void>;
            setFromUrl(url: string, target: string): Promise<boolean>;
            setUnsplashKey(key: string): Promise<void>;
            changeNow(): Promise<boolean>;
            drainPendingHistory(): Promise<string>;
            setSleepHours(enabled: boolean, startMin: number, endMin: number): Promise<void>;
            setNotificationsEnabled(enabled: boolean): Promise<void>;
            setNotificationStrings(title: string, fav: string, block: string, next: string, favDone: string, channelName: string): Promise<void>;
            drainPendingActions(): Promise<string>;
            isIgnoringBatteryOptimization(): Promise<boolean>;
            requestIgnoreBatteryOptimization(): Promise<void>;
        };
    }
}
