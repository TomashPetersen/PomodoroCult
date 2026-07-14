import { BarChart3, Calendar, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { QUICK_STATS_PERIODS } from '../lib/constants';
import { getStatsPeriodLabel, getTaskTitle, pluralizeSessions, t } from '../lib/i18n';
import { formatDateRange, formatHoursMinutes } from '../lib/format';
import { getDateRangeBetween } from '../lib/storage';
import { cn } from '../lib/ui';
import { useAppStore } from '../store/useAppStore';
import { ActionIconButton } from './ActionIconButton';
import { StatsDeleteConfirmModal } from './StatsDeleteConfirmModal';
import { StatsRangeModal } from './StatsRangeModal';

interface StatsScreenProps {
  surface?: 'popup' | 'appWindow';
}

export const StatsScreen = ({ surface = 'popup' }: StatsScreenProps) => {
  const isAppWindow = surface === 'appWindow';
  const locale = useAppStore((state) => state.locale);
  const statistics = useAppStore((state) => state.statistics);
  const tasks = useAppStore((state) => state.tasks);
  const statsPeriod = useAppStore((state) => state.statsPeriod);
  const statsRangeStart = useAppStore((state) => state.statsRangeStart);
  const statsRangeEnd = useAppStore((state) => state.statsRangeEnd);
  const selectedStatsTaskId = useAppStore((state) => state.selectedStatsTaskId);
  const statsTaskSelectionTouched = useAppStore((state) => state.statsTaskSelectionTouched);
  const statsView = useAppStore((state) => state.statsView);
  const setStatsView = useAppStore((state) => state.setStatsView);
  const openStatsChartWindow = useAppStore((state) => state.openStatsChartWindow);
  const openAppWindow = useAppStore((state) => state.openAppWindow);
  const setStatsPeriod = useAppStore((state) => state.setStatsPeriod);
  const openStatsRangeModal = useAppStore((state) => state.openStatsRangeModal);
  const openStatsDeleteConfirm = useAppStore((state) => state.openStatsDeleteConfirm);
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
  }, [applyAutoStatsTask, rows, selectedStatsTaskId, statsTaskSelectionTouched]);

  const selectedRow = rows.find((row) => row.taskId === selectedStatsTaskId) ?? rows[0] ?? null;
  const selectedTitle = selectedRow
    ? getTaskTitle(locale, selectedRow.taskId, selectedRow.title)
    : null;
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <header className={cn(isAppWindow ? 'space-y-2' : 'space-y-3')}>
        <div className="flex min-h-9 items-center justify-between gap-3">
          <h1 className={cn('font-semibold text-zinc-950 dark:text-white', isAppWindow ? 'text-base' : 'text-lg')}>
            {t(locale, 'stats')}
          </h1>
          <div className="grid grid-cols-3 rounded-xl bg-[#eaeef2] p-1 dark:bg-[#161b22]">
            {QUICK_STATS_PERIODS.map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setStatsPeriod(period)}
                className={cn(
                  'h-8 rounded-lg px-2 text-xs font-medium transition',
                  statsPeriod === period
                    ? 'bg-[#fcfcfb] text-zinc-950 shadow-sm dark:bg-[#21262d] dark:text-[#f0f3f6]'
                    : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-[#f0f3f6]'
                )}
              >
                {getStatsPeriodLabel(locale, period)}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={openStatsRangeModal}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-[#fcfcfb] px-3 text-left shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#161b22] dark:hover:border-zinc-700',
            isAppWindow ? 'h-10' : 'h-11'
          )}
        >
          <div
            className={cn(
              'grid shrink-0 place-items-center rounded-lg bg-[#eaeef2] text-zinc-600 dark:bg-[#21262d] dark:text-zinc-300',
              isAppWindow ? 'h-7 w-7' : 'h-8 w-8'
            )}
          >
            <Calendar className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              {t(locale, 'range')}
            </p>
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {formatDateRange(statsRangeStart, statsRangeEnd)}
            </p>
          </div>
        </button>

        <div className="grid grid-cols-2 rounded-xl bg-[#eaeef2] p-1 dark:bg-[#161b22]">
          {[
            { view: 'list' as const, label: t(locale, 'statsListView') },
            { view: 'chart' as const, label: t(locale, 'statsChartView') }
          ].map((item) => (
            <button
              key={item.view}
              type="button"
              onClick={() => {
                if (item.view === 'chart') {
                  if (isAppWindow) {
                    setStatsView('chart');
                  } else {
                    void openStatsChartWindow();
                  }
                  return;
                }

                setStatsView('list');
              }}
              className={cn(
                'h-8 rounded-lg px-2 text-xs font-semibold transition',
                (isAppWindow ? statsView : 'list') === item.view
                  ? 'bg-[#fcfcfb] text-zinc-950 shadow-sm dark:bg-[#21262d] dark:text-[#f0f3f6]'
                  : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-[#f0f3f6]'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            if (isAppWindow) {
              setStatsView('review');
              return;
            }
            void openAppWindow({ screen: 'stats', statsView: 'review' });
          }}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-950/60"
          aria-label={locale === 'ru' ? 'Открыть обзор фокуса' : 'Open Focus Review'}
        >
          <Sparkles className="h-4 w-4" />
          {locale === 'ru' ? 'Обзор фокуса' : 'Focus Review'}
        </button>
      </header>

      <section className={cn('grid grid-cols-2 gap-3', isAppWindow ? 'mt-3' : 'mt-4')}>
        <div className={cn('rounded-xl border border-zinc-200 bg-[#fcfcfb] shadow-sm dark:border-zinc-800 dark:bg-[#161b22]', isAppWindow ? 'p-2.5' : 'p-3')}>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {selectedTitle
              ? t(locale, 'sessionsMetric', { title: selectedTitle })
              : t(locale, 'sessionsMetricEmpty')}
          </p>
          <p className={cn('font-semibold text-zinc-950 dark:text-white', isAppWindow ? 'mt-1 text-2xl' : 'mt-2 text-3xl')}>
            {selectedRow?.sessions ?? 0}
          </p>
        </div>
        <div className={cn('rounded-xl border border-zinc-200 bg-[#fcfcfb] shadow-sm dark:border-zinc-800 dark:bg-[#161b22]', isAppWindow ? 'p-2.5' : 'p-3')}>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {selectedTitle
              ? t(locale, 'timeMetric', { title: selectedTitle })
              : t(locale, 'timeMetricEmpty')}
          </p>
          <p className={cn('font-semibold text-zinc-950 dark:text-white', isAppWindow ? 'mt-1 text-2xl' : 'mt-2 text-3xl')}>
            {formatHoursMinutes(selectedRow?.seconds ?? 0)}
          </p>
        </div>
      </section>

      <section className={cn('flex-1 overflow-y-auto pr-1', isAppWindow ? 'mt-3' : 'mt-4')}>
        {rows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-zinc-400 dark:text-zinc-500">
            <BarChart3 className="h-8 w-8" />
            <p className="mt-3 text-sm">{t(locale, 'noStats')}</p>
          </div>
        ) : (
          <div className={cn(isAppWindow ? 'space-y-1.5' : 'space-y-2')}>
            {rows.map((row) => {
              const active = selectedRow?.taskId === row.taskId;

              return (
                <button
                  key={row.taskId}
                  type="button"
                  onClick={() => selectStatsTask(row.taskId)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-xl border px-3 text-left shadow-sm transition',
                    isAppWindow ? 'py-2.5' : 'py-3',
                    active
                      ? 'border-rose-300 bg-rose-50 dark:border-rose-500/60 dark:bg-rose-500/10'
                      : 'border-zinc-200 bg-[#fcfcfb] hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#161b22] dark:hover:border-zinc-700'
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">
                      {getTaskTitle(locale, row.taskId, row.title)}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {row.sessions} {pluralizeSessions(locale, row.sessions)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                      {formatHoursMinutes(row.seconds)}
                    </span>
                    <ActionIconButton
                      type="button"
                      label={t(locale, 'deleteStats')}
                      tooltipSide="bottom"
                      onClick={(event) => {
                        event.stopPropagation();
                        openStatsDeleteConfirm(row.taskId);
                      }}
                      className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </ActionIconButton>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <StatsRangeModal />
      <StatsDeleteConfirmModal />
    </div>
  );
};
