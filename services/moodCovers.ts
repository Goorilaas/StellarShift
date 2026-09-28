import AsyncStorage from '@react-native-async-storage/async-storage';
import { Mood } from '../components/collections';
import { getCollectionMeta } from './collectionService';

// Диск-кеш обкладинок настроїв: { moodId → [cover URLs] }. Дозволяє шафл і
// миттєвий показ між сесіями. Наповнюється: Фаза 1 (перша обкладинка) + органічно
// при браузингу деталей (mergeMoodCovers з metas, які там і так тягнуться).
const KEY = 'mood_covers';
const EARTH_MOVE_KEY = 'mood_covers_earth_move_4015';
let memo: Record<string, string[]> | null = null;

export const loadCoversMap = async (): Promise<Record<string, string[]>> => {
    if (memo) return memo;
    try {
        const raw = await AsyncStorage.getItem(KEY);
        const map: Record<string, string[]> = raw ? JSON.parse(raw) : {};
        if (await AsyncStorage.getItem(EARTH_MOVE_KEY) !== 'done') {
            // Старі URL не містять ID колекцій: прибираємо лише кеш космічного настрою.
            delete map.milkyway;
            try {
                await AsyncStorage.setItem(KEY, JSON.stringify(map));
                await AsyncStorage.setItem(EARTH_MOVE_KEY, 'done');
            } catch { /* Повторимо міграцію після перезапуску; поточний екран уже без старих URL. */ }
        }
        memo = map;
    } catch {
        memo = {};
    }
    return memo!;
};

// Додати обкладинки в кеш настрою (унікалізуємо). No-op, якщо нічого нового.
export const mergeMoodCovers = async (moodId: string, covers: string[]): Promise<void> => {
    if (covers.length === 0) return;
    const map = await loadCoversMap();
    const prev = map[moodId] ?? [];
    const merged = Array.from(new Set([...prev, ...covers]));
    if (merged.length === prev.length) return;
    map[moodId] = merged;
    try { await AsyncStorage.setItem(KEY, JSON.stringify(map)); } catch { /* best-effort */ }
};

// Фаза 1: обкладинка першої колекції настрою (1 запит). Кешуємо й повертаємо.
export const fetchFirstCover = async (mood: Mood): Promise<string | null> => {
    const firstId = mood.collectionIds[0];
    if (!firstId) return null;
    const meta = await getCollectionMeta(firstId);
    if (meta?.cover) {
        await mergeMoodCovers(mood.id, [meta.cover]);
        return meta.cover;
    }
    return null;
};
