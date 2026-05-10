// Пасхалкові фрази-благословення. Використовуються у settings (тап по лого «Про застосунок»)
// та у каталозі (тап по лого StellarShift в топ-барі).
// Іконка — це ключ з ICON у components/icons.ts.
// UA — повний пул (10), EN — короткий (6). Прапор України лишаємо тільки в UA.

import { getAppLanguage } from '../i18n';

export type Blessing = { text: string; icon: string };

const BLESSINGS_UK: Blessing[] = [
    { text: 'Ти сяєш як зоря', icon: 'sparkle' },
    { text: 'Космос на твоєму боці', icon: 'galaxy' },
    { text: 'Сьогодні все буде супер', icon: 'sun' },
    { text: 'Зорі шепочуть тобі привіт', icon: 'starsTwo' },
    { text: 'Все буде Україна', icon: 'ukraineFlag' },
    { text: 'Ти на правильній орбіті', icon: 'orbit' },
    { text: 'Удача вже поруч — простягни руку', icon: 'clover' },
    { text: 'Загадай бажання', icon: 'shootingStar' },
    { text: 'Ти — головний герой свого Всесвіту', icon: 'crown' },
    { text: 'Один тап і ти став яскравішим', icon: 'lightbulb' },
];

const BLESSINGS_EN: Blessing[] = [
    { text: 'You shine like a star', icon: 'sparkle' },
    { text: 'The cosmos is on your side', icon: 'galaxy' },
    { text: 'Today is going to be brilliant', icon: 'sun' },
    { text: "You're on the right orbit", icon: 'orbit' },
    { text: 'Make a wish', icon: 'shootingStar' },
    { text: 'One tap and you got brighter', icon: 'lightbulb' },
];

export const BLESSINGS = BLESSINGS_UK; // legacy export, не видаляти — використовується у тестах

function poolForLang(): Blessing[] {
    return getAppLanguage() === 'uk' ? BLESSINGS_UK : BLESSINGS_EN;
}

// Хелпер shuffle-без-повторів. Викликай через React useRef<Blessing[]>([]).
export function nextBlessingFromQueue(queueRef: { current: Blessing[] }): Blessing {
    if (queueRef.current.length === 0) {
        const shuffled = [...poolForLang()];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        queueRef.current = shuffled;
    }
    return queueRef.current.shift()!;
}
