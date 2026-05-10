import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ByoVariant } from '../services/unsplashKey';
import { ICON } from './icons';

type Props = {
    variant: ByoVariant | null;
    onLater: () => void;
    onGoToSettings: () => void;
};

const ACCENT = { soft: '#534AB7', urgent: '#cc3355' } as const;

export default function ByoReminderDialog({ variant, onLater, onGoToSettings }: Props) {
    const { t } = useTranslation();
    const visible = variant !== null;
    const v: ByoVariant = variant ?? 'soft';
    const accent = ACCENT[v];

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}>
            <TouchableWithoutFeedback onPress={variant === 'urgent' ? undefined : onLater}>
                <View style={styles.backdrop}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.card, variant === 'urgent' && styles.cardUrgent]}>
                            <View style={styles.iconWrap}>
                                <SvgXml xml={ICON.galaxy} width={48} height={48} />
                            </View>
                            <Text style={styles.title}>{t(`byoReminder.${v}.title`)}</Text>
                            <Text style={styles.message}>{t(`byoReminder.${v}.message`)}</Text>
                            <TouchableOpacity
                                style={[styles.btnPrimary, { backgroundColor: accent, borderColor: accent }]}
                                onPress={onGoToSettings}
                            >
                                <Text style={styles.btnPrimaryText}>{t(`byoReminder.${v}.confirm`)}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnSecondary} onPress={onLater}>
                                <Text style={styles.btnSecondaryText}>{t(`byoReminder.${v}.cancel`)}</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 28 },
    card: {
        width: '100%', maxWidth: 380, backgroundColor: '#15152a',
        borderRadius: 22, padding: 24, borderWidth: 1, borderColor: '#2a2a4e',
        shadowColor: '#534AB7', shadowOpacity: 0.5, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 14,
        alignItems: 'center',
    },
    cardUrgent: { borderColor: '#5a2030', shadowColor: '#cc3355' },
    iconWrap: { marginBottom: 14 },
    title: { fontSize: 19, fontWeight: '700', color: '#fff', marginBottom: 10, textAlign: 'center' },
    message: { fontSize: 14, color: '#bbb', lineHeight: 21, marginBottom: 22, textAlign: 'center' },
    btnPrimary: {
        width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center',
        borderWidth: 1, marginBottom: 10,
    },
    btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    btnSecondary: { paddingVertical: 10, paddingHorizontal: 16 },
    btnSecondaryText: { color: '#888', fontSize: 14, fontWeight: '500' },
});
