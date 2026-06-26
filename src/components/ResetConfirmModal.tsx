import { AlertTriangle } from 'lucide-react';
import { t } from '../lib/i18n';
import { useAppStore } from '../store/useAppStore';

export const ResetConfirmModal = () => {
  const locale = useAppStore((state) => state.locale);
  const open = useAppStore((state) => state.resetConfirmOpen);
  const closeResetConfirm = useAppStore((state) => state.closeResetConfirm);
  const confirmReset = useAppStore((state) => state.confirmReset);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[24rem] rounded-2xl border border-zinc-200 bg-[#fcfcfb] p-4 shadow-soft dark:border-zinc-800 dark:bg-[#161b22]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-white">{t(locale, 'confirmStop')}</h2>
            <p className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-300">
              {t(locale, 'stopDescription')}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={closeResetConfirm}
            className="h-10 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 transition hover:bg-[#eef2f6] hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]"
          >
            {t(locale, 'cancel')}
          </button>
          <button
            type="button"
            onClick={() => void confirmReset()}
            className="h-10 rounded-xl bg-rose-600 text-sm font-semibold text-white transition hover:bg-rose-500"
          >
            {t(locale, 'stop')}
          </button>
        </div>
      </div>
    </div>
  );
};
