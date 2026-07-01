import { BarChart3 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getTaskTitle, pluralizeSessions, t } from '../lib/i18n';
import { formatHoursMinutes } from '../lib/format';
import { getDateRangeBetween } from '../lib/storage';
import { cn } from '../lib/ui';
import { useAppStore } from '../store/useAppStore';
import { TooltipBubble } from './TooltipBubble';

interface ChartSegment {
  taskId: string;
  title: string;
  sessions: number;
  seconds: number;
  color: string;
}

interface ChartDay {
  date: string;
  label: string;
  totalSessions: number;
  segments: ChartSegment[];
}

interface ChartLegendItem {
  taskId: string;
  title: string;
  sessions: number;
  seconds: number;
  color: string;
}

interface StatsJournalChartProps {
  className?: string;
}

const chartColors = ['#f43f5e', '#10b981', '#f59e0b', '#38bdf8', '#a78bfa', '#fb7185', '#f97316', '#22c55e'];

const formatChartDate = (locale: string, dateKey: string): string =>
  new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit',
    month: 'short'
  }).format(new Date(`${dateKey}T12:00:00`));

const compareLegendItems = (selectedTaskId: string | null) => (a: ChartLegendItem, b: ChartLegendItem) => {
  if (selectedTaskId) {
    if (a.taskId === selectedTaskId && b.taskId !== selectedTaskId) return -1;
    if (b.taskId === selectedTaskId && a.taskId !== selectedTaskId) return 1;
  }

  return b.sessions - a.sessions || b.seconds - a.seconds || a.title.localeCompare(b.title);
};

