import * as Sentry from '@sentry/react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, LogBox, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import ByoReminderDialog from '../components/ByoReminderDialog';
import Onboarding, { ONBOARDING_KEY } from '../components/Onboarding';
import { initI18n } from '../i18n';
import { UnsplashKeyProvider, useUnsplashKey } from '../services/unsplashKey';

// Dev-only шум від expo-keep-awake (тригериться при швидких state-переходах activity).
// Не блокує функціонал, у release build не з'являється.
LogBox.ignoreLogs(['Unable to activate keep awake']);

// Sentry — ініціалізація на module-load перед будь-яким рендером.
// DSN з .env (EXPO_PUBLIC_SENTRY_DSN). Порожній DSN = no-op (Sentry не падає, просто disabled).
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,
        // У dev — більше інформації, у release — мінімум шуму.
        debug: __DEV__,
        // Track 10% performance traces у release, 100% у dev.
        tracesSampleRate: __DEV__ ? 1.0 : 0.1,
        environment: __DEV__ ? 'development' : 'production',
    });
}

function TabsInner() {
    const { hasUserKey, dialog, dismissDialog, setOnGoToSettings } = useUnsplashKey();
    const { t } = useTranslation();

    useEffect(() => {
        setOnGoToSettings(() => {
            dismissDialog();
            router.push({ pathname: '/settings', params: { scrollTo: 'byo' } });
        });
    }, [dismissDialog, setOnGoToSettings]);

    return (
        <>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: {
                        backgroundColor: '#0a0a1a',
                        borderTopColor: '#1a1a2e',
                    },
                    tabBarActiveTintColor: '#7F77DD',
                    tabBarInactiveTintColor: '#555',
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: t('catalog.title'),
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="grid-outline" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="favorites"
                    options={{
                        title: t('favorites.title'),
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="heart-outline" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="settings"
                    options={{
                        title: t('settings.title'),
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="settings-outline" size={size} color={color} />
                        ),
                        tabBarBadge: hasUserKey ? undefined : '',
                        tabBarBadgeStyle: {
                            backgroundColor: '#FFD700',
                            minWidth: 10,
                            maxWidth: 10,
                            height: 10,
                            borderRadius: 5,
                            marginLeft: -4,
                        },
                    }}
                />
            </Tabs>
            <ByoReminderDialog
                variant={dialog}
                onLater={dismissDialog}
                onGoToSettings={() => {
                    dismissDialog();
                    router.push({ pathname: '/settings', params: { scrollTo: 'byo' } });
                }}
            />
        </>
    );
}

function TabLayout() {
    const [i18nReady, setI18nReady] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

    useEffect(() => {
        initI18n().then(() => setI18nReady(true));
        AsyncStorage.getItem(ONBOARDING_KEY)
            .then(seen => setShowOnboarding(seen !== '1'))
            .catch(() => setShowOnboarding(false));
    }, []);

    if (!i18nReady || showOnboarding === null) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0a0a1a', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#7F77DD" />
            </View>
        );
    }
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <UnsplashKeyProvider>
                <TabsInner />
                {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
            </UnsplashKeyProvider>
        </GestureHandlerRootView>
    );
}

export default Sentry.wrap(TabLayout);
