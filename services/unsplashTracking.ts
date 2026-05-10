import axios from 'axios';
import { Linking } from 'react-native';
import { getUnsplashKey } from './unsplashKey';

// Unsplash API guidelines:
// 1. Track downloads via GET to photo.links.download_location with Authorization
// 2. All unsplash.com links must include UTM params for the application
// 3. Photos must be hotlinked from photo.urls (we already do — Image source uses urls.regular/small)

const UTM = '?utm_source=stellarshift&utm_medium=referral';

/**
 * Append UTM params to any unsplash.com URL. Idempotent — won't double-append.
 */
export function withUtm(url: string | undefined | null): string {
    if (!url) return '';
    if (url.includes('utm_source=stellarshift')) return url;
    return url + (url.includes('?') ? '&' : '') + UTM.slice(1);
}

/**
 * Fire Unsplash download-tracking ping. Required by API ToS on every photo "use" event
 * (set as wallpaper, save, share, auto-rotation tick). Fire-and-forget — don't block UI on errors.
 */
export async function trackDownload(downloadLocation: string | undefined | null): Promise<void> {
    if (!downloadLocation) return;
    try {
        const key = await getUnsplashKey();
        await axios.get(downloadLocation, {
            headers: { Authorization: `Client-ID ${key}` },
            timeout: 8000,
        });
    } catch {
        // Silent — tracking failure mustn't break user flow.
    }
}

/**
 * Open Unsplash author profile in browser with proper attribution UTM.
 */
export function openAuthorProfile(username: string | undefined | null): void {
    if (!username) return;
    Linking.openURL(`https://unsplash.com/@${username}${UTM}`);
}

/**
 * Open Unsplash homepage with attribution UTM (used in "Powered by Unsplash" link).
 */
export function openUnsplashHome(): void {
    Linking.openURL(`https://unsplash.com${UTM}`);
}