export const StatsJournalChart = ({ className }: StatsJournalChartProps) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const locale = useAppStore((state) => state.locale);
  const statistics = useAppStore((state) => state.statistics);
  const tasks = useAppStore((state) => state.tasks);
  const statsRangeStart = useAppStore((state) => state.statsRangeStart);
  const statsRangeEnd = useAppStore((state) => state.statsRangeEnd);

  const chartDays = useMemo<ChartDay[]>(() => {
    const range = getDateRangeBetween(statsRangeStart, statsRangeEnd);
    const taskColorMap = new Map<string, string>();

    const getTaskColor = (taskId: string) => {
      const existing = taskColorMap.get(taskId);
      if (existing) return existing;
      const next = chartColors[taskColorMap.size % chartColors.length];
      taskColorMap.set(taskId, next);
      return next;
    };

    return range.map((date) => {
      const day = statistics[date];
      const segments = day
        ? Object.values(day.tasks)
            .map((taskStat) => {
              const currentTask = tasks.find((task) => task.id === taskStat.taskId);
              return {
                taskId: taskStat.taskId,
                title: currentTask?.title ?? taskStat.title,
                sessions: taskStat.sessions,
                seconds: taskStat.seconds,
                color: getTaskColor(taskStat.taskId)
              };
            })
            .sort((a, b) => b.sessions - a.sessions || b.seconds - a.seconds)
        : [];

      return {
        date,
        label: formatChartDate(locale, date),
        totalSessions: day?.sessions ?? 0,
        segments
      };
    });
  }, [locale, statistics, statsRangeEnd, statsRangeStart, tasks]);

  const chartLegend = useMemo<ChartLegendItem[]>(() => {
    const legendMap = new Map<string, ChartLegendItem>();

    for (const day of chartDays) {
      for (const segment of day.segments) {
        const previous = legendMap.get(segment.taskId);
        legendMap.set(segment.taskId, {
          taskId: segment.taskId,
          title: segment.title,
          sessions: (previous?.sessions ?? 0) + segment.sessions,
          seconds: (previous?.seconds ?? 0) + segment.seconds,
          color: segment.color
        });
      }
    }

    return Array.from(legendMap.values()).sort(compareLegendItems(selectedTaskId));
  }, [chartDays, selectedTaskId]);

  const hasChartData = chartDays.some((day) => day.totalSessions > 0);
  const maxSessions = Math.max(1, ...chartDays.map((day) => day.totalSessions));
  const sessionGridTemplateColumns = `repeat(${maxSessions}, minmax(4.75rem, 1fr))`;
  const totalLabel = locale === 'ru' ? 'Итого' : 'Total';

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport || !hasChartData) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      viewport.scrollTop = viewport.scrollHeight;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [hasChartData, statsRangeEnd, statsRangeStart]);

  if (!hasChartData) {
    return (
      <section
        className={cn(
          'grid min-h-0 flex-1 place-items-center rounded-2xl border border-zinc-200 bg-[#fcfcfb] text-center text-zinc-400 shadow-sm dark:border-zinc-800 dark:bg-[#161b22] dark:text-zinc-500',
          className
        )}
      >
        <div>
          <BarChart3 className="mx-auto h-10 w-10" />
          <p className="mt-3 text-sm">{t(locale, 'noStats')}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        'relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-[#fcfcfb] p-4 shadow-sm dark:border-zinc-800 dark:bg-[#161b22]',
        className
      )}
    >
      <div className="mb-3 flex min-h-9 min-w-0 flex-wrap gap-1.5">
        {chartLegend.map((item) => {
          const title = getTaskTitle(locale, item.taskId, item.title);
          const active = selectedTaskId === item.taskId;

          return (
            <button
              key={item.taskId}
              type="button"
              onClick={() => setSelectedTaskId((current) => (current === item.taskId ? null : item.taskId))}
              className={cn(
                'group/legend relative flex max-w-[16rem] items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                active
                  ? 'border-transparent bg-[#24292f] text-white shadow-sm dark:bg-[#f0f3f6] dark:text-[#161b22]'
                  : 'border-transparent bg-[#eef2f6] text-zinc-600 hover:border-zinc-200 hover:bg-[#f8fafc] dark:bg-[#21262d] dark:text-zinc-300 dark:hover:border-[#30363d] dark:hover:bg-[#24292f]'
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="truncate">{title}</span>
              <span className="shrink-0 tabular-nums text-current/65">{item.sessions}</span>
              <TooltipBubble
                multiline
                maxWidth="18rem"
                className="left-1/2 top-[calc(100%+0.45rem)] -translate-x-1/2 group-hover/legend:block group-focus-visible/legend:block"
              >
                {title} / {item.sessions} {pluralizeSessions(locale, item.sessions)} /{' '}
                {formatHoursMinutes(item.seconds)}
              </TooltipBubble>
            </button>
          );
        })}
      </div>

      <div ref={scrollViewportRef} className="min-h-0 flex-1 overflow-auto rounded-2xl bg-[#f6f8fa] p-4 dark:bg-[#0d1117]">
        <div className="min-w-full space-y-1.5">
          <div className="sticky top-0 z-20 grid min-w-full grid-cols-[7.25rem_minmax(34rem,1fr)_6rem] items-center gap-2 bg-[#f6f8fa] pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:bg-[#0d1117]">
            <span />
            <div className="grid gap-2" style={{ gridTemplateColumns: sessionGridTemplateColumns }}>
              {Array.from({ length: maxSessions }, (_value, index) => (
                <span key={index} className="text-center tabular-nums">
                  {index + 1}
                </span>
              ))}
            </div>
            <span className="sticky right-0 justify-self-end rounded-lg bg-[#f6f8fa] px-3 py-1 text-right dark:bg-[#0d1117]">
              {totalLabel}
            </span>
          </div>

          {chartDays.map((day) => {
            const blocks = day.segments.flatMap((segment) =>
              Array.from({ length: segment.sessions }, (_value, index) => ({ segment, index }))
            );

            return (
              <div
                key={day.date}
                className="group/chart-row grid h-12 min-w-full grid-cols-[7.25rem_minmax(34rem,1fr)_6rem] items-center gap-2 rounded-xl border border-transparent px-2 outline outline-1 outline-transparent transition hover:bg-[#fcfcfb] hover:outline-zinc-200 dark:hover:bg-[#161b22] dark:hover:outline-zinc-800"
              >
                <span className="truncate text-sm font-medium text-zinc-500 dark:text-zinc-400">{day.label}</span>

                <div className="grid gap-2" style={{ gridTemplateColumns: sessionGridTemplateColumns }}>
                  {Array.from({ length: maxSessions }, (_value, index) => {
                    const block = blocks[index];

                    if (!block) {
                      return (
                        <span
                          key={index}
                          className="h-7 rounded-lg border border-dashed border-zinc-200/80 dark:border-zinc-800/80"
                        />
                      );
                    }

                    const segment = block.segment;
                    const title = getTaskTitle(locale, segment.taskId, segment.title);
                    const active = selectedTaskId === segment.taskId;
                    const dimmed = selectedTaskId !== null && !active;

                    return (
                      <button
                        key={`${day.date}-${segment.taskId}-${block.index}-${index}`}
                        type="button"
                        onClick={() => setSelectedTaskId(segment.taskId)}
                        className={cn(
                          'group/chart-cell relative z-0 h-7 rounded-lg shadow-sm transition focus:outline-none focus:ring-2 focus:ring-white/80',
                          active && 'z-10 ring-2 ring-white/70 brightness-110',
                          dimmed ? 'opacity-30 hover:opacity-80' : 'hover:scale-[1.035] hover:brightness-110'
                        )}
                        style={{ backgroundColor: segment.color }}
                        aria-label={title}
                      >
                        <TooltipBubble className="left-1/2 top-[calc(100%+0.45rem)] -translate-x-1/2 group-hover/chart-cell:block group-focus-visible/chart-cell:block">
                          {title}
                        </TooltipBubble>
                      </button>
                    );
                  })}
                </div>

                <span className="sticky right-0 justify-self-end rounded-lg bg-[#f6f8fa] px-3 py-1 text-right text-sm font-semibold tabular-nums text-zinc-500 group-hover/chart-row:bg-[#fcfcfb] dark:bg-[#0d1117] dark:text-zinc-300 dark:group-hover/chart-row:bg-[#161b22]">
                  {day.totalSessions}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
