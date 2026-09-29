import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { moveItem } from '../services/collectionOrder';

const ROW = 88;
type Item = { id: string; title: string };
export default function CollectionOrderEditor({ items, onSave, onClose }: {
    items: Item[]; onSave: (ids: string[]) => Promise<void>; onClose: () => void;
}) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [draft, setDraft] = useState(() => items.map(item => item.id));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);
    const busy = useRef(false);
    const mounted = useRef(true);
    const scroll = useRef<ScrollView>(null);
    const viewport = useRef<View>(null);
    const offset = useRef(0);
    const bounds = useRef({ top: 0, height: 0 });
    const drag = useRef<{ from: number; startOffset: number; dy: number; y: number } | null>(null);
    const [moving, setMoving] = useState<{ from: number; to: number; dy: number } | null>(null);
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);
    const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; stop(); }; }, []);

    const update = () => {
        const d = drag.current;
        if (!d) return;
        const dy = d.dy + offset.current - d.startOffset;
        const to = Math.max(0, Math.min(draft.length - 1, d.from + Math.round(dy / ROW)));
        setMoving({ from: d.from, to, dy });
    };
    const begin = (from: number, y: number) => {
        if (busy.current) return;
        stop();
        drag.current = { from, startOffset: offset.current, dy: 0, y };
        update();
        timer.current = setInterval(() => {
            const d = drag.current;
            const b = bounds.current;
            if (!d || !b.height) return;
            const step = d.y < b.top + 55 ? -12 : d.y > b.top + b.height - 55 ? 12 : 0;
            const next = Math.max(0, Math.min(Math.max(0, draft.length * ROW - b.height), offset.current + step));
            if (next !== offset.current) {
                offset.current = next;
                scroll.current?.scrollTo({ y: next, animated: false });
                update();
            }
        }, 32);
    };
    const finish = (cancel = false) => {
        const d = drag.current;
        stop();
        if (d && !cancel) {
            const to = Math.max(0, Math.min(draft.length - 1, d.from + Math.round((d.dy + offset.current - d.startOffset) / ROW)));
            setDraft(ids => moveItem(ids, d.from, to));
        }
        drag.current = null;
        setMoving(null);
    };
    const save = async () => {
        if (busy.current || drag.current) return;
        busy.current = true;
        setSaving(true);
        setError(false);
        try {
            await onSave(draft);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        } catch {
            if (mounted.current) setError(true);
        } finally {
            busy.current = false;
            if (mounted.current) setSaving(false);
        }
    };
    return <Modal visible animationType="slide" onRequestClose={() => { if (!busy.current) onClose(); }}>
        <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.header}>
                <Pressable disabled={saving} onPress={onClose} style={styles.button}><Text style={styles.link}>{t('common.cancel')}</Text></Pressable>
                <Text style={styles.title}>{t('collectionOrder.title')}</Text>
                <Pressable disabled={saving || !!moving} onPress={save} style={styles.button}><Text style={styles.link}>{saving ? t('collectionOrder.saving') : t('common.done')}</Text></Pressable>
            </View>
            <Text style={styles.hint}>{t('collectionOrder.hint')}</Text>
            {error && <Text accessibilityRole="alert" style={styles.error}>{t('collectionOrder.saveError')}</Text>}
            <View ref={viewport} style={styles.list} onLayout={() => viewport.current?.measureInWindow((_x, y, _width, height) => { bounds.current = { top: y, height }; })}>
                <ScrollView ref={scroll} removeClippedSubviews={false} scrollEnabled={!moving && !saving} scrollEventThrottle={16}
                    onScroll={e => { offset.current = e.nativeEvent.contentOffset.y; }}>
                    {draft.map((id, index) => <DragRow key={id} title={items.find(item => item.id === id)?.title ?? id}
                        index={index} total={draft.length} disabled={saving || !!moving}
                        dy={moving?.from === index ? moving.dy : 0} active={moving?.from === index} target={!!moving && moving.to === index}
                        onStart={y => begin(index, y)} onMove={(dy, y) => { if (drag.current) { drag.current.dy = dy; drag.current.y = y; update(); } }}
                        onEnd={() => finish()} onCancel={() => finish(true)}
                        onStep={step => setDraft(ids => moveItem(ids, index, index + step))} />)}
                </ScrollView>
            </View>
        </View>
    </Modal>;
}

function DragRow({ title, index, total, disabled, dy, active, target, onStart, onMove, onEnd, onCancel, onStep }: {
    title: string; index: number; total: number; disabled: boolean; dy: number; active: boolean; target: boolean;
    onStart: (y: number) => void; onMove: (dy: number, y: number) => void; onEnd: () => void; onCancel: () => void; onStep: (step: number) => void;
}) {
    const { t } = useTranslation();
    // Стабільний responder читає актуальні callbacks після перестановки рядків.
    const callbacks = useRef({ disabled, onStart, onMove, onEnd, onCancel });
    callbacks.current = { disabled, onStart, onMove, onEnd, onCancel };
    const responder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => !callbacks.current.disabled,
        onPanResponderGrant: (_e, g) => callbacks.current.onStart(g.y0),
        onPanResponderMove: (_e, g) => callbacks.current.onMove(g.dy, g.moveY),
        onPanResponderRelease: () => callbacks.current.onEnd(),
        onPanResponderTerminate: () => callbacks.current.onCancel(),
        onPanResponderTerminationRequest: () => false,
    })).current;
    return <View style={[styles.row, target && styles.target, active && styles.active, { transform: [{ translateY: dy }] }]}>
        <View style={styles.label} {...responder.panHandlers} accessible accessibilityRole="adjustable"
            accessibilityLabel={`${title}, ${index + 1} / ${total}`}
            accessibilityHint={t('collectionOrder.hint')}
            accessibilityActions={[{ name: 'increment', label: t('collectionOrder.down') }, { name: 'decrement', label: t('collectionOrder.up') }]}
            onAccessibilityAction={e => { if (!disabled) onStep(e.nativeEvent.actionName === 'increment' ? 1 : -1); }}>
            <Text style={styles.position}>{index + 1}</Text><Text style={styles.name} numberOfLines={2}>{title}</Text>
        </View>
        <View>
            <Pressable disabled={disabled || index === 0 || active} onPress={() => onStep(-1)} style={styles.step}><Text style={styles.link}>{t('collectionOrder.up')}</Text></Pressable>
            <Pressable disabled={disabled || index === total - 1 || active} onPress={() => onStep(1)} style={styles.step}><Text style={styles.link}>{t('collectionOrder.down')}</Text></Pressable>
        </View>
    </View>;
}
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#0c0b1c' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', padding: 8 },
    title: { color: '#fff', fontSize: 18, fontWeight: '700' },
    button: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
    link: { color: '#AFA9EC', fontSize: 14 },
    hint: { color: '#aaa8bc', marginHorizontal: 16, marginBottom: 12 },
    error: { color: '#ffafaf', margin: 16 },
    list: { flex: 1, marginHorizontal: 12 },
    row: { height: ROW, flexDirection: 'row', alignItems: 'center', backgroundColor: '#151426', borderBottomWidth: 1, borderBottomColor: '#29273c' },
    target: { backgroundColor: '#302a50' },
    active: { zIndex: 10, elevation: 8, backgroundColor: '#39305e' },
    label: { flex: 1, height: ROW, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12 },
    name: { color: '#fff', flex: 1, fontSize: 16 },
    position: { color: '#AFA9EC' },
    step: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
});
