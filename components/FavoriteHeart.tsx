import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ICON } from './icons';

// «Cosmic spark» — наш підпис: серце вистрибує + осипається зоряний пил.
// v2: серце в кутку тайла (overflow:hidden), тому зорі летять ВНИЗ-ВЛІВО, у
// видиму зону — інакше пів-сплеску обрізалось краєм. 6 зір, більші, зі світінням.
const SPARK_COUNT = 6;
const SPARK_COLORS = ['#FFD700', '#AFA9EC', '#7F77DD', '#FFE9A8', '#C9C2FF', '#FFD700'];
const SPARK_ANGLES = [70, 95, 120, 145, 170, 195].map(d => (d * Math.PI) / 180); // +y вниз
const SPARK_DIST = [24, 28, 25, 29, 26, 22];

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
            // помітніший pop (нижче friction → більший overshoot за 1)
            Animated.spring(fill, { toValue: 1, useNativeDriver: true, friction: 3.2, tension: 150 }).start();
            sparks.forEach(s => {
                s.setValue(0);
                Animated.timing(s, { toValue: 1, duration: 540, useNativeDriver: true }).start();
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
                const angle = SPARK_ANGLES[i];
                const dist = SPARK_DIST[i];
                const tx = s.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * dist] });
                const ty = s.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * dist] });
                const opacity = s.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] });
                const scale = s.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.3, 1.2, 0.4] });
                return (
                    <Animated.View
                        key={i}
                        pointerEvents="none"
                        style={[styles.spark, { opacity, transform: [{ translateX: tx }, { translateY: ty }, { scale }] }]}
                    >
                        <View style={[styles.sparkGlow, { backgroundColor: SPARK_COLORS[i] }]} />
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
    spark: { position: 'absolute', top: 15, left: 15, alignItems: 'center', justifyContent: 'center' },
    sparkGlow: { position: 'absolute', width: 10, height: 10, borderRadius: 5, opacity: 0.35 },
    sparkDot: { width: 5, height: 5, borderRadius: 2.5 },
});
