import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { CATEGORIES, filterNoPeople, UNSPLASH_KEY } from './components/categories';

const DEFAULT_MIX = CATEGORIES.filter(c => c.id !== 'mix').map(c => c.id);
import { ICON } from './components/icons';
import Toast from './components/Toast';
import { changeWallpaperNow, clearHistory, getHistory, HistoryEntry, isIgnoringBatteryOptimization, PoolItem, requestIgnoreBatteryOptimization, setWallpaperFromUrl, startWallpaperRotation, stopWallpaperRotation } from './wallpaperService';

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
    { label: '15 хв', value: 15 },
    { label: '30 хв', value: 30 },
    { label: '1 год', value: 60 },
    { label: '2 год', value: 120 },
    { label: '6 год', value: 360 },
    { label: '24 год', value: 1440 },
];

const APPLY_TO = [
    { label: 'Заставка', value: 'lock', icon: ICON.lock },
    { label: 'Екран', value: 'home', icon: ICON.phone },
    { label: 'Обидва', value: 'both', icon: ICON.both },
];

export default function SettingsScreen() {
    const [interval, setIntervalVal] = useState(30);
    const [applyTo, setApplyTo] = useState('both');
    const [wifiOnly, setWifiOnly] = useState(true);
    const [chargingOnly, setChargingOnly] = useState(false);
    const [activeCategories, setActiveCategories] = useState(['space']);
    const [mixCategories, setMixCategories] = useState<string[]>(DEFAULT_MIX);
    const [autoChange, setAutoChange] = useState(false);
    const [poolLoading, setPoolLoading] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const loaded = useRef(false);
    const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoChangeRef = useRef(false);

    useFocusEffect(
        useCallback(() => {
            loadSettings();
            getHistory().then(setHistory);
        }, [])
    );

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
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
            const addCat = (cat: { query: string; excludePeople?: boolean } | undefined) => {
                if (!cat?.query || seenQ.has(cat.query)) return;
                seenQ.add(cat.query);
                queryJobs.push({ query: cat.query, excludePeople: !!cat.excludePeople });
            };
            categories.forEach(catId => {
                if (catId === 'mix') {
                    const mixIds = mixCategories.length > 0 ? mixCategories : DEFAULT_MIX;
                    mixIds.forEach(id => addCat(CATEGORIES.find(c => c.id === id)));
                } else {
                    addCat(CATEGORIES.find(c => c.id === catId));
                }
            });
            const responses = await Promise.all(
                queryJobs.flatMap(job => {
                    const p1 = Math.ceil(Math.random() * 5);
                    const p2 = p1 < 5 ? p1 + 5 : p1 - 4;
                    return [p1, p2].map(page =>
                        axios.get('https://api.unsplash.com/search/photos', {
                            params: { query: job.query, page, per_page: 30, orientation: 'portrait' },
                            headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
                        }).then(r => ({ data: r.data.results, excludePeople: job.excludePeople }))
                    );
                })
            );
            const seen = new Set<string>();
            const pool: PoolItem[] = responses
                .flatMap(r => (r.excludePeople ? filterNoPeople(r.data) : r.data))
                .filter((p: any) => {
                    if (seen.has(p.id)) return false;
                    seen.add(p.id);
                    return true;
                })
                .map((p: any) => ({ id: p.id, url: p.urls.regular }));

            // shuffle so cycle order is always different
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }

            if (pool.length === 0) throw new Error('0 фото');
            return pool;
        } catch {
            showToast('❌ Не вдалось завантажити пул фото');
            return null;
        } finally {
            setPoolLoading(false);
        }
    };

    const loadAndStart = async () => {
        const pool = await loadPhotoPool(activeCategories);
        if (!pool) return;
        await startWallpaperRotation(pool, interval, applyTo, wifiOnly, chargingOnly);
        showToast(`✅ ${pool.length} фото готові до автозміни`);
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
            showToast('⏹ Автозміну зупинено');
        }
    };

    const handleReapply = (entry: HistoryEntry) => {
        const targetLabel = entry.target === 'lock' ? 'Заставку' : entry.target === 'home' ? 'Екран' : 'Обидва';
        Alert.alert('Застосувати знову?', `Шпалери буде встановлено на «${targetLabel}»`, [
            { text: 'Скасувати', style: 'cancel' },
            {
                text: 'Застосувати', onPress: async () => {
                    try {
                        await setWallpaperFromUrl(entry.url, entry.target, { id: entry.id, small: entry.small });
                        showToast('✅ Шпалери встановлено!');
                        getHistory().then(setHistory);
                    } catch {
                        showToast('❌ Не вдалось застосувати');
                    }
                },
            },
        ]);
    };

    const handleClearHistory = () => {
        Alert.alert('Очистити історію?', 'Всі записи буде видалено', [
            { text: 'Скасувати', style: 'cancel' },
            {
                text: 'Очистити', style: 'destructive', onPress: async () => {
                    await clearHistory();
                    setHistory([]);
                },
            },
        ]);
    };

    const toggleCategory = (id: string) => {
        setActiveCategories(prev =>
            prev.includes(id)
                ? prev.length === 1 ? prev : prev.filter(c => c !== id)
                : [...prev, id]
        );
    };

    const toggleMixCategory = (id: string) => {
        setMixCategories(prev =>
            prev.includes(id)
                ? prev.length === 1 ? prev : prev.filter(c => c !== id)
                : [...prev, id]
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
            <View style={styles.titleRow}>
                <SvgXml xml={ICON.gear} width={24} height={24} />
                <Text style={styles.title}>Налаштування</Text>
            </View>

            <Text style={styles.sectionLabel}>Автозміна шпалер</Text>
            <View style={styles.card}>
                <View style={styles.toggleRow}>
                    <View style={styles.toggleLabelRow}>
                        <SvgXml xml={ICON.refresh} width={18} height={18} />
                        <Text style={styles.toggleLabel}>Автозміна</Text>
                        <Text style={styles.toggleSub}>
                            {poolLoading ? 'Завантажуємо фото...' : 'Шпалери міняються самі'}
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

            <Text style={styles.sectionLabel}>Інтервал зміни</Text>
            <View style={styles.grid}>
                {INTERVALS.map(i => (
                    <TouchableOpacity
                        key={i.value}
                        style={[styles.btn, interval === i.value && styles.btnActive]}
                        onPress={() => setIntervalVal(i.value)}
                    >
                        <Text style={[styles.btnText, interval === i.value && styles.btnTextActive]}>
                            {i.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.sectionLabel}>Застосувати до</Text>
            <View style={styles.row}>
                {APPLY_TO.map(a => (
                    <TouchableOpacity
                        key={a.value}
                        style={[styles.btn, styles.btnFlex, applyTo === a.value && styles.btnActive]}
                        onPress={() => setApplyTo(a.value)}
                    >
                        <SvgXml xml={a.icon} width={15} height={15} />
                        <Text style={[styles.btnText, applyTo === a.value && styles.btnTextActive]}>
                            {a.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.sectionLabel}>Категорії для автозміни</Text>
            <View style={styles.grid}>
                {CATEGORIES.map(c => (
                    <TouchableOpacity
                        key={c.id}
                        style={[styles.btn, activeCategories.includes(c.id) && styles.btnActive]}
                        onPress={() => toggleCategory(c.id)}
                    >
                        <SvgXml xml={c.icon} width={14} height={14} />
                        <Text style={[styles.btnText, activeCategories.includes(c.id) && styles.btnTextActive]}>
                            {c.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.sectionLabel}>Що міксувати</Text>
            <Text style={styles.sectionHint}>З яких категорій збирати «Мікс» у каталозі та автозміні</Text>
            <View style={styles.grid}>
                {CATEGORIES.filter(c => c.id !== 'mix').map(c => (
                    <TouchableOpacity
                        key={c.id}
                        style={[styles.btn, mixCategories.includes(c.id) && styles.btnActive]}
                        onPress={() => toggleMixCategory(c.id)}
                    >
                        <SvgXml xml={c.icon} width={14} height={14} />
                        <Text style={[styles.btnText, mixCategories.includes(c.id) && styles.btnTextActive]}>
                            {c.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.sectionLabel}>Додатково</Text>
            <View style={styles.card}>
                <View style={styles.toggleRow}>
                    <View style={styles.toggleLabelRow}>
                        <SvgXml xml={ICON.wifi} width={18} height={18} />
                        <Text style={styles.toggleLabel}>Лише Wi-Fi</Text>
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
                        <Text style={styles.toggleLabel}>Лише при зарядженні</Text>
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
                            showToast('✅ Шпалери змінено!');
                        } catch {
                            showToast('❌ Спочатку увімкни автозміну');
                        }
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <SvgXml xml={ICON.refresh} width={18} height={18} />
                        <Text style={styles.btnActionText}>Змінити зараз</Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* Історія */}
            {history.length > 0 && (
                <>
                    <View style={styles.historyHeader}>
                        <Text style={styles.sectionLabel}>Історія шпалер</Text>
                        <TouchableOpacity onPress={handleClearHistory}>
                            <Text style={styles.clearText}>Очистити</Text>
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

            {/* Про застосунок */}
            <Text style={styles.sectionLabel}>Про застосунок</Text>
            <View style={styles.aboutCard}>
                <SvgXml xml={ABOUT_LOGO} width={56} height={56} />
                <View style={styles.aboutInfo}>
                    <Text style={styles.aboutName}>StellarShift</Text>
                    <Text style={styles.aboutVersion}>Версія 3.1.1</Text>
                </View>
            </View>
            <View style={styles.aboutFooter}>
                <View style={styles.aboutFooterRow}>
                    <Text style={styles.aboutFooterText}>Розроблено з</Text>
                    <SvgXml xml={ICON_HANDSHAKE} width={20} height={20} />
                    <Text style={styles.aboutFooterText}>Братаном</Text>
                </View>
                <Text style={styles.aboutFooterSub}>Powered by Unsplash · WorkManager · Claude</Text>
            </View>

        </ScrollView>
        <Toast message={toast} />
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
});
