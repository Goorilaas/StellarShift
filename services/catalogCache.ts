import AsyncStorage from '@react-native-async-storage/async-storage';
import { CanceledError } from 'axios';
import type { Photo } from '../components/categories';

export type CatalogPage = { photos: Photo[]; query: string; page: number; hasMore: boolean };
type Entry = { key: string; savedAt: number; value: CatalogPage };
const KEY = 'catalog_cache_v1';
const TTL = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 20;
// Окремий обмежений запис JSON; не зберігаємо самі файли зображень.
const MAX_CHARS = 600_000;
const memory = new Map<string, Entry>();
const pending = new Map<string, { id: symbol; request: Promise<CatalogPage>; signal: AbortSignal; refresh: boolean }>();
let hydration: Promise<void> | undefined;
let writes = Promise.resolve();

function fresh(entry: Entry): boolean {
    const age = Date.now() - entry.savedAt;
    return age >= 0 && age < TTL;
}

function snapshot(): string {
    for (const [key, entry] of memory) if (!fresh(entry)) memory.delete(key);
    let json = JSON.stringify([...memory.values()]);
    while (memory.size > MAX_ENTRIES || json.length > MAX_CHARS) {
        memory.delete(memory.keys().next().value!);
        json = JSON.stringify([...memory.values()]);
    }
    return json;
}

function hydrate(): Promise<void> {
    if (!hydration) hydration = (async () => {
        try {
            const raw = await AsyncStorage.getItem(KEY);
            if (raw && raw.length > MAX_CHARS) return;
            const entries = JSON.parse(raw || '[]');
            if (!Array.isArray(entries)) return;
            for (const entry of entries) {
                const value = entry?.value;
                if (typeof entry?.key !== 'string' || typeof entry.savedAt !== 'number' || !fresh(entry)) continue;
                if (!Array.isArray(value?.photos) || typeof value.query !== 'string' ||
                    !Number.isInteger(value.page) || value.page < 0 || typeof value.hasMore !== 'boolean') continue;
                if (!value.photos.every((p: Photo) => typeof p?.id === 'string' &&
                    typeof p.urls?.small === 'string' && typeof p.urls?.regular === 'string' &&
                    typeof p.user?.name === 'string' && typeof p.user?.username === 'string')) continue;
                memory.set(entry.key, entry);
            }
            snapshot();
        } catch { /* Пошкоджений або недоступний кеш не блокує каталог. */ }
    })();
    return hydration;
}

// Зберігаємо поля Photo, які використовують переглядач, автор, улюблені й download tracking.
function compact(value: CatalogPage): CatalogPage {
    return { ...value, photos: value.photos.map(p => ({
        id: p.id, urls: p.urls, links: p.links,
        user: { name: p.user.name, username: p.user.username, profile_image: p.user.profile_image, links: p.user.links },
        description: p.description, alt_description: p.alt_description, tags: p.tags,
    })) };
}

export async function loadCatalogPage(
    key: string,
    fetchPage: () => Promise<CatalogPage>,
    signal: AbortSignal,
    refresh = false,
): Promise<CatalogPage> {
    if (signal.aborted) throw new CanceledError('Catalog request canceled');
    const existing = pending.get(key);
    if (existing && !existing.signal.aborted && (!refresh || existing.refresh)) return existing.request;
    const id = Symbol();
    const request: Promise<CatalogPage> = (async () => {
        await hydrate();
        if (signal.aborted) throw new CanceledError('Catalog request canceled');
        const cached = memory.get(key);
        if (!refresh && cached && fresh(cached)) {
            memory.delete(key);
            memory.set(key, cached);
            return cached.value;
        }
        const value = compact(await fetchPage());
        if (signal.aborted) throw new CanceledError('Catalog request canceled');
        // Старий запит не перезаписує свіжий результат ручного оновлення.
        if (pending.get(key)?.id === id) {
            const entry = { key, savedAt: Date.now(), value };
            // Завелика добірка показується, але не витісняє весь попередній кеш.
            if (JSON.stringify([entry]).length > MAX_CHARS) return value;
            memory.delete(key);
            memory.set(key, entry);
            const json = snapshot();
            writes = writes.then(() => AsyncStorage.setItem(KEY, json)).catch(() => { });
            await writes;
        }
        return value;
    })();
    pending.set(key, { id, request, signal, refresh });
    try { return await request; }
    finally { if (pending.get(key)?.id === id) pending.delete(key); }
}
