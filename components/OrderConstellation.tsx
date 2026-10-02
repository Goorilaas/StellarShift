import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

// Погоджене сузір’я: ті самі координати й кольори, що у прев’ю.
const STARS = [
    { x: 1, y: 18, size: 10, cx: 6, cy: 23, radius: 0.9, dx: -4, dy: -7, angle: '-15deg', color: '#AFA9EC', path: 'M6 18 L7.3 21.7 L11 23 L7.3 24.3 L6 28 L4.7 24.3 L1 23 L4.7 21.7 Z' },
    { x: 10, y: 1, size: 12, cx: 16, cy: 7, radius: 1.1, dx: 3, dy: 8, angle: '15deg', color: '#C6C1F4', path: 'M16 1 L17.5 5.5 L22 7 L17.5 8.5 L16 13 L14.5 8.5 L10 7 L14.5 5.5 Z' },
    { x: 21, y: 14, size: 10, cx: 26, cy: 19, radius: 0.9, dx: -7, dy: 5, angle: '-15deg', color: '#AFA9EC', path: 'M26 14 L27.3 17.7 L31 19 L27.3 20.3 L26 24 L24.7 20.3 L21 19 L24.7 17.7 Z' },
];

export default function OrderConstellation({ animated = false, size = 32 }: { animated?: boolean; size?: number }) {
    const stars = useRef(STARS.map(() => new Animated.Value(animated ? 0 : 1))).current;
    const connection = useRef(new Animated.Value(animated ? 0 : 0.65)).current;
    useEffect(() => {
        if (!animated) {
            stars.forEach(value => value.setValue(1));
            connection.setValue(0.65);
            return;
        }
        stars.forEach(value => value.setValue(0));
        connection.setValue(0);
        const animation = Animated.parallel([
            ...stars.map((value, index) => Animated.sequence([
                Animated.delay(index * 140),
                Animated.timing(value, { toValue: 1, duration: 1100, easing: Easing.bezier(0.2, 0.7, 0.2, 1), useNativeDriver: true }),
            ])),
            Animated.sequence([
                Animated.delay(1000),
                Animated.timing(connection, { toValue: 0.65, duration: 500, useNativeDriver: true }),
            ]),
        ]);
        animation.start();
        return () => animation.stop();
    }, [animated, connection, stars]);
    const scale = size / 32;
    return <View style={{ width: size, height: size }} pointerEvents="none" accessible={false}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: connection }]}>
            <Svg width={size} height={size} viewBox="0 0 32 32">
                <Path d="M6 23 L16 7 L26 19" stroke="#7F77DD" strokeWidth={1.2} fill="none" />
            </Svg>
        </Animated.View>
        {STARS.map((star, index) => <Animated.View key={index} style={{
            position: 'absolute', left: star.x * scale, top: star.y * scale,
            width: star.size * scale, height: star.size * scale,
            opacity: stars[index].interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
            transform: [
                { translateX: stars[index].interpolate({ inputRange: [0, 1], outputRange: [star.dx * scale, 0] }) },
                { translateY: stars[index].interpolate({ inputRange: [0, 1], outputRange: [star.dy * scale, 0] }) },
                { rotate: stars[index].interpolate({ inputRange: [0, 1], outputRange: [star.angle, '0deg'] }) },
            ],
        }}>
            <Svg width={star.size * scale} height={star.size * scale} viewBox={`${star.x} ${star.y} ${star.size} ${star.size}`}>
                <Path d={star.path} fill={star.color} />
                <Circle cx={star.cx} cy={star.cy} r={star.radius} fill="#fff" />
            </Svg>
        </Animated.View>)}
    </View>;
}
