import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

export default function Toast({ message }: { message: string | null }) {
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
        <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]} pointerEvents="none">
            <Text style={styles.text}>{message}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    toast: {
        position: 'absolute', bottom: 90, alignSelf: 'center',
        backgroundColor: 'rgba(20,20,40,0.95)', paddingHorizontal: 22, paddingVertical: 12,
        borderRadius: 28, borderWidth: 1, borderColor: '#534AB7', zIndex: 999,
        maxWidth: 320, alignItems: 'center',
        shadowColor: '#534AB7', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
    },
    text: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
