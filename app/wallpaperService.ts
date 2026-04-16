import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as FileSystem from 'expo-file-system/legacy';
import * as TaskManager from 'expo-task-manager';
import ManageWallpaper, { TYPE } from 'react-native-manage-wallpaper';

export const WALLPAPER_TASK = 'BACKGROUND_WALLPAPER_UPDATE';

// Отримати наступне фото з пулу
const getNextPhoto = async (): Promise<string | null> => {
    try {
        const poolStr = await AsyncStorage.getItem('wallpaper_pool');
        const indexStr = await AsyncStorage.getItem('wallpaper_pool_index');
        if (!poolStr) return null;

        const pool: { id: string; url: string }[] = JSON.parse(poolStr);
        const index = indexStr ? parseInt(indexStr) : 0;

        const photo = pool[index % pool.length];
        await AsyncStorage.setItem('wallpaper_pool_index', String((index + 1) % pool.length));

        return photo.url;
    } catch {
        return null;
    }
};

// Завантажити фото і встановити як шпалери
const applyWallpaper = async (url: string, target: string) => {
    const dest = FileSystem.cacheDirectory + `wallpaper_${Date.now()}.jpg`;
    const { uri } = await FileSystem.downloadAsync(url, dest);

    const type =
        target === 'lock' ? TYPE.lock :
            target === 'home' ? TYPE.home :
                TYPE.both;

    await new Promise((resolve, reject) => {
        ManageWallpaper.setWallpaper({ uri }, (res: any) => {
            if (res.status === 'success') resolve(res);
            else reject(new Error(res.msg));
        }, type);
    });
};

// Реєструємо фонове завдання
TaskManager.defineTask(WALLPAPER_TASK, async () => {
    try {
        const settingsStr = await AsyncStorage.getItem('settings');
        if (!settingsStr) return BackgroundFetch.BackgroundFetchResult.NoData;

        const settings = JSON.parse(settingsStr);
        if (!settings.autoChange) return BackgroundFetch.BackgroundFetchResult.NoData;

        const url = await getNextPhoto();
        if (!url) return BackgroundFetch.BackgroundFetchResult.NoData;

        await applyWallpaper(url, settings.applyTo);

        return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch {
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

// Запустити автозміну
export const startWallpaperRotation = async (intervalMinutes: number) => {
    try {
        await BackgroundFetch.registerTaskAsync(WALLPAPER_TASK, {
            minimumInterval: intervalMinutes * 60,
            stopOnTerminate: false,
            startOnBoot: true,
        });
        console.log('✅ Автозміна запущена');
    } catch (e) {
        console.log('Помилка запуску:', e);
    }
};

// Зупинити автозміну
export const stopWallpaperRotation = async () => {
    try {
        await BackgroundFetch.unregisterTaskAsync(WALLPAPER_TASK);
        console.log('⏹ Автозміна зупинена');
    } catch (e) {
        console.log('Помилка зупинки:', e);
    }
};

// Змінити шпалери прямо зараз
export const changeWallpaperNow = async () => {
    try {
        const settingsStr = await AsyncStorage.getItem('settings');
        const settings = settingsStr ? JSON.parse(settingsStr) : { applyTo: 'both' };

        const url = await getNextPhoto();
        if (!url) {
            throw new Error('Пул фото порожній');
        }

        await applyWallpaper(url, settings.applyTo);
        return true;
    } catch (e) {
        console.log('Помилка зміни шпалер:', e);
        return false;
    }
};