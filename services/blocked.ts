import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'blocked_photos';

export type BlockedPhoto = { id: string; small: string };

export async function getBlocked(): Promise<BlockedPhoto[]> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((p: any) => p?.id);
    } catch {
        return [];
    }
}

export async function getBlockedIds(): Promise<Set<string>> {
    const list = await getBlocked();
    return new Set(list.map(p => p.id));
}

export async function blockPhoto(p: BlockedPhoto): Promise<void> {
    const list = await getBlocked();
    if (list.some(x => x.id === p.id)) return;
    const next = [...list, { id: p.id, small: p.small }];
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function unblockPhoto(id: string): Promise<void> {
    const list = await getBlocked();
    const next = list.filter(p => p.id !== id);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function clearBlocked(): Promise<void> {
    await AsyncStorage.removeItem(KEY);
}

export async function setBlockedAll(list: BlockedPhoto[]): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function isBlocked(id: string): Promise<boolean> {
    const ids = await getBlockedIds();
    return ids.has(id);
}
