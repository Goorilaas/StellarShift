import AsyncStorage from '@react-native-async-storage/async-storage';

// Дві незалежні множини ID колекцій (Spotify-аналогія):
//   bookmarks — полиця збережених («Мої колекції»), пасивна.
//   active    — у ротації: годують пул шпалер (1 чи багато → об'єднання).
const BM_KEY = 'collection_bookmarks';
const ACT_KEY = 'collection_active';

const read = async (key: string): Promise<string[]> => {
    try {
        const raw = await AsyncStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
};

const toggle = async (key: string, id: string): Promise<string[]> => {
    const cur = await read(key);
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    await AsyncStorage.setItem(key, JSON.stringify(next));
    return next;
};

export const getBookmarkedCollections = (): Promise<string[]> => read(BM_KEY);
export const getActiveCollections = (): Promise<string[]> => read(ACT_KEY);
export const toggleBookmarkCollection = (id: string): Promise<string[]> => toggle(BM_KEY, id);
export const toggleActiveCollection = (id: string): Promise<string[]> => toggle(ACT_KEY, id);
