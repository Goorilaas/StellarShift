import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { Blessing, nextBlessingFromQueue } from './blessings';
import { ICON } from './icons';

// Прапорець «Привітання при запуску» — читається тут і перемикається у Settings.
// Default ON: відсутність ключа або будь-що крім '0' = увімкнено.
export const GREETING_ENABLED_KEY = 'greeting_enabled';
const GREETING_LAST_KEY = 'last_greeting_at';
const SIX_HOURS = 6 * 60 * 60 * 1000;

/**
 * Привітання-благословення при холодному старті — НЕ кожен запуск.
 * Показується раз на ≥6 годин: slide-from-top банер з іконкою + фразою,
 * авто-зникнення через 5с. Ритуал «один раз на день» = м'яка магія без fatigue.
 *
 * `active` — гейт ззовні (наприклад, false поки видно onboarding), щоб не накладалось.
 */
export default function LaunchGreeting({ active }: { active: boolean }) {
    const [blessing, setBlessing] = useState<Blessing | null>(null);
    const queueRef = useRef<Blessing[]>([]);
    const translateY = useRef(new Animated.Value(-120)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const insets = useSafeAreaInsets();

    // Перевірка умов один раз при mount (коли active стане true).
    useEffect(() => {
        if (!active) return;
        let cancelled = false;
        (async () => {
            const enabled = (await AsyncStorage.getItem(GREETING_ENABLED_KEY)) !== '0';
            if (!enabled) return;
            const lastStr = await AsyncStorage.getItem(GREETING_LAST_KEY);
            const last = lastStr ? parseInt(lastStr, 10) : 0;
            if (Date.now() - last < SIX_HOURS) return;
            if (cancelled) return;
            setBlessing(nextBlessingFromQueue(queueRef));
            await AsyncStorage.setItem(GREETING_LAST_KEY, String(Date.now()));
        })();
        return () => { cancelled = true; };
    }, [active]);

    // Slide-in, тримати 5с, slide-out.
    useEffect(() => {
        if (!blessing) return;
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 12, bounciness: 7 }),
        ]).start();
        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: -120, duration: 300, useNativeDriver: true }),
            ]).start(() => setBlessing(null));
        }, 5000);
        return () => clearTimeout(timer);
    }, [blessing, opacity, translateY]);

    if (!blessing) return null;
    const iconXml = (ICON as Record<string, string>)[blessing.icon];
    return (
        <Animated.View
            style={[styles.banner, { top: insets.top + 10, opacity, transform: [{ translateY }] }]}
            pointerEvents="none"
        >
            {iconXml ? <SvgXml xml={iconXml} width={26} height={26} /> : null}
            <Text style={styles.text}>{blessing.text}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: 'rgba(20,20,40,0.96)', paddingHorizontal: 20, paddingVertical: 12,
        borderRadius: 26, borderWidth: 1, borderColor: '#534AB7', zIndex: 1000, maxWidth: 360,
        shadowColor: '#534AB7', shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 10,
    },
    text: { color: '#fff', fontSize: 14, fontWeight: '600', flexShrink: 1 },
});
