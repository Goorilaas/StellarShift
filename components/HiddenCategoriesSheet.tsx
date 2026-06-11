import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    Dimensions,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Category } from './categories';

const { height } = Dimensions.get('window');
const SHEET_HEIGHT = height * 0.6;

type Props = {
    visible: boolean;
    hidden: Category[];
    onRestore: (id: string) => void;
    onRestoreAll: () => void;
    onClose: () => void;
};

// Сховані категорії каталогу (long-press на чіп → «Приховати»). Тут їх повертають.
// Брат BlockedManagerSheet, але рядками — категорій мало, грид не потрібен.
export default function HiddenCategoriesSheet({ visible, hidden, onRestore, onRestoreAll, onClose }: Props) {
    const { t } = useTranslation();
    const slide = useRef(new Animated.Value(SHEET_HEIGHT)).current;

    useEffect(() => {
        Animated.timing(slide, {
            toValue: visible ? 0 : SHEET_HEIGHT,
            duration: 240,
            useNativeDriver: true,
        }).start();
    }, [visible, slide]);

    const renderItem = ({ item }: { item: Category }) => (
        <View style={styles.row}>
            <SvgXml xml={item.icon} width={18} height={18} />
            <Text style={styles.rowLabel}>{item.labelKey ? t(item.labelKey) : item.label}</Text>
            <TouchableOpacity style={styles.restoreBtn} onPress={() => onRestore(item.id)}>
                <Text style={styles.restoreText}>{t('hiddenCatsSheet.restore')}</Text>
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
                            <Text style={styles.title}>{t('hiddenCatsSheet.title')}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
                                <Text style={styles.doneText}>{t('common.done')}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Кнопка в статичному потоці ПІД списком — не напливає на рядки при скролі */}
                        <View style={{ height: SHEET_HEIGHT - 70 }}>
                            <FlatList
                                data={hidden}
                                keyExtractor={item => item.id}
                                renderItem={renderItem}
                                style={{ flexGrow: 0, flexShrink: 1 }}
                                contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}
                            />
                            <TouchableOpacity style={styles.restoreAllBtn} onPress={onRestoreAll}>
                                <Text style={styles.restoreAllText}>{t('hiddenCatsSheet.restoreAll', { count: hidden.length })}</Text>
                            </TouchableOpacity>
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
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#15152a' },
    rowLabel: { color: '#e8e6f5', fontSize: 14, flex: 1 },
    restoreBtn: { backgroundColor: '#2a2a4e', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
    restoreText: { color: '#AFA9EC', fontSize: 12, fontWeight: '700' },
    restoreAllBtn: { marginTop: 12, marginHorizontal: 18, backgroundColor: 'rgba(127,119,221,0.12)', borderColor: '#7F77DD', borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    restoreAllText: { color: '#AFA9EC', fontSize: 14, fontWeight: '700' },
});
