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
    <section className="rounded-2xl border border-zinc-200 bg-[#fcfcfb] p-4 shadow-sm dark:border-zinc-800 dark:bg-[#0b1016]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
            {t(locale, 'todayWidgetTitle')}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-zinc-950 dark:text-white">
            {activeTaskTitle}
          </p>
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
          <Target className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#eef2f6] p-3 dark:bg-[#161b22]">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <CheckCircle2 className="h-4 w-4" />
            {t(locale, 'todaySessions')}
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-950 dark:text-white">
            {today?.sessions ?? 0}
          </p>
        </div>

        <div className="rounded-xl bg-[#eef2f6] p-3 dark:bg-[#161b22]">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Clock3 className="h-4 w-4" />
            {t(locale, 'todayFocusTime')}
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-950 dark:text-white">
            {formatHoursMinutes(today?.seconds ?? 0)}
          </p>
        </div>
      </div>
    </section>
  );
};
