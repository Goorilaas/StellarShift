import { NativeModules } from 'react-native';
export type CollectionVisibility = { hidden: Record<string, string[]>; active: string[]; paused: boolean };
export type HideChoice = '' | 'remove' | 'categories' | 'pause';
export const getCollectionVisibility = async (): Promise<CollectionVisibility> => JSON.parse(await NativeModules.WallpaperModule.getCollectionVisibility());
export const mutateCollectionVisibility = async (key: string, ids: string[], restore: boolean, choice: HideChoice = ''): Promise<CollectionVisibility> =>
    JSON.parse(await NativeModules.WallpaperModule.mutateCollectionVisibility(key, JSON.stringify(ids), restore, choice));
export function excludedCollections(state: CollectionVisibility): Set<string> {
    return new Set(Object.values(state.hidden).flat());
}
export function removalEffect(active: string[], ids: string[]): 'none' | 'some' | 'last' {
    const removed = new Set(ids);
    const count = active.filter(id => removed.has(id)).length;
    return count === 0 ? 'none' : count === active.length ? 'last' : 'some';
}
