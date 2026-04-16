import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width } = Dimensions.get('window');
const IMG_SIZE = (width - 36) / 2;

export default function SkeletonCard() {
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, {
                    toValue: 1,
                    duration: 900,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmer, {
                    toValue: 0,
                    duration: 900,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const opacity = shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <View style={styles.card}>
            <Animated.View style={[styles.shimmer, { opacity }]}>
                <LinearGradient
                    colors={['#1a1a2e', '#2a2a4e', '#1a1a2e']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: IMG_SIZE,
        height: IMG_SIZE * 1.5,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#1a1a2e',
    },
    shimmer: {
        ...StyleSheet.absoluteFillObject,
    },
});