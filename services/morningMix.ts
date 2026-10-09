import AsyncStorage from '@react-native-async-storage/async-storage';
import { CanceledError } from 'axios';
import { NativeModules } from 'react-native';
import { CATEGORIES, CATEGORY_QUERIES, dedupAndCapByAuthor, filterNoPeople, PEOPLE_TAGS, Photo, subCountForMix } from '../components/categories';
import { getUnsplashKey } from './unsplashKey';
import type { CatalogPage } from './catalogCache';

const native = NativeModules.WallpaperModule;
export const MORNING_MIX_CHANGED = 'stellarshiftMorningMixConfigChanged';
const defaults = CATEGORIES.filter(c => c.id !== 'mix').map(c => c.id);
let generation = 0;

export function morningRecipe(ids: string[]) {
    const selected = [...new Set(ids)].sort();
    const per = Math.min(subCountForMix(selected.filter(id => id !== 'favorites').length), 3);
    let groups = selected.map(id => ({ queries: CATEGORY_QUERIES[id]?.length ? CATEGORY_QUERIES[id]
        : [CATEGORIES.find(c => c.id === id)?.query].filter((q): q is string => !!q), take: per })).filter(g => g.queries.length);
    if (!groups.length) groups = CATEGORIES.filter(c => c.query).map(c => ({ queries: [c.query], take: 1 }));
    return { id: JSON.stringify([1, selected]), groups };
}

// Read persisted settings so asynchronous startup work cannot reinstate an older selection.
export async function syncMorningMix(): Promise<void> {
    const request = ++generation;
    if (!native?.configureMorningMix) return;
    const raw = await AsyncStorage.getItem('settings');
    const settings = raw ? JSON.parse(raw) : {};
    const ids = settings.mixCategories ?? defaults;
    if (!Array.isArray(ids) || !ids.every(id => typeof id === 'string')) return;
    const key = await getUnsplashKey();
    if (request !== generation) return;
    await native.configureMorningMix(JSON.stringify({ ...morningRecipe(ids), peopleKeywords: PEOPLE_TAGS,
        rotationMix: settings.autoChange === true && Array.isArray(settings.activeCategories)
            && settings.activeCategories.length === 1 && settings.activeCategories[0] === 'mix' }), key);
}

function validPhoto(p: Photo): boolean {
    return typeof p?.id === 'string' && typeof p.urls?.small === 'string' && typeof p.urls?.regular === 'string'
        && typeof p.user?.name === 'string' && typeof p.user?.username === 'string';
}

export async function readMorningMix(ids: string[]): Promise<CatalogPage | null> {
    if (!native?.getMorningMix) return null;
    await syncMorningMix();
    const id = morningRecipe(ids).id;
    const raw = await native.getMorningMix(id);
    if (!raw || raw.length > 2_000_000) return null;
    const entry = JSON.parse(raw);
    if (entry.id !== id || !Array.isArray(entry.photos) || !entry.photos.length || !entry.photos.every(validPhoto)) return null;
    // Stored order stays stable between launches. The worker shuffles only on a successful rebuild.
    const filtered = filterNoPeople(entry.photos);
    return { photos: dedupAndCapByAuthor(filtered.length >= 8 ? filtered : entry.photos), query: '', page: 0, hasMore: false };
}

export async function saveMorningMix(ids: string[], page: CatalogPage, signal: AbortSignal): Promise<void> {
    if (signal.aborted) throw new CanceledError('Catalog request canceled');
    if (!page.photos.length || !native?.saveMorningMix) return;
    await native.saveMorningMix(morningRecipe(ids).id, JSON.stringify(page.photos));
}
