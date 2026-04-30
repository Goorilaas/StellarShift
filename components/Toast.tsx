import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

export type ToastAction = { label: string; onPress: () => void };

export default function Toast({
    message,
    action,
}: {
    message: string | null;
    action?: ToastAction | null;
}) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (message) {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 8 }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 20, duration: 280, useNativeDriver: true }),
            ]).start();
        }
    }, [message, opacity, translateY]);

    if (!message) return null;
    return (
        <Animated.View
            style={[styles.toast, { opacity, transform: [{ translateY }] }]}
            pointerEvents={action ? 'auto' : 'none'}
        >
            <View style={styles.row}>
                <Text style={styles.text}>{message}</Text>
                {action && (
                    <Pressable onPress={action.onPress} style={styles.actionBtn} hitSlop={8}>
                        <Text style={styles.actionText}>{action.label}</Text>
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    toast: {
        position: 'absolute', bottom: 90, alignSelf: 'center',
        backgroundColor: 'rgba(20,20,40,0.95)', paddingHorizontal: 22, paddingVertical: 12,
        borderRadius: 28, borderWidth: 1, borderColor: '#534AB7', zIndex: 999,
        maxWidth: 360, alignItems: 'center',
        shadowColor: '#534AB7', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    text: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
    actionBtn: { paddingVertical: 4, paddingHorizontal: 8, borderLeftWidth: 1, borderLeftColor: 'rgba(127,119,221,0.4)', marginLeft: 4 },
    actionText: { color: '#FFD700', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
});
