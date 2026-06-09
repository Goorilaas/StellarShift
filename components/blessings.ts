// Пасхалкові фрази-благословення. Використовуються у settings (тап по лого «Про застосунок»)
// та у каталозі (тап по лого StellarShift в топ-барі).
// Іконка — це ключ з ICON у components/icons.ts.
// UA — повний пул (20), EN — повний пул (20). Прапор України: UA «Все буде Україна»,
// EN «Stand with Ukraine» — бренд-сигнал. Решта іконок ділиться між тематичними парами.

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
    // Soul wave (v3.7.5)
    { text: 'Зоряний пил у твоїх венах', icon: 'stardust' },
    { text: 'Всесвіт тримає тобі місце', icon: 'moonCradle' },
    { text: 'Твоє світло видно здалеко', icon: 'beacon' },
    { text: 'Сьогодні Всесвіт за тебе', icon: 'cosmicShield' },
    { text: 'Ти ближче до мрії, ніж учора', icon: 'pathToStar' },
    { text: 'Нехай орбіта буде лагідною', icon: 'gentleOrbit' },
    { text: 'Навіть зорі звіряють час по тобі', icon: 'starClock' },
    { text: 'Тиша і світло вже летять до тебе', icon: 'stillness' },
    { text: 'Ти — рідкісне сузір\'я', icon: 'constellation' },
    { text: 'Добро повертається на твою орбіту', icon: 'goodReturns' },
];

const BLESSINGS_EN: Blessing[] = [
    { text: 'You shine like a star', icon: 'sparkle' },
    { text: 'The cosmos is on your side', icon: 'galaxy' },
    { text: 'Today is going to be brilliant', icon: 'sun' },
    { text: "You're on the right orbit", icon: 'orbit' },
    { text: 'Make a wish', icon: 'shootingStar' },
    { text: 'One tap and you got brighter', icon: 'lightbulb' },
    // Soul wave (v3.7.5)
    { text: 'Stand with Ukraine', icon: 'ukraineFlag' },
    { text: 'Stardust runs in your veins', icon: 'stardust' },
    { text: 'The universe saved you a seat', icon: 'moonCradle' },
    { text: 'Your light travels far', icon: 'beacon' },
    { text: 'Today the cosmos has your back', icon: 'cosmicShield' },
    { text: 'Closer to the dream than yesterday', icon: 'pathToStar' },
    { text: 'May your orbit be gentle', icon: 'gentleOrbit' },
    { text: "You're a rare constellation", icon: 'constellation' },
    { text: 'Stillness is on its way to you', icon: 'stillness' },
    { text: 'The stars set their clocks by you', icon: 'starClock' },
    { text: 'Good things are circling back', icon: 'goodReturns' },
    { text: 'Somewhere, a star is rooting for you', icon: 'rootingStar' },
    { text: 'You bend light just by being here', icon: 'prism' },
    { text: 'Today is yours to orbit', icon: 'dayOrbit' },
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
