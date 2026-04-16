import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text, TouchableOpacity,
    View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { CATEGORIES, UNSPLASH_KEY } from './components/categories';
import { changeWallpaperNow, startWallpaperRotation, stopWallpaperRotation } from './wallpaperService';

const INTERVALS = [
    { label: '15 хв', value: 15 },
    { label: '30 хв', value: 30 },
    { label: '1 год', value: 60 },
    { label: '2 год', value: 120 },
    { label: '6 год', value: 360 },
    { label: '24 год', value: 1440 },
];

const APPLY_TO = [
    { label: '🔒 Заставка', value: 'lock' },
    { label: '📱 Екран', value: 'home' },
    { label: '✨ Обидва', value: 'both' },
];

export default function SettingsScreen() {
    const [interval, setIntervalVal] = useState(30);
    const [applyTo, setApplyTo] = useState('both');
    const [wifiOnly, setWifiOnly] = useState(true);
    const [chargingOnly, setChargingOnly] = useState(false);
    const [activeCategories, setActiveCategories] = useState(['space']);
    const [autoChange, setAutoChange] = useState(false);
    const [poolLoading, setPoolLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadSettings();
        }, [])
    );

    const loadSettings = async () => {
        try {
            const s = await AsyncStorage.getItem('settings');
            if (s) {
                const parsed = JSON.parse(s);
                setIntervalVal(parsed.interval ?? 30);
                setApplyTo(parsed.applyTo ?? 'both');
                setWifiOnly(parsed.wifiOnly ?? true);
                setChargingOnly(parsed.chargingOnly ?? false);
                setActiveCategories(parsed.activeCategories ?? ['space']);
                setAutoChange(parsed.autoChange ?? false);
            }
        } catch (e) { }
    };

    const loadPhotoPool = async (categories: string[]) => {
        setPoolLoading(true);
        try {
            const queries = CATEGORIES
                .filter(c => categories.includes(c.id))
                .map(c => c.query);

            const results = await Promise.all(
                queries.map(q =>
                    axios.get('https://api.unsplash.com/search/photos', {
                        params: { query: q, page: Math.ceil(Math.random() * 5), per_page: 20, orientation: 'portrait' },
                        headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
                    })
                )
            );

            const pool = results
                .flatMap(r => r.data.results)
                .map((p: any) => ({ id: p.id, url: p.urls.regular }));

            await AsyncStorage.setItem('wallpaper_pool', JSON.stringify(pool));
            await AsyncStorage.setItem('wallpaper_pool_index', '0');
            Alert.alert('✅ Пул завантажено!', `${pool.length} фото готові до автозміни`);
        } catch (e) {
            Alert.alert('Помилка', 'Не вдалось завантажити пул фото');
        }
        setPoolLoading(false);
    };

    const saveSettings = async () => {
        try {
            const settings = { interval, applyTo, wifiOnly, chargingOnly, activeCategories, autoChange };
            await AsyncStorage.setItem('settings', JSON.stringify(settings));

            if (autoChange) {
                await loadPhotoPool(activeCategories);
                await startWallpaperRotation(interval);
            } else {
                await stopWallpaperRotation();
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            Alert.alert('Помилка', 'Не вдалося зберегти налаштування');
        }
    };

    const toggleCategory = (id: string) => {
        setActiveCategories(prev =>
            prev.includes(id)
                ? prev.length === 1 ? prev : prev.filter(c => c !== id)
                : [...prev, id]
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.title}>⚙️ Налаштування</Text>

            {/* Автозміна */}
            <Text style={styles.sectionLabel}>Автозміна шпалер</Text>
            <View style={styles.card}>
                <View style={styles.toggleRow}>
                    <View>
                        <Text style={styles.toggleLabel}>🔄 Автозміна</Text>
                        <Text style={styles.toggleSub}>Шпалери міняються самі</Text>
                    </View>
                    <Switch
                        value={autoChange}
                        onValueChange={setAutoChange}
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

            <Text style={styles.sectionLabel}>Додатково</Text>
            <View style={styles.card}>
                <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>📶 Лише Wi-Fi</Text>
                    <Switch
                        value={wifiOnly}
                        onValueChange={setWifiOnly}
                        trackColor={{ false: '#333', true: '#534AB7' }}
                        thumbColor={wifiOnly ? '#fff' : '#888'}
                    />
                </View>
                <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>🔋 Лише при зарядженні</Text>
                    <Switch
                        value={chargingOnly}
                        onValueChange={setChargingOnly}
                        trackColor={{ false: '#333', true: '#534AB7' }}
                        thumbColor={chargingOnly ? '#fff' : '#888'}
                    />
                </View>
            </View>

            <TouchableOpacity
                style={[styles.saveBtn, saved && styles.saveBtnSuccess, poolLoading && styles.saveBtnLoading]}
                onPress={saveSettings}
                disabled={poolLoading}
            >
                <Text style={styles.saveBtnText}>
                    {poolLoading ? '⏳ Завантажуємо пул фото...' : saved ? '✅ Збережено!' : '💾 Зберегти налаштування'}
                </Text>
            </TouchableOpacity>

            {autoChange && (
                <TouchableOpacity
                    style={styles.changeNowBtn}
                    onPress={async () => {
                        const result = await changeWallpaperNow();
                        if (result) {
                            Alert.alert('✅ Шпалери змінено!');
                        } else {
                            Alert.alert('Помилка', 'Спочатку збережи налаштування і завантаж пул фото');
                        }
                    }}
                >
                    <Text style={styles.saveBtnText}>🔄 Змінити зараз</Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a1a', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 40 },
    title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 24 },
    sectionLabel: { fontSize: 12, color: '#7F77DD', fontWeight: '600', letterSpacing: 1, marginBottom: 10, marginTop: 20, textTransform: 'uppercase' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    row: { flexDirection: 'row', gap: 8 },
    btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#333', flexDirection: 'row', alignItems: 'center', gap: 6 },
    btnFlex: { flex: 1, alignItems: 'center' },
    btnActive: { backgroundColor: '#534AB7', borderColor: '#534AB7' },
    btnText: { color: '#aaa', fontSize: 13 },
    btnTextActive: { color: '#fff' },
    card: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 4, borderWidth: 1, borderColor: '#333' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    toggleLabel: { color: '#ccc', fontSize: 14 },
    toggleSub: { color: '#555', fontSize: 11, marginTop: 2 },
    saveBtn: { marginTop: 32, backgroundColor: '#534AB7', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    saveBtnSuccess: { backgroundColor: '#1D9E75' },
    saveBtnLoading: { backgroundColor: '#2a2a4e' },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    changeNowBtn: { marginTop: 12, backgroundColor: '#1D9E75', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
});