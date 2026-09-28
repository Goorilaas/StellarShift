import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ICON } from './icons';
import type { ToastAction } from './Toast';

// Ритм побажань каталогу; Undo живе окремо від згасаючого напису.
export default function RestoreFeedback({ message, action }: { message: string; action?: ToastAction | null }) {
    const opacity = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        opacity.setValue(0);
        const animation = Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.delay(1800),
            Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]);
        animation.start();
        return () => animation.stop();
    }, [message, action, opacity]);

    return (
        <View style={styles.wrap}>
            <Animated.View style={[styles.row, { opacity }]} pointerEvents="none">
                <SvgXml xml={ICON.sparkle} width={28} height={28} />
                <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text>
            </Animated.View>
            {action && (
                <Pressable style={styles.undo} onPress={action.onPress} accessibilityRole="button">
                    <Text style={styles.undoText}>{action.label}</Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { alignItems: 'center', marginBottom: 8, paddingTop: 8 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 54 },
    message: { flexShrink: 1, color: '#fff', fontSize: 20, fontWeight: '700', fontStyle: 'italic', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.95)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 2 } },
    undo: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 10 },
    undoText: { color: '#FFD700', fontSize: 14, fontWeight: '600' },
});
