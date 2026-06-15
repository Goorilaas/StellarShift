import * as FileSystem from 'expo-file-system/legacy';
import { TFunction } from 'i18next';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Photo } from '../components/categories';
import { ensureGalleryPermission } from './galleryPermission';
import { trackDownload } from './unsplashTracking';

type Translate = TFunction;
type Toast = (message: string) => void;

// Зберегти фото в галерею. Логіка та сама, що в каталозі — винесено сюди, щоб
// фото-переглядач колекцій не дублював її (каталог поки лишається зі своєю
// інлайн-копією; за бажання приведемо до цього сервісу окремим прибиранням).
export const savePhotoToGallery = async (photo: Photo, t: Translate, showToast: Toast): Promise<void> => {
    try {
        const granted = await ensureGalleryPermission(t);
        if (!granted) return;
        const dest = (FileSystem.cacheDirectory ?? '') + `stellarshift_${photo.id}.jpg`;
        const { uri } = await FileSystem.downloadAsync(photo.urls.regular, dest);
        await MediaLibrary.saveToLibraryAsync(uri);
        try { await FileSystem.deleteAsync(dest, { idempotent: true }); } catch { }
        trackDownload(photo.links?.download_location);
        showToast(t('catalog.toast.saved'));
    } catch {
        showToast(t('catalog.toast.downloadFail'));
    }
};

// Поділитися фото через системний share-sheet.
export const sharePhoto = async (photo: Photo, t: Translate, showToast: Toast): Promise<void> => {
    try {
        if (!(await Sharing.isAvailableAsync())) { showToast(t('catalog.toast.shareUnavailable')); return; }
        showToast(t('catalog.toast.preparing'));
        const dest = (FileSystem.cacheDirectory ?? '') + `stellarshift_share_${photo.id}.jpg`;
        const { uri } = await FileSystem.downloadAsync(photo.urls.regular, dest);
        await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: t('catalog.shareDialog') });
        try { await FileSystem.deleteAsync(dest, { idempotent: true }); } catch { }
        trackDownload(photo.links?.download_location);
    } catch {
        showToast(t('catalog.toast.shareFail'));
    }
};
