import {
  calculateFocusReview,
  FocusReviewInput,
  FocusReviewResult,
  getLocalDateKeyForReview,
  localDateFromOrdinal,
  parseLocalDateOrdinal,
  ReviewComparison,
  ReviewGoalProgress
} from './focusReview';
import { formatHoursMinutesLabel } from './format';
import { Locale } from './types';

export interface LocalTextReport {
  content: string;
  filename: string;
  mimeType: string;
}

const ordinalStringCompare = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

export const neutralizeSpreadsheetString = (value: string): string =>
  /^[\t\r\n]/.test(value) || /^[\s\p{Cc}]*[=+\-@]/u.test(value)
    ? `'${value}`
    : value;

const quoteCsvField = (value: string | number): string =>
  `"${String(value).replace(/"/g, '""')}"`;

const quoteCsvString = (value: string): string =>
  quoteCsvField(neutralizeSpreadsheetString(value));

export const buildFocusReviewCsv = (
  review: Readonly<FocusReviewResult>
): LocalTextReport => {
  const headers = [
    'id',
    'startedAt',
    'completedAt',
    'durationSeconds',
    'taskId',
    'taskTitleSnapshot',
    'focusModeId'
  ];
  const rows = [...review.events].sort((left, right) =>
    left.completedAt - right.completedAt || ordinalStringCompare(left.id, right.id)
  ).map((event) => [
    quoteCsvString(event.id),
    quoteCsvField(new Date(event.startedAt).toISOString()),
    quoteCsvField(new Date(event.completedAt).toISOString()),
    quoteCsvField(event.durationSeconds),
    quoteCsvString(event.taskId),
    quoteCsvString(event.taskTitleSnapshot),
    quoteCsvString(event.focusModeId ?? '')
  ].join(','));

  return {
    content: `\uFEFF${[headers.map(quoteCsvField).join(','), ...rows].join('\r\n')}\r\n`,
    filename: `focus-review_${review.range.start}_${review.range.end}.csv`,
    mimeType: 'text/csv;charset=utf-8'
  };
};

