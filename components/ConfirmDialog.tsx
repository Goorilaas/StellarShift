import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

type Props = {
    visible: boolean;
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmDialog({
    visible, title, message,
    confirmLabel,
    cancelLabel,
    destructive = false,
    onConfirm, onCancel,
}: Props) {
    const { t } = useTranslation();
    const confirmText = confirmLabel ?? t('common.confirm');
    const cancelText = cancelLabel ?? t('common.cancel');
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <TouchableWithoutFeedback onPress={onCancel}>
                <View style={styles.backdrop}>
                    <TouchableWithoutFeedback>
                        <View style={styles.card}>
                            <Text style={styles.title}>{title}</Text>
                            {message && <Text style={styles.message}>{message}</Text>}
                            <View style={styles.row}>
                                <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onCancel}>
                                    <Text style={styles.btnCancelText}>{cancelText}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btn, destructive ? styles.btnDestructive : styles.btnConfirm]}
                                    onPress={onConfirm}
                                >
                                    <Text style={styles.btnConfirmText}>{confirmText}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 28 },
    card: {
        width: '100%', maxWidth: 360, backgroundColor: '#15152a',
        borderRadius: 22, padding: 22, borderWidth: 1, borderColor: '#2a2a4e',
        shadowColor: '#534AB7', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12,
    },
    title: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 },
    message: { fontSize: 14, color: '#aaa', lineHeight: 20, marginBottom: 20 },
    row: { flexDirection: 'row', gap: 10 },
    btn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
    btnCancel: { backgroundColor: 'transparent', borderColor: '#333' },
    btnCancelText: { color: '#aaa', fontSize: 14, fontWeight: '600' },
    btnConfirm: { backgroundColor: '#534AB7', borderColor: '#534AB7' },
    btnDestructive: { backgroundColor: 'rgba(204,51,85,0.85)', borderColor: '#cc3355' },
    btnConfirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
