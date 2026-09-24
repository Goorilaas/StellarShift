import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios, { isCancel } from 'axios';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAppLanguage, Lang, setAppLanguage, SUPPORTED_LANGS } from '../i18n';
import {
    ActivityIndicator,
    Animated,
    AppState,
    Easing,
    Image,
    Linking,
    Modal,
    PermissionsAndroid,
    Platform,
    Pressable,
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
import { CATEGORIES, CATEGORY_QUERIES, Category, CHAOS_CATEGORY, CHAOS_QUERIES, FAVORITES_CATEGORY, filterNoPeople, PEOPLE_TAGS, pickCategoryQueries, sortCategoriesByLabel, subCountForMix } from '../components/categories';
import { blockPhoto, BlockedPhoto, clearBlocked, getBlockedIds, restoreBlocked, unblockPhoto } from '../services/blocked';
import { useBlockedPhotos } from '../services/useBlockedPhotos';
import { getActiveCollections } from '../services/collectionSubs';
import { clearUserKey, getUnsplashKey, getUserKey, setUserKey, useUnsplashKey, validateKey } from '../services/unsplashKey';
import { openUnsplashHome } from '../services/unsplashTracking';
import BlockedManagerSheet from '../components/BlockedManagerSheet';
import HiddenCategoriesSheet from '../components/HiddenCategoriesSheet';
import CategoryPickerSheet from '../components/CategoryPickerSheet';
import ConfirmDialog from '../components/ConfirmDialog';
import { ICON } from '../components/icons';
import Toast, { useToastQueue } from '../components/Toast';

import { Blessing, nextBlessingFromQueue } from '../components/blessings';
import { GREETING_ENABLED_KEY } from '../components/LaunchGreeting';
import { changeWallpaperNow, clearHistory, disableLiveWallpaper, drainPendingActions, getHistory, HistoryEntry, isIgnoringBatteryOptimization, isLiveWallpaperActive, openLiveWallpaperPicker, PoolItem, refreshPoolNative, requestIgnoreBatteryOptimization, setLiveIntensityNative, setNotificationsEnabledNative, setNotificationStrings, setPoolRecipeNative, setSleepHoursNative, setUnsplashKeyNative, setWallpaperFromUrl, startWallpaperRotation, stopWallpaperRotation, syncNativeHistory, updateRotationSettingsNative } from '../services/wallpaperService';

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
    const { t, i18n } = useTranslation();
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
    const [activeCategories, setActiveCategories] = useState(['space']);
    const [mixCategories, setMixCategories] = useState<string[]>(DEFAULT_MIX);
    const [autoChange, setAutoChange] = useState(false);
    const [poolLoading, setPoolLoading] = useState(false);
    const [greetingEnabled, setGreetingEnabled] = useState(true);
    const [notifyEnabled, setNotifyEnabled] = useState(true);
    const [sleepEnabled, setSleepEnabled] = useState(false);
    const [sleepStart, setSleepStart] = useState(0);    // 00:00, хвилини від півночі
    const [sleepEnd, setSleepEnd] = useState(420);      // 07:00
    const [sleepPicker, setSleepPicker] = useState<'start' | 'end' | null>(null);
    const [lwActive, setLwActive] = useState(false);
    const [lwIntensity, setLwIntensity] = useState(60);
    const { toast, showToast, dismissToast } = useToastQueue();
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const blocked = useBlockedPhotos() ?? [];
    const [blockedSheetOpen, setBlockedSheetOpen] = useState(false);
    const [hiddenCats, setHiddenCats] = useState<string[]>([]);
    const [hiddenCatsSheetOpen, setHiddenCatsSheetOpen] = useState(false);
    const [favIds, setFavIds] = useState<string[]>([]);
    const [histMenuTarget, setHistMenuTarget] = useState<HistoryEntry | null>(null);
    const [clearBlockedOpen, setClearBlockedOpen] = useState(false);
    const loaded = useRef(false);
    const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Ключ налаштувань, для яких пул уже зібрано. Захищає від спурйозного
    // перезавантаження: loadSettings на КОЖЕН focus робить setState новими
    // масивами (JSON.parse) → reload-ефект порівнював за посиланням і думав
    // що змінилось. Тепер порівнюємо за ЗНАЧЕННЯМ.
    const appliedPoolKeyRef = useRef<string>('');
    const poolKeyOf = (p: { activeCategories: string[]; mixCategories: string[]; interval: number; applyTo: string }) =>
        JSON.stringify([p.activeCategories, p.mixCategories, p.interval, p.applyTo]);
    const autoChangeRef = useRef(false);
    const poolAbortRef = useRef<AbortController | null>(null);
    const rotationRequestRef = useRef(0);
    const loadAndStartRef = useRef<(rebuild?: boolean) => Promise<void>>(async () => {});

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

    // Mix перший. Потім Улюблені (спецкатегорія з AsyncStorage). Потім Chaos якщо розблокований.
    // Решта — алфавіт за поточною locale (sortCategoriesByLabel залишає stable-id у вхідному порядку).
    const categoryList = sortCategoriesByLabel([
        ...CATEGORIES.filter(c => c.id === 'mix'),
        FAVORITES_CATEGORY,
        ...(chaosUnlocked ? [CHAOS_CATEGORY] : []),
        ...CATEGORIES.filter(c => c.id !== 'mix'),
    ], t, i18n.language);
    // У "Що міксувати" Mix не показуємо, але Улюблені і Chaos (якщо розблокований) — показуємо
    const mixCategoryList = sortCategoriesByLabel([
        FAVORITES_CATEGORY,
        ...(chaosUnlocked ? [CHAOS_CATEGORY] : []),
        ...CATEGORIES.filter(c => c.id !== 'mix'),
    ], t, i18n.language);

    // ConfirmDialog для re-lock easter
    const [relockOpen, setRelockOpen] = useState(false);

    const nextBlessing = (): Blessing => nextBlessingFromQueue(blessingQueueRef);

    useEffect(() => {
        AsyncStorage.getItem('easter_unlocked').then(v => {
            if (v === '1') setChaosUnlocked(true);
        });
        AsyncStorage.getItem(GREETING_ENABLED_KEY).then(v => setGreetingEnabled(v !== '0'));
        AsyncStorage.getItem('notify_enabled').then(v => setNotifyEnabled(v !== '0'));
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
            // спершу зливаємо native-буфер (WorkManager-тіки), тоді читаємо
            syncNativeHistory().then(() => getHistory().then(setHistory));
            AsyncStorage.getItem('favorites').then(v => setFavIds(v ? JSON.parse(v) : [])).catch(() => { });
            isLiveWallpaperActive().then(setLwActive).catch(() => { });
            AsyncStorage.getItem('lw_intensity').then(v => { if (v) setLwIntensity(parseInt(v, 10)); }).catch(() => { });
            drainShadeActions().catch(() => { });
            AsyncStorage.getItem('hidden_categories').then(v => setHiddenCats(v ? JSON.parse(v) : [])).catch(() => { });
        }, [])
    );

    const loadSettings = async () => {
        try {
            const s = await AsyncStorage.getItem('settings');
            if (s) {
                const p = JSON.parse(s);
                setIntervalVal(p.interval ?? 30);
                setApplyTo(p.applyTo ?? 'both');
                setSleepEnabled(p.sleepEnabled ?? false);
                setSleepStart(p.sleepStart ?? 0);
                setSleepEnd(p.sleepEnd ?? 420);
                setActiveCategories(p.activeCategories ?? ['space']);
                setMixCategories(p.mixCategories ?? DEFAULT_MIX);
                setAutoChange(p.autoChange ?? false);
                autoChangeRef.current = p.autoChange ?? false;
                // Пул уже відповідає цим налаштуванням — не перебудовуємо на focus
                appliedPoolKeyRef.current = poolKeyOf({
                    activeCategories: p.activeCategories ?? ['space'],
                    mixCategories: p.mixCategories ?? DEFAULT_MIX,
                    interval: p.interval ?? 30,
                    applyTo: p.applyTo ?? 'both',
                });
            }
        } catch { }
        loaded.current = true;
    };

    // Auto-save to AsyncStorage on every change
    useEffect(() => {
        if (!loaded.current) return;
        AsyncStorage.setItem('settings', JSON.stringify({
            interval, applyTo, activeCategories, mixCategories, autoChange,
            sleepEnabled, sleepStart, sleepEnd,
        }));
    }, [interval, applyTo, activeCategories, mixCategories, autoChange, sleepEnabled, sleepStart, sleepEnd]);

    // Тихі години → native prefs. Без рестарту ротації — Worker читає на кожному тіку.
    useEffect(() => {
        if (!loaded.current) return;
        setSleepHoursNative(sleepEnabled, sleepStart, sleepEnd).catch(() => { });
    }, [sleepEnabled, sleepStart, sleepEnd]);

    // When rotation settings change while autoChange is ON → debounced reload.
    // Порівнюємо за ЗНАЧЕННЯМ: loadSettings на focus робить setState новими
    // масивами (JSON.parse), тож reference-deps бачили б фальшиву зміну і
    // перебудовували пул (+toast) на кожен вхід у Settings. Ключ ідентичний —
    // нічого не робимо.
    useEffect(() => {
        if (!loaded.current || !autoChangeRef.current) return;
        const key = poolKeyOf({ activeCategories, mixCategories, interval, applyTo });
        if (key === appliedPoolKeyRef.current) return;
        if (reloadTimer.current) clearTimeout(reloadTimer.current);
        // Інвалідуємо старе завантаження одразу, а не після debounce.
        rotationRequestRef.current += 1;
        poolAbortRef.current?.abort();
        const previous = appliedPoolKeyRef.current ? JSON.parse(appliedPoolKeyRef.current) : null;
        const sourceChanged = !previous || JSON.stringify(previous.slice(0, 2)) !== JSON.stringify([activeCategories, mixCategories]);
        reloadTimer.current = setTimeout(() => loadAndStartRef.current(sourceChanged), 1500);
        return () => { if (reloadTimer.current) clearTimeout(reloadTimer.current); };
    }, [activeCategories, mixCategories, interval, applyTo]);

    const loadPhotoPool = async (categories: string[]): Promise<PoolItem[] | null> => {
        // Останній виклик виграє: абортимо попередній in-flight fetch, щоб stale-пул
        // не дійшов до startWallpaperRotation і не перезаписав свіжіший у native prefs.
        poolAbortRef.current?.abort();
        const abort = new AbortController();
        poolAbortRef.current = abort;
        setPoolLoading(true);
        try {
            const queryJobs: { query: string; excludePeople: boolean; pageCount: number }[] = [];
            const seenQ = new Set<string>();
            let wantsFavorites = false;
            // Скільки під-запитів на категорію — залежить від розміру міксу під
            // бюджет ~44 запити (Варіант A): менше категорій → багатше кожній.
            const expandedIds = categories.flatMap(c =>
                c === 'mix' ? (mixCategories.length > 0 ? mixCategories : DEFAULT_MIX) : [c]);
            const apiCatCount = new Set(expandedIds.filter(c => c !== 'favorites')).size;
            const subCount = subCountForMix(apiCatCount);
            const addJob = (query: string | undefined, excludePeople: boolean, pageCount: number) => {
                if (!query || seenQ.has(query)) return;
                seenQ.add(query);
                queryJobs.push({ query, excludePeople, pageCount });
            };
            const addById = (id: string) => {
                if (id === 'favorites') {
                    wantsFavorites = true;
                } else if (id === 'chaos') {
                    // Chaos — 6 random queries з CHAOS_QUERIES (по 2 сторінки)
                    [...CHAOS_QUERIES].sort(() => Math.random() - 0.5).slice(0, 6)
                        .forEach(q => addJob(q, true, 2));
                } else {
                    // Ротаційні (гори/космос/океан/тварини/природа) → N різних
                    // під-запитів по 1 сторінці. Решта → базовий query, 2 сторінки.
                    const cat = CATEGORIES.find(c => c.id === id);
                    const subs = pickCategoryQueries(id, subCount);
                    if (subs.length > 0) {
                        subs.forEach(q => addJob(q, !!cat?.excludePeople, 1));
                    } else {
                        addJob(cat?.query, !!cat?.excludePeople, 2);
                    }
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
                        // 2 сторінки (база, рознесені) або 1 випадкова (ротаційний під-запит)
                        let pages: number[];
                        if (job.pageCount === 2) {
                            const p1 = Math.ceil(Math.random() * 5);
                            pages = [p1, p1 < 5 ? p1 + 5 : p1 - 4];
                        } else {
                            pages = [Math.ceil(Math.random() * 6)];
                        }
                        return pages.map(page =>
                            axios.get('https://api.unsplash.com/search/photos', {
                                params: { query: job.query, page, per_page: 30, orientation: 'portrait' },
                                headers: { Authorization: `Client-ID ${key}` },
                                signal: abort.signal,
                            }).then(r => ({ data: r.data.results, excludePeople: job.excludePeople }))
                        );
                    })
                )
                : [];
            // Дедуп по id + ліміт ≤2 фото на автора — розбиваємо «шпалерні ферми»
            // (один автор флудить усі запити). Author беремо з сирих Unsplash-фото
            // ДО мапи в PoolItem (там автора вже нема).
            // Приховані відсіює native при збереженні пулу; джерело лишаємо для Undo.
            const seenId = new Set<string>();
            const authorCount = new Map<string, number>();
            const apiPool: PoolItem[] = [];
            for (const p of responses.flatMap(r => (r.excludePeople ? filterNoPeople(r.data) : r.data)) as any[]) {
                if (seenId.has(p.id)) continue;
                const author = p.user?.username ?? '';
                const n = authorCount.get(author) ?? 0;
                if (author && n >= 2) continue;
                seenId.add(p.id);
                authorCount.set(author, n + 1);
                apiPool.push({ id: p.id, url: p.urls.regular, downloadLocation: p.links?.download_location });
            }

            // Favorites спершу (без author-ліміту — це власні вибори юзера), дедуп по id
            const pool: PoolItem[] = [];
            const finalSeen = new Set<string>();
            for (const p of [...favoritesPool, ...apiPool]) {
                if (finalSeen.has(p.id)) continue;
                finalSeen.add(p.id);
                pool.push(p);
            }

            // shuffle so cycle order is always different
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }

            // За час фетчу стартував новіший виклик — цей результат застарів, тихо виходимо
            if (abort.signal.aborted) return null;

            if (pool.length === 0) {
                if (wantsFavorites && queryJobs.length === 0) {
                    showToast(t('settings.toast.poolEmptyFav'));
                } else {
                    showToast(t('settings.toast.poolFail'));
                }
                return null;
            }
            return pool;
        } catch (e) {
            // Abort — не помилка: нас суперсіднув новіший виклик, без toast
            if (isCancel(e) || abort.signal.aborted) return null;
            showToast(t('settings.toast.poolFail'));
            return null;
        } finally {
            // Не гасимо спінер, якщо вже крутиться новіший виклик
            if (poolAbortRef.current === abort) setPoolLoading(false);
        }
    };

    // Будує «рецепт» для нативного щоденного перезбору: повні списки кандидатів +
    // скільки брати + скільки сторінок. Kotlin сам рандомить ротацію щодня (дані,
    // не логіка — списки запитів лишаються лише тут). Дзеркалить job-білдер
    // loadPhotoPool, але емітить КАНДИДАТІВ, а не вже обрані запити.
    const buildPoolRecipe = async (categories: string[]): Promise<string> => {
        const expandedIds = categories.flatMap(c =>
            c === 'mix' ? (mixCategories.length > 0 ? mixCategories : DEFAULT_MIX) : [c]);
        const apiCatCount = new Set(expandedIds.filter(c => c !== 'favorites')).size;
        const subCount = subCountForMix(apiCatCount);
        const jobs: { queries: string[]; pick: number; pages: number; excludePeople: boolean }[] = [];
        const seen = new Set<string>();
        let wantsFavorites = false;
        const addJobsForId = (id: string) => {
            if (id === 'favorites') { wantsFavorites = true; return; }
            if (id === 'chaos') {
                if (seen.has('__chaos')) return;
                seen.add('__chaos');
                jobs.push({ queries: [...CHAOS_QUERIES], pick: 6, pages: 2, excludePeople: true });
                return;
            }
            if (seen.has(id)) return;
            seen.add(id);
            const cat = CATEGORIES.find(c => c.id === id);
            if (!cat) return;
            const subs = CATEGORY_QUERIES[id];
            if (subs && subs.length > 0) {
                jobs.push({ queries: [...subs], pick: subCount, pages: 1, excludePeople: !!cat.excludePeople });
            } else if (cat.query) {
                jobs.push({ queries: [cat.query], pick: 1, pages: 2, excludePeople: !!cat.excludePeople });
            }
        };
        categories.forEach(catId => {
            if (catId === 'mix') (mixCategories.length > 0 ? mixCategories : DEFAULT_MIX).forEach(addJobsForId);
            else addJobsForId(catId);
        });
        let favorites: PoolItem[] = [];
        if (wantsFavorites) {
            try {
                const raw = await AsyncStorage.getItem('favorites_data');
                const favData: any[] = raw ? JSON.parse(raw) : [];
                favorites = favData
                    .filter(p => p?.id && p?.urls?.regular)
                    .map(p => ({ id: p.id, url: p.urls.regular, downloadLocation: p.links?.download_location }));
            } catch { /* favorites best-effort */ }
        }
        const blockedIds = [...(await getBlockedIds())];
        return JSON.stringify({ subCount, peopleKeywords: PEOPLE_TAGS, blockedIds, favorites, jobs });
    };

    const loadAndStart = async (rebuild = true) => {
        if (!autoChangeRef.current) return;
        const request = ++rotationRequestRef.current;
        const current = () => autoChangeRef.current && request === rotationRequestRef.current;
        try {
            const key = poolKeyOf({ activeCategories, mixCategories, interval, applyTo });
            // Інтервал/екран не змінюють склад пулу й не потребують Unsplash.
            if (!rebuild) {
                const reused = await updateRotationSettingsNative(interval, applyTo);
                if (!current()) return;
                if (reused) { appliedPoolKeyRef.current = key; return; }
            }
            const activeColl = await getActiveCollections();
            if (!current()) return;
            if (activeColl.length > 0) {
                const recipe = await buildPoolRecipe(activeCategories);
                if (!current()) return;
                await setPoolRecipeNative(recipe);
                if (!current()) return;
                const apiKey = await getUnsplashKey();
                if (!current()) return;
                await setUnsplashKeyNative(apiKey);
                if (!current()) return;
                await updateRotationSettingsNative(interval, applyTo);
                if (!current()) return;
                const applied = await refreshPoolNative();
                if (current() && applied) appliedPoolKeyRef.current = key;
                return;
            }
            const pool = await loadPhotoPool(activeCategories);
            if (!pool || !current()) return;
            const apiKey = await getUnsplashKey();
            if (!current()) return;
            await setUnsplashKeyNative(apiKey);
            if (!current()) return;
            const recipe = await buildPoolRecipe(activeCategories);
            if (!current()) return;
            await setPoolRecipeNative(recipe);
            if (!current()) return;
            await startWallpaperRotation(pool, interval, applyTo, false, false);
            if (!current()) return;
            appliedPoolKeyRef.current = key;
            showToast(t('settings.toast.poolReady', { count: pool.length }));
        } catch {
            if (current()) showToast(t('settings.toast.poolFail'));
        }
    };

    // Focus/debounce звертаються до останніх налаштувань, а не mount-closure.
    useEffect(() => { loadAndStartRef.current = loadAndStart; });

    // Android 13+: нотифікації потребують runtime-дозволу. До 13 — завжди true.
    const ensureNotifPermission = async (): Promise<boolean> => {
        if (Platform.OS !== 'android' || (Platform.Version as number) < 33) return true;
        const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        if (has) return true;
        const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        return res === PermissionsAndroid.RESULTS.GRANTED;
    };

    const handleNotifyToggle = async (value: boolean) => {
        if (value) {
            const ok = await ensureNotifPermission();
            if (!ok) {
                showToast(t('settings.toast.notifDenied'));
                return; // toggle лишається off
            }
        }
        setNotifyEnabled(value);
        AsyncStorage.setItem('notify_enabled', value ? '1' : '0').catch(() => { });
        setNotificationsEnabledNative(value).catch(() => { });
    };

    const handleAutoChangeToggle = async (value: boolean) => {
        const request = ++rotationRequestRef.current;
        poolAbortRef.current?.abort();
        autoChangeRef.current = value;
        setAutoChange(value);
        if (value) {
            // Check battery optimization — critical for background work on Samsung
            const ignoring = await isIgnoringBatteryOptimization();
            if (!ignoring) {
                await requestIgnoreBatteryOptimization();
            }
            if (!autoChangeRef.current || request !== rotationRequestRef.current) return;
            // Сповіщення-компаньйон: best-effort запит дозволу (без revert)
            if (notifyEnabled) ensureNotifPermission().catch(() => { });
            await loadAndStartRef.current();
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

    const fmtTime = (m: number): string =>
        `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

    const handleDisableLw = async () => {
        // boolean-результат: native повертає true/false (не кидає), тож фідбек завжди
        // правильний — раніше глухо ловило 'lwPickerFail' навіть при успіху.
        const ok = await disableLiveWallpaper().catch(() => false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { });
        if (ok) {
            setLwActive(false);
            showToast(t('settings.toast.lwDisabled'));
        } else {
            showToast(t('settings.toast.lwDisableFail'));
        }
    };

    const applyLwIntensity = (px: number) => {
        setLwIntensity(px);
        AsyncStorage.setItem('lw_intensity', String(px)).catch(() => { });
        setLiveIntensityNative(px).catch(() => { });
        Haptics.selectionAsync().catch(() => { });
    };

    // Локалізовані рядки нотифікації → native prefs (Kotlin не знає про i18next)
    useEffect(() => {
        setNotificationStrings({
            title: t('notif.title'),
            fav: t('notif.fav'),
            block: t('notif.block'),
            next: t('notif.next'),
            favDone: t('notif.favDone'),
            channelName: t('notif.channel'),
        }).catch(() => { });
    }, [lang, t]);

    // Приховані та пул уже оновлені receiver; тут забираємо лише улюблені.
    // Favorites: тягнемо повне фото по id; офлайн → мінімальний обʼєкт, лайк не губиться.
    const drainShadeActions = async () => {
        const { favorites: pendFav } = await drainPendingActions();
        if (pendFav.length === 0) return;
        if (pendFav.length > 0) {
            const raw = await AsyncStorage.getItem('favorites_data');
            const data: any[] = raw ? JSON.parse(raw) : [];
            let added = false;
            for (const f of pendFav) {
                if (data.some(p => p.id === f.id)) continue;
                let photo: any;
                try {
                    const key = await getUnsplashKey();
                    photo = (await axios.get(`https://api.unsplash.com/photos/${f.id}`, {
                        headers: { Authorization: `Client-ID ${key}` },
                    })).data;
                } catch {
                    photo = { id: f.id, urls: { regular: f.url, small: f.url }, user: { name: 'Unsplash', username: '' }, links: {} };
                }
                data.push(photo);
                added = true;
            }
            if (added) {
                await AsyncStorage.setItem('favorites_data', JSON.stringify(data));
                await AsyncStorage.setItem('favorites', JSON.stringify(data.map(p => p.id)));
                setFavIds(data.map(p => p.id));
            }
        }
        showToast(t('settings.toast.shadeSynced'));
    };

    // Повернення з фону на ЦЕЙ ЖЕ таб не стріляє useFocusEffect — ловимо AppState.
    // Ref оновлюється в effect (не в рендері — reactCompiler), щоб слухач
    // завжди кликав свіжий closure (loadAndStart усередині читає поточний стан).
    const refreshFromShade = () => {
        syncNativeHistory().then(() => getHistory().then(setHistory)).catch(() => { });
        drainShadeActions().catch(() => { });
        // повернення з системного LW-preview = resume → оновлюємо статус
        isLiveWallpaperActive().then(setLwActive).catch(() => { });
    };
    const refreshFromShadeRef = useRef(refreshFromShade);
    useEffect(() => { refreshFromShadeRef.current = refreshFromShade; });

    useEffect(() => {
        const sub = AppState.addEventListener('change', state => {
            if (state === 'active') refreshFromShadeRef.current();
        });
        return () => sub.remove();
    }, []);

    // ── Керування шпалерами з історії (включно з «Зараз на екрані») ──

    const timeAgo = (ts: number): string => {
        const m = Math.floor((Date.now() - ts) / 60000);
        if (m < 1) return t('settings.current.justNow');
        if (m < 60) return t('settings.current.minAgo', { count: m });
        const h = Math.floor(m / 60);
        if (h < 24) return t('settings.current.hourAgo', { count: h });
        return new Date(ts).toLocaleDateString();
    };

    // В улюблені треба ПОВНЕ фото (автор, лінки) — історія має лише id+url,
    // тому тягнемо метадані одним запитом GET /photos/:id.
    const favoriteFromHistory = async (h: HistoryEntry) => {
        setHistMenuTarget(null);
        if (favIds.includes(h.id)) {
            showToast(t('settings.toast.favExists'));
            return;
        }
        try {
            const key = await getUnsplashKey();
            const r = await axios.get(`https://api.unsplash.com/photos/${h.id}`, {
                headers: { Authorization: `Client-ID ${key}` },
            });
            const photo = r.data;
            const raw = await AsyncStorage.getItem('favorites_data');
            const data: any[] = raw ? JSON.parse(raw) : [];
            if (!data.some(p => p.id === photo.id)) {
                const newData = [...data, photo];
                await AsyncStorage.setItem('favorites_data', JSON.stringify(newData));
                await AsyncStorage.setItem('favorites', JSON.stringify(newData.map(p => p.id)));
            }
            setFavIds(prev => [...prev, h.id]);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
            showToast(t('settings.toast.favAdded'));
        } catch {
            showToast(t('settings.toast.favFetchFail'));
        }
    };

    const blockFromHistory = async (h: HistoryEntry) => {
        setHistMenuTarget(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { });
        await blockPhoto({ id: h.id, small: h.small ?? h.url });
        // silent з улюблених, як у каталозі
        if (favIds.includes(h.id)) {
            const raw = await AsyncStorage.getItem('favorites_data');
            const data: any[] = raw ? JSON.parse(raw) : [];
            const newData = data.filter(p => p.id !== h.id);
            await AsyncStorage.setItem('favorites_data', JSON.stringify(newData));
            await AsyncStorage.setItem('favorites', JSON.stringify(newData.map(p => p.id)));
            setFavIds(prev => prev.filter(id => id !== h.id));
        }
        const isCurrent = history[0]?.id === h.id;
        if (autoChangeRef.current) {
            if (isCurrent) {
                // «Прибрати гидоту»: заблокував поточну → вона зникає з екрана негайно
                try {
                    await changeWallpaperNow();
                    showToast(t('settings.toast.nastyGone'));
                } catch { /* порожній пул — нічого міняти */ }
                syncNativeHistory().then(() => getHistory().then(setHistory));
            } else {
                showToast(t('catalog.toast.blocked'));
            }
        } else {
            showToast(t('catalog.toast.blocked'));
        }
    };

    // Сховані категорії каталогу: повернення. Каталог перечитує на focus.
    const persistHiddenCats = (next: string[]) => {
        setHiddenCats(next);
        AsyncStorage.setItem('hidden_categories', JSON.stringify(next)).catch(() => { });
    };

    const restoreHiddenCat = (id: string) => {
        const next = hiddenCats.filter(c => c !== id);
        persistHiddenCats(next);
        if (next.length === 0) setHiddenCatsSheetOpen(false);
    };

    const restoreAllHiddenCats = () => {
        persistHiddenCats([]);
        setHiddenCatsSheetOpen(false);
    };

    const handleUnblock = async (id: string) => {
        const removed = blocked.find(p => p.id === id);
        await unblockPhoto(id);
        if (removed) {
            showToast(t('settings.toast.unblockedOne'), {
                label: t('common.undo'),
                onPress: () => undoUnblockOne(removed),
            }, 5000);
        }
    };

    const undoUnblockOne = async (photo: BlockedPhoto) => {
        dismissToast();
        await blockPhoto(photo);
    };

    const confirmClearBlocked = async () => {
        setClearBlockedOpen(false);
        const snapshot = await clearBlocked();
        showToast(t('settings.toast.unblockedAll', { count: snapshot.length }), {
            label: t('common.undo'),
            onPress: () => undoClearBlocked(snapshot),
        }, 5000);
    };

    const undoClearBlocked = async (snapshot: BlockedPhoto[]) => {
        dismissToast();
        await restoreBlocked(snapshot);
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

            <Text style={styles.sectionLabel}>{t('settings.section.greeting')}</Text>
            <View style={styles.card}>
                <View style={styles.toggleRow}>
                    {/* label+sub у колонку: тексти довші ніж в autoChange, інакше Switch виштовхується за край */}
                    <View style={[styles.toggleLabelRow, { flex: 1, marginRight: 10 }]}>
                        <SvgXml xml={ICON.sparkle} width={18} height={18} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.toggleLabel}>{t('settings.toggle.greeting')}</Text>
                            <Text style={styles.toggleSub}>{t('settings.toggle.greetingSub')}</Text>
                        </View>
                    </View>
                    <Switch
                        value={greetingEnabled}
                        onValueChange={(v) => { setGreetingEnabled(v); AsyncStorage.setItem(GREETING_ENABLED_KEY, v ? '1' : '0'); }}
                        trackColor={{ false: '#333', true: '#534AB7' }}
                        thumbColor={greetingEnabled ? '#fff' : '#888'}
                    />
                </View>
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

            <Text style={styles.sectionLabel}>{t('settings.section.notify')}</Text>
            <View style={styles.card}>
                <View style={styles.toggleRow}>
                    <View style={[styles.toggleLabelRow, { flex: 1, marginRight: 10 }]}>
                        <SvgXml xml={ICON.bell} width={18} height={18} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.toggleLabel}>{t('settings.toggle.notify')}</Text>
                            <Text style={styles.toggleSub}>{t('settings.toggle.notifySub')}</Text>
                        </View>
                    </View>
                    <Switch
                        value={notifyEnabled}
                        onValueChange={handleNotifyToggle}
                        trackColor={{ false: '#333', true: '#534AB7' }}
                        thumbColor={notifyEnabled ? '#fff' : '#888'}
                    />
                </View>
            </View>

            <Text style={styles.sectionLabel}>{t('settings.section.sleep')}</Text>
            <View style={styles.card}>
                <View style={styles.toggleRow}>
                    <View style={[styles.toggleLabelRow, { flex: 1, marginRight: 10 }]}>
                        <SvgXml xml={ICON.moon} width={18} height={18} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.toggleLabel}>{t('settings.toggle.sleep')}</Text>
                            <Text style={styles.toggleSub}>{t('settings.toggle.sleepSub')}</Text>
                        </View>
                    </View>
                    <Switch
                        value={sleepEnabled}
                        onValueChange={setSleepEnabled}
                        trackColor={{ false: '#333', true: '#534AB7' }}
                        thumbColor={sleepEnabled ? '#fff' : '#888'}
                    />
                </View>
                {sleepEnabled && (
                    <View style={styles.sleepTimesRow}>
                        <TouchableOpacity style={styles.sleepTimeBtn} onPress={() => setSleepPicker('start')}>
                            <Text style={styles.sleepTimeText}>{fmtTime(sleepStart)}</Text>
                        </TouchableOpacity>
                        <Text style={styles.sleepDash}>—</Text>
                        <TouchableOpacity style={styles.sleepTimeBtn} onPress={() => setSleepPicker('end')}>
                            <Text style={styles.sleepTimeText}>{fmtTime(sleepEnd)}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
            {sleepPicker && (
                <DateTimePicker
                    mode="time"
                    is24Hour
                    value={(() => {
                        const d = new Date();
                        const m = sleepPicker === 'start' ? sleepStart : sleepEnd;
                        d.setHours(Math.floor(m / 60), m % 60, 0, 0);
                        return d;
                    })()}
                    onChange={(e, date) => {
                        const which = sleepPicker;
                        setSleepPicker(null); // Android-діалог стріляє один раз
                        if (e.type !== 'set' || !date || !which) return;
                        const mins = date.getHours() * 60 + date.getMinutes();
                        if (which === 'start') setSleepStart(mins);
                        else setSleepEnd(mins);
                    }}
                />
            )}

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

            <Text style={styles.sectionLabel}>{t('settings.section.lw')}</Text>
            <View style={styles.card}>
                <View style={styles.toggleRow}>
                    <View style={[styles.toggleLabelRow, { flex: 1, marginRight: 10 }]}>
                        <SvgXml xml={ICON.live} width={18} height={18} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.toggleLabel}>{t('settings.lw.title')}</Text>
                            <Text style={styles.toggleSub}>{t('settings.lw.hint')}</Text>
                        </View>
                    </View>
                    <Text style={[styles.lwStatus, lwActive ? styles.lwStatusOn : styles.lwStatusOff]}>
                        {lwActive ? t('settings.lw.statusActive') : t('settings.lw.statusOff')}
                    </Text>
                </View>
                <Text style={styles.lwIntensityLabel}>{t('settings.lw.intensity')}</Text>
                <View style={styles.lwIntensityRow}>
                    {[{ k: 'soft', v: 30 }, { k: 'normal', v: 60 }, { k: 'strong', v: 100 }].map(opt => (
                        <TouchableOpacity
                            key={opt.k}
                            style={[styles.btn, styles.btnFlex, lwIntensity === opt.v && styles.btnActive]}
                            onPress={() => applyLwIntensity(opt.v)}
                        >
                            <Text style={[styles.btnText, lwIntensity === opt.v && styles.btnTextActive]}>
                                {t(`settings.lw.${opt.k}`)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity
                    style={styles.lwBtn}
                    onPress={() => openLiveWallpaperPicker().catch(() => showToast(t('settings.toast.lwPickerFail')))}
                >
                    <SvgXml xml={ICON.live} width={16} height={16} />
                    <Text style={styles.lwBtnText}>
                        {lwActive ? t('settings.lw.reopen') : t('settings.lw.enable')}
                    </Text>
                </TouchableOpacity>
                {lwActive && (
                    <TouchableOpacity style={styles.lwDisableBtn} onPress={handleDisableLw}>
                        <Text style={styles.lwDisableText}>{t('settings.lw.disable')}</Text>
                    </TouchableOpacity>
                )}
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

            {/* Зараз на екрані: history[0] після злиття з native-буфером */}
            {/* Один блок: картка поточної + стрічка решти історії під нею */}
            {history.length > 0 && (
                <>
                    <View style={styles.historyHeader}>
                        <Text style={styles.sectionLabel}>{t('settings.current.title')}</Text>
                        <TouchableOpacity onPress={handleClearHistory}>
                            <Text style={styles.clearText}>{t('settings.history.clear')}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.currentCard}>
                        <Image source={{ uri: history[0].small ?? history[0].url }} style={styles.currentImg} />
                        <View style={styles.currentInfo}>
                            <Text style={styles.currentSub}>
                                {timeAgo(history[0].appliedAt)} · {t(`settings.applyTo.${history[0].target}`)}
                            </Text>
                            <View style={styles.currentActions}>
                                <TouchableOpacity
                                    style={styles.currentActionBtn}
                                    onPress={() => favoriteFromHistory(history[0])}
                                >
                                    <SvgXml xml={favIds.includes(history[0].id) ? ICON.heartFilled : ICON.heartOutline} width={20} height={20} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.currentActionBtn}
                                    onPress={() => blockFromHistory(history[0])}
                                >
                                    <SvgXml xml={ICON.blocked} width={20} height={20} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                    {history.length > 1 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.historyStrip}
                            contentContainerStyle={styles.historyRow}
                        >
                            {history.slice(1).map(h => (
                                <TouchableOpacity
                                    key={`${h.id}-${h.appliedAt}`}
                                    style={styles.historyCard}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                                        setHistMenuTarget(h); // тап = багате меню (улюблені / блок / застосувати)
                                    }}
                                >
                                    <Image source={{ uri: h.small ?? h.url }} style={styles.historyImg} />
                                    <View style={styles.historyOverlay}>
                                        <SvgXml xml={ICON.refresh} width={14} height={14} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
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

            {/* Сховані категорії (long-press на чіп у каталозі) */}
            {hiddenCats.length > 0 && (
                <>
                    <Text style={styles.sectionLabel}>{t('settings.section.hiddenCats')}</Text>
                    <TouchableOpacity style={styles.blockedCard} onPress={() => setHiddenCatsSheetOpen(true)} activeOpacity={0.75}>
                        <View style={styles.blockedIconWrap}>
                            <SvgXml xml={ICON.blocked} width={22} height={22} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.blockedTitle}>{t('settings.hiddenCats.title', { count: hiddenCats.length })}</Text>
                            <Text style={styles.blockedSub}>{t('settings.hiddenCats.sub')}</Text>
                        </View>
                        <Text style={styles.pickerArrow}>›</Text>
                    </TouchableOpacity>
                </>
            )}

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
                    <SvgXml xml={ICON.heartFilled} width={20} height={20} />
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
        {/* Long-press меню запису історії: улюблені / більше ніколи / застосувати */}
        <Modal visible={!!histMenuTarget} transparent animationType="fade" onRequestClose={() => setHistMenuTarget(null)}>
            <Pressable style={styles.histMenuBackdrop} onPress={() => setHistMenuTarget(null)}>
                {histMenuTarget && (
                    <Pressable style={styles.histMenuCard} onPress={() => { }}>
                        <Image source={{ uri: histMenuTarget.small ?? histMenuTarget.url }} style={styles.histMenuPreview} />
                        <TouchableOpacity style={styles.histMenuRow} onPress={() => favoriteFromHistory(histMenuTarget)}>
                            <SvgXml xml={favIds.includes(histMenuTarget.id) ? ICON.heartFilled : ICON.heartOutline} width={16} height={16} />
                            <Text style={styles.histMenuRowText}>{t('settings.histMenu.favorite')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.histMenuRow} onPress={() => blockFromHistory(histMenuTarget)}>
                            <SvgXml xml={ICON.blocked} width={16} height={16} />
                            <Text style={styles.histMenuRowText}>{t('settings.histMenu.block')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.histMenuRow} onPress={() => { const h = histMenuTarget; setHistMenuTarget(null); handleReapply(h); }}>
                            <SvgXml xml={ICON.refresh} width={16} height={16} />
                            <Text style={styles.histMenuRowText}>{t('settings.histMenu.reapply')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.histMenuCancel} onPress={() => setHistMenuTarget(null)}>
                            <Text style={styles.histMenuCancelText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </Pressable>
                )}
            </Pressable>
        </Modal>
        <HiddenCategoriesSheet
            visible={hiddenCatsSheetOpen}
            hidden={hiddenCats
                .map(id => (id === 'chaos' ? CHAOS_CATEGORY : CATEGORIES.find(c => c.id === id)))
                .filter((c): c is Category => !!c)}
            onRestore={restoreHiddenCat}
            onRestoreAll={restoreAllHiddenCats}
            onClose={() => setHiddenCatsSheetOpen(false)}
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
    lwStatus: { fontSize: 12, fontWeight: '700' },
    lwStatusOn: { color: '#1D9E75' },
    lwStatusOff: { color: '#555' },
    lwBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginHorizontal: 16, marginBottom: 14, paddingVertical: 12,
        borderRadius: 12, borderWidth: 1, borderColor: '#7F77DD',
        backgroundColor: 'rgba(127,119,221,0.12)',
    },
    lwBtnText: { color: '#AFA9EC', fontSize: 14, fontWeight: '700' },
    lwDisableBtn: { alignItems: 'center', marginHorizontal: 16, marginBottom: 14, marginTop: -4, paddingVertical: 10 },
    lwDisableText: { color: '#cc3355', fontSize: 13, fontWeight: '700' },
    lwIntensityLabel: { color: '#7a7a90', fontSize: 12, paddingHorizontal: 16, marginTop: 4, marginBottom: 8 },
    lwIntensityRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 14 },
    sleepTimesRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
    sleepTimeBtn: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4e', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 18 },
    sleepTimeText: { color: '#e8e6f5', fontSize: 15, fontWeight: '600', letterSpacing: 0.5 },
    sleepDash: { color: '#555', fontSize: 15 },
    historyStrip: { marginTop: 10 },
    historyRow: { gap: 8, paddingVertical: 4 },
    historyCard: { width: 70, height: 105, borderRadius: 10, overflow: 'hidden', position: 'relative' },
    historyImg: { width: 70, height: 105, borderRadius: 10 },
    historyOverlay: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: 4 },
    currentCard: {
        flexDirection: 'row', gap: 14, backgroundColor: '#15152a', borderRadius: 14,
        borderWidth: 1, borderColor: '#232347', padding: 12, alignItems: 'center',
    },
    currentImg: { width: 84, height: 126, borderRadius: 10, backgroundColor: '#1a1a2e' },
    currentInfo: { flex: 1, gap: 12 },
    currentSub: { color: '#7a7a90', fontSize: 13 },
    currentActions: { flexDirection: 'row', gap: 14 },
    currentActionBtn: {
        width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#2a2a4e',
        backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center',
    },
    histMenuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    histMenuCard: {
        backgroundColor: '#15152a', borderRadius: 18, borderWidth: 1, borderColor: '#232347',
        paddingVertical: 8, width: 260, overflow: 'hidden',
    },
    histMenuPreview: { width: 260, height: 130, marginTop: -8, marginBottom: 4 },
    histMenuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 13 },
    histMenuRowText: { color: '#e8e6f5', fontSize: 14 },
    histMenuCancel: { alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#232347' },
    histMenuCancelText: { color: '#9b96d0', fontSize: 14, fontWeight: '600' },
    aboutCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2a2a4e' },
    aboutInfo: { gap: 4 },
    aboutName: { color: '#fff', fontSize: 18, fontWeight: '700' },
    aboutVersion: { color: '#7F77DD', fontSize: 13, fontWeight: '600' },
    aboutFooter: { marginTop: 12, alignItems: 'center', gap: 4, paddingBottom: 8 },
    aboutFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    aboutFooterText: { color: '#aaa', fontSize: 14, fontWeight: '600' },
    aboutFooterSub: { color: '#444', fontSize: 11 },
    aboutFooterLink: { color: '#7F77DD', textDecorationLine: 'underline' },
    logoWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
    blessingWrap: { alignSelf: 'stretch', marginTop: 12, paddingHorizontal: 24, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    blessingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch' },
    blessingText: { color: '#AFA9EC', fontSize: 14, lineHeight: 20, fontWeight: '600', fontStyle: 'italic', flexShrink: 1, flexWrap: 'wrap', textAlign: 'center' },
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
