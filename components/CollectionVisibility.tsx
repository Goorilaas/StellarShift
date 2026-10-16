import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CollectionVisibility, getCollectionVisibility, HideChoice, mutateCollectionVisibility, removalEffect } from '../services/hiddenCollections';
import { getCachedCollectionMeta } from '../services/collectionService';
import { loadCoversMap } from '../services/moodCovers';
import { MOODS } from './collections';
import { ICON } from './icons';
import Toast, { ToastAction, useToastQueue } from './Toast';

const Context = createContext({ state: { hidden: {}, active: [], paused: false } as CollectionVisibility,
    toast: null as { message: string; action?: ToastAction | null } | null, busy: false, refresh: async () => {}, hide: (_key: string, _ids: string[], _name: string) => {}, restore: async (_key: string) => {} });
export const useCollectionVisibility = () => useContext(Context);
export function CollectionVisibilityProvider({ children }: { children: ReactNode }) {
    const { t } = useTranslation();
    const [state, setState] = useState<CollectionVisibility | null>(null);
    const [error, setError] = useState(false);
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const revisions = useRef<Record<string, number>>({});
    const { toast, showToast, dismissToast } = useToastQueue();
    const refresh = async () => { setState(await getCollectionVisibility()); };
    const load = () => { setError(false); refresh().catch(() => setError(true)); };
    useEffect(() => { getCollectionVisibility().then(setState).catch(() => setError(true)); }, []);
    const restore = async (key: string) => {
        if (lock.current) return;
        lock.current = true; setBusy(true);
        try { setState(await mutateCollectionVisibility(key, [], true)); revisions.current[key] = (revisions.current[key] ?? 0) + 1; showToast(t('collectionVisibility.restored')); }
        catch { showToast(t('collectionVisibility.error')); }
        finally { lock.current = false; setBusy(false); }
    };
    const apply = async (key: string, ids: string[], choice: HideChoice) => {
        if (lock.current) return;
        lock.current = true; setBusy(true);
        try {
            setState(await mutateCollectionVisibility(key, ids, false, choice));
            const revision = (revisions.current[key] ?? 0) + 1;
            revisions.current[key] = revision;
            showToast(t('collectionVisibility.hidden'), { label: t('collectionVisibility.undo'), onPress: () => {
                dismissToast();
                if (revisions.current[key] === revision) void restore(key);
            } }, 6000);
        } catch { showToast(t('collectionVisibility.error')); }
        finally { lock.current = false; setBusy(false); }
    };
    const hide = async (key: string, ids: string[], name: string) => {
        if (lock.current) return;
        lock.current = true; setBusy(true);
        try {
            const latest = await getCollectionVisibility(); setState(latest);
            const effect = removalEffect(latest.active, ids);
            if (effect === 'none') { lock.current = false; await apply(key, ids, ''); return; }
            Alert.alert(name, t(effect === 'last' ? 'collectionVisibility.last' : 'collectionVisibility.activeWarning'), effect === 'last' ? [
                { text: t('collectionVisibility.categories'), onPress: () => { void apply(key, ids, 'categories'); } },
                { text: t('collectionVisibility.pause'), onPress: () => { void apply(key, ids, 'pause'); } },
                { text: t('collectionVisibility.cancel'), style: 'cancel' },
            ] : [
                { text: t('collectionVisibility.cancel'), style: 'cancel' },
                { text: t('collectionVisibility.hide'), onPress: () => { void apply(key, ids, 'remove'); } },
            ]);
        } catch { showToast(t('collectionVisibility.error')); }
        finally { lock.current = false; setBusy(false); }
    };
    if (error) return <View style={styles.loading}><Text style={styles.text}>{t('collectionVisibility.error')}</Text><Pressable onPress={load} style={styles.button}><Text style={styles.link}>{t('collections.retry')}</Text></Pressable></View>;
    if (!state) return <View style={styles.loading}><ActivityIndicator color="#AFA9EC" /></View>;
    return <Context.Provider value={{ state, toast, busy, refresh, hide, restore }}><View style={{ flex: 1 }}><View pointerEvents={busy ? 'none' : 'auto'} style={{ flex: 1 }}>{children}</View>
        <Toast message={toast?.message ?? null} action={toast?.action} />
    </View></Context.Provider>;
}

export function HideCollection({ id, ids, name, disabled }: { id: string; ids: string[]; name: string; disabled?: boolean }) {
    const { hide, busy } = useCollectionVisibility();
    const { t } = useTranslation();
    return <Pressable accessibilityRole="button" accessibilityLabel={`${t('collectionVisibility.hide')}: ${name}`} disabled={busy || disabled}
        onPress={() => hide(id, ids, name)} style={styles.hide}><View style={styles.iconBg}><SvgXml xml={ICON.blocked} width={18} height={18} /></View></Pressable>;
}

