import AsyncStorage from '@react-native-async-storage/async-storage';
import { Photo } from '../components/categories';

// Спільне сховище улюблених (ті самі ключі, що в каталозі): id-список + повні
// об'єкти. Винесено, щоб фото-грид колекцій лайкав так само, як каталог.
export const getFavoriteIds = async (): Promise<string[]> => {
    try {
        const raw = await AsyncStorage.getItem('favorites');
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const toggleFavoritePhoto = async (photo: Photo): Promise<string[]> => {
    const [idsRaw, dataRaw] = await Promise.all([
        AsyncStorage.getItem('favorites'),
        AsyncStorage.getItem('favorites_data'),
    ]);
    const ids: string[] = idsRaw ? JSON.parse(idsRaw) : [];
    const data: Photo[] = dataRaw ? JSON.parse(dataRaw) : [];
    const has = ids.includes(photo.id);
    const newIds = has ? ids.filter(i => i !== photo.id) : [...ids, photo.id];
    const newData = has ? data.filter(p => p.id !== photo.id) : [...data, photo];
    await AsyncStorage.setItem('favorites', JSON.stringify(newIds));
    await AsyncStorage.setItem('favorites_data', JSON.stringify(newData));
    return newIds;
};
