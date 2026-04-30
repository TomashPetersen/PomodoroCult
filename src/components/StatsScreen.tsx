import { BarChart3, Calendar } from 'lucide-react';
import { useMemo } from 'react';
import { formatHoursMinutes, pluralRu } from '../lib/format';
import { getDateRange, getLocalDateKey } from '../lib/storage';
import { cn } from '../lib/ui';
import { StatsPeriod } from '../lib/types';
import { useAppStore } from '../store/useAppStore';

const periodDays: Record<StatsPeriod, number> = {
  '1d': 1,
  '7d': 7,
  '30d': 30
};

const periodLabels: Array<{ value: StatsPeriod; label: string }> = [
  { value: '1d', label: '1д' },
  { value: '7d', label: '7д' },
  { value: '30d', label: 'Месяц' }
];

export const StatsScreen = () => {
  const statistics = useAppStore((state) => state.statistics);
  const tasks = useAppStore((state) => state.tasks);
  const statsPeriod = useAppStore((state) => state.statsPeriod);
  const statsDate = useAppStore((state) => state.statsDate);
  const selectedStatsTaskId = useAppStore((state) => state.selectedStatsTaskId);
  const setStatsPeriod = useAppStore((state) => state.setStatsPeriod);
  const setStatsDate = useAppStore((state) => state.setStatsDate);
  const toggleStatsTask = useAppStore((state) => state.toggleStatsTask);
  const today = getLocalDateKey();

  const summary = useMemo(() => {
    const range = getDateRange(statsDate, periodDays[statsPeriod]);
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

    const rows = Array.from(taskMap.values()).sort((a, b) => {
      if (b.seconds !== a.seconds) return b.seconds - a.seconds;
      return b.lastSessionAt - a.lastSessionAt;
    });
    const activeRow = selectedStatsTaskId
      ? rows.find((row) => row.taskId === selectedStatsTaskId)
      : null;
    const visibleRows = activeRow ? [activeRow] : rows;

    return {
      rows,
      sessions: visibleRows.reduce((sum, row) => sum + row.sessions, 0),
      seconds: visibleRows.reduce((sum, row) => sum + row.seconds, 0)
    };
  }, [selectedStatsTaskId, statistics, statsDate, statsPeriod, tasks]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="space-y-3">
        <div className="flex h-9 items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-zinc-950 dark:text-white">Статистика</h1>
          <div className="grid grid-cols-3 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
            {periodLabels.map((period) => (
              <button
                key={period.value}
                type="button"
                onClick={() => setStatsPeriod(period.value)}
                className={cn(
                  'h-7 rounded-md px-2 text-xs font-medium transition',
                  statsPeriod === period.value
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100'
                )}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          <Calendar className="h-4 w-4 text-zinc-500" />
          <input
            type="date"
            value={statsDate}
            max={today}
            onChange={(event) => setStatsDate(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none dark:[color-scheme:dark]"
          />
        </label>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Количество сессий</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-950 dark:text-white">
            {summary.sessions}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Общее время</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-950 dark:text-white">
            {formatHoursMinutes(summary.seconds)}
          </p>
        </div>
      </section>

      <section className="mt-4 flex-1 overflow-y-auto pr-1">
        {summary.rows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-zinc-400 dark:text-zinc-500">
            <BarChart3 className="h-8 w-8" />
            <p className="mt-3 text-sm">Нет данных</p>
          </div>
        ) : (
          <div className="space-y-2">
            {summary.rows.map((row) => {
              const active = selectedStatsTaskId === row.taskId;

              return (
                <button
                  key={row.taskId}
                  type="button"
                  onClick={() => toggleStatsTask(row.taskId)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left shadow-sm transition',
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
                      {row.sessions} {pluralRu(row.sessions, 'сессия', 'сессии', 'сессий')}
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
    </div>
  );
};
