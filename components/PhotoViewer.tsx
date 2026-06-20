import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Dimensions, Image, Modal, Pressable, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { blockPhoto } from '../services/blocked';
import { savePhotoToGallery, sharePhoto } from '../services/photoActions';
import { setWallpaperFromUrl } from '../services/wallpaperService';
import AuthorInfoModal from './AuthorInfoModal';
import { Photo } from './categories';
import { ICON } from './icons';
import Toast, { useToastQueue } from './Toast';

const { width, height } = Dimensions.get('window');

// Фуллскрін-переглядач фото з колекції. Візуально дзеркалить каталог-модалку
// (SVG-іконки, розкладка кнопок, політ серця, дабл-тап, інфо автора), логіку
// смикає зі спільних сервісів. Окремий від каталогу навмисно (A1) — якщо міняєш
// тут UI/кнопки/анімації, дзеркаль у каталог/улюблені. Див. memory.
export default function PhotoViewer({ photo, isFav, onClose, onToggleFav, onBlocked }: {
    photo: Photo; isFav: boolean; onClose: () => void; onToggleFav: () => void; onBlocked: () => void;
}) {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { toast, showToast } = useToastQueue();
    const [setting, setSetting] = useState(false);
    const [authorOpen, setAuthorOpen] = useState(false);
    const [showHeart, setShowHeart] = useState(false);
    const heartScale = useRef(new Animated.Value(0)).current;
    const heartOpacity = useRef(new Animated.Value(1)).current;
    const heartTranslateY = useRef(new Animated.Value(0)).current;
    const heartRotate = useRef(new Animated.Value(0)).current;
    const lastTapRef = useRef(0);

    // Політ серця — той самий, що в каталозі (pop + плавний підйом + легке гойдання).
    const triggerHeartAnim = () => {
        setShowHeart(true);
        heartScale.setValue(0);
        heartOpacity.setValue(0);
        heartTranslateY.setValue(0);
        heartRotate.setValue(0);
        Animated.parallel([
            Animated.sequence([
                Animated.spring(heartScale, { toValue: 1.3, useNativeDriver: true, speed: 16, bounciness: 14 }),
                Animated.spring(heartScale, { toValue: 1.1, useNativeDriver: true, speed: 12 }),
            ]),
            Animated.sequence([
                Animated.timing(heartOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
                Animated.delay(500),
                Animated.parallel([
                    Animated.timing(heartOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
                    Animated.timing(heartTranslateY, { toValue: -50, duration: 450, useNativeDriver: true }),
                    Animated.timing(heartScale, { toValue: 1.4, duration: 450, useNativeDriver: true }),
                ]),
            ]),
            Animated.sequence([
                Animated.timing(heartRotate, { toValue: -1, duration: 80, useNativeDriver: true }),
                Animated.timing(heartRotate, { toValue: 1, duration: 120, useNativeDriver: true }),
                Animated.timing(heartRotate, { toValue: 0, duration: 100, useNativeDriver: true }),
            ]),
        ]).start(() => setShowHeart(false));
    };

    // Дабл-тап (350мс) — додає в улюблені (ТІЛЬКИ додає, як у каталозі) + політ серця.
    const onImageTap = () => {
        const now = Date.now();
        if (now - lastTapRef.current < 350) {
            lastTapRef.current = 0;
            if (!isFav) { onToggleFav(); triggerHeartAnim(); }
        } else {
            lastTapRef.current = now;
        }
    };

    const onFavPress = () => {
        const wasFav = isFav;
        onToggleFav();
        if (!wasFav) triggerHeartAnim();
    };

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
                <StatusBar barStyle="light-content" />
                <Pressable onPress={onImageTap}>
                    <Image source={{ uri: photo.urls.regular }} style={styles.full} resizeMode="cover" />
                </Pressable>

                {/* Верхній scrim — статус-бар і кнопки читаються на яскравому фото (#6) */}
                <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={[styles.topScrim, { height: insets.top + 70 }]} pointerEvents="none" />

                <TouchableOpacity style={[styles.closeTop, { top: insets.top + 8 }]} onPress={onClose}>
                    <Text style={styles.closeTopText}>✕</Text>
                </TouchableOpacity>

                {!!photo.user?.name && (
                    <TouchableOpacity style={[styles.authorRow, { top: insets.top + 8 }]} onPress={() => setAuthorOpen(true)} activeOpacity={0.85}>
                        {!!photo.user.profile_image?.small && (
                            <Image source={{ uri: photo.user.profile_image.small }} style={styles.authorAvatar} />
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={styles.authorName} numberOfLines={1}>{photo.user.name}</Text>
                            <Text style={styles.authorUsername} numberOfLines={1}>@{photo.user.username} · Unsplash ›</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {showHeart && (
                    <Animated.View style={[styles.heartOverlay, { opacity: heartOpacity, transform: [{ translateY: heartTranslateY }, { scale: heartScale }, { rotate: heartRotate.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] }) }] }]} pointerEvents="none">
                        <SvgXml xml={ICON.heartGlow} width={180} height={180} />
                    </Animated.View>
                )}

                <View style={[styles.buttons, { bottom: insets.bottom + 28 }]}>
                    <TouchableOpacity style={[styles.btn, isFav && styles.btnFav]} onPress={onFavPress}>
                        <SvgXml xml={isFav ? ICON.heartFilled : ICON.heartOutline} width={18} height={18} />
                        <Text style={styles.btnText}>{isFav ? t('catalog.modal.inFav') : t('catalog.modal.addToFav')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.btnSet, setting && { opacity: 0.6 }]} onPress={onSet} disabled={setting}>
                        {setting ? <ActivityIndicator color="#fff" /> : <SvgXml xml={ICON.wallpaper} width={18} height={18} />}
                        <Text style={styles.btnText}>{setting ? t('catalog.modal.setting') : t('catalog.modal.setWallpaper')}</Text>
                    </TouchableOpacity>
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => savePhotoToGallery(photo, t, showToast)}>
                            <SvgXml xml={ICON.save} width={22} height={22} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => sharePhoto(photo, t, showToast)}>
                            <SvgXml xml={ICON.share} width={22} height={22} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={onBlock}>
                            <SvgXml xml={ICON.blocked} width={22} height={22} />
                        </TouchableOpacity>
                    </View>
                </View>

                <AuthorInfoModal photo={photo} visible={authorOpen} onClose={() => setAuthorOpen(false)} />
                <Toast message={toast?.message ?? null} action={toast?.action} />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    full: { width, height },
    topScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
    closeTop: { position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 6 },
    closeTopText: { color: '#fff', fontSize: 16 },
    authorRow: { position: 'absolute', left: 16, right: 66, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.55)', padding: 8, borderRadius: 14, zIndex: 6 },
    authorAvatar: { width: 36, height: 36, borderRadius: 18 },
    authorName: { color: '#fff', fontSize: 13, fontWeight: '600' },
    authorUsername: { color: '#aaa', fontSize: 11 },
    heartOverlay: { position: 'absolute', alignSelf: 'center', top: height / 2 - 90, zIndex: 99 },
    buttons: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    btn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', flexDirection: 'row', alignItems: 'center', gap: 8 },
    btnFav: { backgroundColor: 'rgba(83,74,183,0.8)', borderColor: '#534AB7' },
    btnSet: { marginTop: 12, borderColor: 'rgba(29,158,117,0.6)' },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
    iconBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
});
