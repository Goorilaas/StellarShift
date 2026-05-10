import type { TFunction } from 'i18next';

/**
 * Soulful brand-микро-фідбек: коли юзер запускає «гарну» дію (зараз — save-to-
 * gallery), показуємо коротку радісну фразу замість сухого «Завантажуємо...».
 *
 * Pool у `i18n/locales/{uk,en}.json → cheer.{1..5}`. Випадковий вибір без черги —
 * juiceness не страждає від випадкового повторення (5 фраз дають 80% novelty
 * при типовій частоті 1-3 натискання за сесію).
 */
const POOL_SIZE = 5;

export function randomCheer(t: TFunction): string {
    const idx = 1 + Math.floor(Math.random() * POOL_SIZE);
    return t(`cheer.${idx}`);
}
