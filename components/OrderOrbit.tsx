import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export default function OrderOrbit({ animated = false, size = 32 }: { animated?: boolean; size?: number }) {
    const progress = useRef(new Animated.Value(animated ? 0 : 1)).current;
    useEffect(() => {
        progress.setValue(animated ? 0 : 1);
        if (!animated) return;
        const animation = Animated.timing(progress, { toValue: 1, duration: 1500, easing: Easing.bezier(0.2, 0.7, 0.2, 1), useNativeDriver: true });
        animation.start();
        return () => animation.stop();
    }, [animated, progress]);
    return <View style={{ width: size, height: size }} pointerEvents="none" accessible={false}>
        <Svg width={size} height={size} viewBox="0 0 32 32">
            <Circle cx={16} cy={16} r={11.5} fill="none" stroke="#7F77DD" strokeWidth={1.2} strokeDasharray="2 3" opacity={0.65} />
            <Circle cx={16} cy={16} r={6.5} fill="#AFA9EC" />
            <Path d="M13 11.5 C17 8.5 22 12 22.5 16 C19 13 17 16 13 11.5Z" fill="#C6C1F4" />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['-130deg', '0deg'] }) }] }]}>
            <Svg width={size} height={size} viewBox="0 0 32 32">
                <Path d="M24 3 L25.1 6.9 L29 8 L25.1 9.1 L24 13 L22.9 9.1 L19 8 L22.9 6.9 Z" fill="#C6C1F4" />
                <Circle cx={24} cy={8} r={1} fill="#fff" />
            </Svg>
        </Animated.View>
    </View>;
}
