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
const SHEET_HEIGHT = height * 0.85;

type Props = {
    visible: boolean;
    title: string;
    /** All available categories (will be split into selected + rest) */
    available: Category[];
    /** Currently selected category IDs in user's order */
    selected: string[];
    /** Called when selection changes */
    onChange: (ids: string[]) => void;
    onClose: () => void;
    /** Min selected (e.g. 1 — can't unselect last) */
    minSelected?: number;
};

export default function CategoryPickerSheet({
    visible, title, available, selected, onChange, onClose, minSelected = 1,
}: Props) {
    const { t } = useTranslation();
    const slide = useRef(new Animated.Value(SHEET_HEIGHT)).current;
    const labelOf = (c: Category) => c.labelKey ? t(c.labelKey) : c.label;

    useEffect(() => {
        Animated.timing(slide, {
            toValue: visible ? 0 : SHEET_HEIGHT,
            duration: 240,
            useNativeDriver: true,
        }).start();
    }, [visible, slide]);

    // Selected list — у порядку який задав юзер
    const selectedCats = selected
        .map(id => available.find(c => c.id === id))
        .filter((c): c is Category => !!c);
    const selectedIds = new Set(selected);

    // Inactive — решта алфавітом (available вже відсортований)
    const inactiveCats = available.filter(c => !selectedIds.has(c.id));

    const toggle = (id: string) => {
        if (selectedIds.has(id)) {
            // Зняти
            if (selected.length <= minSelected) return; // protect
            onChange(selected.filter(s => s !== id));
        } else {
            // Додати в кінець активних
            onChange([...selected, id]);
        }
    };

    const renderActiveItem = ({ item }: { item: Category }) => (
        <Pressable
            onPress={() => toggle(item.id)}
            style={[styles.row, styles.rowActive]}
        >
            <SvgXml xml={item.icon} width={18} height={18} />
            <Text style={styles.rowLabel}>{labelOf(item)}</Text>
            <View style={styles.checkOn}>
                <Text style={styles.checkOnText}>✓</Text>
            </View>
        </Pressable>
    );

    const renderInactiveItem = ({ item }: { item: Category }) => (
        <Pressable
            onPress={() => toggle(item.id)}
            style={[styles.row, styles.rowInactive]}
        >
            <SvgXml xml={item.icon} width={18} height={18} />
            <Text style={[styles.rowLabel, styles.rowLabelInactive]}>{labelOf(item)}</Text>
            <View style={styles.checkOff} />
        </Pressable>
    );

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Animated.View
                    style={[styles.sheet, { transform: [{ translateY: slide }] }]}
                    onStartShouldSetResponder={() => true}
                    onTouchEnd={(e) => e.stopPropagation()}
                >
                    <Pressable onPress={(e) => e.stopPropagation?.()}>
                        <View style={styles.handle} />
                        <View style={styles.header}>
                            <Text style={styles.title}>{title}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
                                <Text style={styles.doneText}>{t('common.done')}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: SHEET_HEIGHT - 70 }}>
                            {/* Active section */}
                            <Text style={styles.sectionLabel}>
                                {t('categoryPicker.active')} · {selectedCats.length}
                            </Text>
                            {selectedCats.length === 0 ? (
                                <Text style={styles.emptyText}>{t('settings.picker.empty')}</Text>
                            ) : (
                                <View style={{ maxHeight: SHEET_HEIGHT * 0.5 }}>
                                    <FlatList
                                        data={selectedCats}
                                        keyExtractor={(item) => item.id}
                                        renderItem={renderActiveItem}
                                    />
                                </View>
                            )}

                            {/* Inactive section */}
                            <Text style={styles.sectionLabel}>
                                {t('categoryPicker.available')} · {inactiveCats.length}
                            </Text>
                            <FlatList
                                data={inactiveCats}
                                keyExtractor={(item) => item.id}
                                renderItem={renderInactiveItem}
                                style={{ flex: 1 }}
                                contentContainerStyle={{ paddingBottom: 40 }}
                            />
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
    sectionLabel: { fontSize: 11, color: '#7F77DD', fontWeight: '600', letterSpacing: 1, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8, textTransform: 'uppercase' },
    emptyText: { color: '#555', fontSize: 13, paddingHorizontal: 18, fontStyle: 'italic' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#15152a' },
    rowActive: { backgroundColor: 'rgba(83,74,183,0.08)' },
    rowInactive: {},
    rowLabel: { color: '#fff', fontSize: 14, flex: 1, fontWeight: '500' },
    rowLabelInactive: { color: '#888', fontWeight: '400' },
    checkOn: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#534AB7', alignItems: 'center', justifyContent: 'center' },
    checkOnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    checkOff: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#3a3a5e' },
});
