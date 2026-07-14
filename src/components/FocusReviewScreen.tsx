import {
  ArrowLeft,
  Calendar,
  Check,
  Clock3,
  FileDown,
  FileText,
  HelpCircle,
  Maximize2,
  Minimize2,
  Save,
  Sparkles,
  Target,
  TrendingUp
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { QUICK_STATS_PERIODS } from '../lib/constants';
import {
  calculateFocusReview,
  ReviewComparison,
  ReviewCoverage,
  ReviewGoalProgress
} from '../lib/focusReview';
import { formatHoursMinutesLabel } from '../lib/format';
import {
  buildFocusReviewCsv,
  buildWeeklyFocusReviewMarkdown,
  downloadLocalTextReport
} from '../lib/focusReports';
import { getStatsPeriodLabel } from '../lib/i18n';
import { cn } from '../lib/ui';
import { useAppStore } from '../store/useAppStore';
import { ActionIconButton } from './ActionIconButton';

interface FocusReviewScreenProps {
  maximized: boolean;
  onBack: () => void;
  onToggleMaximized: () => void;
}

const copy = {
  en: {
    title: 'Focus Review',
    back: 'Back to statistics',
    range: 'Range',
    coverage: 'Event insights are available from',
    coverageFull: 'Full event-log coverage',
    coveragePartial: 'Partial event-log coverage — observed totals may be incomplete',
    coverageNone: 'The selected range is before reliable event history',
    totalFocus: 'Total focus',
    sessions: 'Completed sessions',
    previous: 'vs. previous equivalent period',
    new: 'New — no prior data',
    neutral: 'No change',
    insufficient: 'Insufficient coverage',
    strongestDay: 'Strongest day',
    strongestTask: 'Strongest task',
    sparse: 'Not enough data yet',
    sparseStrongest: 'Needs at least 3 sessions across 2 dates.',
    goals: 'Session goals',
    dailyGoal: 'Daily goal',
    weeklyGoal: 'Weekly goal',
    disabled: 'Disabled',
    partialGoal: 'Observed progress; coverage is incomplete',
    saveGoals: 'Save goals',
    saved: 'Goals saved',
    goalError: 'Enter a whole number from 1 to 99, or leave the field empty.',
    saveError: 'Could not save goals. Try again.',
    streak: 'Consistency streak',
    days: 'days',
    atLeast: 'At least',
    distribution: 'Task distribution',
    previousShare: 'previous share',
    percentagePoints: 'pp',
    noDistribution: 'No event-derived task data in this range.',
    reports: 'Local reports',
    csv: 'Download session CSV',
    markdown: 'Download weekly Markdown',
    csvReady: 'CSV report created.',
    markdownReady: 'Weekly Markdown report created.',
    reportError: 'Could not create the report. Try again.',
    bestWindow: 'Best two-hour window',
    needsSessions: 'Needs 10 sessions; currently {count}.',
    needsDates: 'Needs 4 start dates; currently {count}.',
    help: 'How Focus Review works',
    helpText:
      'Totals use completed Work events only. Periods are inclusive local calendar dates and comparison uses the same number of dates. Strongest insights need 3 sessions across 2 dates. Streak ends today, or yesterday when today is unfinished, and never crosses event-log coverage. Best window needs 10 sessions across 4 start dates, uses fixed non-overlapping two-hour buckets, and assigns the full session to its local start bucket. New events use captured local dates and start minutes; legacy events are inferred from timestamps in the current runtime timezone.',
    captured: 'captured',
    inferred: 'inferred',
    empty: 'No completed Work events in this range.',
    error: 'Focus Review could not be calculated for this range.',
    fullscreen: 'Enter fullscreen',
    exitFullscreen: 'Exit fullscreen'
  },
  ru: {
    title: 'Обзор фокуса',
    back: 'Назад к статистике',
    range: 'Диапазон',
    coverage: 'Событийная аналитика доступна с',
    coverageFull: 'Полное покрытие журнала событий',
    coveragePartial: 'Частичное покрытие — наблюдаемые итоги могут быть неполными',
    coverageNone: 'Выбранный период находится до надёжной истории событий',
    totalFocus: 'Время фокуса',
    sessions: 'Завершённые сессии',
    previous: 'к предыдущему равному периоду',
    new: 'Новое — ранее данных не было',
    neutral: 'Без изменений',
    insufficient: 'Недостаточно покрытия',
    strongestDay: 'Самый продуктивный день',
    strongestTask: 'Самая сильная задача',
    sparse: 'Пока недостаточно данных',
    sparseStrongest: 'Нужно не менее 3 сессий на 2 датах.',
    goals: 'Цели по сессиям',
    dailyGoal: 'Цель на день',
    weeklyGoal: 'Цель на неделю',
    disabled: 'Отключена',
    partialGoal: 'Наблюдаемый прогресс; покрытие неполное',
    saveGoals: 'Сохранить цели',
    saved: 'Цели сохранены',
    goalError: 'Введите целое число от 1 до 99 или оставьте поле пустым.',
    saveError: 'Не удалось сохранить цели. Повторите попытку.',
    streak: 'Серия постоянства',
    days: 'дн.',
    atLeast: 'Не менее',
    distribution: 'Распределение по задачам',
    previousShare: 'доля ранее',
    percentagePoints: 'п.п.',
    noDistribution: 'В этом диапазоне нет событийных данных по задачам.',
    reports: 'Локальные отчёты',
    csv: 'Скачать CSV сессий',
    markdown: 'Скачать недельный Markdown',
    csvReady: 'CSV-отчёт создан.',
    markdownReady: 'Недельный Markdown-отчёт создан.',
    reportError: 'Не удалось создать отчёт. Повторите попытку.',
    bestWindow: 'Лучшее двухчасовое окно',
    needsSessions: 'Нужно 10 сессий; сейчас {count}.',
    needsDates: 'Нужно 4 даты старта; сейчас {count}.',
    help: 'Как работает обзор фокуса',
    helpText:
      'Итоги используют только события завершённых рабочих сессий. Периоды состоят из включённых локальных календарных дат, сравнение берёт такое же число дат. Для сильнейших показателей нужны 3 сессии на 2 датах. Серия заканчивается сегодня или вчера, если сегодняшний день ещё не начат, и не пересекает границу журнала. Для лучшего окна нужны 10 сессий на 4 датах старта; используются фиксированные непересекающиеся двухчасовые интервалы, а вся сессия относится к интервалу локального времени старта. Новые события используют сохранённые локальные даты и минуты; для старых событий они выводятся из timestamp в текущем часовом поясе.',
    captured: 'сохранено',
    inferred: 'выведено',
    empty: 'В этом диапазоне нет завершённых рабочих сессий.',
    error: 'Не удалось рассчитать обзор фокуса для этого диапазона.',
    fullscreen: 'На весь экран',
    exitFullscreen: 'Выйти из полноэкранного режима'
  }
} as const;

const interpolate = (value: string, params: Record<string, string | number>): string =>
  value.replace(/\{(\w+)\}/g, (_match, key) => String(params[key] ?? ''));

const formatReviewDate = (value: string, locale: 'ru' | 'en'): string => {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(year, month - 1, day, 12));
};

