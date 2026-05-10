import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { UNSPLASH_KEY as FALLBACK_KEY } from '../components/categories';

// Storage keys
const K_USER_KEY = 'unsplash_user_key';
const K_OPEN_COUNT = 'app_open_count';
const K_DISMISS_COUNT = 'byo_dismiss_count';
const K_LAST_DISMISSED = 'byo_last_dismissed_at';
const K_LAST_403 = 'byo_last_403_at';

// Timing constants
const SOFT_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const URGENT_403_COOLDOWN_MS = 30 * 60 * 1000; // 30 min
const AGGRESSIVE_THRESHOLD = 5; // after 5 "Пізніше" → urgent every launch

export type ByoVariant = 'soft' | 'urgent';

// ---- Storage helpers ----

let _cachedUserKey: string | null | undefined = undefined;

export async function getUserKey(): Promise<string | null> {
    if (_cachedUserKey !== undefined) return _cachedUserKey;
    const v = await AsyncStorage.getItem(K_USER_KEY);
    _cachedUserKey = v;
    return v;
}

export async function setUserKey(key: string): Promise<void> {
    const trimmed = key.trim();
    await AsyncStorage.setItem(K_USER_KEY, trimmed);
    _cachedUserKey = trimmed;
    // Reset nag counters on success
    await AsyncStorage.multiRemove([K_DISMISS_COUNT, K_LAST_DISMISSED, K_LAST_403]);
}

export async function clearUserKey(): Promise<void> {
    await AsyncStorage.removeItem(K_USER_KEY);
    _cachedUserKey = null;
}

export async function getUnsplashKey(): Promise<string> {
    const user = await getUserKey();
    return user || FALLBACK_KEY;
}

// ---- Validation ----

export type ValidationResult =
    | { ok: true }
    | { ok: false; reason: 'invalid' | 'rate_limit' | 'network' };

export async function validateKey(key: string): Promise<ValidationResult> {
    try {
        await axios.get('https://api.unsplash.com/photos', {
            params: { per_page: 1 },
            headers: { Authorization: `Client-ID ${key.trim()}` },
            timeout: 8000,
        });
        return { ok: true };
    } catch (e: any) {
        const status = e?.response?.status;
        if (status === 401) return { ok: false, reason: 'invalid' };
        if (status === 403) return { ok: false, reason: 'rate_limit' };
        return { ok: false, reason: 'network' };
    }
}

// ---- Counters ----

export async function incrementOpenCount(): Promise<number> {
    const raw = await AsyncStorage.getItem(K_OPEN_COUNT);
    const n = (raw ? parseInt(raw, 10) : 0) + 1;
    await AsyncStorage.setItem(K_OPEN_COUNT, String(n));
    return n;
}

export async function getOpenCount(): Promise<number> {
    const raw = await AsyncStorage.getItem(K_OPEN_COUNT);
    return raw ? parseInt(raw, 10) : 0;
}

export async function getDismissCount(): Promise<number> {
    const raw = await AsyncStorage.getItem(K_DISMISS_COUNT);
    return raw ? parseInt(raw, 10) : 0;
}

export async function recordSoftDismiss(): Promise<void> {
    const cur = await getDismissCount();
    await AsyncStorage.setItem(K_DISMISS_COUNT, String(cur + 1));
    await AsyncStorage.setItem(K_LAST_DISMISSED, String(Date.now()));
}

export async function recordUrgent403(): Promise<void> {
    await AsyncStorage.setItem(K_LAST_403, String(Date.now()));
}

async function getLastDismissedAt(): Promise<number> {
    const raw = await AsyncStorage.getItem(K_LAST_DISMISSED);
    return raw ? parseInt(raw, 10) : 0;
}

async function getLast403At(): Promise<number> {
    const raw = await AsyncStorage.getItem(K_LAST_403);
    return raw ? parseInt(raw, 10) : 0;
}

// ---- Decision logic ----

/**
 * Check whether soft popup should fire this launch.
 * Conditions:
 *  - No user key set
 *  - Open count >= 2
 *  - Either: dismiss count >= AGGRESSIVE_THRESHOLD (every launch),
 *    OR (now - lastDismissed) >= 3 days
 */
export async function shouldShowSoft(openCount: number): Promise<boolean> {
    const key = await getUserKey();
    if (key) return false;
    if (openCount < 2) return false;
    const dismisses = await getDismissCount();
    if (dismisses >= AGGRESSIVE_THRESHOLD) return true;
    const last = await getLastDismissedAt();
    if (last === 0) return true; // first eligible launch
    return Date.now() - last >= SOFT_COOLDOWN_MS;
}

/**
 * After a real 403 — show urgent if cooldown passed.
 */
export async function shouldShowUrgent403(): Promise<boolean> {
    const key = await getUserKey();
    if (key) return false;
    const last = await getLast403At();
    return Date.now() - last >= URGENT_403_COOLDOWN_MS;
}

// ---- React Context ----

type Ctx = {
    hasUserKey: boolean;
    refresh: () => Promise<void>;
    /** Trigger urgent dialog (after 403 from API). Respects cooldown. */
    trigger403: () => Promise<void>;
    /** Currently visible BYO dialog variant (or null). */
    dialog: ByoVariant | null;
    dismissDialog: () => Promise<void>;
    /** Navigate user to settings BYO section — called from dialog. */
    onGoToSettings?: () => void;
    setOnGoToSettings: (fn: () => void) => void;
};

const UnsplashKeyCtx = createContext<Ctx | null>(null);

export function useUnsplashKey(): Ctx {
    const c = useContext(UnsplashKeyCtx);
    if (!c) throw new Error('useUnsplashKey must be used within UnsplashKeyProvider');
    return c;
}

export function useHasUserKey(): boolean {
    return useUnsplashKey().hasUserKey;
}

type ProviderProps = { children: any };

export function UnsplashKeyProvider({ children }: ProviderProps) {
    const [hasUserKey, setHasUserKey] = useState(false);
    const [dialog, setDialog] = useState<ByoVariant | null>(null);
    const onGoRef = useRef<(() => void) | undefined>(undefined);
    const checkedSoftRef = useRef(false);

    const refresh = useCallback(async () => {
        _cachedUserKey = undefined; // bust cache
        const k = await getUserKey();
        setHasUserKey(!!k);
    }, []);

    // On mount: increment open count, check soft popup
    useEffect(() => {
        (async () => {
            await refresh();
            if (checkedSoftRef.current) return;
            checkedSoftRef.current = true;
            const n = await incrementOpenCount();
            const show = await shouldShowSoft(n);
            if (show) setDialog('soft');
        })();
    }, [refresh]);

    const trigger403 = useCallback(async () => {
        const ok = await shouldShowUrgent403();
        if (!ok) return;
        await recordUrgent403();
        setDialog('urgent'); // urgent has priority — overrides soft if visible
    }, []);

    const dismissDialog = useCallback(async () => {
        if (dialog === 'soft') {
            await recordSoftDismiss();
        }
        // urgent dismiss → cooldown already recorded when shown
        setDialog(null);
    }, [dialog]);

    const setOnGoToSettings = useCallback((fn: () => void) => {
        onGoRef.current = fn;
    }, []);

    const value: Ctx = {
        hasUserKey,
        refresh,
        trigger403,
        dialog,
        dismissDialog,
        onGoToSettings: () => onGoRef.current?.(),
        setOnGoToSettings,
    };

    return createElement(UnsplashKeyCtx.Provider, { value }, children);
}
