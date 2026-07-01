import { CheckCircle2, Clock3, Target } from 'lucide-react';
import { formatHoursMinutes } from '../lib/format';
import { getTaskTitle, t } from '../lib/i18n';
import { getLocalDateKey } from '../lib/storage';
import { useAppStore } from '../store/useAppStore';

export const AppWindowTodayWidget = () => {
  const locale = useAppStore((state) => state.locale);
  const statistics = useAppStore((state) => state.statistics);
  const tasks = useAppStore((state) => state.tasks);
  const timerState = useAppStore((state) => state.timerState);

  const today = statistics[getLocalDateKey()];
  const activeTask = tasks.find((task) => task.id === timerState.activeTaskId);
  const activeTaskTitle = activeTask
    ? getTaskTitle(locale, activeTask.id, activeTask.title)
    : t(locale, 'noTask');

  return (
    <section className="rounded-2xl border border-zinc-200 bg-[#fcfcfb] p-3 shadow-sm dark:border-zinc-800 dark:bg-[#0b1016]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
            {t(locale, 'todayWidgetTitle')}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-zinc-950 dark:text-white">
            {activeTaskTitle}
          </p>
        </div>

        <div className="min-w-[7.5rem] rounded-xl bg-[#eef2f6] px-3 py-2 dark:bg-[#161b22]">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t(locale, 'todaySessions')}
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums leading-none text-zinc-950 dark:text-white">
            {today?.sessions ?? 0}
          </p>
        </div>

        <div className="min-w-[8.5rem] rounded-xl bg-[#eef2f6] px-3 py-2 dark:bg-[#161b22]">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Clock3 className="h-3.5 w-3.5" />
            {t(locale, 'todayFocusTime')}
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums leading-none text-zinc-950 dark:text-white">
            {formatHoursMinutes(today?.seconds ?? 0)}
          </p>
        </div>

        <div className="hidden h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-500/10 xl:grid">
          <Target className="h-4 w-4" />
        </div>
      </div>
    </section>
  );
};
