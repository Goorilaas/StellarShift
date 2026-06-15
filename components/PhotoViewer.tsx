import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { blockPhoto } from '../services/blocked';
import { savePhotoToGallery, sharePhoto } from '../services/photoActions';
import { setWallpaperFromUrl } from '../services/wallpaperService';
import { Photo } from './categories';
import Toast, { useToastQueue } from './Toast';

type IconName = keyof typeof Ionicons.glyphMap;

// Фуллскрін-переглядач фото з колекції: ті самі 5 дій, що в каталозі, але
// смикають спільні сервіси (нічого не дублюємо з логіки).
export default function PhotoViewer({ photo, isFav, onClose, onToggleFav, onBlocked }: {
    photo: Photo; isFav: boolean; onClose: () => void; onToggleFav: () => void; onBlocked: () => void;
}) {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { toast, showToast } = useToastQueue();
    const [setting, setSetting] = useState(false);

    const onSet = async () => {
        setSetting(true);
        try {
            const raw = await AsyncStorage.getItem('settings');
            const target = raw ? (JSON.parse(raw).applyTo ?? 'both') : 'both';
            await setWallpaperFromUrl(photo.urls.regular, target, {
                id: photo.id, small: photo.urls.small, downloadLocation: photo.links?.download_location,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
            showToast(t('catalog.toast.applied'));
        } catch {
            showToast(t('catalog.toast.applyFail'));
        } finally {
            setSetting(false);
        }
    };

    const onBlock = async () => {
        await blockPhoto({ id: photo.id, small: photo.urls.small });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
        onBlocked();
    };

    return (
        <Modal visible animationType="fade" onRequestClose={onClose}>
            <View style={styles.root}>
                <Image source={{ uri: photo.urls.regular }} style={StyleSheet.absoluteFill} resizeMode="cover" />

                <Pressable onPress={onClose} hitSlop={10} style={[styles.close, { top: insets.top + 10 }]}>
                    <Ionicons name="close" size={26} color="#fff" />
                </Pressable>
                {!!photo.user?.name && (
                    <View style={[styles.author, { top: insets.top + 12 }]}>
                        <Text style={styles.authorTxt} numberOfLines={1}>{photo.user.name}</Text>
                    </View>
                )}

                <View style={[styles.panel, { paddingBottom: insets.bottom + 16 }]}>
                    <Pressable onPress={onSet} disabled={setting} style={styles.primary}>
                        {setting
                            ? <ActivityIndicator color="#fff" />
                            : <>
                                <Ionicons name="image" size={18} color="#fff" />
                                <Text style={styles.primaryTxt}>Встановити шпалеру</Text>
                            </>}
                    </Pressable>
                    <View style={styles.row}>
                        <ActionBtn icon={isFav ? 'heart' : 'heart-outline'} label="Улюблене" hot={isFav} onPress={onToggleFav} />
                        <ActionBtn icon="share-social-outline" label="Поділитись" onPress={() => sharePhoto(photo, t, showToast)} />
                        <ActionBtn icon="download-outline" label="Зберегти" onPress={() => savePhotoToGallery(photo, t, showToast)} />
                        <ActionBtn icon="eye-off-outline" label="Сховати" onPress={onBlock} />
                    </View>
                </View>

                <Toast message={toast?.message ?? null} action={toast?.action} />
            </View>
        </Modal>
    );
}

function ActionBtn({ icon, label, onPress, hot }: { icon: IconName; label: string; onPress: () => void; hot?: boolean }) {
    return (
        <Pressable onPress={onPress} style={styles.btn} hitSlop={6}>
            <Ionicons name={icon} size={22} color={hot ? '#FF4D6D' : '#fff'} />
            <Text style={styles.btnTxt}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    close: { position: 'absolute', left: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.42)', alignItems: 'center', justifyContent: 'center', zIndex: 5 },
    author: { position: 'absolute', right: 14, backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, maxWidth: 220 },
    authorTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
    panel: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,26,0.86)', paddingTop: 16, paddingHorizontal: 16, gap: 14 },
    primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#534AB7', borderRadius: 14, paddingVertical: 13 },
    primaryTxt: { color: '#fff', fontSize: 15, fontWeight: '600' },
    row: { flexDirection: 'row', justifyContent: 'space-around' },
    btn: { alignItems: 'center', gap: 5, paddingHorizontal: 8 },
    btnTxt: { color: '#cfcfe0', fontSize: 11, fontWeight: '600' },
});
