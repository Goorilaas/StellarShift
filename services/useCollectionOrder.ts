import { useCallback, useEffect, useState } from 'react';
import { readCollectionOrder, reconcileOrder, saveCollectionOrder } from './collectionOrder';

export function useCollectionOrder(scope: string, ids: readonly string[]) {
    const [saved, setSaved] = useState<string[]>([]);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let alive = true;
        setReady(false);
        setError(false);
        readCollectionOrder(scope).then(order => {
            if (alive) { setSaved(order); setReady(true); }
        }).catch(() => { if (alive) setError(true); });
        return () => { alive = false; };
    }, [scope, attempt]);
    const save = useCallback(async (draft: string[], alphabetical = false) => {
        if (!ready) throw new Error('Order not loaded');
        const next = alphabetical ? [] : reconcileOrder(ids, draft);
        await saveCollectionOrder(scope, next);
        setSaved(next);
    }, [scope, ids, ready]);
    return { manual: saved.length > 0, ids: reconcileOrder(ids, saved), ready, error, save, retry: () => setAttempt(n => n + 1) };
}
