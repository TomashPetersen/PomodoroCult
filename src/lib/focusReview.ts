import { FocusReviewGoals, SessionEvent } from './types';

export type ReviewCoverage = 'full' | 'partial' | 'none';
export type ComparisonKind =
  | 'percent'
  | 'new'
  | 'neutral'
  | 'insufficient-coverage';
export type LocalMetadataSource = 'captured' | 'inferred';

export interface ReviewDateRange {
  start: string;
  end: string;
}

export interface ReviewTotals {
  durationSeconds: number;
  sessions: number;
}

export interface ReviewComparison {
  kind: ComparisonKind;
  percent: number | null;
  current: number;
  previous: number;
}

export interface ReviewDaySummary extends ReviewTotals {
  date: string;
}

export interface ReviewTaskSummary extends ReviewTotals {
  taskId: string;
  title: string;
}

export interface ReviewTaskDistributionRow extends ReviewTaskSummary {
  currentShare: number;
  previousShare: number;
  percentagePointDelta: number;
}

export interface ReviewStreak {
  state: 'value' | 'coverage-limited' | 'insufficient-coverage';
  days: number;
}

export interface ReviewBestWindow extends ReviewTotals {
  state: 'value' | 'insufficient-sessions' | 'insufficient-dates';
  bucketStartMinute: number | null;
  eligibleSessions: number;
  distinctStartDates: number;
}

export interface ReviewGoalProgress {
  target: number | null;
  current: number;
  ratio: number | null;
  coverage: ReviewCoverage;
  state: 'disabled' | 'partial-coverage' | 'below' | 'met' | 'exceeded';
}

export interface ResolvedReviewEvent extends SessionEvent {
  completedDate: string;
  startedDate: string;
  startMinute: number;
  completionMetadataSource: LocalMetadataSource;
  startMetadataSource: LocalMetadataSource;
}

export interface FocusReviewResult {
  range: ReviewDateRange;
  previousRange: ReviewDateRange;
  coverageDate: string;
  coverage: ReviewCoverage;
  previousCoverage: ReviewCoverage;
  totals: ReviewTotals;
  previousTotals: ReviewTotals;
  durationComparison: ReviewComparison;
  sessionComparison: ReviewComparison;
  strongestDay: ReviewDaySummary | null;
  strongestTask: ReviewTaskSummary | null;
  taskDistribution: ReviewTaskDistributionRow[];
  streak: ReviewStreak;
  bestWindow: ReviewBestWindow;
  goals: {
    daily: ReviewGoalProgress;
    weekly: ReviewGoalProgress;
  };
  events: ResolvedReviewEvent[];
  previousEvents: ResolvedReviewEvent[];
  capturedCompletionCount: number;
  inferredCompletionCount: number;
  capturedStartCount: number;
  inferredStartCount: number;
}

export interface FocusReviewInput {
  sessionEvents: readonly SessionEvent[];
  focusReviewGoals: Readonly<FocusReviewGoals>;
  sessionEventLogStartedAt: number;
  range: Readonly<ReviewDateRange>;
  now?: number;
}

const DAY_MS = 86_400_000;
const MAX_DATE_TIMESTAMP = 8_640_000_000_000_000;
const MAX_SESSION_DURATION_SECONDS = 86_400;

const ordinalStringCompare = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const isValidTimestamp = (value: unknown, now: number): value is number =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= now &&
  Number(value) <= MAX_DATE_TIMESTAMP;

export const parseLocalDateOrdinal = (value: unknown): number | null => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return Math.floor(timestamp / DAY_MS);
};

export const localDateFromOrdinal = (ordinal: number): string => {
  const date = new Date(ordinal * DAY_MS);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getLocalDateKeyForReview = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalStartMinuteForReview = (timestamp: number): number => {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
};

const getUtcDateKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalDayStartTimestamp = (dateKey: string): number => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
};

const getLocalDayEndTimestamp = (dateKey: string): number => {
  const ordinal = parseLocalDateOrdinal(dateKey) as number;
  return getLocalDayStartTimestamp(localDateFromOrdinal(ordinal + 1)) - 1;
};

