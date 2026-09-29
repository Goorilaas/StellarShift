import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCollectionOrder } from '../services/useCollectionOrder';
import CollectionOrderEditor from './CollectionOrderEditor';
import OrderConstellation from './OrderConstellation';

export default function CollectionOrderControl({ order, items }: {
    order: ReturnType<typeof useCollectionOrder>; items: { id: string; title: string }[];
}) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);
    const [success, setSuccess] = useState(0);
    const opacity = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!success) return;
        const animation = Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.delay(1800),
            Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]);
        animation.start(({ finished }) => { if (finished) setSuccess(0); });
        return () => animation.stop();
    }, [success, opacity]);
    return <View style={styles.wrap}>
        {order.error ? <Pressable onPress={order.retry} style={styles.button} accessibilityRole="button">
            <Text style={styles.link}>{t('collectionOrder.loadError')}</Text>
        </Pressable> : <Pressable disabled={!order.ready || items.length < 2} onPress={() => setEditing(true)} style={styles.button} accessibilityRole="button">
            <View style={[styles.buttonContent, (!order.ready || items.length < 2) && styles.disabled]}>
                <OrderConstellation size={22} />
                <Text style={styles.link}>{t('collectionOrder.title')}</Text>
            </View>
        </Pressable>}
        {!!success && <Animated.View style={[styles.feedback, { opacity }]} pointerEvents="none">
            <OrderConstellation key={success} animated />
            <Text accessibilityLiveRegion="polite" style={styles.success}>{t('collectionOrder.success')}</Text>
        </Animated.View>}
        {editing && <CollectionOrderEditor items={items} onClose={() => setEditing(false)} onSave={async ids => {
            await order.save(ids);
            setEditing(false);
            opacity.setValue(0);
            setSuccess(n => n + 1);
        }} />}
    </View>;
}
const styles = StyleSheet.create({
    wrap: { paddingHorizontal: 12, paddingBottom: 8 },
    button: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-end' },
    buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    feedback: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 54 },
    link: { color: '#AFA9EC', fontSize: 15 },
    disabled: { opacity: 0.4 },
    success: { flexShrink: 1, textShadowColor: 'rgba(0,0,0,0.95)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 2 }, color: '#fff', fontSize: 20, fontWeight: '700', fontStyle: 'italic', textAlign: 'center' },
});
