import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { BlockedPhoto, getBlocked, subscribeBlocked } from './blocked';

export function useBlockedPhotos(): BlockedPhoto[] | null {
    const [blocked, setBlocked] = useState<BlockedPhoto[] | null>(null);
    useFocusEffect(useCallback(() => {
        let alive = true;
        let revision = 0;
        const refresh = () => {
            const current = ++revision;
            getBlocked().then(list => {
                if (alive && current === revision) setBlocked(list);
            }).catch(() => { /* Зберігаємо попередній список при помилці читання. */ });
        };
        refresh();
        const unsubscribe = subscribeBlocked(refresh);
        const state = AppState.addEventListener('change', value => { if (value === 'active') refresh(); });
        const focus = AppState.addEventListener('focus', refresh); // повернення зі шторки Android
        return () => { alive = false; unsubscribe(); state.remove(); focus.remove(); };
    }, []));
    return blocked;
}
