import { AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const ResetConfirmModal = () => {
  const open = useAppStore((state) => state.resetConfirmOpen);
  const closeResetConfirm = useAppStore((state) => state.closeResetConfirm);
  const confirmReset = useAppStore((state) => state.confirmReset);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/55 p-5 backdrop-blur-sm">
      <div className="w-full rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-white">Подтвердите сброс</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Таймер будет остановлен, счетчик циклов обнулится, а экран вернется к вкладке
              «Помодоро». Уже сохраненная статистика останется.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={closeResetConfirm}
            className="h-11 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => void confirmReset()}
            className="h-11 rounded-xl bg-rose-600 text-sm font-semibold text-white transition hover:bg-rose-500"
          >
            Сбросить
          </button>
        </div>
      </div>
    </div>
  );
};
