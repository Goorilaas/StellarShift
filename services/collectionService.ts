import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { CanceledError } from 'axios';
import { dedupAndCapByAuthor, Photo } from '../components/categories';
import { getUnsplashKey } from './unsplashKey';

export type CollectionMeta = {
    id: string;
    title: string;
    total: number;
    cover?: string;       // urls.small обкладинки — для герой-картки
    curator?: string;     // user.name — куратор
};

// Публічні дані колекцій зберігаємо між сесіями на добу.
const CACHE_TTL = 24 * 60 * 60 * 1000;
type CacheEntry<T> = { savedAt: number; value: T };
const memory = new Map<string, CacheEntry<unknown>>();
const pending = new Map<string, Promise<unknown>>();

async function cached<T>(id: string, fetchValue: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const storageKey = `collection_cache_v1:${id}`;
    const read = async (): Promise<T> => {
        let entry = memory.get(storageKey) as CacheEntry<T> | undefined;
        if (!entry) {
            try {
                const raw = await AsyncStorage.getItem(storageKey);
                const parsed = raw ? JSON.parse(raw) : null;
                if (parsed && typeof parsed.savedAt === 'number' && parsed.value != null) {
                    entry = parsed;
                    memory.set(storageKey, parsed);
                }
            } catch { /* Несправний кеш не блокує мережу. */ }
        }
        if (entry && Date.now() - entry.savedAt >= 0 && Date.now() - entry.savedAt < CACHE_TTL) {
            return entry.value;
        }
        const value = await fetchValue();
        const next = { savedAt: Date.now(), value };
        memory.set(storageKey, next);
        try { await AsyncStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* best-effort */ }
        return value;
    };
    // Запити з власним AbortSignal не ділять скасування з іншими споживачами.
    if (signal) {
        if (signal.aborted) throw new CanceledError('Request canceled');
        return read();
    }
    const existing = pending.get(storageKey);
    if (existing) return existing as Promise<T>;
    const request = read();
    pending.set(storageKey, request);
    try { return await request; }
    finally { pending.delete(storageKey); }
}

export const getCollectionPhotos = async (
    collectionId: string,
    page = 1,
    perPage = 30,
    signal?: AbortSignal,
): Promise<Photo[]> => {
    return cached(`photos:${collectionId}:${page}:${perPage}`, async () => {
        const key = await getUnsplashKey();
        const res = await axios.get(`https://api.unsplash.com/collections/${collectionId}/photos`, {
            params: { page, per_page: perPage, orientation: 'portrait' },
            headers: { Authorization: `Client-ID ${key}` },
            signal,
        });
        const photos = dedupAndCapByAuthor(res.data as Photo[]);
        return photos;
    }, signal);
};

// Метадані колекції для картки: назва, к-сть, обкладинка, куратор.
export const getCollectionMeta = async (collectionId: string): Promise<CollectionMeta | null> => {
    try {
        return await cached(`meta:${collectionId}`, async () => {
            const key = await getUnsplashKey();
            const res = await axios.get(`https://api.unsplash.com/collections/${collectionId}`, {
                headers: { Authorization: `Client-ID ${key}` },
            });
            const d = res.data;
            const meta: CollectionMeta = {
                id: d.id,
                title: d.title,
                total: d.total_photos,
                cover: d.cover_photo?.urls?.small,
                curator: d.user?.name,
            };
            return meta;
        });
    } catch {
        return null;
    }
};
