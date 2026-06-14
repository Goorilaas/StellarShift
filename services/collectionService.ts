import axios from 'axios';
import { dedupAndCapByAuthor, Photo } from '../components/categories';
import { getUnsplashKey } from './unsplashKey';

export type CollectionMeta = {
    id: string;
    title: string;
    total: number;
    cover?: string;       // urls.small обкладинки — для герой-картки
    curator?: string;     // user.name — куратор
};

// Фото з конкретної колекції (портрет, як решта пулу). author-cap лишаємо —
// навіть у кураторській добірці один автор не має монополізувати грид.
export const getCollectionPhotos = async (
    collectionId: string,
    page = 1,
    perPage = 30,
    signal?: AbortSignal,
): Promise<Photo[]> => {
    const key = await getUnsplashKey();
    const res = await axios.get(`https://api.unsplash.com/collections/${collectionId}/photos`, {
        params: { page, per_page: perPage, orientation: 'portrait' },
        headers: { Authorization: `Client-ID ${key}` },
        signal,
    });
    return dedupAndCapByAuthor(res.data as Photo[]);
};

// Метадані колекції для картки: назва, к-сть, обкладинка, куратор.
export const getCollectionMeta = async (collectionId: string): Promise<CollectionMeta | null> => {
    try {
        const key = await getUnsplashKey();
        const res = await axios.get(`https://api.unsplash.com/collections/${collectionId}`, {
            headers: { Authorization: `Client-ID ${key}` },
        });
        const d = res.data;
        return {
            id: d.id,
            title: d.title,
            total: d.total_photos,
            cover: d.cover_photo?.urls?.small,
            curator: d.user?.name,
        };
    } catch {
        return null;
    }
};
