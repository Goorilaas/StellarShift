import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { Photo } from './components/categories';
import { ICON } from './components/icons';
import Toast from './components/Toast';
import { setWallpaperFromUrl } from './wallpaperService';

const { width, height } = Dimensions.get('window');
const IMG_SIZE = (width - 36) / 2;

export default function FavoritesScreen() {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [setting, setSetting] = useState<boolean>(false);
    const [toast, setToast] = useState<string | null>(null);
    const { bottom } = useSafeAreaInsets();

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    useFocusEffect(
        useCallback(() => {
            loadFavorites();
        }, [])
    );

    const loadFavorites = async () => {
        const saved = await AsyncStorage.getItem('favorites_data');
        setPhotos(saved ? JSON.parse(saved) : []);
    };

    const removeFavorite = async (photo: Photo) => {
        const newPhotos = photos.filter(p => p.id !== photo.id);
        setPhotos(newPhotos);
        await AsyncStorage.setItem('favorites_data', JSON.stringify(newPhotos));
        await AsyncStorage.setItem('favorites', JSON.stringify(newPhotos.map(p => p.id)));
        setSelectedPhoto(null);
    };

    const setAsWallpaper = async (photo: Photo) => {
        setSetting(true);
        try {
            const s = await AsyncStorage.getItem('settings');
            const target = s ? (JSON.parse(s).applyTo ?? 'both') : 'both';
            await setWallpaperFromUrl(photo.urls.regular, target, { id: photo.id, small: photo.urls.small });
            setSelectedPhoto(null);
            showToast('✅ Красу встановлено!');
        } catch {
            showToast('❌ Не вдалося встановити');
        } finally {
            setSetting(false);
        }
    };

    const saveToGallery = async (photo: Photo) => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                showToast('❌ Потрібен дозвіл для збереження');
                return;
            }
            showToast('⏳ Завантажуємо...');
            const dest = (FileSystem.cacheDirectory ?? '') + `stellarshift_${photo.id}.jpg`;
            const { uri } = await FileSystem.downloadAsync(photo.urls.regular, dest);
            await MediaLibrary.saveToLibraryAsync(uri);
            try { await FileSystem.deleteAsync(dest, { idempotent: true }); } catch { }
            showToast('✅ Збережено в галерею!');
        } catch {
            showToast('❌ Не вдалося завантажити');
        }
    };

    const sharePhoto = async (photo: Photo) => {
        try {
            if (!(await Sharing.isAvailableAsync())) {
                showToast('❌ Поділитись недоступно');
                return;
            }
            showToast('⏳ Готуємо...');
            const dest = (FileSystem.cacheDirectory ?? '') + `stellarshift_share_${photo.id}.jpg`;
            const { uri } = await FileSystem.downloadAsync(photo.urls.regular, dest);
            await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Поділитись шпалерами' });
            try { await FileSystem.deleteAsync(dest, { idempotent: true }); } catch { }
        } catch {
            showToast('❌ Не вдалося поділитись');
        }
    };

    const renderPhoto = ({ item }: { item: Photo }) => (
        <TouchableOpacity style={styles.photoCard} onPress={() => setSelectedPhoto(item)}>
            <Image source={{ uri: item.urls.small }} style={styles.photo} resizeMode="cover" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.titleRow}>
                <SvgXml xml={ICON.heartFilled} width={22} height={22} />
                <Text style={styles.title}>Улюблені</Text>
            </View>

            {photos.length === 0 ? (
                <View style={styles.empty}>
                    <SvgXml xml={ICON.galaxy} width={80} height={80} />
                    <Text style={styles.emptyText}>Ще немає збережених шпалер</Text>
                    <Text style={styles.emptySub}>Утримуй картинку в каталозі щоб додати</Text>
                </View>
            ) : (
                <FlatList
                    data={photos}
                    numColumns={2}
                    keyExtractor={i => i.id}
                    columnWrapperStyle={styles.row}
                    renderItem={renderPhoto}
                />
            )}

            <Modal
                visible={!!selectedPhoto}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedPhoto(null)}
            >
                <View style={styles.modalBg}>
                    <TouchableWithoutFeedback onPress={() => setSelectedPhoto(null)}>
                        <Image
                            source={{ uri: selectedPhoto?.urls?.regular }}
                            style={[styles.fullImage, StyleSheet.absoluteFill]}
                            resizeMode="cover"
                        />
                    </TouchableWithoutFeedback>

                    <View style={[styles.modalButtons, { bottom: bottom + 16 }]}>
                        <TouchableOpacity
                            style={[styles.modalBtn, styles.modalBtnPrimary, setting && { opacity: 0.6 }]}
                            onPress={() => selectedPhoto && setAsWallpaper(selectedPhoto)}
                            disabled={setting}
                        >
                            <SvgXml xml={ICON.wallpaper} width={18} height={18} />
                            <Text style={styles.modalBtnText}>
                                {setting ? 'Встановлюємо...' : 'Встановити'}
                            </Text>
                        </TouchableOpacity>
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => selectedPhoto && saveToGallery(selectedPhoto)}>
                                <SvgXml xml={ICON.save} width={22} height={22} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => selectedPhoto && sharePhoto(selectedPhoto)}>
                                <SvgXml xml={ICON.share} width={22} height={22} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.iconBtn, { borderColor: 'rgba(204,51,85,0.6)' }]}
                                onPress={() => selectedPhoto && removeFavorite(selectedPhoto)}
                            >
                                <SvgXml xml={ICON.heartBroken} width={24} height={24} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Toast message={toast} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a1a', paddingTop: 50 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
    title: { fontSize: 22, fontWeight: '700', color: '#fff' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyText: { fontSize: 18, color: '#fff', fontWeight: '600' },
    emptySub: { fontSize: 13, color: '#555', textAlign: 'center', paddingHorizontal: 40 },
    row: { paddingHorizontal: 12, gap: 12, marginBottom: 12 },
    photoCard: { borderRadius: 12, overflow: 'hidden' },
    photo: { width: IMG_SIZE, height: IMG_SIZE * 1.5, borderRadius: 12 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
    fullImage: { width: width, height: height },
    modalButtons: { position: 'absolute', left: 24, right: 24, gap: 10, alignItems: 'center' },
    modalBtn: { paddingVertical: 16, borderRadius: 18, alignItems: 'center', borderWidth: 1, flexDirection: 'row', justifyContent: 'center', gap: 8, alignSelf: 'stretch' },
    modalBtnPrimary: { backgroundColor: 'rgba(83,74,183,0.85)', borderColor: '#534AB7' },
    modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
    iconBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
});
