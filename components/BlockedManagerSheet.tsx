import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { BlockedPhoto } from '../services/blocked';
import { ICON } from './icons';

const { width, height } = Dimensions.get('window');
const SHEET_HEIGHT = height * 0.85;
const TILE_SIZE = (width - 18 * 2 - 12 * 2) / 3;

type Props = {
    visible: boolean;
    blocked: BlockedPhoto[];
    onUnblock: (id: string) => void;
    onClearAll: () => void;
    onClose: () => void;
};

export default function BlockedManagerSheet({ visible, blocked, onUnblock, onClearAll, onClose }: Props) {
    const { t } = useTranslation();
    const slide = useRef(new Animated.Value(SHEET_HEIGHT)).current;

    useEffect(() => {
        Animated.timing(slide, {
            toValue: visible ? 0 : SHEET_HEIGHT,
            duration: 240,
            useNativeDriver: true,
        }).start();
    }, [visible, slide]);

    const renderItem = ({ item }: { item: BlockedPhoto }) => (
        <View style={styles.tile}>
            <Image source={{ uri: item.small }} style={styles.tileImg} />
            <View style={styles.tileBadge}>
                <SvgXml xml={ICON.blocked} width={16} height={16} />
            </View>
            <TouchableOpacity style={styles.unblockBtn} onPress={() => onUnblock(item.id)}>
                <Text style={styles.unblockText}>{t('blockedSheet.unblock')}</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Animated.View
                    style={[styles.sheet, { transform: [{ translateY: slide }] }]}
                    onStartShouldSetResponder={() => true}
                >
                    <Pressable onPress={(e) => e.stopPropagation?.()}>
                        <View style={styles.handle} />
                        <View style={styles.header}>
                            <Text style={styles.title}>{t('blockedSheet.title')}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
                                <Text style={styles.doneText}>{t('common.done')}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: SHEET_HEIGHT - 70 }}>
                            {blocked.length === 0 ? (
                                <View style={styles.emptyWrap}>
                                    <SvgXml xml={ICON.blocked} width={56} height={56} />
                                    <Text style={styles.emptyTitle}>{t('blockedSheet.empty.title')}</Text>
                                    <Text style={styles.emptyText}>{t('blockedSheet.empty.sub')}</Text>
                                </View>
                            ) : (
                                <>
                                    <FlatList
                                        data={blocked}
                                        keyExtractor={(item) => item.id}
                                        renderItem={renderItem}
                                        numColumns={3}
                                        columnWrapperStyle={{ gap: 12, paddingHorizontal: 18 }}
                                        contentContainerStyle={{ paddingTop: 16, paddingBottom: 80, gap: 12 }}
                                    />
                                    <TouchableOpacity style={styles.clearAllBtn} onPress={onClearAll}>
                                        <Text style={styles.clearAllText}>{t('blockedSheet.clearAll', { count: blocked.length })}</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </Pressable>
                </Animated.View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
        height: SHEET_HEIGHT,
        backgroundColor: '#0f0f1f',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        borderTopWidth: 1, borderColor: '#2a2a4e',
        paddingTop: 8,
    },
    handle: { alignSelf: 'center', width: 40, height: 4, backgroundColor: '#3a3a5e', borderRadius: 2, marginBottom: 8 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
    title: { color: '#fff', fontSize: 17, fontWeight: '700' },
    doneBtn: { paddingVertical: 6, paddingHorizontal: 12 },
    doneText: { color: '#7F77DD', fontSize: 15, fontWeight: '700' },
    emptyWrap: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 32 },
    emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 4 },
    emptyText: { color: '#7a7a90', fontSize: 13, lineHeight: 19, textAlign: 'center' },
    tile: { width: TILE_SIZE, alignItems: 'center', position: 'relative' },
    tileImg: { width: TILE_SIZE, height: TILE_SIZE * 1.4, borderRadius: 10, backgroundColor: '#1a1a2e' },
    tileBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, padding: 3 },
    unblockBtn: { marginTop: 6, backgroundColor: '#2a2a4e', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, width: '100%', alignItems: 'center' },
    unblockText: { color: '#AFA9EC', fontSize: 11, fontWeight: '700' },
    clearAllBtn: { position: 'absolute', bottom: 16, left: 18, right: 18, backgroundColor: 'rgba(204,51,85,0.15)', borderColor: '#cc3355', borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    clearAllText: { color: '#cc3355', fontSize: 14, fontWeight: '700' },
});
