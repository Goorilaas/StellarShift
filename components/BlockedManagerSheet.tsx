import { useTranslation } from 'react-i18next';
import {
    Animated,
    FlatList,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { useSheetDismiss } from '../services/useSheetDismiss';
import { BlockedPhoto } from '../services/blocked';
import { ICON } from './icons';
import Toast, { ToastAction } from './Toast';
import RestoreFeedback from './RestoreFeedback';

type Props = {
    visible: boolean;
    blocked: BlockedPhoto[];
    onUnblock: (id: string) => void;
    onClearAll: () => void;
    onClose: () => void;
    feedback?: { message: string; action?: ToastAction | null; presentation?: 'restore' } | null;
};

export default function BlockedManagerSheet({ visible, blocked, onUnblock, onClearAll, onClose, feedback }: Props) {
    const { t } = useTranslation();
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const sheetHeight = Math.min(height * 0.85, height - insets.top);
    const tileSize = (width - 18 * 2 - 12 * 2) / 3;
    const { slide, panHandlers } = useSheetDismiss(visible, sheetHeight, onClose);

    const renderItem = ({ item }: { item: BlockedPhoto }) => (
        <View style={[styles.tile, { width: tileSize }]}>
            <Image source={{ uri: item.small }} style={[styles.tileImg, { width: tileSize, height: tileSize * 1.4 }]} />
            <TouchableOpacity style={styles.unblockBtn} onPress={() => onUnblock(item.id)} accessibilityRole="button">
                <Text style={styles.unblockText}>{t('blockedSheet.unblock')}</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
                <Animated.View style={[styles.sheet, { height: sheetHeight, transform: [{ translateY: slide }] }]}>
                    <View style={styles.handleTouch} {...panHandlers}>
                        <View style={styles.handle} />
                    </View>
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('blockedSheet.title')}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
                            <Text style={styles.doneText}>{t('common.done')}</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        style={styles.list}
                        data={blocked}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        numColumns={3}
                        removeClippedSubviews={false}
                        columnWrapperStyle={{ gap: 12, paddingHorizontal: 18 }}
                        contentContainerStyle={{ paddingTop: 16, paddingBottom: 16, gap: 12 }}
                        ListEmptyComponent={
                            <View style={styles.emptyWrap}>
                                <SvgXml xml={ICON.blocked} width={56} height={56} />
                                <Text style={styles.emptyTitle}>{t('blockedSheet.empty.title')}</Text>
                                <Text style={styles.emptyText}>{t('blockedSheet.empty.sub')}</Text>
                            </View>
                        }
                    />
                    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                        {feedback?.presentation === 'restore' ? (
                            <RestoreFeedback message={feedback.message} action={feedback.action} />
                        ) : (
                            <Toast inline message={feedback?.message ?? null} action={feedback?.action} />
                        )}
                        {blocked.length > 0 && (
                            <TouchableOpacity style={styles.clearAllBtn} onPress={onClearAll}>
                                <Text style={styles.clearAllText}>{t('blockedSheet.clearAll', { count: blocked.length })}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#0f0f1f',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        borderTopWidth: 1, borderColor: '#2a2a4e',
        paddingTop: 8,
    },
    list: { flex: 1, minHeight: 0 },
    footer: { paddingTop: 8, paddingHorizontal: 18, borderTopWidth: 1, borderTopColor: '#1a1a2e' },
    handleTouch: { height: 44, justifyContent: 'center', alignItems: 'center' },
    handle: { alignSelf: 'center', width: 40, height: 4, backgroundColor: '#3a3a5e', borderRadius: 2 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
    title: { color: '#fff', fontSize: 17, fontWeight: '700' },
    doneBtn: { paddingVertical: 6, paddingHorizontal: 12 },
    doneText: { color: '#7F77DD', fontSize: 15, fontWeight: '700' },
    emptyWrap: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 32 },
    emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 4 },
    emptyText: { color: '#7a7a90', fontSize: 13, lineHeight: 19, textAlign: 'center' },
    tile: { alignItems: 'center' },
    tileImg: { borderRadius: 10, backgroundColor: '#1a1a2e' },
    unblockBtn: { marginTop: 6, backgroundColor: '#2a2a4e', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, width: '100%', alignItems: 'center' },
    unblockText: { color: '#AFA9EC', fontSize: 11, fontWeight: '700' },
    clearAllBtn: { backgroundColor: 'rgba(204,51,85,0.15)', borderColor: '#cc3355', borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    clearAllText: { color: '#cc3355', fontSize: 14, fontWeight: '700' },
});