export const escapeMarkdownText = (value: string): string =>
  value
    .replace(/[\p{Cc}\u2028\u2029]+/gu, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/([`|<>#\[\]()._*{}~!+\->])/g, '\\$1')
    .trim();

const getMondayToSundayRange = (now: number): { start: string; end: string; through: string } => {
  const through = getLocalDateKeyForReview(now);
  const todayOrdinal = parseLocalDateOrdinal(through) as number;
  const daysSinceMonday = (new Date(now).getDay() + 6) % 7;
  return {
    start: localDateFromOrdinal(todayOrdinal - daysSinceMonday),
    end: localDateFromOrdinal(todayOrdinal + (6 - daysSinceMonday)),
    through
  };
};

const comparisonText = (comparison: ReviewComparison, locale: Locale): string => {
  if (comparison.kind === 'insufficient-coverage') {
    return locale === 'ru' ? 'Недостаточно покрытия' : 'Insufficient coverage';
  }
  if (comparison.kind === 'new') {
    return locale === 'ru' ? 'Новое, ранее данных не было' : 'New, no prior data';
  }
  if (comparison.kind === 'neutral') {
    return locale === 'ru' ? 'Без изменений' : 'No change';
  }
  const percent = comparison.percent ?? 0;
  return `${percent > 0 ? '+' : ''}${percent}%`;
};

const coverageText = (coverage: FocusReviewResult['coverage'], locale: Locale): string => {
  if (locale === 'ru') {
    return coverage === 'full'
      ? 'полное'
      : coverage === 'partial'
        ? 'частичное'
        : 'нет покрытия';
  }
  return coverage;
};

const sessionCountText = (count: number, locale: Locale): string =>
  locale === 'ru' ? `${count} сесс.` : `${count} sessions`;

const goalText = (goal: ReviewGoalProgress, locale: Locale): string => {
  if (goal.state === 'disabled') return locale === 'ru' ? 'отключена' : 'disabled';
  const progress = `${goal.current}/${goal.target} (${Math.round((goal.ratio ?? 0) * 100)}%)`;
  if (goal.state === 'partial-coverage') {
    return `${progress}; ${locale === 'ru' ? 'покрытие неполное' : 'partial coverage'}`;
  }
  const state = locale === 'ru'
    ? goal.state === 'below' ? 'ниже цели' : goal.state === 'met' ? 'достигнута' : 'превышена'
    : goal.state === 'below' ? 'below' : goal.state === 'met' ? 'met' : 'exceeded';
  return `${progress}; ${state}`;
};

const formatWindow = (review: Readonly<FocusReviewResult>, locale: Locale): string => {
  const window = review.bestWindow;
  if (window.state === 'insufficient-sessions') {
    return locale === 'ru'
      ? `Недостаточно данных: нужно 10 сессий, сейчас ${window.eligibleSessions}.`
      : `Not enough data: 10 sessions required, currently ${window.eligibleSessions}.`;
  }
  if (window.state === 'insufficient-dates') {
    return locale === 'ru'
      ? `Недостаточно данных: нужно 4 даты старта, сейчас ${window.distinctStartDates}.`
      : `Not enough data: 4 start dates required, currently ${window.distinctStartDates}.`;
  }
  const startHour = Math.floor((window.bucketStartMinute ?? 0) / 60);
  return `${String(startHour).padStart(2, '0')}:00–${String(startHour + 2).padStart(2, '0')}:00`;
};

const safeTaskTitle = (title: string, taskId: string): string =>
  escapeMarkdownText(title) || escapeMarkdownText(taskId);

export const buildWeeklyFocusReviewMarkdown = (
  input: Readonly<Omit<FocusReviewInput, 'range'>>,
  locale: Locale
): LocalTextReport => {
  const now = input.now ?? Date.now();
  const week = getMondayToSundayRange(now);
  const weekStartOrdinal = parseLocalDateOrdinal(week.start) as number;
  const throughOrdinal = parseLocalDateOrdinal(week.through) as number;
  const review = calculateFocusReview({
    ...input,
    now,
    range: { start: week.start, end: week.through },
    previousRange: {
      start: localDateFromOrdinal(weekStartOrdinal - 7),
      end: localDateFromOrdinal(throughOrdinal - 7)
    }
  });
  const ru = locale === 'ru';
  const strongestDay = review.strongestDay
    ? `${review.strongestDay.date} — ${formatHoursMinutesLabel(review.strongestDay.durationSeconds, locale)}, ${sessionCountText(review.strongestDay.sessions, locale)}`
    : ru ? 'Пока недостаточно данных (нужно 3 сессии на 2 датах).' : 'Not enough data yet (3 sessions across 2 dates required).';
  const strongestTask = review.strongestTask
    ? `${safeTaskTitle(review.strongestTask.title, review.strongestTask.taskId)} — ${formatHoursMinutesLabel(review.strongestTask.durationSeconds, locale)}, ${sessionCountText(review.strongestTask.sessions, locale)}`
    : ru ? 'Пока недостаточно данных (нужно 3 сессии на 2 датах).' : 'Not enough data yet (3 sessions across 2 dates required).';
  const streak = review.streak.state === 'insufficient-coverage'
    ? (ru ? 'Недостаточно покрытия' : 'Insufficient coverage')
    : `${review.streak.state === 'coverage-limited' ? (ru ? 'не менее ' : 'at least ') : ''}${review.streak.days} ${ru ? 'дн.' : 'days'}`;
  const ranking = review.taskDistribution.length === 0
    ? [ru ? '- Нет событийных данных по задачам.' : '- No event-derived task data.']
    : review.taskDistribution.map((task, index) =>
      `${index + 1}. ${safeTaskTitle(task.title, task.taskId)} — ` +
      `${formatHoursMinutesLabel(task.durationSeconds, locale)}, ${sessionCountText(task.sessions, locale)}; ` +
      `${Math.round(task.currentShare * 100)}% (${task.percentagePointDelta > 0 ? '+' : ''}${task.percentagePointDelta} ${ru ? 'п.п.' : 'pp'})`
    );
  const provenance = ru
    ? `Сохранённые даты завершения/старта: ${review.capturedCompletionCount}/${review.capturedStartCount}; выведенные из timestamp: ${review.inferredCompletionCount}/${review.inferredStartCount}.`
    : `Captured completion/start dates: ${review.capturedCompletionCount}/${review.capturedStartCount}; inferred from timestamps: ${review.inferredCompletionCount}/${review.inferredStartCount}.`;

  const lines = ru ? [
    '# Еженедельный обзор фокуса',
    '',
    `**Календарная неделя:** ${week.start} — ${week.end}`,
    `**Данные по:** ${week.through} (будущие дни недели не считаются нулём)`,
    '',
    '## Итоги по сегодня',
    '',
    `- Время фокуса: ${formatHoursMinutesLabel(review.totals.durationSeconds, locale)} (${comparisonText(review.durationComparison, locale)} к равному отрезку прошлой недели).`,
    `- Завершённые сессии: ${review.totals.sessions} (${comparisonText(review.sessionComparison, locale)} к равному отрезку прошлой недели).`,
    `- Самый продуктивный день: ${strongestDay}`,
    `- Самая сильная задача: ${strongestTask}`,
    `- Серия: ${streak}`,
    `- Лучшее двухчасовое окно: ${formatWindow(review, locale)}`,
    '',
    '## Цели',
    '',
    `- На день: ${goalText(review.goals.daily, locale)}.`,
    `- На неделю: ${goalText(review.goals.weekly, locale)}.`,
    '',
    '## Задачи',
    '',
    ...ranking,
    '',
    '## Покрытие и часовой пояс',
    '',
    `Журнал событий доступен с ${review.coverageDate}; покрытие периода: ${coverageText(review.coverage, locale)}.`,
    provenance,
    'Новые события используют сохранённые локальные даты и минуты старта; старые события без метаданных выводятся в текущем часовом поясе.',
    ''
  ] : [
    '# Weekly Focus Review',
    '',
    `**Calendar week:** ${week.start} — ${week.end}`,
    `**Data through:** ${week.through} (future weekdays are not treated as zero)`,
    '',
    '## Week to date',
    '',
    `- Focus time: ${formatHoursMinutesLabel(review.totals.durationSeconds, locale)} (${comparisonText(review.durationComparison, locale)} vs. the equal part of last week).`,
    `- Completed sessions: ${review.totals.sessions} (${comparisonText(review.sessionComparison, locale)} vs. the equal part of last week).`,
    `- Strongest day: ${strongestDay}`,
    `- Strongest task: ${strongestTask}`,
    `- Streak: ${streak}`,
    `- Best two-hour window: ${formatWindow(review, locale)}`,
    '',
    '## Goals',
    '',
    `- Daily: ${goalText(review.goals.daily, locale)}.`,
    `- Weekly: ${goalText(review.goals.weekly, locale)}.`,
    '',
    '## Tasks',
    '',
    ...ranking,
    '',
    '## Coverage and timezone',
    '',
    `The event log is available from ${review.coverageDate}; period coverage: ${coverageText(review.coverage, locale)}.`,
    provenance,
    'New events use captured local dates and start minutes; legacy events without metadata are inferred in the current timezone.',
    ''
  ];

  return {
    content: lines.join('\n'),
    filename: `focus-review-week_${week.start}_${week.through}.md`,
    mimeType: 'text/markdown;charset=utf-8'
  };
};

export const downloadLocalTextReport = (report: Readonly<LocalTextReport>): void => {
  const blob = new Blob([report.content], { type: report.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = report.filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
};
