import { AlertTriangle } from 'lucide-react';
import { getTaskTitle, t } from '../lib/i18n';
import { useAppStore } from '../store/useAppStore';

export const StatsDeleteConfirmModal = () => {
  const locale = useAppStore((state) => state.locale);
  const tasks = useAppStore((state) => state.tasks);
  const statsDeleteConfirmTaskId = useAppStore((state) => state.statsDeleteConfirmTaskId);
  const closeStatsDeleteConfirm = useAppStore((state) => state.closeStatsDeleteConfirm);
  const confirmStatsDelete = useAppStore((state) => state.confirmStatsDelete);

  if (!statsDeleteConfirmTaskId) return null;

  const task = tasks.find((item) => item.id === statsDeleteConfirmTaskId);
  const title = getTaskTitle(locale, statsDeleteConfirmTaskId, task?.title ?? '');

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/55 p-5 backdrop-blur-sm">
      <div className="w-full rounded-2xl border border-zinc-200 bg-[#fcfcfb] p-5 shadow-soft dark:border-zinc-800 dark:bg-[#161b22]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
              {t(locale, 'confirmDeleteStats')}
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {t(locale, 'deleteStatsDescription', { title })}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <button
            type="button"
            onClick={closeStatsDeleteConfirm}
            className="h-11 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 transition hover:bg-[#eef2f6] hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]"
          >
            {t(locale, 'cancel')}
          </button>
          <button
            type="button"
            onClick={() => void confirmStatsDelete()}
            className="h-11 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-500"
          >
            {t(locale, 'deleteForever')}
          </button>
        </div>
      </div>
    </div>
  );
};
