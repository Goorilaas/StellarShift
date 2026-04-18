import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

export default function Toast({ message }: { message: string | null }) {
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (message) {
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        } else {
            Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
        }
    }, [message, opacity]);

    if (!message) return null;
    return (
        <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
            <Text style={styles.text}>{message}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    toast: {
        position: 'absolute', bottom: 100, alignSelf: 'center',
        backgroundColor: 'rgba(20,20,40,0.95)', paddingHorizontal: 20, paddingVertical: 12,
        borderRadius: 24, borderWidth: 1, borderColor: '#534AB7', zIndex: 999,
        left: 24, right: 24, alignItems: 'center',
    },
    text: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