export function CollectionManagement({ moodId, names, disabled }: { moodId?: string; names: Record<string, string>; disabled?: boolean }) {
    const { state, busy, restore, toast } = useCollectionVisibility();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [panel, setPanel] = useState<'settings' | 'hidden' | null>(null);
    const [rows, setRows] = useState<{ key: string; name: string; cover?: string; curator?: string }[]>([]);
    const keys = Object.keys(state.hidden).filter(key => moodId
        ? key.startsWith('collection:') && MOODS.find(m => m.id === moodId)?.collectionIds.includes(key.slice(11))
        : key.startsWith('mood:'));
    const signature = JSON.stringify(keys);
    useEffect(() => {
        if (panel !== 'hidden') return;
        let alive = true;
        const currentKeys: string[] = JSON.parse(signature);
        setRows(currentKeys.map(key => ({ key, name: names[key] ?? MOODS.find(m => `mood:${m.id}` === key)?.name ?? key.slice(11) })));
        (async () => {
            const covers = await loadCoversMap();
            const result = await Promise.all(currentKeys.map(async key => {
                const mood = MOODS.find(m => `mood:${m.id}` === key);
                if (mood) return { key, name: names[key] ?? mood.name, cover: covers[mood.id]?.[0] };
                const meta = await getCachedCollectionMeta(key.slice(11));
                return { key, name: names[key] ?? meta?.title ?? key.slice(11), cover: meta?.cover, curator: meta?.curator };
            }));
            if (alive) setRows(result);
        })().catch(() => {});
        return () => { alive = false; };
    }, [panel, signature, names]);
    const title = t(moodId ? 'collectionVisibility.hiddenSubs' : 'collectionVisibility.hiddenMoods');
    return <><Pressable accessibilityRole="button" accessibilityLabel={t('collectionVisibility.settings')} disabled={disabled || busy}
        onPress={() => setPanel('settings')} style={styles.button}><SvgXml xml={ICON.gear} width={22} height={22} /></Pressable>
        <Modal visible={panel !== null} transparent animationType="slide" onRequestClose={() => setPanel(panel === 'hidden' ? 'settings' : null)}>
            <View style={styles.overlay}><View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 16), marginTop: insets.top + 32 }]}>
                <View style={styles.head}><Text style={[styles.text, { fontSize: 20, flex: 1 }]}>{panel === 'settings' ? t('collectionVisibility.settings') : title}</Text>
                    <Pressable style={styles.button} onPress={() => setPanel(null)}><Text style={styles.link}>{t('common.done')}</Text></Pressable></View>
                {panel === 'settings' ? <Pressable style={styles.row} onPress={() => setPanel('hidden')}><Text style={styles.text}>{title} · {keys.length}</Text></Pressable> : <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
                    <Text style={[styles.link, { marginBottom: 16 }]}>{t('collectionVisibility.restoreHint')}</Text>
                    {rows.length === 0 && <Text style={styles.text}>{t('collectionVisibility.empty')}</Text>}
                    {rows.map(row => <View key={row.key} style={styles.row}>
                        {row.cover ? <Image source={{ uri: row.cover }} style={styles.cover} /> : <View style={styles.cover} />}
                        <View style={{ flex: 1 }}><Text style={styles.text}>{row.name}</Text>{row.curator && <Text style={styles.link}>{row.curator}</Text>}
                            <Pressable disabled={busy} onPress={() => { void restore(row.key); }} style={styles.button}><Text style={styles.link}>{t('collectionVisibility.restore')}</Text></Pressable></View>
                    </View>)}
                </ScrollView>}
                <Toast message={toast?.message ?? null} action={toast?.action} inline />
            </View></View>
        </Modal>
    </>;
}
const styles = StyleSheet.create({
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a1a' },
    text: { color: '#fff', fontSize: 16 }, link: { color: '#AFA9EC', fontSize: 14 },
    button: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
    hide: { position: 'absolute', top: 0, right: 0, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    iconBg: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#121221dd', alignItems: 'center', justifyContent: 'center' },
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' },
    panel: { backgroundColor: '#131326', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', flexShrink: 1 },
    head: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    row: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, marginBottom: 10, backgroundColor: '#1a1930', borderRadius: 14 },
    cover: { width: 64, height: 80, borderRadius: 10, backgroundColor: '#2a2642' },
});
