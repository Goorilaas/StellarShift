import axios from 'axios';

export type CollectionError = 'rateLimit' | 'unavailable' | 'access' | 'auth' | 'network' | 'server' | 'unknown';

export function classifyCollectionError(error: unknown): CollectionError {
    if (!axios.isAxiosError(error)) return 'unknown';
    const status = error.response?.status;
    const data = error.response?.data;
    const messages = typeof data === 'string' ? [data] : Array.isArray(data?.errors) ? data.errors : [];
    const explicitRateLimit = messages.some((message: unknown) =>
        typeof message === 'string' && /rate limit exceeded/i.test(message));
    const remaining = error.response?.headers?.['x-ratelimit-remaining'];
    // Сам по собі 403 означає відмову в доступі, а не вичерпану квоту.
    if (status === 429 || (status === 403 && (remaining === '0' || remaining === 0 || explicitRateLimit))) {
        return 'rateLimit';
    }
    if (status === 401) return 'auth';
    if (status === 403) return 'access';
    if (status === 404 || status === 410) return 'unavailable';
    if (status && status >= 500) return 'server';
    if (!error.response && ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error.code ?? '')) return 'network';
    return 'unknown';
}
