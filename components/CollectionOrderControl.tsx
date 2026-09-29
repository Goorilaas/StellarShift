import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCollectionOrder } from '../services/useCollectionOrder';
import CollectionOrderEditor from './CollectionOrderEditor';

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
            <Text style={[styles.link, (!order.ready || items.length < 2) && styles.disabled]}>{t('collectionOrder.title')}</Text>
        </Pressable>}
        {!!success && <Animated.View style={{ opacity }} pointerEvents="none">
            {/* SVG додається лише після окремого погодження прев’ю. */}
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
    link: { color: '#AFA9EC', fontSize: 15 },
    disabled: { opacity: 0.4 },
    success: { color: '#fff', fontSize: 20, fontWeight: '700', fontStyle: 'italic', textAlign: 'center' },
});
