import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mood, MOODS } from '../components/collections';
import { CollectionMeta, getCollectionMeta } from '../services/collectionService';

type IconName = keyof typeof Ionicons.glyphMap;

// Настрій → суцільний бренд-колір + мотив-іконка (рівень 1 без API-викликів,
// щоб відкриття таба не палило ліміт; реальні обкладинки — на рівні 2).
const STYLE: Record<string, { color: string; icon: IconName }> = {
    milkyway: { color: '#2A2350', icon: 'planet-outline' },
    mountains: { color: '#1B4A7A', icon: 'triangle-outline' },
    neon: { color: '#3A2F6B', icon: 'flash-outline' },
    ocean: { color: '#0E5E4C', icon: 'water-outline' },
    forest: { color: '#1E5631', icon: 'leaf-outline' },
    game: { color: '#2E6B2E', icon: 'football-outline' },
    autumn: { color: '#8A4B12', icon: 'leaf-outline' },
    winter: { color: '#2E5A86', icon: 'snow-outline' },
    minimal: { color: '#4A4A57', icon: 'ellipse-outline' },
    noir: { color: '#1b1b28', icon: 'moon-outline' },
    bloom: { color: '#93324F', icon: 'flower-outline' },
    wild: { color: '#6B4A12', icon: 'paw-outline' },
    mist: { color: '#46566B', icon: 'cloud-outline' },
    city: { color: '#3A3A4A', icon: 'business-outline' },
    horizons: { color: '#2E6B86', icon: 'navigate-outline' },
    golden: { color: '#B0701A', icon: 'sunny-outline' },
    alpenglow: { color: '#C24A2E', icon: 'partly-sunny-outline' },
    treasure: { color: '#7A5A14', icon: 'diamond-outline' },
};
const FALLBACK = { color: '#2A2350', icon: 'images-outline' as IconName };

export default function CollectionsScreen() {
    const insets = useSafeAreaInsets();
    const [mood, setMood] = useState<Mood | null>(null);
    return mood
        ? <MoodDetail mood={mood} top={insets.top} onBack={() => setMood(null)} />
        : <Grid top={insets.top} onPick={setMood} />;
}

function Grid({ top, onPick }: { top: number; onPick: (m: Mood) => void }) {
    return (
        <View style={styles.screen}>
            <View style={{ paddingTop: top + 8, paddingHorizontal: 16, paddingBottom: 6 }}>
                <Text style={styles.h1}>Колекції</Text>
                <Text style={styles.sub}>Настрої, зібрані з любов&apos;ю</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
                <View style={styles.grid}>
                    {MOODS.map(m => {
                        const s = STYLE[m.id] ?? FALLBACK;
                        return (
                            <Pressable key={m.id} style={[styles.card, { backgroundColor: s.color }]} onPress={() => onPick(m)}>
                                <Ionicons name={s.icon} size={60} color="rgba(255,255,255,0.13)" style={styles.motif} />
                                <View style={styles.cardBottom}>
                                    <Text style={styles.name} numberOfLines={1}>{m.name}</Text>
                                    <Text style={styles.cardSub} numberOfLines={2}>{m.subtitle}</Text>
                                    <Text style={styles.count}>{m.collectionIds.length} колекцій</Text>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

function MoodDetail({ mood, top, onBack }: { mood: Mood; top: number; onBack: () => void }) {
    const [metas, setMetas] = useState<CollectionMeta[] | null>(null);
    const s = STYLE[mood.id] ?? FALLBACK;

    useEffect(() => {
        let alive = true;
        if (mood.collectionIds.length === 0) { setMetas([]); return; }
        Promise.all(mood.collectionIds.map(id => getCollectionMeta(id)))
            .then(r => { if (alive) setMetas(r.filter((x): x is CollectionMeta => !!x)); })
            .catch(() => { if (alive) setMetas([]); });
        return () => { alive = false; };
    }, [mood]);

    return (
        <View style={styles.screen}>
            <View style={{ paddingTop: top + 8, paddingHorizontal: 12, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pressable onPress={onBack} hitSlop={12}><Ionicons name="arrow-back" size={24} color="#fff" /></Pressable>
                <Text style={styles.h2} numberOfLines={1}>{mood.name}</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 32 }}>
                <View style={[styles.band, { backgroundColor: s.color }]}>
                    <Ionicons name={s.icon} size={70} color="rgba(255,255,255,0.14)" style={styles.motif} />
                    <Text style={styles.bandSub} numberOfLines={2}>{mood.subtitle}</Text>
                </View>
                <Text style={styles.section}>Колекції авторів</Text>
                {mood.collectionIds.length === 0 && (
                    <Text style={styles.empty}>Збираємо власноруч — скоро тут з&apos;являться добірки.</Text>
                )}
                {metas === null && (
                    <ActivityIndicator color="#7F77DD" style={{ marginTop: 22 }} />
                )}
                {metas?.map(c => (
                    <View key={c.id} style={styles.ac}>
                        {c.cover
                            ? <Image source={{ uri: c.cover }} style={styles.cov} />
                            : <View style={[styles.cov, { backgroundColor: s.color }]} />}
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.at} numberOfLines={1}>{c.title || 'Колекція'}</Text>
                            {!!c.curator && <Text style={styles.au} numberOfLines={1}>куратор · {c.curator}</Text>}
                            <Text style={styles.ap}>{c.total} фото</Text>
                        </View>
                        <Ionicons name="bookmark-outline" size={22} color="#5c5c7a" />
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#0a0a1a' },
    h1: { color: '#fff', fontSize: 22, fontWeight: '600' },
    h2: { color: '#fff', fontSize: 18, fontWeight: '600', flex: 1 },
    sub: { color: '#8a8aa3', fontSize: 13, marginTop: 2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    card: { width: '48.5%', height: 132, borderRadius: 16, padding: 12, marginBottom: 12, overflow: 'hidden' },
    motif: { position: 'absolute', top: -6, right: -4 },
    cardBottom: { position: 'absolute', left: 12, right: 12, bottom: 11 },
    name: { color: '#fff', fontSize: 15, fontWeight: '600' },
    cardSub: { color: 'rgba(255,255,255,0.62)', fontSize: 11, marginTop: 2, lineHeight: 14 },
    count: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 7 },
    band: { height: 96, borderRadius: 16, padding: 14, overflow: 'hidden', justifyContent: 'flex-end' },
    bandSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
    section: { color: '#8a8aa3', fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 10 },
    empty: { color: '#7d7d99', fontSize: 13, lineHeight: 19 },
    ac: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#131326', borderColor: '#23233f', borderWidth: 1, borderRadius: 14, padding: 9, marginBottom: 10 },
    cov: { width: 58, height: 58, borderRadius: 11 },
    at: { color: '#fff', fontSize: 14, fontWeight: '600' },
    au: { color: '#8a8aa3', fontSize: 11.5, marginTop: 2 },
    ap: { color: '#7d7d99', fontSize: 11, marginTop: 3 },
});
