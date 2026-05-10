import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
    BackHandler,
    Dimensions,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SvgXml } from 'react-native-svg';
import { ICON } from './icons';

export const ONBOARDING_KEY = 'onboarding_seen';

type Slide = {
    icon: string;
    iconSize: number;
    titleKey: string;
    bodyKey: string;
};

const SLIDES: Slide[] = [
    { icon: ICON.galaxy, iconSize: 140, titleKey: 'onboarding.s1.title', bodyKey: 'onboarding.s1.body' },
    { icon: ICON.heartFilled, iconSize: 110, titleKey: 'onboarding.s2.title', bodyKey: 'onboarding.s2.body' },
    { icon: ICON.refresh, iconSize: 110, titleKey: 'onboarding.s3.title', bodyKey: 'onboarding.s3.body' },
];

const { width: SCREEN_W } = Dimensions.get('window');

export default function Onboarding({ onDone }: { onDone: () => void }) {
    const { t } = useTranslation();
    const [index, setIndex] = useState(0);
    const listRef = useRef<FlatList<Slide>>(null);

    const finish = async () => {
        try {
            await AsyncStorage.setItem(ONBOARDING_KEY, '1');
        } catch {
            // не блокуємо — переживемо повторний показ
        }
        onDone();
    };

    const next = () => {
        if (index < SLIDES.length - 1) {
            listRef.current?.scrollToIndex({ index: index + 1, animated: true });
        } else {
            finish();
        }
    };

    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
        if (i !== index) setIndex(i);
    };

    // Android system back button:
    // - на слайдах 1+ — повертає на попередній слайд
    // - на слайді 0 — поглинаємо подію щоб не закрити застосунок випадково
    //   (юзер має кнопку «Пропустити» для явного виходу).
    useEffect(() => {
        const onBack = () => {
            if (index > 0) {
                listRef.current?.scrollToIndex({ index: index - 1, animated: true });
            }
            return true; // consumed
        };
        const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
        return () => sub.remove();
    }, [index]);

    const isLast = index === SLIDES.length - 1;

    return (
        <View style={styles.root}>
            <Pressable style={styles.skip} onPress={finish} hitSlop={12}>
                <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
            </Pressable>

            <FlatList
                ref={listRef}
                data={SLIDES}
                keyExtractor={(_, i) => String(i)}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                renderItem={({ item }) => (
                    <View style={styles.slide}>
                        <View style={styles.iconWrap}>
                            <SvgXml xml={item.icon} width={item.iconSize} height={item.iconSize} />
                        </View>
                        <Text style={styles.title}>{t(item.titleKey)}</Text>
                        <Text style={styles.body}>{t(item.bodyKey)}</Text>
                    </View>
                )}
            />

            <View style={styles.dots}>
                {SLIDES.map((_, i) => (
                    <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
                ))}
            </View>

            <Pressable style={[styles.cta, isLast && styles.ctaFinal]} onPress={next}>
                <Text style={[styles.ctaText, isLast && styles.ctaTextFinal]}>
                    {t(isLast ? 'onboarding.start' : 'onboarding.next')}
                </Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0a0a1a',
        zIndex: 1000,
    },
    skip: {
        position: 'absolute',
        top: 56,
        right: 20,
        zIndex: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    skipText: {
        color: '#777',
        fontSize: 15,
    },
    slide: {
        width: SCREEN_W,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    iconWrap: {
        marginBottom: 48,
        opacity: 0.95,
    },
    title: {
        color: '#FFD700',
        fontSize: 26,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 16,
        letterSpacing: 0.3,
    },
    body: {
        color: '#bbb',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 320,
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 32,
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2a2a40',
    },
    dotActive: {
        backgroundColor: '#7F77DD',
        width: 24,
    },
    cta: {
        marginHorizontal: 32,
        marginBottom: 48,
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: '#1a1a2e',
        borderWidth: 1,
        borderColor: '#2a2a40',
        alignItems: 'center',
    },
    ctaFinal: {
        backgroundColor: '#FFD700',
        borderColor: '#FFD700',
    },
    ctaText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    ctaTextFinal: {
        color: '#0a0a1a',
        fontWeight: '700',
    },
});