const formatComparison = (
  comparison: ReviewComparison,
  labels: (typeof copy)['en'] | (typeof copy)['ru']
): string => {
  if (comparison.kind === 'insufficient-coverage') return labels.insufficient;
  if (comparison.kind === 'new') return labels.new;
  if (comparison.kind === 'neutral') return labels.neutral;
  const value = comparison.percent ?? 0;
  return `${value > 0 ? '+' : ''}${value}% ${labels.previous}`;
};

const coverageLabel = (
  coverage: ReviewCoverage,
  labels: (typeof copy)['en'] | (typeof copy)['ru']
): string => coverage === 'full'
  ? labels.coverageFull
  : coverage === 'partial'
    ? labels.coveragePartial
    : labels.coverageNone;

const GoalProgress = ({
  label,
  progress,
  labels
}: {
  label: string;
  progress: ReviewGoalProgress;
  labels: (typeof copy)['en'] | (typeof copy)['ru'];
}) => {
  const percentage = progress.ratio === null ? null : Math.round(progress.ratio * 100);
  return (
    <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{label}</span>
        <span className="font-mono text-zinc-600 dark:text-zinc-300">
          {progress.state === 'disabled'
            ? labels.disabled
            : `${progress.current} / ${progress.target} (${percentage}%)`}
        </span>
      </div>
      {progress.ratio !== null && (
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuenow={Math.min(progress.current, progress.target ?? progress.current)}
          aria-valuemax={progress.target ?? undefined}
          aria-valuetext={`${progress.current} / ${progress.target} (${percentage}%)`}
        >
          <div
            className="h-full rounded-full bg-rose-500 motion-safe:transition-[width]"
            style={{ width: `${Math.min(100, Math.max(0, progress.ratio * 100))}%` }}
          />
        </div>
      )}
      {progress.state === 'partial-coverage' && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{labels.partialGoal}</p>
      )}
    </div>
  );
};

