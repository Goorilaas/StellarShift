import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

const KEY = 'blocked_photos';
const { WallpaperModule } = NativeModules;
const listeners = new Set<() => void>();
let migration: Promise<void> | undefined;

export type BlockedPhoto = { id: string; small: string };

function ensureMigrated(): Promise<void> {
    if (!migration) {
        migration = (async () => {
            const raw = await AsyncStorage.getItem(KEY);
            let legacy: BlockedPhoto[] = [];
            try {
                const parsed = JSON.parse(raw || '[]');
                if (Array.isArray(parsed)) legacy = parsed.filter(p => typeof p?.id === 'string' && p.id);
            } catch { /* Старий пошкоджений JSON не блокує native-список. */ }
            await WallpaperModule.getBlockedPhotos(JSON.stringify(legacy));
        })().catch(error => { migration = undefined; throw error; });
    }
    return migration;
}

export async function getBlocked(): Promise<BlockedPhoto[]> {
    await ensureMigrated();
    return JSON.parse(await WallpaperModule.getBlockedPhotos('[]'));
}

export async function getBlockedIds(): Promise<Set<string>> {
    const list = await getBlocked();
    return new Set(list.map(p => p.id));
}

export async function blockPhoto(p: BlockedPhoto): Promise<void> {
    await mutate('add', [p]);
}

export async function unblockPhoto(id: string): Promise<void> {
    await mutate('remove', [{ id, small: '' }]);
}

export async function clearBlocked(): Promise<BlockedPhoto[]> {
    return mutate('clear', []);
}

export async function restoreBlocked(list: BlockedPhoto[]): Promise<void> {
    await mutate('add', list);
}

async function mutate(operation: string, list: BlockedPhoto[]): Promise<BlockedPhoto[]> {
    await ensureMigrated();
    const result = JSON.parse(await WallpaperModule.mutateBlockedPhotos(operation, JSON.stringify(list)));
    listeners.forEach(listener => listener());
    return result;
}

export function subscribeBlocked(listener: () => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

// Джерело не змінюємо: Undo фільтрує той самий кеш без повторного завантаження.
export function filterBlockedPhotos<T extends { id: string }>(photos: T[], blocked: BlockedPhoto[]): T[] {
    const ids = new Set(blocked.map(p => p.id));
    return photos.filter(p => !ids.has(p.id));
}

// Обкладинки старого кешу мають лише URL; розмір у query не змінює фото.
export function isBlockedCover(url: string | undefined, blocked: BlockedPhoto[]): boolean {
    return !!url && blocked.some(p => p.small && p.small.split('?')[0] === url.split('?')[0]);
}

export async function isBlocked(id: string): Promise<boolean> {
    const ids = await getBlockedIds();
    return ids.has(id);
}
