import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { t } from '../lib/i18n';
import { formatDateLabel } from '../lib/format';
import { getLocalDateKey } from '../lib/storage';
import { cn } from '../lib/ui';
import { Locale } from '../lib/types';
import { useAppStore } from '../store/useAppStore';

type PickerTarget = 'start' | 'end';

const toDate = (dateKey: string): Date => new Date(`${dateKey}T12:00:00`);

const addMonths = (date: Date, offset: number): Date => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + offset);
  return next;
};

const getMonthTitle = (locale: Locale, date: Date): string =>
  new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    month: 'long',
    year: 'numeric'
  }).format(date);

const getWeekdayLabels = (locale: Locale): string[] => {
  const baseMonday = new Date('2026-06-01T12:00:00');

  return Array.from({ length: 7 }, (_value, index) => {
    const date = new Date(baseMonday);
    date.setDate(baseMonday.getDate() + index);
    return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' })
      .format(date)
      .slice(0, 2);
  });
};

const getCalendarDays = (monthDate: Date): Date[] => {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_value, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

export const StatsRangeModal = () => {
  const locale = useAppStore((state) => state.locale);
  const open = useAppStore((state) => state.statsRangeModalOpen);
  const statsRangeStart = useAppStore((state) => state.statsRangeStart);
  const statsRangeEnd = useAppStore((state) => state.statsRangeEnd);
  const closeStatsRangeModal = useAppStore((state) => state.closeStatsRangeModal);
  const applyCustomStatsRange = useAppStore((state) => state.applyCustomStatsRange);
  const [draftStart, setDraftStart] = useState(statsRangeStart);
  const [draftEnd, setDraftEnd] = useState(statsRangeEnd);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => toDate(statsRangeEnd));
  const today = getLocalDateKey();
  const weekdayLabels = useMemo(() => getWeekdayLabels(locale), [locale]);
  const calendarDays = useMemo(() => getCalendarDays(monthCursor), [monthCursor]);

  useEffect(() => {
    if (!open) return;

    setDraftStart(statsRangeStart);
    setDraftEnd(statsRangeEnd);
    setMonthCursor(toDate(statsRangeEnd));
    setPickerTarget(null);
  }, [open, statsRangeEnd, statsRangeStart]);

  if (!open) return null;

  const canApply = Boolean(draftStart && draftEnd && draftStart <= draftEnd && draftEnd <= today);

  const openPicker = (target: PickerTarget) => {
    setPickerTarget(target);
    setMonthCursor(toDate(target === 'start' ? draftStart : draftEnd));
  };

  const selectDate = (dateKey: string) => {
    if (pickerTarget === 'start') {
      setDraftStart(dateKey);
      if (dateKey > draftEnd) {
        setDraftEnd(dateKey);
      }
    }

    if (pickerTarget === 'end') {
      setDraftEnd(dateKey);
      if (dateKey < draftStart) {
        setDraftStart(dateKey);
      }
    }

    setPickerTarget(null);
  };

  const isDateDisabled = (dateKey: string): boolean => {
    if (dateKey > today) return true;
    if (pickerTarget === 'start' && dateKey > draftEnd) return true;
    if (pickerTarget === 'end' && dateKey < draftStart) return true;
    return false;
  };

  const renderDateField = (target: PickerTarget, value: string, label: string) => {
    const active = pickerTarget === target;

    return (
      <div className="relative">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <button
          type="button"
          onClick={() => openPicker(target)}
          className={cn(
            'group flex h-10 w-full items-center justify-between rounded-xl border bg-[#fcfcfb] px-3 text-left text-sm text-zinc-950 outline-none transition',
            'hover:border-zinc-300 hover:bg-[#f0f3f6] focus:border-rose-400',
            'dark:border-[#30363d] dark:bg-[#161b22] dark:text-[#f0f3f6] dark:hover:border-[#484f58] dark:hover:bg-[#21262d] dark:focus:border-rose-500',
            active ? 'border-rose-400 dark:border-rose-500' : 'border-zinc-200'
          )}
          aria-label={t(locale, 'openCalendar')}
          title={t(locale, 'openCalendar')}
        >
          <span>{formatDateLabel(value)}</span>
          <CalendarDays className="h-4 w-4 text-zinc-500 transition group-hover:text-zinc-950 dark:text-zinc-300" />
        </button>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-[24rem] overflow-visible rounded-2xl border border-zinc-200 bg-[#fcfcfb] p-4 shadow-soft dark:border-[#30363d] dark:bg-[#161b22]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-white">{t(locale, 'chooseDateRange')}</h2>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {renderDateField('start', draftStart, t(locale, 'startDate'))}
          {renderDateField('end', draftEnd, t(locale, 'endDate'))}
        </div>

        <p className="mt-3 rounded-xl bg-[#eef2f6] px-3 py-2 text-xs text-zinc-600 dark:bg-[#21262d] dark:text-zinc-300">
          {t(locale, 'currentSelection', {
            start: formatDateLabel(draftStart),
            end: formatDateLabel(draftEnd)
          })}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={closeStatsRangeModal}
            className="h-10 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 transition hover:bg-[#eef2f6] hover:text-zinc-950 dark:border-[#30363d] dark:text-zinc-200 dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]"
          >
            {t(locale, 'cancel')}
          </button>
          <button
            type="button"
            disabled={!canApply}
            onClick={() => applyCustomStatsRange(draftStart, draftEnd)}
            className="h-10 rounded-xl bg-[#24292f] text-sm font-semibold text-[#f6f8fa] transition hover:bg-[#32383f] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#f0f3f6] dark:text-[#161b22] dark:hover:bg-[#d8dee4]"
          >
            {t(locale, 'apply')}
          </button>
        </div>

        {pickerTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#f6f8fa]/72 p-3 backdrop-blur-sm dark:bg-[#0d1117]/72"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setPickerTarget(null);
              }
            }}
          >
            <div
              className="w-full max-w-[18rem] rounded-2xl border border-zinc-200 bg-[#fcfcfb] p-3 shadow-soft dark:border-[#30363d] dark:bg-[#161b22]"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMonthCursor((current) => addMonths(current, -1))}
                  className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-[#eef2f6] hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]"
                  aria-label={t(locale, 'previousMonth')}
                  title={t(locale, 'previousMonth')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold capitalize text-zinc-950 dark:text-white">
                  {getMonthTitle(locale, monthCursor)}
                </span>
                <button
                  type="button"
                  onClick={() => setMonthCursor((current) => addMonths(current, 1))}
                  className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-[#eef2f6] hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]"
                  aria-label={t(locale, 'nextMonth')}
                  title={t(locale, 'nextMonth')}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-zinc-400">
                {weekdayLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {calendarDays.map((date) => {
                  const dateKey = getLocalDateKey(date);
                  const inMonth = date.getMonth() === monthCursor.getMonth();
                  const selected = dateKey === (pickerTarget === 'start' ? draftStart : draftEnd);
                  const inRange = dateKey >= draftStart && dateKey <= draftEnd;
                  const disabled = isDateDisabled(dateKey);

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      disabled={disabled}
                      onClick={() => selectDate(dateKey)}
                      className={cn(
                        'grid h-8 place-items-center rounded-lg text-xs font-medium transition',
                        inRange && 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
                        selected && 'bg-rose-500 text-white dark:bg-rose-500 dark:text-white',
                        !selected && !inRange && inMonth && 'text-zinc-800 hover:bg-[#eef2f6] dark:text-zinc-100 dark:hover:bg-[#21262d]',
                        !inMonth && 'text-zinc-300 dark:text-zinc-700',
                        disabled && 'cursor-not-allowed opacity-30'
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
