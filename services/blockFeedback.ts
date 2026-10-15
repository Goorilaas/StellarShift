import type { ToastAction } from '../components/Toast';
import { BlockResult, retryBlockedReplacement } from './blocked';

type ShowToast = (message: string, action?: ToastAction | null, duration?: number) => void;
export function showBlockFeedback(result: BlockResult, id: string, t: (key: string) => string,
                                  show: ShowToast, dismiss: () => void, undo?: () => void) {
    const message = result === 'replaced' ? 'blockReplacement.replaced' : 'catalog.toast.blocked';
    if (undo || result !== 'failed') show(t(message), undo ? { label: t('common.undo'), onPress: undo } : null, 5000);
    let retrying = false;
    const failure = () => show(t('blockReplacement.failed'), {
        label: t('blockReplacement.retry'),
        onPress: async () => {
            if (retrying) return;
            retrying = true;
            dismiss();
            try {
                const next = await retryBlockedReplacement(id);
                if (next === 'failed') failure();
                else show(t(next === 'replaced' ? 'blockReplacement.replaced' : 'blockReplacement.noLongerNeeded'));
            } finally { retrying = false; }
        },
    }, 10000);
    if (result === 'failed') failure();
}