export const getPreviousReviewRange = (range: Readonly<ReviewDateRange>): ReviewDateRange => {
  const startOrdinal = parseLocalDateOrdinal(range.start);
  const endOrdinal = parseLocalDateOrdinal(range.end);
  if (startOrdinal === null || endOrdinal === null || endOrdinal < startOrdinal) {
    throw new Error('Invalid Focus Review range.');
  }
  const dayCount = endOrdinal - startOrdinal + 1;
  return {
    start: localDateFromOrdinal(startOrdinal - dayCount),
    end: localDateFromOrdinal(startOrdinal - 1)
  };
};

export const getReviewCoverage = (
  range: Readonly<ReviewDateRange>,
  coverageStartedAt: number
): ReviewCoverage => {
  const rangeStart = getLocalDayStartTimestamp(range.start);
  const rangeEnd = getLocalDayEndTimestamp(range.end);
  if (rangeEnd < coverageStartedAt) return 'none';
  if (rangeStart < coverageStartedAt) return 'partial';
  return 'full';
};

const resolveEvent = (event: SessionEvent, now: number): ResolvedReviewEvent | null => {
  const capturedCompletedOrdinal = parseLocalDateOrdinal(event.completedLocalDate);
  const capturedStartedOrdinal = parseLocalDateOrdinal(event.startedLocalDate);
  const capturedMinute = Number.isInteger(event.localStartMinute) &&
    Number(event.localStartMinute) >= 0 && Number(event.localStartMinute) <= 1439
    ? Number(event.localStartMinute)
    : null;
  const capturedOffset = Number.isInteger(event.timeZoneOffsetMinutes) &&
    Number(event.timeZoneOffsetMinutes) >= -1440 && Number(event.timeZoneOffsetMinutes) <= 1440
    ? Number(event.timeZoneOffsetMinutes)
    : null;
  if (
    typeof event.id !== 'string' || !event.id ||
    typeof event.taskId !== 'string' || !event.taskId ||
    typeof event.taskTitleSnapshot !== 'string' ||
    (event.focusModeId !== null && typeof event.focusModeId !== 'string') ||
    !isValidTimestamp(event.startedAt, now) ||
    !isValidTimestamp(event.completedAt, now) ||
    event.completedAt < event.startedAt ||
    !Number.isInteger(event.durationSeconds) ||
    event.durationSeconds < 1 ||
    event.durationSeconds > MAX_SESSION_DURATION_SECONDS ||
    (event.completedLocalDate !== undefined && capturedCompletedOrdinal === null) ||
    (event.startedLocalDate !== undefined && capturedStartedOrdinal === null) ||
    (event.localStartMinute !== undefined && capturedMinute === null) ||
    (event.timeZoneOffsetMinutes !== undefined && capturedOffset === null) ||
    (capturedCompletedOrdinal !== null && capturedOffset !== null &&
      event.completedLocalDate !== getUtcDateKey(
        event.completedAt - capturedOffset * 60_000
      ))
  ) {
    return null;
  }
  const capturedStart = capturedStartedOrdinal !== null && capturedMinute !== null;

  return {
    ...event,
    completedDate: capturedCompletedOrdinal === null
      ? getLocalDateKeyForReview(event.completedAt)
      : event.completedLocalDate as string,
    startedDate: capturedStart
      ? event.startedLocalDate as string
      : getLocalDateKeyForReview(event.startedAt),
    startMinute: capturedStart
      ? capturedMinute
      : getLocalStartMinuteForReview(event.startedAt),
    completionMetadataSource: capturedCompletedOrdinal === null ? 'inferred' : 'captured',
    startMetadataSource: capturedStart ? 'captured' : 'inferred'
  };
};

const isInRange = (date: string, range: Readonly<ReviewDateRange>): boolean => {
  const ordinal = parseLocalDateOrdinal(date);
  const start = parseLocalDateOrdinal(range.start);
  const end = parseLocalDateOrdinal(range.end);
  return ordinal !== null && start !== null && end !== null && ordinal >= start && ordinal <= end;
};

const summarizeTotals = (events: readonly ResolvedReviewEvent[]): ReviewTotals => ({
  durationSeconds: events.reduce((total, event) => total + event.durationSeconds, 0),
  sessions: events.length
});

