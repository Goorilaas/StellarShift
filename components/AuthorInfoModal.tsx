import { useTranslation } from 'react-i18next';
import { Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { openAuthorProfile } from '../services/unsplashTracking';
import { Photo } from './categories';

// Спільна модалка автора для каталогу / улюблених / колекцій (винесено з каталогу
// у v4.0.6). A1: цілий переглядач лишаємо окремим на напрямок, але цей лист —
// чистий presentational, без зв'язку з пейджером/станом батька — безпечно ділити.
export default function AuthorInfoModal({ photo, visible, onClose }: {
    photo: Photo | null; visible: boolean; onClose: () => void;
}) {
    const { t } = useTranslation();
    return (
        <Modal visible={visible && !!photo} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                    {photo && (
                        <>
                            <View style={styles.header}>
                                <Image source={{ uri: photo.user.profile_image?.medium || photo.user.profile_image?.small }} style={styles.avatar} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.name}>{photo.user.name}</Text>
                                    <Text style={styles.handle}>@{photo.user.username} · Unsplash</Text>
                                </View>
                            </View>
                            <Text style={styles.desc}>
                                {photo.description || photo.alt_description || t('catalog.author.fallbackDesc')}
                            </Text>
                            <View style={styles.actions}>
                                <TouchableOpacity style={styles.link} onPress={() => openAuthorProfile(photo.user.username)}>
                                    <Text style={styles.linkText}>{t('catalog.author.openProfile')}</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity style={styles.close} onPress={onClose}>
                                <Text style={styles.closeText}>{t('common.close')}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 28 },
    card: { width: '100%', maxWidth: 360, backgroundColor: '#15152a', borderRadius: 22, padding: 22, borderWidth: 1, borderColor: '#2a2a4e', shadowColor: '#534AB7', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: '#2a2a4e' },
    name: { color: '#fff', fontSize: 17, fontWeight: '700' },
    handle: { color: '#7F77DD', fontSize: 12, marginTop: 2 },
    desc: { color: '#aaa', fontSize: 14, lineHeight: 20, marginBottom: 18 },
    actions: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    link: { flex: 1, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(127,119,221,0.15)', borderWidth: 1, borderColor: '#534AB7', alignItems: 'center' },
    linkText: { color: '#AFA9EC', fontSize: 12, fontWeight: '700' },
    close: { alignSelf: 'flex-end', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#534AB7' },
    closeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
