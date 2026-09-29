import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { mergeVisibleOrder } from './tileOrder';
import { useCollectionOrder } from './useCollectionOrder';

export function useOrderEditing(scope: string, ids: readonly string[]) {
    const order = useCollectionOrder(scope, ids);
    const [draft, setDraft] = useState<string[] | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const [success, setSuccess] = useState(0);
    const [dragging, setDragging] = useState(false);
    const busy = useRef(false);
    const focused = useRef(true);
    const editing = draft !== null;
    const cancel = useCallback(() => {
        if (busy.current) return;
        setDraft(null); setSaveError(false); setDragging(false);
    }, []);
    useFocusEffect(useCallback(() => {
        focused.current = true;
        return () => { focused.current = false; setDraft(null); setSaveError(false); setDragging(false); setSuccess(0); };
    }, []));
    useFocusEffect(useCallback(() => {
        if (!editing) return;
        const back = BackHandler.addEventListener('hardwareBackPress', () => { cancel(); return true; });
        return () => back.remove();
    }, [editing, cancel]));
    const save = async () => {
        if (busy.current || dragging || !draft) return;
        busy.current = true; setSaving(true); setSaveError(false);
        try {
            await order.save(draft);
            if (focused.current) {
                setDraft(null); setSuccess(n => n + 1);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }
        } catch { if (focused.current) setSaveError(true); }
        finally { busy.current = false; setSaving(false); }
    };
    return { ...order, ids: draft ?? order.ids, editing, saving, saveError, success, dragging,
        clearSuccess: () => setSuccess(0),
        start: () => { if (order.ready && !busy.current) { setDraft([...order.ids]); setSuccess(0); setSaveError(false); } },
        cancel, save, setDragging,
        reorder: (visible: string[]) => { if (!busy.current) setDraft(current => current && mergeVisibleOrder(current, visible)); },
    };
}
export type OrderEditing = ReturnType<typeof useOrderEditing>;