const compareValues = (
  current: number,
  previous: number,
  coverageAvailable: boolean
): ReviewComparison => {
  if (!coverageAvailable) {
    return { kind: 'insufficient-coverage', percent: null, current, previous };
  }
  if (previous === 0) {
    return current === 0
      ? { kind: 'neutral', percent: 0, current, previous }
      : { kind: 'new', percent: null, current, previous };
  }
  return {
    kind: 'percent',
    percent: Math.round(((current - previous) / previous) * 100),
    current,
    previous
  };
};

const getStrongestDay = (
  events: readonly ResolvedReviewEvent[]
): ReviewDaySummary | null => {
  const dates = new Map<string, ReviewDaySummary>();
  for (const event of events) {
    const previous = dates.get(event.completedDate);
    dates.set(event.completedDate, {
      date: event.completedDate,
      durationSeconds: (previous?.durationSeconds ?? 0) + event.durationSeconds,
      sessions: (previous?.sessions ?? 0) + 1
    });
  }
  if (events.length < 3 || dates.size < 2) return null;
  return Array.from(dates.values()).sort((left, right) =>
    right.durationSeconds - left.durationSeconds ||
    right.sessions - left.sessions ||
    ordinalStringCompare(left.date, right.date)
  )[0] ?? null;
};

interface TaskAccumulator extends ReviewTaskSummary {
  newestTitleCompletedAt: number;
  newestTitleEventId: string;
}

const summarizeTasks = (
  events: readonly ResolvedReviewEvent[]
): Map<string, TaskAccumulator> => {
  const tasks = new Map<string, TaskAccumulator>();
  for (const event of events) {
    const previous = tasks.get(event.taskId);
    const hasEligibleTitle = event.taskTitleSnapshot.trim().length > 0;
    const useEventTitle = hasEligibleTitle && (
      !previous ||
      event.completedAt > previous.newestTitleCompletedAt ||
      (event.completedAt === previous.newestTitleCompletedAt &&
        ordinalStringCompare(event.id, previous.newestTitleEventId) < 0)
    );
    tasks.set(event.taskId, {
      taskId: event.taskId,
      title: useEventTitle ? event.taskTitleSnapshot : previous?.title ?? '',
      durationSeconds: (previous?.durationSeconds ?? 0) + event.durationSeconds,
      sessions: (previous?.sessions ?? 0) + 1,
      newestTitleCompletedAt: useEventTitle
        ? event.completedAt
        : previous?.newestTitleCompletedAt ?? -1,
      newestTitleEventId: useEventTitle
        ? event.id
        : previous?.newestTitleEventId ?? ''
    });
  }
  return tasks;
};

const getStrongestTask = (
  events: readonly ResolvedReviewEvent[],
  tasks: ReadonlyMap<string, TaskAccumulator>
): ReviewTaskSummary | null => {
  if (events.length < 3 || new Set(events.map((event) => event.completedDate)).size < 2) return null;
  const best = Array.from(tasks.values()).sort((left, right) =>
    right.durationSeconds - left.durationSeconds ||
    right.sessions - left.sessions ||
    ordinalStringCompare(left.taskId, right.taskId)
  )[0];
  return best ? {
    taskId: best.taskId,
    title: best.title,
    durationSeconds: best.durationSeconds,
    sessions: best.sessions
  } : null;
};

const getTaskDistribution = (
  currentTasks: ReadonlyMap<string, TaskAccumulator>,
  previousTasks: ReadonlyMap<string, TaskAccumulator>,
  currentTotal: number,
  previousTotal: number
): ReviewTaskDistributionRow[] =>
  Array.from(currentTasks.values()).map((task) => {
    const currentShare = currentTotal === 0 ? 0 : task.durationSeconds / currentTotal;
    const previousShare = previousTotal === 0
      ? 0
      : (previousTasks.get(task.taskId)?.durationSeconds ?? 0) / previousTotal;
    return {
      taskId: task.taskId,
      title: task.title,
      durationSeconds: task.durationSeconds,
      sessions: task.sessions,
      currentShare,
      previousShare,
      percentagePointDelta: Math.round((currentShare - previousShare) * 10_000) / 100
    };
  }).sort((left, right) =>
    right.durationSeconds - left.durationSeconds ||
    right.sessions - left.sessions ||
    ordinalStringCompare(left.taskId, right.taskId)
  );

