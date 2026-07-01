import { Clock3, History, TimerReset } from 'lucide-react';
import { useMemo } from 'react';
import { formatHoursMinutes } from '../lib/format';
import { getDateRangeBetween, getLocalDateKey, getPresetStatsRange } from '../lib/storage';
import { cn } from '../lib/ui';
import { useAppStore } from '../store/useAppStore';

interface FocusSummaryCardsProps {
  className?: string;
}

interface FocusSummaryItem {
  key: string;
  label: string;
  value: string;
  icon: typeof History;
}

export const FocusSummaryCards = ({ className }: FocusSummaryCardsProps) => {
  const locale = useAppStore((state) => state.locale);
  const statistics = useAppStore((state) => state.statistics);

  const items = useMemo<FocusSummaryItem[]>(() => {
    const todayKey = getLocalDateKey();
    const weekRange = getPresetStatsRange(7, todayKey);
    const weekKeys = getDateRangeBetween(weekRange.start, weekRange.end);
    const totalSeconds = Object.values(statistics).reduce((sum, day) => sum + day.seconds, 0);
    const weekSeconds = weekKeys.reduce((sum, key) => sum + (statistics[key]?.seconds ?? 0), 0);
    const todaySeconds = statistics[todayKey]?.seconds ?? 0;

    return [
      {
        key: 'total',
        label: locale === 'ru' ? 'Всего фокуса' : 'Total focus',
        value: formatHoursMinutes(totalSeconds),
        icon: History
      },
      {
        key: 'week',
        label: locale === 'ru' ? 'Фокус за неделю' : 'Focus this week',
        value: formatHoursMinutes(weekSeconds),
        icon: TimerReset
      },
      {
        key: 'today',
        label: locale === 'ru' ? 'Фокус сегодня' : 'Focus today',
        value: formatHoursMinutes(todaySeconds),
        icon: Clock3
      }
    ];
  }, [locale, statistics]);

  return (
    <section className={cn('grid shrink-0 grid-cols-3 gap-3', className)}>
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.key}
            className="flex min-w-0 items-center gap-3 rounded-2xl border border-zinc-200 bg-[#fcfcfb] px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-[#161b22]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-500 dark:bg-rose-500/15">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">{item.label}</p>
              <p className="mt-0.5 truncate text-xl font-semibold tabular-nums text-zinc-950 dark:text-white">
                {item.value}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
};
