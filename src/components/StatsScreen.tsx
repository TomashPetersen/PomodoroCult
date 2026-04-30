import { BarChart3, Calendar } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { QUICK_STATS_PERIODS, STATS_PERIOD_LABELS } from '../lib/constants';
import { formatDateRange, formatHoursMinutes, pluralRu } from '../lib/format';
import { getDateRangeBetween } from '../lib/storage';
import { cn } from '../lib/ui';
import { useAppStore } from '../store/useAppStore';
import { StatsRangeModal } from './StatsRangeModal';

export const StatsScreen = () => {
  const statistics = useAppStore((state) => state.statistics);
  const tasks = useAppStore((state) => state.tasks);
  const statsPeriod = useAppStore((state) => state.statsPeriod);
  const statsRangeStart = useAppStore((state) => state.statsRangeStart);
  const statsRangeEnd = useAppStore((state) => state.statsRangeEnd);
  const selectedStatsTaskId = useAppStore((state) => state.selectedStatsTaskId);
  const statsTaskSelectionTouched = useAppStore((state) => state.statsTaskSelectionTouched);
  const setStatsPeriod = useAppStore((state) => state.setStatsPeriod);
  const openStatsRangeModal = useAppStore((state) => state.openStatsRangeModal);
  const selectStatsTask = useAppStore((state) => state.selectStatsTask);
  const applyAutoStatsTask = useAppStore((state) => state.applyAutoStatsTask);

  const rows = useMemo(() => {
    const range = getDateRangeBetween(statsRangeStart, statsRangeEnd);
    const taskMap = new Map<
      string,
      { taskId: string; title: string; sessions: number; seconds: number; lastSessionAt: number }
    >();

    for (const date of range) {
      const day = statistics[date];
      if (!day) continue;

      for (const taskStat of Object.values(day.tasks)) {
        const currentTask = tasks.find((task) => task.id === taskStat.taskId);
        const previous = taskMap.get(taskStat.taskId);

        taskMap.set(taskStat.taskId, {
          taskId: taskStat.taskId,
          title: currentTask?.title ?? taskStat.title,
          sessions: (previous?.sessions ?? 0) + taskStat.sessions,
          seconds: (previous?.seconds ?? 0) + taskStat.seconds,
          lastSessionAt: Math.max(previous?.lastSessionAt ?? 0, taskStat.lastSessionAt)
        });
      }
    }

    return Array.from(taskMap.values()).sort((a, b) => {
      if (b.lastSessionAt !== a.lastSessionAt) return b.lastSessionAt - a.lastSessionAt;
      return b.seconds - a.seconds;
    });
  }, [statistics, statsRangeEnd, statsRangeStart, tasks]);

  useEffect(() => {
    if (rows.length === 0) {
      if (selectedStatsTaskId !== null || statsTaskSelectionTouched) {
        applyAutoStatsTask(null);
      }
      return;
    }

    const selectedStillVisible = rows.some((row) => row.taskId === selectedStatsTaskId);

    if (!selectedStatsTaskId || !selectedStillVisible) {
      applyAutoStatsTask(rows[0].taskId);
      return;
    }

    if (!statsTaskSelectionTouched && selectedStatsTaskId !== rows[0].taskId) {
      applyAutoStatsTask(rows[0].taskId);
    }
  }, [
    applyAutoStatsTask,
    rows,
    selectedStatsTaskId,
    statsTaskSelectionTouched
  ]);

  const selectedRow = rows.find((row) => row.taskId === selectedStatsTaskId) ?? rows[0] ?? null;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <header className="space-y-3">
        <div className="flex min-h-9 items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-zinc-950 dark:text-white">Статистика</h1>
          <div className="grid grid-cols-3 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
            {QUICK_STATS_PERIODS.map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setStatsPeriod(period)}
                className={cn(
                  'h-8 rounded-lg px-2 text-xs font-medium transition',
                  statsPeriod === period
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100'
                )}
              >
                {STATS_PERIOD_LABELS[period]}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={openStatsRangeModal}
          className="flex h-11 w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 text-left shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Диапазон
            </p>
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {formatDateRange(statsRangeStart, statsRangeEnd)}
            </p>
          </div>
        </button>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {selectedRow ? `Сессии: ${selectedRow.title}` : 'Количество сессий'}
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-950 dark:text-white">
            {selectedRow?.sessions ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {selectedRow ? `Время: ${selectedRow.title}` : 'Общее время'}
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-950 dark:text-white">
            {formatHoursMinutes(selectedRow?.seconds ?? 0)}
          </p>
        </div>
      </section>

      <section className="mt-4 flex-1 overflow-y-auto pr-1">
        {rows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-zinc-400 dark:text-zinc-500">
            <BarChart3 className="h-8 w-8" />
            <p className="mt-3 text-sm">Нет данных за выбранный период</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const active = selectedRow?.taskId === row.taskId;

              return (
                <button
                  key={row.taskId}
                  type="button"
                  onClick={() => selectStatsTask(row.taskId)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left shadow-sm transition',
                    active
                      ? 'border-rose-300 bg-rose-50 dark:border-rose-500/60 dark:bg-rose-500/10'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">
                      {row.title}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {row.sessions}{' '}
                      {pluralRu(row.sessions, 'сессия', 'сессии', 'сессий')}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                    {formatHoursMinutes(row.seconds)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <StatsRangeModal />
    </div>
  );
};
