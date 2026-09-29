import AsyncStorage from '@react-native-async-storage/async-storage';

// Порядок показу не змінює склад колекцій, закладки чи ротацію.
export function reconcileOrder(ids: readonly string[], saved: readonly string[]): string[] {
    const available = new Set(ids);
    return [...new Set([...saved.filter(id => available.has(id)), ...ids])];
}

export function moveItem(ids: readonly string[], from: number, to: number): string[] {
    const next = [...ids];
    if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id);
    return next;
}

export async function readCollectionOrder(scope: string): Promise<string[]> {
    const raw = await AsyncStorage.getItem(`collection_order_v1:${scope}`);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every(id => typeof id === 'string')) throw new Error('Invalid collection order');
    return value;
}

export async function saveCollectionOrder(scope: string, ids: readonly string[]): Promise<void> {
    await AsyncStorage.setItem(`collection_order_v1:${scope}`, JSON.stringify([...new Set(ids)]));
}
