import * as MediaLibrary from 'expo-media-library';
import { Alert, Linking } from 'react-native';
import type { TFunction } from 'i18next';

/**
 * Запитати дозвіл на запис у галерею з людським rationale ПЕРЕД system prompt.
 *
 * Сценарії:
 *   - Уже granted → повертає true одразу.
 *   - canAskAgain=true → наш Alert з поясненням → system prompt → результат.
 *   - canAskAgain=false (юзер відмовив назавжди) → Alert «відкрити налаштування»
 *     з кнопкою, що веде в системні settings застосунку.
 *
 * Повертає true тільки коли в кінці маємо granted.
 */
export async function ensureGalleryPermission(t: TFunction): Promise<boolean> {
    // Granular: запитуємо ТІЛЬКИ photo permission (не audio/video). Defense-in-depth
    // на випадок якщо колись інший transitive lib потягне декларацію audio/video у манифест.
    const current = await MediaLibrary.getPermissionsAsync(false, ['photo']);
    if (current.granted) return true;

    if (!current.canAskAgain) {
        return new Promise(resolve => {
            Alert.alert(
                t('perm.gallery.deniedTitle'),
                t('perm.gallery.deniedMsg'),
                [
                    { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
                    { text: t('perm.gallery.openSettings'), onPress: () => { Linking.openSettings(); resolve(false); } },
                ],
                { cancelable: true, onDismiss: () => resolve(false) },
            );
        });
    }

    const rationaleAccepted = await new Promise<boolean>(resolve => {
        Alert.alert(
            t('perm.gallery.rationaleTitle'),
            t('perm.gallery.rationaleMsg'),
            [
                { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
                { text: t('perm.gallery.allow'), onPress: () => resolve(true) },
            ],
            { cancelable: true, onDismiss: () => resolve(false) },
        );
    });
    if (!rationaleAccepted) return false;

    const next = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
    return next.granted;
}
