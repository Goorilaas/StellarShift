import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAppLanguage, Lang, setAppLanguage, SUPPORTED_LANGS } from '../i18n';
import {
    ActivityIndicator,
    Animated,
    Easing,
    Image,
    Linking,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { CATEGORIES, CHAOS_CATEGORY, CHAOS_QUERIES, FAVORITES_CATEGORY, filterNoPeople } from '../components/categories';
import { BlockedPhoto, clearBlocked, getBlocked, getBlockedIds, setBlockedAll, unblockPhoto } from '../services/blocked';
import { clearUserKey, getUnsplashKey, getUserKey, setUserKey, useUnsplashKey, validateKey } from '../services/unsplashKey';
import { openUnsplashHome } from '../services/unsplashTracking';
import BlockedManagerSheet from '../components/BlockedManagerSheet';
import CategoryPickerSheet from '../components/CategoryPickerSheet';
import ConfirmDialog from '../components/ConfirmDialog';
import { ICON } from '../components/icons';
import Toast, { ToastAction } from '../components/Toast';

import { Blessing, nextBlessingFromQueue } from '../components/blessings';
import { changeWallpaperNow, clearHistory, getHistory, HistoryEntry, isIgnoringBatteryOptimization, PoolItem, requestIgnoreBatteryOptimization, setUnsplashKeyNative, setWallpaperFromUrl, startWallpaperRotation, stopWallpaperRotation } from '../services/wallpaperService';

const DEFAULT_MIX = CATEGORIES.filter(c => c.id !== 'mix').map(c => c.id);

type Star = { id: number; tx: number; ty: number; opacity: Animated.Value; translateX: Animated.Value; translateY: Animated.Value; scale: Animated.Value };

const ABOUT_LOGO = `<svg width="56" height="56" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="50" fill="#0a0a1a"/>
  <circle cx="50" cy="50" r="48" fill="none" stroke="#1a1a3e" stroke-width="1"/>
  <circle cx="24" cy="22" r="1" fill="#aaa" opacity="0.7"/>
  <circle cx="74" cy="18" r="0.8" fill="#9988ee" opacity="0.8"/>
  <circle cx="15" cy="55" r="0.7" fill="#fff" opacity="0.5"/>
  <circle cx="82" cy="62" r="1" fill="#7766dd" opacity="0.7"/>
  <circle cx="85" cy="40" r="0.6" fill="#fff" opacity="0.5"/>
  <path d="M50,50 Q62,33 74,42 Q86,55 76,72 Q63,84 50,79 Q30,70 27,50 Q27,25 44,16 Q65,7 76,22" fill="none" stroke="#534AB7" stroke-width="2.2" opacity="0.9" stroke-linecap="round"/>
  <path d="M50,50 Q38,67 26,58 Q14,45 22,28 Q35,15 50,20 Q70,30 73,50 Q73,75 58,82 Q38,90 22,76" fill="none" stroke="#7F77DD" stroke-width="1.3" opacity="0.4" stroke-linecap="round"/>
  <circle cx="50" cy="50" r="12" fill="#1a1050" opacity="0.8"/>
  <circle cx="50" cy="50" r="8" fill="#534AB7" opacity="0.95"/>
  <circle cx="50" cy="50" r="4" fill="#AFA9EC"/>
  <circle cx="50" cy="50" r="1.5" fill="white"/>
</svg>`;

const ICON_HANDSHAKE = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="6" cy="12" r="3" stroke="#7F77DD" stroke-width="1.5"/>
  <circle cx="18" cy="12" r="3" stroke="#534AB7" stroke-width="1.5"/>
  <path d="M9 12h6" stroke="#AFA9EC" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 1.5"/>
  <circle cx="12" cy="12" r="1.5" fill="#AFA9EC"/>
</svg>`;

const INTERVALS = [
    { labelKey: 'settings.interval.15m', value: 15 },
    { labelKey: 'settings.interval.30m', value: 30 },
    { labelKey: 'settings.interval.1h', value: 60 },
    { labelKey: 'settings.interval.2h', value: 120 },
    { labelKey: 'settings.interval.6h', value: 360 },
    { labelKey: 'settings.interval.24h', value: 1440 },
];

const APPLY_TO = [
    { labelKey: 'settings.applyTo.lock', value: 'lock', icon: ICON.lock },
    { labelKey: 'settings.applyTo.home', value: 'home', icon: ICON.phone },
    { labelKey: 'settings.applyTo.both', value: 'both', icon: ICON.both },
];

type ValidStatus = 'idle' | 'checking' | 'ok' | 'invalid' | 'rate_limit' | 'network';

export default function SettingsScreen() {
    const { t } = useTranslation();
    const [lang, setLang] = useState<Lang>(getAppLanguage());
    const params = useLocalSearchParams<{ scrollTo?: string }>();
    const { hasUserKey, refresh: refreshKey } = useUnsplashKey();
    const scrollRef = useRef<ScrollView | null>(null);
    const byoSectionY = useRef<number | null>(null);
    const [byoInput, setByoInput] = useState('');
    const [byoValidStatus, setByoValidStatus] = useState<ValidStatus>('idle');
    const [byoSavedKey, setByoSavedKey] = useState<string | null>(null);
    const [byoHelpOpen, setByoHelpOpen] = useState(false);
    const [byoClearOpen, setByoClearOpen] = useState(false);
    const [byoExpanded, setByoExpanded] = useState(false);
    const [activeSheetOpen, setActiveSheetOpen] = useState(false);
    const [mixSheetOpen, setMixSheetOpen] = useState(false);

    const [interval, setIntervalVal] = useState(30);
    const [applyTo, setApplyTo] = useState('both');
    const [wifiOnly, setWifiOnly] = useState(true);
    const [chargingOnly, setChargingOnly] = useState(false);
    const [activeCategories, setActiveCategories] = useState(['space']);
    const [mixCategories, setMixCategories] = useState<string[]>(DEFAULT_MIX);
    const [autoChange, setAutoChange] = useState(false);
    const [poolLoading, setPoolLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; action?: ToastAction | null } | null>(null);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [blocked, setBlocked] = useState<BlockedPhoto[]>([]);
    const [blockedSheetOpen, setBlockedSheetOpen] = useState(false);
    const [clearBlockedOpen, setClearBlockedOpen] = useState(false);
    const loaded = useRef(false);
    const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoChangeRef = useRef(false);

    // Reapply / clear-history dialogs
    const [reapplyEntry, setReapplyEntry] = useState<HistoryEntry | null>(null);
    const [clearHistoryOpen, setClearHistoryOpen] = useState(false);

    // Easter egg state
    const tapCountRef = useRef(0);
    const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [chaosUnlocked, setChaosUnlocked] = useState(false);
    const [stars, setStars] = useState<Star[]>([]);
    const [blessing, setBlessing] = useState<Blessing | null>(null);
    const blessingOpacity = useRef(new Animated.Value(0)).current;
    const logoRotation = useRef(new Animated.Value(0)).current;
    const starIdRef = useRef(0);
    const blessingQueueRef = useRef<Blessing[]>([]);

    // Mix перший. Потім Улюблені (спецкатегорія з AsyncStorage). Потім Chaos якщо розблокований. Далі решта.
    const categoryList = [
        ...CATEGORIES.filter(c => c.id === 'mix'),
        FAVORITES_CATEGORY,
        ...(chaosUnlocked ? [CHAOS_CATEGORY] : []),
        ...CATEGORIES.filter(c => c.id !== 'mix'),
    ];
    // У "Що міксувати" Mix не показуємо, але Улюблені і Chaos (якщо розблокований) — показуємо
    const mixCategoryList = [
        FAVORITES_CATEGORY,
        ...(chaosUnlocked ? [CHAOS_CATEGORY] : []),
        ...CATEGORIES.filter(c => c.id !== 'mix'),
    ];

    // ConfirmDialog для re-lock easter
    const [relockOpen, setRelockOpen] = useState(false);

    const nextBlessing = (): Blessing => nextBlessingFromQueue(blessingQueueRef);

    useEffect(() => {
        AsyncStorage.getItem('easter_unlocked').then(v => {
            if (v === '1') setChaosUnlocked(true);
        });
        // Load saved BYO key into UI
        getUserKey().then(k => {
            setByoSavedKey(k);
            if (k) setByoInput(k);
        });
    }, []);

    // Auto-scroll to BYO section when navigated with ?scrollTo=byo
    useEffect(() => {
        if (params.scrollTo !== 'byo') return;
        const timer = setTimeout(() => {
            if (byoSectionY.current !== null && scrollRef.current) {
                scrollRef.current.scrollTo({ y: Math.max(0, byoSectionY.current - 20), animated: true });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [params.scrollTo]);

    const handleByoCheck = async () => {
        const trimmed = byoInput.trim();
        if (!trimmed) return;
        setByoValidStatus('checking');
        const res = await validateKey(trimmed);
        setByoValidStatus(res.ok ? 'ok' : res.reason);
    };

    const handleByoSave = async () => {
        const trimmed = byoInput.trim();
        if (!trimmed || byoValidStatus !== 'ok') {
            showToast(t('settings.toast.checkFirst'));
            return;
        }
        await setUserKey(trimmed);
        await refreshKey();
        setByoSavedKey(trimmed);
        setByoExpanded(false);
        setByoHelpOpen(false);
        setByoValidStatus('idle');
        showToast(t('settings.toast.keySaved'));
    };

    const handleByoClear = async () => {
        setByoClearOpen(false);
        await clearUserKey();
        await refreshKey();
        setByoSavedKey(null);
        setByoInput('');
        setByoValidStatus('idle');
        setByoExpanded(false);
        showToast(t('settings.toast.keyRemoved'));
    };

    const maskKey = (k: string) => k.length <= 8 ? '••••' : `${k.slice(0, 4)}••••${k.slice(-4)}`;

    const openUnsplashRegister = () => {
        Linking.openURL('https://unsplash.com/oauth/applications');
    };

    const openPrivacyPolicy = () => {
        const base = 'https://goorilaas.github.io/StellarShift';
        Linking.openURL(getAppLanguage() === 'uk' ? `${base}/privacy/` : `${base}/privacy-en/`);
    };

    const handleShareApp = async () => {
        try {
            await Share.share({
                message: t('settings.share.message', {
                    url: 'https://play.google.com/store/apps/details?id=com.gorilas.StellarShift',
                }),
            });
        } catch {
            // Користувач закрив share sheet — ігноруємо
        }
    };

    const fireBlessing = () => {
        const phrase = nextBlessing();
        setBlessing(phrase);
        // spawn 6 stars flying in random directions
        const newStars: Star[] = Array.from({ length: 6 }).map((_, i) => {
            const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.6;
            const dist = 80 + Math.random() * 40;
            return {
                id: starIdRef.current++,
                tx: Math.cos(angle) * dist,
                ty: Math.sin(angle) * dist,
                opacity: new Animated.Value(1),
                translateX: new Animated.Value(0),
                translateY: new Animated.Value(0),
                scale: new Animated.Value(0.4),
            };
        });
        setStars(prev => [...prev, ...newStars]);
        newStars.forEach(s => {
            Animated.parallel([
                Animated.timing(s.translateX, { toValue: s.tx, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(s.translateY, { toValue: s.ty, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(s.scale, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.timing(s.opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
            ]).start(() => {
                setStars(prev => prev.filter(p => p.id !== s.id));
            });
        });
        Animated.sequence([
            Animated.timing(blessingOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.delay(1800),
            Animated.timing(blessingOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => setBlessing(null));
    };

    const fireSpin = () => {
        logoRotation.setValue(0);
        Animated.timing(logoRotation, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    };

    const unlockChaos = async () => {
        if (chaosUnlocked) {
            fireBlessing();
            return;
        }
        setChaosUnlocked(true);
        await AsyncStorage.setItem('easter_unlocked', '1');
        showToast(t('settings.toast.chaosUnlocked'));
    };

    const relockChaos = async () => {
        setRelockOpen(false);
        await AsyncStorage.removeItem('easter_unlocked');
        setChaosUnlocked(false);
        // Прибираємо chaos з активних та з мікс-категорій. Захист від empty active.
        setActiveCategories(prev => {
            const cleaned = prev.filter(id => id !== 'chaos');
            return cleaned.length === 0 ? ['space'] : cleaned;
        });
        setMixCategories(prev => prev.filter(id => id !== 'chaos'));
        showToast(t('settings.toast.chaosLocked'));
    };

    const handleLogoLongPress = () => {
        if (!chaosUnlocked) return; // нема що блокувати
        setRelockOpen(true);
    };

    const handleLogoTap = () => {
        tapCountRef.current += 1;
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        tapTimerRef.current = setTimeout(() => {
            const count = tapCountRef.current;
            tapCountRef.current = 0;
            if (count >= 7) {
                unlockChaos();
            } else if (count >= 3) {
                fireSpin();
                fireBlessing();
            } else {
                fireBlessing();
            }
        }, 450);
    };

    useFocusEffect(
        useCallback(() => {
            loadSettings();
            getHistory().then(setHistory);
            getBlocked().then(setBlocked);
            // Якщо catalog заблокував фото — пул автозміни треба перебудувати
            AsyncStorage.getItem('pool_dirty').then(async dirty => {
                if (dirty === '1' && autoChangeRef.current) {
                    await AsyncStorage.removeItem('pool_dirty');
                    loadAndStart();
                } else if (dirty === '1') {
                    await AsyncStorage.removeItem('pool_dirty');
                }
            });
        }, [])
    );

    const showToast = (msg: string, action?: ToastAction | null, duration = 3000) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ message: msg, action });
        toastTimerRef.current = setTimeout(() => setToast(null), duration);
    };
    const dismissToast = () => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast(null);
    };

    const loadSettings = async () => {
        try {
            const s = await AsyncStorage.getItem('settings');
            if (s) {
                const p = JSON.parse(s);
                setIntervalVal(p.interval ?? 30);
                setApplyTo(p.applyTo ?? 'both');
                setWifiOnly(p.wifiOnly ?? true);
                setChargingOnly(p.chargingOnly ?? false);
                setActiveCategories(p.activeCategories ?? ['space']);
                setMixCategories(p.mixCategories ?? DEFAULT_MIX);
                setAutoChange(p.autoChange ?? false);
                autoChangeRef.current = p.autoChange ?? false;
            }
        } catch { }
        loaded.current = true;
    };

    // Auto-save to AsyncStorage on every change
    useEffect(() => {
        if (!loaded.current) return;
        AsyncStorage.setItem('settings', JSON.stringify({
            interval, applyTo, wifiOnly, chargingOnly, activeCategories, mixCategories, autoChange,
        }));
    }, [interval, applyTo, wifiOnly, chargingOnly, activeCategories, mixCategories, autoChange]);

    // When rotation settings change while autoChange is ON → debounced reload
    useEffect(() => {
        if (!loaded.current || !autoChangeRef.current) return;
        if (reloadTimer.current) clearTimeout(reloadTimer.current);
        reloadTimer.current = setTimeout(() => loadAndStart(), 1500);
        return () => { if (reloadTimer.current) clearTimeout(reloadTimer.current); };
    }, [activeCategories, mixCategories, interval, applyTo, wifiOnly, chargingOnly]);

    const loadPhotoPool = async (categories: string[]): Promise<PoolItem[] | null> => {
        setPoolLoading(true);
        try {
            const queryJobs: { query: string; excludePeople: boolean }[] = [];
            const seenQ = new Set<string>();
            let wantsFavorites = false;
            const addCat = (cat: { query: string; excludePeople?: boolean } | undefined) => {
                if (!cat?.query || seenQ.has(cat.query)) return;
                seenQ.add(cat.query);
                queryJobs.push({ query: cat.query, excludePeople: !!cat.excludePeople });
            };
            const addById = (id: string) => {
                if (id === 'favorites') {
                    wantsFavorites = true;
                } else if (id === 'chaos') {
                    // Chaos — беремо 6 random queries з CHAOS_QUERIES
                    const shuffled = [...CHAOS_QUERIES].sort(() => Math.random() - 0.5).slice(0, 6);
                    shuffled.forEach(q => addCat({ query: q, excludePeople: true }));
                } else {
                    addCat(CATEGORIES.find(c => c.id === id));
                }
            };
            categories.forEach(catId => {
                if (catId === 'mix') {
                    const mixIds = mixCategories.length > 0 ? mixCategories : DEFAULT_MIX;
                    mixIds.forEach(id => addById(id));
                } else {
                    addById(catId);
                }
            });

            // Favorites pool — з AsyncStorage, не йдемо в Unsplash
            let favoritesPool: PoolItem[] = [];
            if (wantsFavorites) {
                try {
                    const raw = await AsyncStorage.getItem('favorites_data');
                    const favData: any[] = raw ? JSON.parse(raw) : [];
                    favoritesPool = favData
                        .filter(p => p?.id && p?.urls?.regular)
                        .map(p => ({ id: p.id, url: p.urls.regular, downloadLocation: p.links?.download_location }));
                } catch { /* ігноруємо, favorites просто буде порожнім */ }
            }

            // API-запити (можуть бути 0 jobs — якщо тільки favorites)
            const key = queryJobs.length > 0 ? await getUnsplashKey() : null;
            const responses = key
                ? await Promise.all(
                    queryJobs.flatMap(job => {
                        const p1 = Math.ceil(Math.random() * 5);
                        const p2 = p1 < 5 ? p1 + 5 : p1 - 4;
                        return [p1, p2].map(page =>
                            axios.get('https://api.unsplash.com/search/photos', {
                                params: { query: job.query, page, per_page: 30, orientation: 'portrait' },
                                headers: { Authorization: `Client-ID ${key}` },
                            }).then(r => ({ data: r.data.results, excludePeople: job.excludePeople }))
                        );
                    })
                )
                : [];
            const apiPool: PoolItem[] = responses
                .flatMap(r => (r.excludePeople ? filterNoPeople(r.data) : r.data))
                .map((p: any) => ({ id: p.id, url: p.urls.regular, downloadLocation: p.links?.download_location }));

            // Об'єднуємо favorites + API, дедуп по id, виключаємо заблоковані
            const blockedSet = await getBlockedIds();
            const seen = new Set<string>();
            const pool: PoolItem[] = [...favoritesPool, ...apiPool].filter(p => {
                if (blockedSet.has(p.id)) return false;
                if (seen.has(p.id)) return false;
                seen.add(p.id);
                return true;
            });

            // shuffle so cycle order is always different
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }

            if (pool.length === 0) {
                if (wantsFavorites && queryJobs.length === 0) {
                    showToast(t('settings.toast.poolEmptyFav'));
                } else {
                    showToast(t('settings.toast.poolFail'));
                }
                return null;
            }
            return pool;
        } catch {
            showToast(t('settings.toast.poolFail'));
            return null;
        } finally {
            setPoolLoading(false);
        }
    };

    // TODO(techdebt): race window — `loadPhotoPool` не абортить in-flight axios.
    // Якщо юзер змінює settings двічі за ~2с і перший pool-fetch повертається
    // ПІСЛЯ другого — native side тримає stale parameters (last-write-wins).
    // Self-healing наступною свідомою зміною. Severity low. Розслідувано 2026-05-01,
    // claim про stale closure через useEffect deps виявився false positive
    // (cleanup pattern на line 372-376 коректно скасовує попередній таймер).
    // Реальний фікс: AbortController у loadPhotoPool, reuse тут. Див. roadmap → Технічний борг.
    const loadAndStart = async () => {
        const pool = await loadPhotoPool(activeCategories);
        if (!pool) return;
        // Sync current Unsplash key into native prefs so WallpaperWorker can fire
        // download-tracking pings on each rotation tick (required by Unsplash ToS).
        try { await setUnsplashKeyNative(await getUnsplashKey()); } catch { /* non-fatal */ }
        await startWallpaperRotation(pool, interval, applyTo, wifiOnly, chargingOnly);
        showToast(t('settings.toast.poolReady', { count: pool.length }));
    };

    const handleAutoChangeToggle = async (value: boolean) => {
        autoChangeRef.current = value;
        setAutoChange(value);
        if (value) {
            // Check battery optimization — critical for background work on Samsung
            const ignoring = await isIgnoringBatteryOptimization();
            if (!ignoring) {
                await requestIgnoreBatteryOptimization();
            }
            await loadAndStart();
        } else {
            if (reloadTimer.current) clearTimeout(reloadTimer.current);
            await stopWallpaperRotation();
            showToast(t('settings.toast.stopped'));
        }
    };

    const handleReapply = (entry: HistoryEntry) => setReapplyEntry(entry);

    const confirmReapply = async () => {
        const entry = reapplyEntry;
        setReapplyEntry(null);
        if (!entry) return;
        try {
            await setWallpaperFromUrl(entry.url, entry.target, { id: entry.id, small: entry.small, downloadLocation: entry.downloadLocation });
            showToast(t('settings.toast.applied'));
            getHistory().then(setHistory);
        } catch {
            showToast(t('settings.toast.applyFail'));
        }
    };

    const handleClearHistory = () => setClearHistoryOpen(true);

    const confirmClearHistory = async () => {
        setClearHistoryOpen(false);
        await clearHistory();
        setHistory([]);
    };

    const handleUnblock = async (id: string) => {
        const removed = blocked.find(p => p.id === id);
        await unblockPhoto(id);
        setBlocked(prev => prev.filter(p => p.id !== id));
        if (autoChangeRef.current) loadAndStart();
        if (removed) {
            showToast(t('settings.toast.unblockedOne'), {
                label: t('common.undo'),
                onPress: () => undoUnblockOne(removed),
            }, 5000);
        }
    };

    const undoUnblockOne = async (photo: BlockedPhoto) => {
        dismissToast();
        const current = await getBlocked();
        if (current.some(p => p.id === photo.id)) return;
        const next = [...current, photo];
        await setBlockedAll(next);
        setBlocked(next);
        if (autoChangeRef.current) loadAndStart();
    };

    const confirmClearBlocked = async () => {
        setClearBlockedOpen(false);
        const snapshot = blocked;
        await clearBlocked();
        setBlocked([]);
        if (autoChangeRef.current) loadAndStart();
        showToast(t('settings.toast.unblockedAll', { count: snapshot.length }), {
            label: t('common.undo'),
            onPress: () => undoClearBlocked(snapshot),
        }, 5000);
    };

    const undoClearBlocked = async (snapshot: BlockedPhoto[]) => {
        dismissToast();
        await setBlockedAll(snapshot);
        setBlocked(snapshot);
        if (autoChangeRef.current) loadAndStart();
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
        <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
            <View style={styles.titleRow}>
                <SvgXml xml={ICON.gear} width={24} height={24} />
                <Text style={styles.title}>{t('settings.title')}</Text>
            </View>

            <Text style={styles.sectionLabel}>{t('settings.section.language')}</Text>
            <View style={styles.row}>
                {SUPPORTED_LANGS.map(code => (
                    <TouchableOpacity
                        key={code}
                        style={[styles.btn, styles.btnFlex, lang === code && styles.btnActive]}
                        onPress={async () => {
                            setLang(code);
                            await setAppLanguage(code);
                        }}
                    >
                        <Text style={[styles.btnText, lang === code && styles.btnTextActive]}>
                            {t(`settings.language.${code}`)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.sectionLabel}>{t('settings.section.autoChange')}</Text>
            <View style={styles.card}>
                <View style={styles.toggleRow}>
                    <View style={styles.toggleLabelRow}>
                        <SvgXml xml={ICON.refresh} width={18} height={18} />
                        <Text style={styles.toggleLabel}>{t('settings.toggle.autoChange')}</Text>
                        <Text style={styles.toggleSub}>
                            {poolLoading ? t('settings.toggle.autoChangeLoading') : t('settings.toggle.autoChangeIdle')}
                        </Text>
                    </View>
                    <Switch
                        value={autoChange}
                        onValueChange={handleAutoChangeToggle}
                        disabled={poolLoading}
                        trackColor={{ false: '#333', true: '#534AB7' }}
                        thumbColor={autoChange ? '#fff' : '#888'}
                    />
                </View>
            </View>

            <Text style={styles.sectionLabel}>{t('settings.section.interval')}</Text>
            <View style={styles.grid}>
                {INTERVALS.map(i => (
                    <TouchableOpacity
                        key={i.value}
                        style={[styles.btn, interval === i.value && styles.btnActive]}
                        onPress={() => setIntervalVal(i.value)}
                    >
                        <Text style={[styles.btnText, interval === i.value && styles.btnTextActive]}>
                            {t(i.labelKey)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.sectionLabel}>{t('settings.section.applyTo')}</Text>
            <View style={styles.row}>
                {APPLY_TO.map(a => (
                    <TouchableOpacity
                        key={a.value}
                        style={[styles.btn, styles.btnFlex, applyTo === a.value && styles.btnActive]}
                        onPress={() => setApplyTo(a.value)}
                    >
                        <SvgXml xml={a.icon} width={15} height={15} />
                        <Text style={[styles.btnText, applyTo === a.value && styles.btnTextActive]}>
                            {t(a.labelKey)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.sectionLabel}>{t('settings.section.activeCategories')}</Text>
            <TouchableOpacity style={styles.pickerCard} onPress={() => setActiveSheetOpen(true)} activeOpacity={0.75}>
                <View style={styles.pickerPreview}>
                    {activeCategories.slice(0, 5).map(id => {
                        const c = categoryList.find(c2 => c2.id === id);
                        if (!c) return null;
                        return (
                            <View key={id} style={styles.pickerChip}>
                                <SvgXml xml={c.icon} width={12} height={12} />
                                <Text style={styles.pickerChipText} numberOfLines={1}>{c.labelKey ? t(c.labelKey) : c.label}</Text>
                            </View>
                        );
                    })}
                    {activeCategories.length > 5 && (
                        <View style={[styles.pickerChip, styles.pickerChipMore]}>
                            <Text style={styles.pickerChipText}>+{activeCategories.length - 5}</Text>
                        </View>
                    )}
                    {activeCategories.length === 0 && (
                        <Text style={styles.pickerEmpty}>{t('settings.picker.empty')}</Text>
                    )}
                </View>
                <Text style={styles.pickerArrow}>›</Text>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>{t('settings.section.mixCategories')}</Text>
            <Text style={styles.sectionHint}>{t('settings.section.mixHint')}</Text>
            <TouchableOpacity style={styles.pickerCard} onPress={() => setMixSheetOpen(true)} activeOpacity={0.75}>
                <View style={styles.pickerPreview}>
                    {mixCategories.slice(0, 5).map(id => {
                        const c = mixCategoryList.find(c2 => c2.id === id);
                        if (!c) return null;
                        return (
                            <View key={id} style={styles.pickerChip}>
                                <SvgXml xml={c.icon} width={12} height={12} />
                                <Text style={styles.pickerChipText} numberOfLines={1}>{c.labelKey ? t(c.labelKey) : c.label}</Text>
                            </View>
                        );
                    })}
                    {mixCategories.length > 5 && (
                        <View style={[styles.pickerChip, styles.pickerChipMore]}>
                            <Text style={styles.pickerChipText}>+{mixCategories.length - 5}</Text>
                        </View>
                    )}
                    {mixCategories.length === 0 && (
                        <Text style={styles.pickerEmpty}>{t('settings.picker.empty')}</Text>
                    )}
                </View>
                <Text style={styles.pickerArrow}>›</Text>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>{t('settings.section.whenChange')}</Text>
            <View style={styles.card}>
                <View style={styles.toggleRow}>
                    <View style={styles.toggleLabelRow}>
                        <SvgXml xml={ICON.wifi} width={18} height={18} />
                        <Text style={styles.toggleLabel}>{t('settings.toggle.wifi')}</Text>
                    </View>
                    <Switch
                        value={wifiOnly}
                        onValueChange={setWifiOnly}
                        trackColor={{ false: '#333', true: '#534AB7' }}
                        thumbColor={wifiOnly ? '#fff' : '#888'}
                    />
                </View>
                <View style={styles.toggleRow}>
                    <View style={styles.toggleLabelRow}>
                        <SvgXml xml={ICON.battery} width={18} height={18} />
                        <Text style={styles.toggleLabel}>{t('settings.toggle.charging')}</Text>
                    </View>
                    <Switch
                        value={chargingOnly}
                        onValueChange={setChargingOnly}
                        trackColor={{ false: '#333', true: '#534AB7' }}
                        thumbColor={chargingOnly ? '#fff' : '#888'}
                    />
                </View>
            </View>

            {autoChange && (
                <TouchableOpacity
                    style={[styles.changeNowBtn, poolLoading && { opacity: 0.5 }]}
                    disabled={poolLoading}
                    onPress={async () => {
                        try {
                            await changeWallpaperNow();
                            showToast(t('settings.toast.changed'));
                        } catch {
                            showToast(t('settings.toast.enableFirst'));
                        }
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <SvgXml xml={ICON.refresh} width={18} height={18} />
                        <Text style={styles.btnActionText}>{t('settings.changeNow')}</Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* Історія */}
            {history.length > 0 && (
                <>
                    <View style={styles.historyHeader}>
                        <Text style={styles.sectionLabel}>{t('settings.section.history')}</Text>
                        <TouchableOpacity onPress={handleClearHistory}>
                            <Text style={styles.clearText}>{t('settings.history.clear')}</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyRow}>
                        {history.map(h => (
                            <TouchableOpacity key={`${h.id}-${h.appliedAt}`} style={styles.historyCard} onPress={() => handleReapply(h)}>
                                {h.small ? (
                                    <Image source={{ uri: h.small }} style={styles.historyImg} />
                                ) : (
                                    <View style={[styles.historyImg, { backgroundColor: '#1a1a2e' }]} />
                                )}
                                <View style={styles.historyOverlay}>
                                    <SvgXml xml={ICON.refresh} width={14} height={14} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </>
            )}

            {/* BYO Unsplash key */}
            <View onLayout={e => { byoSectionY.current = e.nativeEvent.layout.y; }}>
                <View style={styles.byoHeaderRow}>
                    <Text style={styles.sectionLabel}>{t('settings.section.byo')}</Text>
                    {hasUserKey ? (
                        <View style={styles.byoBadgeOk}><Text style={styles.byoBadgeOkText}>{t('settings.byo.badgeCustom')}</Text></View>
                    ) : (
                        <View style={styles.byoBadgeWarn}><Text style={styles.byoBadgeWarnText}>{t('settings.byo.badgeDemo')}</Text></View>
                    )}
                </View>
                {hasUserKey && !byoExpanded ? (
                    // COLLAPSED: key set, compact view
                    <View style={styles.byoCardCollapsed}>
                        <View style={styles.byoCollapsedRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.byoCollapsedLabel}>{t('settings.byo.activeKey')}</Text>
                                <Text style={styles.byoCollapsedKey}>{byoSavedKey ? maskKey(byoSavedKey) : '••••'}</Text>
                            </View>
                            <TouchableOpacity style={styles.byoCollapsedBtn} onPress={() => setByoExpanded(true)}>
                                <Text style={styles.byoCollapsedBtnText}>{t('settings.byo.change')}</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.byoCollapsedClear} onPress={() => setByoClearOpen(true)}>
                            <Text style={styles.byoClearText}>{t('settings.byo.delete')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    // EXPANDED: full form
                    <View style={styles.byoCard}>
                        {!hasUserKey && (
                            <Text style={styles.byoIntro}>{t('settings.byo.intro')}</Text>
                        )}
                        <TextInput
                            style={styles.byoInput}
                            value={byoInput}
                            onChangeText={t => { setByoInput(t); setByoValidStatus('idle'); }}
                            placeholder={t('settings.byo.placeholder')}
                            placeholderTextColor="#555"
                            autoCapitalize="none"
                            autoCorrect={false}
                            selectionColor="#7F77DD"
                        />
                        {byoValidStatus !== 'idle' && (
                            <Text style={[
                                styles.byoStatus,
                                byoValidStatus === 'ok' && styles.byoStatusOk,
                                (byoValidStatus === 'invalid' || byoValidStatus === 'rate_limit' || byoValidStatus === 'network') && styles.byoStatusErr,
                            ]}>
                                {byoValidStatus === 'checking' && t('settings.byo.status.checking')}
                                {byoValidStatus === 'ok' && t('settings.byo.status.ok')}
                                {byoValidStatus === 'invalid' && t('settings.byo.status.invalid')}
                                {byoValidStatus === 'rate_limit' && t('settings.byo.status.rate')}
                                {byoValidStatus === 'network' && t('settings.byo.status.network')}
                            </Text>
                        )}
                        <View style={styles.byoBtnRow}>
                            <TouchableOpacity
                                style={[styles.byoBtn, styles.byoBtnCheck, (!byoInput.trim() || byoValidStatus === 'checking') && { opacity: 0.5 }]}
                                disabled={!byoInput.trim() || byoValidStatus === 'checking'}
                                onPress={handleByoCheck}
                            >
                                {byoValidStatus === 'checking'
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <Text style={styles.byoBtnText}>{t('settings.byo.check')}</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.byoBtn, styles.byoBtnSave, byoValidStatus !== 'ok' && { opacity: 0.4 }]}
                                disabled={byoValidStatus !== 'ok'}
                                onPress={handleByoSave}
                            >
                                <Text style={styles.byoBtnText}>{t('settings.byo.save')}</Text>
                            </TouchableOpacity>
                        </View>
                        {hasUserKey && byoExpanded && (
                            <TouchableOpacity style={styles.byoClearBtn} onPress={() => setByoExpanded(false)}>
                                <Text style={styles.byoHelpToggleText}>{t('settings.byo.cancelChange')}</Text>
                            </TouchableOpacity>
                        )}
                        {byoSavedKey && !byoExpanded && (
                            <TouchableOpacity style={styles.byoClearBtn} onPress={() => setByoClearOpen(true)}>
                                <Text style={styles.byoClearText}>{t('settings.byo.deleteAndDemo')}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.byoHelpToggle} onPress={() => setByoHelpOpen(v => !v)}>
                            <Text style={styles.byoHelpToggleText}>{byoHelpOpen ? '▾' : '▸'} {t('settings.byo.howToggle')}</Text>
                        </TouchableOpacity>
                        {byoHelpOpen && (
                            <View style={styles.byoHelp}>
                                <Text style={styles.byoHelpStep}>{t('settings.byo.step1')}</Text>
                                <Text style={styles.byoHelpStep}>{t('settings.byo.step2')}</Text>
                                <Text style={styles.byoHelpStep}>{t('settings.byo.step3')}</Text>
                                <Text style={styles.byoHelpStep}>{t('settings.byo.step4')}</Text>
                                <Text style={styles.byoHelpStepHint}>{t('settings.byo.stepHint')}</Text>
                                <TouchableOpacity style={styles.byoHelpLinkBtn} onPress={openUnsplashRegister}>
                                    <Text style={styles.byoHelpLinkText}>{t('settings.byo.openUnsplash')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </View>

            {/* Сховані фото */}
            {blocked.length > 0 && (
                <>
                    <Text style={styles.sectionLabel}>{t('settings.section.blocked')}</Text>
                    <TouchableOpacity style={styles.blockedCard} onPress={() => setBlockedSheetOpen(true)} activeOpacity={0.75}>
                        <View style={styles.blockedIconWrap}>
                            <SvgXml xml={ICON.blocked} width={22} height={22} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.blockedTitle}>{t('settings.blocked.title', { count: blocked.length })}</Text>
                            <Text style={styles.blockedSub}>{t('settings.blocked.sub')}</Text>
                        </View>
                        <Text style={styles.pickerArrow}>›</Text>
                    </TouchableOpacity>
                </>
            )}

            {/* Поділитися застосунком */}
            <Text style={styles.sectionLabel}>{t('settings.section.share')}</Text>
            <TouchableOpacity style={styles.blockedCard} onPress={handleShareApp} activeOpacity={0.75}>
                <View style={styles.blockedIconWrap}>
                    <SvgXml xml={ICON.share} width={22} height={22} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.blockedTitle}>{t('settings.share.title')}</Text>
                    <Text style={styles.blockedSub}>{t('settings.share.sub')}</Text>
                </View>
                <Text style={styles.pickerArrow}>›</Text>
            </TouchableOpacity>

            {/* Про застосунок */}
            <Text style={styles.sectionLabel}>{t('settings.section.about')}</Text>
            <View style={styles.aboutCard}>
                <TouchableOpacity activeOpacity={0.7} onPress={handleLogoTap} onLongPress={handleLogoLongPress} delayLongPress={2000} style={styles.logoWrap}>
                    <Animated.View style={{
                        transform: [{
                            rotate: logoRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }),
                        }],
                    }}>
                        <SvgXml xml={ABOUT_LOGO} width={56} height={56} />
                    </Animated.View>
                    {stars.map(s => (
                        <Animated.View
                            key={s.id}
                            pointerEvents="none"
                            style={{
                                position: 'absolute',
                                left: 28 - 8,
                                top: 28 - 8,
                                opacity: s.opacity,
                                transform: [
                                    { translateX: s.translateX },
                                    { translateY: s.translateY },
                                    { scale: s.scale },
                                ],
                            }}
                        >
                            <SvgXml xml={ICON.sparkle} width={16} height={16} />
                        </Animated.View>
                    ))}
                </TouchableOpacity>
                <View style={styles.aboutInfo}>
                    <Text style={styles.aboutName}>StellarShift</Text>
                    <Text style={styles.aboutVersion}>{t('settings.about.version', { version: Constants.expoConfig?.version ?? '—' })}</Text>
                </View>
            </View>
            {blessing && (
                <Animated.View style={[styles.blessingWrap, { opacity: blessingOpacity }]} pointerEvents="none">
                    <View style={styles.blessingRow}>
                        <SvgXml xml={ICON[blessing.icon as keyof typeof ICON]} width={20} height={20} />
                        <Text style={styles.blessingText}>{blessing.text}</Text>
                    </View>
                </Animated.View>
            )}
            <View style={styles.aboutFooter}>
                <View style={styles.aboutFooterRow}>
                    <Text style={styles.aboutFooterText}>{t('settings.about.builtWith')}</Text>
                    <SvgXml xml={lang === 'uk' ? ICON_HANDSHAKE : ICON.heartFilled} width={20} height={20} />
                    <Text style={styles.aboutFooterText}>{t('settings.about.bratan')}</Text>
                </View>
                <Text style={styles.aboutFooterSub}>
                    Powered by{' '}
                    <Text style={styles.aboutFooterLink} onPress={openUnsplashHome}>Unsplash</Text>
                    {' · WorkManager · Claude'}
                </Text>
                <Text style={[styles.aboutFooterSub, { marginTop: 8 }]}>
                    <Text style={styles.aboutFooterLink} onPress={openPrivacyPolicy}>
                        {t('settings.about.privacy')}
                    </Text>
                </Text>
            </View>

        </ScrollView>
        <Toast message={toast?.message ?? null} action={toast?.action} />
        <ConfirmDialog
            visible={!!reapplyEntry}
            title={t('settings.dialog.reapplyTitle')}
            message={reapplyEntry ? t('settings.dialog.reapplyMsg', { target: t(`settings.applyTo.${reapplyEntry.target}`) }) : undefined}
            confirmLabel={t('settings.dialog.reapplyConfirm')}
            onConfirm={confirmReapply}
            onCancel={() => setReapplyEntry(null)}
        />
        <ConfirmDialog
            visible={clearHistoryOpen}
            title={t('settings.dialog.clearHistTitle')}
            message={t('settings.dialog.clearHistMsg')}
            confirmLabel={t('settings.dialog.clearHistConfirm')}
            destructive
            onConfirm={confirmClearHistory}
            onCancel={() => setClearHistoryOpen(false)}
        />
        <CategoryPickerSheet
            visible={activeSheetOpen}
            title={t('settings.section.activeCategories')}
            available={categoryList}
            selected={activeCategories}
            onChange={setActiveCategories}
            onClose={() => setActiveSheetOpen(false)}
            minSelected={1}
        />
        <CategoryPickerSheet
            visible={mixSheetOpen}
            title={t('settings.section.mixCategories')}
            available={mixCategoryList}
            selected={mixCategories}
            onChange={setMixCategories}
            onClose={() => setMixSheetOpen(false)}
            minSelected={1}
        />
        <ConfirmDialog
            visible={byoClearOpen}
            title={t('settings.dialog.byoDeleteTitle')}
            message={t('settings.dialog.byoDeleteMsg')}
            confirmLabel={t('common.delete')}
            destructive
            onConfirm={handleByoClear}
            onCancel={() => setByoClearOpen(false)}
        />
        <ConfirmDialog
            visible={clearBlockedOpen}
            title={t('settings.dialog.clearBlockedTitle')}
            message={t('settings.dialog.clearBlockedMsg', { count: blocked.length })}
            confirmLabel={t('settings.dialog.clearBlockedConfirm')}
            destructive
            onConfirm={confirmClearBlocked}
            onCancel={() => setClearBlockedOpen(false)}
        />
        <BlockedManagerSheet
            visible={blockedSheetOpen}
            blocked={blocked}
            onUnblock={handleUnblock}
            onClearAll={() => { setBlockedSheetOpen(false); setClearBlockedOpen(true); }}
            onClose={() => setBlockedSheetOpen(false)}
        />
        <ConfirmDialog
            visible={relockOpen}
            title={t('settings.dialog.relockTitle')}
            message={t('settings.dialog.relockMsg')}
            confirmLabel={t('settings.dialog.relockConfirm')}
            destructive
            onConfirm={relockChaos}
            onCancel={() => setRelockOpen(false)}
        />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a1a', paddingTop: 50, paddingHorizontal: 16 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
    title: { fontSize: 22, fontWeight: '700', color: '#fff' },
    toggleLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionLabel: { fontSize: 12, color: '#7F77DD', fontWeight: '600', letterSpacing: 1, marginBottom: 10, marginTop: 20, textTransform: 'uppercase' },
    sectionHint: { fontSize: 11, color: '#666', marginTop: -6, marginBottom: 10 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    row: { flexDirection: 'row', gap: 8 },
    btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#333', flexDirection: 'row', alignItems: 'center', gap: 6 },
    btnFlex: { flex: 1, justifyContent: 'center' },
    btnActive: { backgroundColor: '#534AB7', borderColor: '#534AB7' },
    btnText: { color: '#aaa', fontSize: 13 },
    btnTextActive: { color: '#fff' },
    card: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 4, borderWidth: 1, borderColor: '#333' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    toggleLabel: { color: '#ccc', fontSize: 14 },
    toggleSub: { color: '#555', fontSize: 11, marginTop: 2 },
    changeNowBtn: { marginTop: 28, backgroundColor: '#1D9E75', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    btnActionText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    clearText: { color: '#7F77DD', fontSize: 12, fontWeight: '600', marginBottom: 10 },
    historyRow: { gap: 8, paddingVertical: 4 },
    historyCard: { width: 70, height: 105, borderRadius: 10, overflow: 'hidden', position: 'relative' },
    historyImg: { width: 70, height: 105, borderRadius: 10 },
    historyOverlay: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: 4 },
    aboutCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2a2a4e' },
    aboutInfo: { gap: 4 },
    aboutName: { color: '#fff', fontSize: 18, fontWeight: '700' },
    aboutVersion: { color: '#7F77DD', fontSize: 13, fontWeight: '600' },
    aboutFooter: { marginTop: 12, alignItems: 'center', gap: 4, paddingBottom: 8 },
    aboutFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    aboutFooterText: { color: '#aaa', fontSize: 14, fontWeight: '600' },
    aboutFooterSub: { color: '#444', fontSize: 11 },
    aboutFooterLink: { color: '#7F77DD', textDecorationLine: 'underline' },
    logoWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
    blessingWrap: { alignSelf: 'stretch', marginTop: 12, paddingHorizontal: 24, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    blessingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch' },
    blessingText: { color: '#AFA9EC', fontSize: 14, lineHeight: 20, fontWeight: '600', fontStyle: 'italic', flex: 1, flexWrap: 'wrap' },
    // BYO key
    byoHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    byoBadgeOk: { backgroundColor: 'rgba(29,158,117,0.18)', borderColor: '#1D9E75', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 14 },
    byoBadgeOkText: { color: '#1D9E75', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    byoBadgeWarn: { backgroundColor: 'rgba(255,215,0,0.15)', borderColor: '#FFD700', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 14 },
    byoBadgeWarnText: { color: '#FFD700', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    // Category picker card
    pickerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#2a2a4e', minHeight: 50 },
    pickerPreview: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
    pickerChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#2a2a4e', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    pickerChipMore: { backgroundColor: '#534AB7' },
    pickerChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    pickerEmpty: { color: '#555', fontSize: 13, fontStyle: 'italic' },
    pickerArrow: { color: '#7F77DD', fontSize: 26, fontWeight: '300', marginLeft: 8 },
    blockedCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1a1a2e', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#2a2a4e' },
    blockedIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(204,51,85,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(204,51,85,0.3)' },
    blockedTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
    blockedSub: { color: '#666', fontSize: 11, marginTop: 2 },
    byoCard: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2a2a4e', gap: 10 },
    byoCardCollapsed: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#2a2a4e' },
    byoCollapsedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    byoCollapsedLabel: { color: '#666', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
    byoCollapsedKey: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: 'monospace' },
    byoCollapsedBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#2a2a4e', borderWidth: 1, borderColor: '#3a3a5e' },
    byoCollapsedBtnText: { color: '#AFA9EC', fontSize: 13, fontWeight: '700' },
    byoCollapsedClear: { paddingTop: 10, alignItems: 'flex-start' },
    byoIntro: { color: '#aaa', fontSize: 13, lineHeight: 19 },
    byoInput: { backgroundColor: '#0a0a1a', borderColor: '#333', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: '#fff', fontSize: 13, fontFamily: 'monospace' },
    byoStatus: { fontSize: 12, fontWeight: '600' },
    byoStatusOk: { color: '#1D9E75' },
    byoStatusErr: { color: '#cc3355' },
    byoBtnRow: { flexDirection: 'row', gap: 8 },
    byoBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    byoBtnCheck: { backgroundColor: '#2a2a4e', borderWidth: 1, borderColor: '#3a3a5e' },
    byoBtnSave: { backgroundColor: '#534AB7' },
    byoBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    byoClearBtn: { paddingVertical: 8, alignItems: 'center' },
    byoClearText: { color: '#cc3355', fontSize: 12, fontWeight: '600' },
    byoHelpToggle: { paddingVertical: 6 },
    byoHelpToggleText: { color: '#7F77DD', fontSize: 13, fontWeight: '600' },
    byoHelp: { gap: 6, paddingTop: 4, paddingBottom: 4 },
    byoHelpStep: { color: '#bbb', fontSize: 12, lineHeight: 18 },
    byoHelpStepHint: { color: '#666', fontSize: 11, fontStyle: 'italic', marginTop: 4 },
    byoHelpLinkBtn: { backgroundColor: 'rgba(127,119,221,0.15)', borderWidth: 1, borderColor: '#534AB7', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
    byoHelpLinkText: { color: '#AFA9EC', fontSize: 13, fontWeight: '700' },
});
