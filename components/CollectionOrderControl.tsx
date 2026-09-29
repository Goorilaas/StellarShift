import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { OrderEditing } from '../services/useOrderEditing';
import OrderConstellation from './OrderConstellation';
import OrderOrbit from './OrderOrbit';

type Props = { order: OrderEditing; orbit?: boolean; count: number };
export default function CollectionOrderControl({ order, orbit = false, count }: Props) {
    const { t } = useTranslation();
    const Symbol = orbit ? OrderOrbit : OrderConstellation;
    const disabled = !order.ready || order.saving || order.dragging || (!order.editing && count < 2);
    return <Pressable disabled={disabled && !order.error} onPress={order.error ? order.retry : order.editing ? order.save : order.start}
        style={styles.button} accessibilityRole="button" accessibilityState={{ disabled }}>
        <View style={[styles.buttonContent, disabled && styles.disabled]}>
            <Symbol size={22} />
            <Text style={styles.link}>{t(order.error ? 'collections.retry' : order.saving ? 'collectionOrder.saving' : order.editing ? 'common.done' : 'collectionOrder.title')}</Text>
        </View>
    </Pressable>;
}

export function CollectionOrderFeedback({ order, orbit = false }: { order: OrderEditing; orbit?: boolean }) {
    const { t } = useTranslation();
    const Symbol = orbit ? OrderOrbit : OrderConstellation;
    const opacity = useRef(new Animated.Value(0)).current;
    const clear = useRef(order.clearSuccess);
    clear.current = order.clearSuccess;
    useEffect(() => {
        if (!order.success) return;
        opacity.setValue(0);
        const animation = Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.delay(1800),
            Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]);
        animation.start(({ finished }) => { if (finished) clear.current(); });
        return () => animation.stop();
    }, [order.success, opacity]);
    if (order.saveError || order.error) return <Text accessibilityRole="alert" style={styles.error}>{t(order.saveError ? 'collectionOrder.saveError' : 'collectionOrder.loadError')}</Text>;
    if (!order.success) return null;
    return <Animated.View style={[styles.feedback, { opacity }]} pointerEvents="none">
        <Symbol key={order.success} animated />
        <Text accessibilityLiveRegion="polite" style={styles.success}>{t('collectionOrder.success')}</Text>
    </Animated.View>;
}
const styles = StyleSheet.create({
    button: { minHeight: 44, justifyContent: 'center', flexShrink: 0 },
    buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    feedback: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 54, paddingHorizontal: 12 },
    link: { color: '#AFA9EC', fontSize: 14 }, disabled: { opacity: 0.4 },
    error: { color: '#ffafaf', padding: 12 },
    success: { flexShrink: 1, color: '#fff', fontSize: 20, fontWeight: '700', fontStyle: 'italic', textAlign: 'center' },
});
