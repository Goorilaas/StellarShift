import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ICON } from './icons';

// «Cosmic spark» — наш підпис: серце вистрибує + розлітаються бренд-зорі.
const SPARK_COUNT = 4;
const SPARK_COLORS = ['#FFD700', '#AFA9EC', '#7F77DD', '#FFD700'];
const SPARK_DIST = 13; // px — невеликий радіус, щоб не кліпалось overflow тайла

type Props = {
    active: boolean;
    onToggle: () => void;
};

/**
 * Кнопка-серце на тайлі (каталог + улюблені). Порожнє біле серце на темному
 * колі завжди; при активації червоне заповнене вистрибує (spring-pop) і з нього
 * розлітаються 4 крихітні зорі бренд-палітри (~420мс). На першому рендері — стан
 * без анімації (скрол не має «вибухати»). Тап не відкриває фото — лише лайк.
 */
export default function FavoriteHeart({ active, onToggle }: Props) {
    const fill = useRef(new Animated.Value(active ? 1 : 0)).current;
    const sparks = useRef(Array.from({ length: SPARK_COUNT }, () => new Animated.Value(0))).current;
    const mounted = useRef(false);

    useEffect(() => {
        if (!mounted.current) {
            mounted.current = true;
            fill.setValue(active ? 1 : 0);
            return;
        }
        if (active) {
            Animated.spring(fill, { toValue: 1, useNativeDriver: true, friction: 4, tension: 150 }).start();
            sparks.forEach(s => {
                s.setValue(0);
                Animated.timing(s, { toValue: 1, duration: 420, useNativeDriver: true }).start();
            });
        } else {
            Animated.timing(fill, { toValue: 0, duration: 170, useNativeDriver: true }).start();
        }
    }, [active, fill, sparks]);

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        onToggle();
    };

    return (
        <Pressable onPress={handlePress} hitSlop={8} style={styles.wrap}>
            <View style={styles.circle}>
                <SvgXml xml={ICON.heartWhite} width={15} height={15} />
                <Animated.View
                    style={[
                        StyleSheet.absoluteFill,
                        styles.center,
                        { opacity: fill, transform: [{ scale: fill.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] },
                    ]}
                    pointerEvents="none"
                >
                    <SvgXml xml={ICON.heartFilled} width={15} height={15} />
                </Animated.View>
            </View>
            {sparks.map((s, i) => {
                const angle = (Math.PI * 2 * i) / SPARK_COUNT - Math.PI / 2;
                const tx = s.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * SPARK_DIST] });
                const ty = s.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * SPARK_DIST] });
                const opacity = s.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 0] });
                const scale = s.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.2, 1, 0.3] });
                return (
                    <Animated.View
                        key={i}
                        pointerEvents="none"
                        style={[styles.spark, { opacity, transform: [{ translateX: tx }, { translateY: ty }, { scale }] }]}
                    >
                        <View style={[styles.sparkDot, { backgroundColor: SPARK_COLORS[i] }]} />
                    </Animated.View>
                );
            })}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    wrap: { position: 'absolute', top: 6, right: 6, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
    circle: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.42)', alignItems: 'center', justifyContent: 'center' },
    center: { alignItems: 'center', justifyContent: 'center' },
    spark: { position: 'absolute', top: 13, left: 13, width: 4, height: 4 },
    sparkDot: { width: 4, height: 4, borderRadius: 2 },
});