const getStreak = (
  allEvents: readonly ResolvedReviewEvent[],
  now: number,
  coverageStartedAt: number
): ReviewStreak => {
  const today = getLocalDateKeyForReview(now);
  const todayOrdinal = parseLocalDateOrdinal(today) as number;
  const eventDates = new Set<number>();
  for (const event of allEvents) {
    const ordinal = parseLocalDateOrdinal(event.completedDate);
    if (ordinal !== null && ordinal <= todayOrdinal) eventDates.add(ordinal);
  }

  const target = eventDates.has(todayOrdinal) ? todayOrdinal : todayOrdinal - 1;
  const coverageDate = getLocalDateKeyForReview(coverageStartedAt);
  const coverageOrdinal = parseLocalDateOrdinal(coverageDate) as number;
  const coverageIsPartialDay = coverageStartedAt > getLocalDayStartTimestamp(coverageDate);
  if (
    target < coverageOrdinal ||
    (coverageIsPartialDay && target === coverageOrdinal && !eventDates.has(target))
  ) {
    return { state: 'insufficient-coverage', days: 0 };
  }

  let days = 0;
  let cursor = target;
  while (cursor >= coverageOrdinal && eventDates.has(cursor)) {
    days += 1;
    cursor -= 1;
  }

  if (coverageIsPartialDay && cursor <= coverageOrdinal) {
    return days === 0
      ? { state: 'insufficient-coverage', days: 0 }
      : { state: 'coverage-limited', days };
  }
  if (cursor < coverageOrdinal && days > 0) {
    return { state: 'coverage-limited', days };
  }
  return { state: 'value', days };
};

const getBestWindow = (
  events: readonly ResolvedReviewEvent[]
): ReviewBestWindow => {
  const distinctDates = new Set(events.map((event) => event.startedDate)).size;
  if (events.length < 10) {
    return {
      state: 'insufficient-sessions',
      bucketStartMinute: null,
      durationSeconds: 0,
      sessions: 0,
      eligibleSessions: events.length,
      distinctStartDates: distinctDates
    };
  }
  if (distinctDates < 4) {
    return {
      state: 'insufficient-dates',
      bucketStartMinute: null,
      durationSeconds: 0,
      sessions: 0,
      eligibleSessions: events.length,
      distinctStartDates: distinctDates
    };
  }

  const buckets = new Map<number, ReviewTotals>();
  for (const event of events) {
    const start = Math.floor(event.startMinute / 120) * 120;
    const previous = buckets.get(start);
    buckets.set(start, {
      durationSeconds: (previous?.durationSeconds ?? 0) + event.durationSeconds,
      sessions: (previous?.sessions ?? 0) + 1
    });
  }
  const [bucketStartMinute, totals] = Array.from(buckets.entries()).sort((left, right) =>
    right[1].durationSeconds - left[1].durationSeconds ||
    right[1].sessions - left[1].sessions ||
    left[0] - right[0]
  )[0];
  return {
    state: 'value',
    bucketStartMinute,
    ...totals,
    eligibleSessions: events.length,
    distinctStartDates: distinctDates
  };
};

const getMondayRange = (now: number): ReviewDateRange => {
  const today = getLocalDateKeyForReview(now);
  const todayOrdinal = parseLocalDateOrdinal(today) as number;
  const localDay = new Date(now).getDay();
  const daysSinceMonday = (localDay + 6) % 7;
  return {
    start: localDateFromOrdinal(todayOrdinal - daysSinceMonday),
    end: localDateFromOrdinal(todayOrdinal + (6 - daysSinceMonday))
  };
};

const getGoalProgress = (
  target: number | null,
  current: number,
  coverage: ReviewCoverage
): ReviewGoalProgress => {
  if (target === null) {
    return { target, current, ratio: null, coverage, state: 'disabled' };
  }
  if (coverage !== 'full') {
    return { target, current, ratio: current / target, coverage, state: 'partial-coverage' };
  }
  return {
    target,
    current,
    ratio: current / target,
    coverage,
    state: current < target ? 'below' : current === target ? 'met' : 'exceeded'
  };
};

