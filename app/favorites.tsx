import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Photo } from '../components/categories';
import FavoriteHeart from '../components/FavoriteHeart';
import { ICON } from '../components/icons';
import Toast, { useToastQueue } from '../components/Toast';
import { setWallpaperFromUrl } from '../services/wallpaperService';
import { openAuthorProfile, trackDownload } from '../services/unsplashTracking';
import { ensureGalleryPermission } from '../services/galleryPermission';
import { randomCheer } from '../services/cheer';

const { width, height } = Dimensions.get('window');
const IMG_SIZE = (width - 36) / 2;

export default function FavoritesScreen() {
    const { t } = useTranslation();
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [setting, setSetting] = useState<boolean>(false);
    const { toast, showToast, dismissToast } = useToastQueue();
    const { bottom, top } = useSafeAreaInsets();
    const router = useRouter();

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
        const snapshot = photos;
        const newPhotos = photos.filter(p => p.id !== photo.id);
        setPhotos(newPhotos);
        await AsyncStorage.setItem('favorites_data', JSON.stringify(newPhotos));
        await AsyncStorage.setItem('favorites', JSON.stringify(newPhotos.map(p => p.id)));
        setSelectedPhoto(null);
        showToast(t('favorites.toast.removed'), {
            label: t('common.undo'),
            onPress: () => undoRemove(snapshot),
        }, 5000);
    };

    const undoRemove = async (snapshot: Photo[]) => {
        dismissToast();
        setPhotos(snapshot);
        await AsyncStorage.setItem('favorites_data', JSON.stringify(snapshot));
        await AsyncStorage.setItem('favorites', JSON.stringify(snapshot.map(p => p.id)));
        showToast(t('favorites.toast.undone'));
    };

    const setAsWallpaper = async (photo: Photo) => {
        setSetting(true);
        showToast(randomCheer(t));
        try {
            const s = await AsyncStorage.getItem('settings');
            const target = s ? (JSON.parse(s).applyTo ?? 'both') : 'both';
            await setWallpaperFromUrl(photo.urls.regular, target, { id: photo.id, small: photo.urls.small, downloadLocation: photo.links?.download_location });
            setSelectedPhoto(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
            showToast(t('favorites.toast.applied'));
        } catch {
            showToast(t('favorites.toast.applyFail'));
        } finally {
            setSetting(false);
        }
    };

    const saveToGallery = async (photo: Photo) => {
        try {
            const granted = await ensureGalleryPermission(t);
            if (!granted) return;
            showToast(randomCheer(t));
            const dest = (FileSystem.cacheDirectory ?? '') + `stellarshift_${photo.id}.jpg`;
            const { uri } = await FileSystem.downloadAsync(photo.urls.regular, dest);
            await MediaLibrary.saveToLibraryAsync(uri);
            try { await FileSystem.deleteAsync(dest, { idempotent: true }); } catch { }
            trackDownload(photo.links?.download_location);
            showToast(t('favorites.toast.saved'));
        } catch {
            showToast(t('favorites.toast.downloadFail'));
        }
    };

    const sharePhoto = async (photo: Photo) => {
        try {
            if (!(await Sharing.isAvailableAsync())) {
                showToast(t('favorites.toast.shareUnavailable'));
                return;
            }
            showToast(t('favorites.toast.preparing'));
            const dest = (FileSystem.cacheDirectory ?? '') + `stellarshift_share_${photo.id}.jpg`;
            const { uri } = await FileSystem.downloadAsync(photo.urls.regular, dest);
            await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: t('catalog.shareDialog') });
            try { await FileSystem.deleteAsync(dest, { idempotent: true }); } catch { }
            trackDownload(photo.links?.download_location);
        } catch {
            showToast(t('favorites.toast.shareFail'));
        }
    };

    const renderPhoto = ({ item }: { item: Photo }) => (
        <TouchableOpacity style={styles.photoCard} onPress={() => setSelectedPhoto(item)} activeOpacity={0.85}>
            <Image source={{ uri: item.urls.small }} style={styles.photo} resizeMode="cover" />
            {/* Всі тут улюблені → серце filled, тап = швидко зняти (з undo) */}
            <FavoriteHeart active onToggle={() => removeFavorite(item)} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.titleRow}>
                <SvgXml xml={ICON.heartFilled} width={22} height={22} />
                <Text style={styles.title}>{t('favorites.title')}</Text>
            </View>

            {photos.length === 0 ? (
                <View style={styles.empty}>
                    <SvgXml xml={ICON.heartOutline} width={84} height={84} />
                    <Text style={styles.emptyText}>{t('favorites.empty.title')}</Text>
                    <Text style={styles.emptySub}>{t('favorites.empty.sub')}</Text>
                    <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/')}>
                        <SvgXml xml={ICON.search} width={16} height={16} />
                        <Text style={styles.emptyCtaText}>{t('favorites.empty.cta')}</Text>
                    </TouchableOpacity>
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

                    {selectedPhoto?.user && (
                        <TouchableOpacity
                            style={[styles.authorChip, { top: top + 12 }]}
                            onPress={() => openAuthorProfile(selectedPhoto.user.username)}
                            activeOpacity={0.85}
                        >
                            {selectedPhoto.user.profile_image?.small && (
                                <Image
                                    source={{ uri: selectedPhoto.user.profile_image.small }}
                                    style={styles.authorChipAvatar}
                                />
                            )}
                            <View style={{ flex: 1 }}>
                                <Text style={styles.authorChipName} numberOfLines={1}>
                                    {selectedPhoto.user.name}
                                </Text>
                                <Text style={styles.authorChipHandle} numberOfLines={1}>
                                    @{selectedPhoto.user.username} · Unsplash ›
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    <View style={[styles.modalButtons, { bottom: bottom + 16 }]}>
                        <TouchableOpacity
                            style={[styles.modalBtn, styles.modalBtnPrimary, setting && { opacity: 0.6 }]}
                            onPress={() => selectedPhoto && setAsWallpaper(selectedPhoto)}
                            disabled={setting}
                        >
                            <SvgXml xml={ICON.wallpaper} width={18} height={18} />
                            <Text style={styles.modalBtnText}>
                                {setting ? t('favorites.modal.setting') : t('favorites.modal.setWallpaper')}
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

            <Toast message={toast?.message ?? null} action={toast?.action} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a1a', paddingTop: 50 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
    title: { fontSize: 22, fontWeight: '700', color: '#fff' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
    emptyText: { fontSize: 18, color: '#fff', fontWeight: '700', textAlign: 'center' },
    emptySub: { fontSize: 13, color: '#7a7a90', textAlign: 'center', lineHeight: 19, paddingHorizontal: 8 },
    emptyCta: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 24, backgroundColor: '#534AB7', borderWidth: 1, borderColor: '#7F77DD' },
    emptyCtaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
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
    authorChip: { position: 'absolute', left: 12, right: 60, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 22, paddingVertical: 6, paddingHorizontal: 8, paddingRight: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    authorChipAvatar: { width: 32, height: 32, borderRadius: 16 },
    authorChipName: { color: '#fff', fontSize: 13, fontWeight: '700' },
    authorChipHandle: { color: '#bbb', fontSize: 11, marginTop: 1 },
});
