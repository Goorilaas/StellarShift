import AsyncStorage from '@react-native-async-storage/async-storage';

export function normalizeCollectionName(value: string): string {
    const name = value.trim();
    if (!name || /[\r\n]/.test(value) || Array.from(name).length > 40) throw new Error('Invalid name');
    return name;
}
export async function readCollectionNames(keys: string[]): Promise<Record<string, string>> {
    const entries = await Promise.all(keys.map(async key => {
        const value = await AsyncStorage.getItem(`collection_name_v1:${key}`);
        return [key, value === null ? undefined : normalizeCollectionName(value)] as const;
    }));
    return Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry[1] !== undefined));
}
export async function saveCollectionName(key: string, value: string): Promise<string> {
    const name = normalizeCollectionName(value);
    await AsyncStorage.setItem(`collection_name_v1:${key}`, name);
    return name;
}
const collator = new Intl.Collator('uk', { sensitivity: 'base', numeric: true });
const group = (value: string) => /^[А-ЯІЇЄҐа-яіїєґ]/u.test(value) ? 0 : /^[A-Za-z]/.test(value) ? 1 : 2;
export function alphabeticIds(ids: readonly string[], names: Record<string, string>): string[] {
    return [...ids].sort((a, b) => {
        const left = names[a], right = names[b];
        // Unknown API titles stay at the end until their metadata becomes available.
        if (!left || !right) return left ? -1 : right ? 1 : 0;
        return group(left) - group(right) || collator.compare(left, right);
    });
}