export const FocusReviewScreen = ({
  maximized,
  onBack,
  onToggleMaximized
}: FocusReviewScreenProps) => {
  const locale = useAppStore((state) => state.locale);
  const sessionEvents = useAppStore((state) => state.sessionEvents);
  const focusReviewGoals = useAppStore((state) => state.focusReviewGoals);
  const sessionEventLogStartedAt = useAppStore((state) => state.sessionEventLogStartedAt);
  const statsPeriod = useAppStore((state) => state.statsPeriod);
  const statsRangeStart = useAppStore((state) => state.statsRangeStart);
  const statsRangeEnd = useAppStore((state) => state.statsRangeEnd);
  const setStatsPeriod = useAppStore((state) => state.setStatsPeriod);
  const openStatsRangeModal = useAppStore((state) => state.openStatsRangeModal);
  const saveFocusReviewGoals = useAppStore((state) => state.saveFocusReviewGoals);
  const labels = copy[locale];
  const [dailyGoal, setDailyGoal] = useState(focusReviewGoals.dailySessions?.toString() ?? '');
  const [weeklyGoal, setWeeklyGoal] = useState(focusReviewGoals.weeklySessions?.toString() ?? '');
  const [goalMessage, setGoalMessage] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    setDailyGoal(focusReviewGoals.dailySessions?.toString() ?? '');
    setWeeklyGoal(focusReviewGoals.weeklySessions?.toString() ?? '');
  }, [focusReviewGoals.dailySessions, focusReviewGoals.weeklySessions]);

  const calculated = useMemo(() => {
    try {
      return {
        result: calculateFocusReview({
          sessionEvents,
          focusReviewGoals,
          sessionEventLogStartedAt,
          range: { start: statsRangeStart, end: statsRangeEnd }
        }),
        error: null
      };
    } catch (error) {
      return { result: null, error };
    }
  }, [
    focusReviewGoals,
    sessionEventLogStartedAt,
    sessionEvents,
    statsRangeEnd,
    statsRangeStart
  ]);

  const parseGoal = (value: string): number | null | undefined => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 99 ? parsed : undefined;
  };

  const handleSaveGoals = async () => {
    const daily = parseGoal(dailyGoal);
    const weekly = parseGoal(weeklyGoal);
    if (daily === undefined || weekly === undefined) {
      setGoalError(labels.goalError);
      setGoalMessage(null);
      return;
    }
    try {
      await saveFocusReviewGoals({ dailySessions: daily, weeklySessions: weekly });
      setGoalError(null);
      setGoalMessage(labels.saved);
    } catch {
      setGoalMessage(null);
      setGoalError(labels.saveError);
    }
  };

  const result = calculated.result;
  const cardClass = 'rounded-2xl border border-zinc-200 bg-[#fcfcfb] p-4 shadow-sm dark:border-zinc-800 dark:bg-[#161b22]';

  const handleCsvDownload = () => {
    if (!result) return;
    try {
      downloadLocalTextReport(buildFocusReviewCsv(result));
      setReportError(null);
      setReportMessage(labels.csvReady);
    } catch {
      setReportMessage(null);
      setReportError(labels.reportError);
    }
  };

  const handleMarkdownDownload = () => {
    try {
      const snapshot = {
        sessionEvents: sessionEvents.map((event) => ({ ...event })),
        focusReviewGoals: { ...focusReviewGoals },
        sessionEventLogStartedAt,
        now: Date.now()
      };
      downloadLocalTextReport(buildWeeklyFocusReviewMarkdown(snapshot, locale));
      setReportError(null);
      setReportMessage(labels.markdownReady);
    } catch {
      setReportMessage(null);
      setReportError(labels.reportError);
    }
  };

  return (
    <main className="flex h-full w-full flex-col overflow-hidden p-4">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ActionIconButton
            type="button"
            onClick={onBack}
            label={labels.back}
            tooltipSide="bottom"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-[#fcfcfb] text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 dark:border-zinc-700 dark:bg-[#161b22] dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </ActionIconButton>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-zinc-950 dark:text-white">
              {labels.title}
            </h1>
            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
              {formatReviewDate(statsRangeStart, locale)} — {formatReviewDate(statsRangeEnd, locale)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={openStatsRangeModal}
            className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-[#fcfcfb] px-3 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 dark:border-zinc-700 dark:bg-[#161b22] dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Calendar className="h-4 w-4" />
            {labels.range}
          </button>
          <div className="grid grid-cols-3 rounded-2xl bg-[#eaeef2] p-1 dark:bg-[#161b22]">
            {QUICK_STATS_PERIODS.map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setStatsPeriod(period)}
                className={cn(
                  'h-9 rounded-xl px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500',
                  statsPeriod === period
                    ? 'bg-[#24292f] text-white dark:bg-[#f0f3f6] dark:text-[#161b22]'
                    : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
                )}
              >
                {getStatsPeriodLabel(locale, period)}
              </button>
            ))}
          </div>
          <ActionIconButton
            type="button"
            onClick={onToggleMaximized}
            label={maximized ? labels.exitFullscreen : labels.fullscreen}
            tooltipAlign="right"
            tooltipSide="bottom"
            className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-[#fcfcfb] text-zinc-600 shadow-sm hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 dark:border-zinc-700 dark:bg-[#161b22] dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </ActionIconButton>
        </div>
      </header>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {!result ? (
          <div role="alert" className={cn(cardClass, 'text-sm text-rose-700 dark:text-rose-300')}>
            {labels.error}
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            <section aria-label={labels.coverage} className={cn(
              'rounded-xl border px-4 py-3 text-sm',
              result.coverage === 'full'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
            )}>
              <p className="font-semibold">{coverageLabel(result.coverage, labels)}</p>
              <p className="mt-1">{labels.coverage} {formatReviewDate(result.coverageDate, locale)}.</p>
            </section>

            <section aria-labelledby="review-overview-heading">
              <h2 id="review-overview-heading" className="sr-only">{labels.title}</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <article className={cardClass}>
                  <Clock3 className="h-5 w-5 text-rose-500" />
                  <h3 className="mt-3 text-sm font-semibold text-zinc-600 dark:text-zinc-300">{labels.totalFocus}</h3>
                  <p className="mt-1 text-3xl font-semibold text-zinc-950 dark:text-white">
                    {formatHoursMinutesLabel(result.totals.durationSeconds, locale)}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatComparison(result.durationComparison, labels)}
                  </p>
                </article>
                <article className={cardClass}>
                  <Check className="h-5 w-5 text-emerald-500" />
                  <h3 className="mt-3 text-sm font-semibold text-zinc-600 dark:text-zinc-300">{labels.sessions}</h3>
                  <p className="mt-1 text-3xl font-semibold text-zinc-950 dark:text-white">{result.totals.sessions}</p>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatComparison(result.sessionComparison, labels)}
                  </p>
                </article>
                <article className={cardClass}>
                  <TrendingUp className="h-5 w-5 text-violet-500" />
                  <h3 className="mt-3 text-sm font-semibold text-zinc-600 dark:text-zinc-300">{labels.strongestDay}</h3>
                  {result.strongestDay ? (
                    <>
                      <p className="mt-1 text-xl font-semibold text-zinc-950 dark:text-white">
                        {formatReviewDate(result.strongestDay.date, locale)}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {formatHoursMinutesLabel(result.strongestDay.durationSeconds, locale)} · {result.strongestDay.sessions}
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                      {labels.sparse}<br />{labels.sparseStrongest}
                    </p>
                  )}
                </article>
                <article className={cardClass}>
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <h3 className="mt-3 text-sm font-semibold text-zinc-600 dark:text-zinc-300">{labels.strongestTask}</h3>
                  {result.strongestTask ? (
                    <>
                      <p className="mt-1 break-words text-xl font-semibold text-zinc-950 dark:text-white">
                        {result.strongestTask.title.trim() || result.strongestTask.taskId}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {formatHoursMinutesLabel(result.strongestTask.durationSeconds, locale)} · {result.strongestTask.sessions}
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                      {labels.sparse}<br />{labels.sparseStrongest}
                    </p>
                  )}
                </article>
              </div>
            </section>

            {result.totals.sessions === 0 && (
              <p className={cn(cardClass, 'text-center text-sm text-zinc-500 dark:text-zinc-400')}>
                {labels.empty}
              </p>
            )}

            <div className="grid gap-4 xl:grid-cols-2">
              <section className={cardClass} aria-labelledby="review-goals-heading">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-rose-500" />
                  <h2 id="review-goals-heading" className="text-base font-semibold">{labels.goals}</h2>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <GoalProgress label={labels.dailyGoal} progress={result.goals.daily} labels={labels} />
                  <GoalProgress label={labels.weeklyGoal} progress={result.goals.weekly} labels={labels} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <label className="text-sm font-medium">
                    {labels.dailyGoal}
                    <input
                      type="number"
                      min={1}
                      max={99}
                      inputMode="numeric"
                      value={dailyGoal}
                      onChange={(event) => setDailyGoal(event.target.value)}
                      placeholder={labels.disabled}
                      aria-invalid={Boolean(goalError)}
                      aria-describedby={goalError || goalMessage ? 'review-goal-status' : undefined}
                      className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    {labels.weeklyGoal}
                    <input
                      type="number"
                      min={1}
                      max={99}
                      inputMode="numeric"
                      value={weeklyGoal}
                      onChange={(event) => setWeeklyGoal(event.target.value)}
                      placeholder={labels.disabled}
                      aria-invalid={Boolean(goalError)}
                      aria-describedby={goalError || goalMessage ? 'review-goal-status' : undefined}
                      className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleSaveGoals()}
                    className="flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
                  >
                    <Save className="h-4 w-4" />
                    {labels.saveGoals}
                  </button>
                </div>
                {(goalError || goalMessage) && (
                  <p id="review-goal-status" role={goalError ? 'alert' : 'status'} className={cn(
                    'mt-3 text-sm',
                    goalError ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
                  )}>
                    {goalError ?? goalMessage}
                  </p>
                )}
              </section>

              <section className={cardClass} aria-labelledby="review-streak-heading">
                <h2 id="review-streak-heading" className="text-base font-semibold">{labels.streak}</h2>
                <p className="mt-3 text-3xl font-semibold text-zinc-950 dark:text-white">
                  {result.streak.state === 'coverage-limited' && `${labels.atLeast} `}
                  {result.streak.state === 'insufficient-coverage'
                    ? labels.insufficient
                    : `${result.streak.days} ${labels.days}`}
                </p>
                <h2 className="mt-6 text-base font-semibold">{labels.bestWindow}</h2>
                {result.bestWindow.state === 'value' && result.bestWindow.bucketStartMinute !== null ? (
                  <p className="mt-3 text-2xl font-semibold text-zinc-950 dark:text-white">
                    {String(Math.floor(result.bestWindow.bucketStartMinute / 60)).padStart(2, '0')}:00–
                    {String(Math.floor(result.bestWindow.bucketStartMinute / 60) + 2).padStart(2, '0')}:00
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                    {result.bestWindow.state === 'insufficient-sessions'
                      ? interpolate(labels.needsSessions, { count: result.bestWindow.eligibleSessions })
                      : interpolate(labels.needsDates, { count: result.bestWindow.distinctStartDates })}
                  </p>
                )}
              </section>
            </div>

            <section className={cardClass} aria-labelledby="review-distribution-heading">
              <h2 id="review-distribution-heading" className="text-base font-semibold">{labels.distribution}</h2>
              {result.taskDistribution.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{labels.noDistribution}</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {result.taskDistribution.map((row) => (
                    <div key={row.taskId} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate font-medium">{row.title.trim() || row.taskId}</span>
                          <span className="shrink-0 font-mono">{Math.round(row.currentShare * 100)}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                          <div className="h-full rounded-full bg-violet-500" style={{ width: `${row.currentShare * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {row.percentagePointDelta > 0 ? '+' : ''}{row.percentagePointDelta} {labels.percentagePoints} · {labels.previousShare} {Math.round(row.previousShare * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className={cardClass} aria-labelledby="review-reports-heading">
              <h2 id="review-reports-heading" className="text-base font-semibold">{labels.reports}</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCsvDownload}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  <FileDown className="h-4 w-4" />
                  {labels.csv}
                </button>
                <button
                  type="button"
                  onClick={handleMarkdownDownload}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  <FileText className="h-4 w-4" />
                  {labels.markdown}
                </button>
              </div>
              {(reportError || reportMessage) && (
                <p role={reportError ? 'alert' : 'status'} className={cn(
                  'mt-3 text-sm',
                  reportError ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
                )}>
                  {reportError ?? reportMessage}
                </p>
              )}
            </section>

            <details className={cardClass}>
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500">
                <HelpCircle className="h-5 w-5 text-sky-500" />
                {labels.help}
              </summary>
              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{labels.helpText}</p>
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                {labels.captured}: {result.capturedCompletionCount} / {result.capturedStartCount}; {labels.inferred}: {result.inferredCompletionCount} / {result.inferredStartCount}
              </p>
            </details>
          </div>
        )}
      </div>
    </main>
  );
};