const validateInputRange = (range: Readonly<ReviewDateRange>, now: number): void => {
  const start = parseLocalDateOrdinal(range.start);
  const end = parseLocalDateOrdinal(range.end);
  const today = parseLocalDateOrdinal(getLocalDateKeyForReview(now)) as number;
  if (start === null || end === null || end < start || end > today) {
    throw new Error('Invalid Focus Review range.');
  }
};

export const calculateFocusReview = (input: Readonly<FocusReviewInput>): FocusReviewResult => {
  const now = input.now ?? Date.now();
  if (!isValidTimestamp(now, now) || !isValidTimestamp(input.sessionEventLogStartedAt, now)) {
    throw new Error('Invalid Focus Review time boundary.');
  }
  validateInputRange(input.range, now);

  const previousRange = getPreviousReviewRange(input.range);
  const resolved: ResolvedReviewEvent[] = [];
  const seenIds = new Set<string>();
  for (const event of input.sessionEvents) {
    if (seenIds.has(event.id)) continue;
    const value = resolveEvent(event, now);
    if (!value) continue;
    seenIds.add(value.id);
    resolved.push(value);
  }
  resolved.sort((left, right) =>
    left.completedAt - right.completedAt || ordinalStringCompare(left.id, right.id)
  );

  const events = resolved.filter((event) => isInRange(event.completedDate, input.range));
  const previousEvents = resolved.filter((event) => isInRange(event.completedDate, previousRange));
  const totals = summarizeTotals(events);
  const previousTotals = summarizeTotals(previousEvents);
  const coverage = getReviewCoverage(input.range, input.sessionEventLogStartedAt);
  const previousCoverage = getReviewCoverage(previousRange, input.sessionEventLogStartedAt);
  const comparisonCoverage = coverage === 'full' && previousCoverage === 'full';
  const currentTasks = summarizeTasks(events);
  const previousTasks = summarizeTasks(previousEvents);

  const today = getLocalDateKeyForReview(now);
  const todayRange = { start: today, end: today };
  const weekRange = getMondayRange(now);
  const dailyCount = resolved.filter((event) => event.completedDate === today).length;
  const weeklyCount = resolved.filter((event) => isInRange(event.completedDate, weekRange)).length;

  return {
    range: { ...input.range },
    previousRange,
    coverageDate: getLocalDateKeyForReview(input.sessionEventLogStartedAt),
    coverage,
    previousCoverage,
    totals,
    previousTotals,
    durationComparison: compareValues(
      totals.durationSeconds,
      previousTotals.durationSeconds,
      comparisonCoverage
    ),
    sessionComparison: compareValues(totals.sessions, previousTotals.sessions, comparisonCoverage),
    strongestDay: getStrongestDay(events),
    strongestTask: getStrongestTask(events, currentTasks),
    taskDistribution: getTaskDistribution(
      currentTasks,
      previousTasks,
      totals.durationSeconds,
      previousTotals.durationSeconds
    ),
    streak: getStreak(resolved, now, input.sessionEventLogStartedAt),
    bestWindow: getBestWindow(events),
    goals: {
      daily: getGoalProgress(
        input.focusReviewGoals.dailySessions,
        dailyCount,
        getReviewCoverage(todayRange, input.sessionEventLogStartedAt)
      ),
      weekly: getGoalProgress(
        input.focusReviewGoals.weeklySessions,
        weeklyCount,
        getReviewCoverage(weekRange, input.sessionEventLogStartedAt)
      )
    },
    events,
    previousEvents,
    capturedCompletionCount: events.filter(
      (event) => event.completionMetadataSource === 'captured'
    ).length,
    inferredCompletionCount: events.filter(
      (event) => event.completionMetadataSource === 'inferred'
    ).length,
    capturedStartCount: events.filter((event) => event.startMetadataSource === 'captured').length,
    inferredStartCount: events.filter((event) => event.startMetadataSource === 'inferred').length
  };
};
