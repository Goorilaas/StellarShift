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
            isIgnoringBatteryOptimization(): Promise<boolean>;
            requestIgnoreBatteryOptimization(): Promise<void>;
        };
    }
}
