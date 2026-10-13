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
    const [alphabetical, setAlphabetical] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const renamingRef = useRef(renaming); renamingRef.current = renaming;
    const dragSnapshot = useRef<{ ids: string[]; alphabetical: boolean } | null>(null);
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
        const back = BackHandler.addEventListener('hardwareBackPress', () => { if (renamingRef.current) return false; cancel(); return true; });
        return () => back.remove();
    }, [editing, cancel]));
    const save = async () => {
        if (busy.current || dragging || renaming || !draft) return;
        busy.current = true; setSaving(true); setSaveError(false);
        try {
            await order.save(alphabetical ? [...ids] : draft, alphabetical);
            if (focused.current) {
                setDraft(null); setSuccess(n => n + 1);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }
        } catch { if (focused.current) setSaveError(true); }
        finally { busy.current = false; setSaving(false); }
    };
    return { ...order, ids: draft ? (alphabetical ? [...ids] : draft) : order.ids, editing, saving, renaming, setRenaming, saveError, success, dragging,
        clearSuccess: () => setSuccess(0),
        start: () => { if (order.ready && !busy.current) { setAlphabetical(!order.manual); setDraft([...order.ids]); setSuccess(0); setSaveError(false); } },
        cancel, save,
        setDragging: (active: boolean) => {
            if (active && draft) dragSnapshot.current = { ids: alphabetical ? [...ids] : [...draft], alphabetical };
            if (!active) dragSnapshot.current = null;
            setDragging(active);
        },
        cancelReorder: () => {
            const previous = dragSnapshot.current;
            if (previous) { setDraft(previous.ids); setAlphabetical(previous.alphabetical); }
        },
        alphabetize: () => { if (!busy.current && !dragging && !renaming) { setAlphabetical(true); setDraft([...ids]); } },
        reorder: (visible: string[]) => { if (!busy.current) { setAlphabetical(false); setDraft(current => current && mergeVisibleOrder(alphabetical ? [...ids] : current, visible)); } },
    };
}
export type OrderEditing = ReturnType<typeof useOrderEditing>;
