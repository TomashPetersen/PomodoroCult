import { CalendarDays } from 'lucide-react';
import { useEffect, useState } from 'react';
import { t } from '../lib/i18n';
import { formatDateLabel } from '../lib/format';
import { getLocalDateKey } from '../lib/storage';
import { useAppStore } from '../store/useAppStore';

export const StatsRangeModal = () => {
  const locale = useAppStore((state) => state.locale);
  const open = useAppStore((state) => state.statsRangeModalOpen);
  const statsRangeStart = useAppStore((state) => state.statsRangeStart);
  const statsRangeEnd = useAppStore((state) => state.statsRangeEnd);
  const closeStatsRangeModal = useAppStore((state) => state.closeStatsRangeModal);
  const applyCustomStatsRange = useAppStore((state) => state.applyCustomStatsRange);
  const [draftStart, setDraftStart] = useState(statsRangeStart);
  const [draftEnd, setDraftEnd] = useState(statsRangeEnd);

  useEffect(() => {
    if (!open) return;

    setDraftStart(statsRangeStart);
    setDraftEnd(statsRangeEnd);
  }, [open, statsRangeEnd, statsRangeStart]);

  if (!open) return null;

  const today = getLocalDateKey();
  const canApply = Boolean(draftStart && draftEnd && draftStart <= draftEnd && draftEnd <= today);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-zinc-950/55 p-5 backdrop-blur-sm">
      <div className="w-full rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-white">{t(locale, 'chooseDateRange')}</h2>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t(locale, 'startDate')}
            </span>
            <input
              type="date"
              value={draftStart}
              max={today}
              onChange={(event) => setDraftStart(event.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-rose-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-rose-500 dark:[color-scheme:dark]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t(locale, 'endDate')}
            </span>
            <input
              type="date"
              value={draftEnd}
              min={draftStart}
              max={today}
              onChange={(event) => setDraftEnd(event.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-rose-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-rose-500 dark:[color-scheme:dark]"
            />
          </label>
        </div>

        <p className="mt-4 rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          {t(locale, 'currentSelection', {
            start: formatDateLabel(draftStart),
            end: formatDateLabel(draftEnd)
          })}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={closeStatsRangeModal}
            className="h-11 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white"
          >
            {t(locale, 'cancel')}
          </button>
          <button
            type="button"
            disabled={!canApply}
            onClick={() => applyCustomStatsRange(draftStart, draftEnd)}
            className="h-11 rounded-xl bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {t(locale, 'apply')}
          </button>
        </div>
      </div>
    </div>
  );
};
