import { normalizeFocusReviewGoals } from '../src/lib/focusReviewGoals';
import {
  APP_WINDOW_SESSION_KEY,
  getNextAppWindowState,
  normalizeAppWindowId
} from '../src/lib/appWindow';
import {
  calculateFocusReview,
  getPreviousReviewRange,
  localDateFromOrdinal,
  parseLocalDateOrdinal,
  ReviewDateRange
} from '../src/lib/focusReview';
import { createSerializedOperationQueue } from '../src/lib/operationQueue';
import {
  createSessionEvent,
  importStoredDataWithAdapter,
  initializeStorageWithAdapter,
  normalizeSessionEvents,
  normalizeStoredData
} from '../src/lib/storage';
import {
  DEFAULT_SETTINGS,
  FocusReviewGoals,
  PersistedStorage,
  StoredData
} from '../src/lib/types';

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

class MemoryStorage {
  value: Partial<PersistedStorage>;
  writes: Partial<PersistedStorage>[] = [];
  failWrites = false;

  constructor(value: Partial<PersistedStorage>) {
    this.value = clone(value);
  }

  read = async (): Promise<Partial<PersistedStorage>> => clone(this.value);

  write = async (patch: Partial<PersistedStorage>): Promise<void> => {
    if (this.failWrites) throw new Error('QUOTA_BYTES quota exceeded');
    const copied = clone(patch);
    this.writes.push(copied);
    this.value = { ...this.value, ...copied };
  };

  normalized(now = 20_000): StoredData {
    return normalizeStoredData(this.value, now);
  }
}

const makeEvent = (id: string, completedAt: number) => createSessionEvent({
  cycleId: id,
  taskId: 'task-a',
  taskTitleSnapshot: 'Task A',
  focusModeId: 'builtin-classic',
  cycleStartedAt: completedAt - 1_000,
  cycleStartedLocalDate: '1970-01-01',
  cycleLocalStartMinute: 0,
  completedAt,
  durationSeconds: 1
});

const v3Event = makeEvent('v3-event', 10_000);
const v3Storage = new MemoryStorage({
  storageVersion: 3,
  settings: DEFAULT_SETTINGS,
  sessionEvents: [v3Event, v3Event]
});
await initializeStorageWithAdapter(v3Storage, 20_000);
assert(v3Storage.writes.length === 1, 'v3 migration did not use one write');
const v3Patch = v3Storage.writes[0];
assert(v3Patch.storageVersion === 4, 'v3 migration did not advance to v4');
assert(v3Patch.sessionEventLogStartedAt === 10_000, 'v3 event coverage was not evidence-based');
assert(!('sessionEvents' in v3Patch), 'v3 migration rewrote the event array');
assert(
  JSON.stringify(v3Patch.migrationBackup?.data) === JSON.stringify({ storageVersion: 3 }),
  'v3 migration backup was not minimal'
);
await initializeStorageWithAdapter(v3Storage, 20_000);
assert(v3Storage.writes.length === 1, 'v4 initialization was not idempotent');

const originalMigration = normalizeStoredData({
  storageVersion: 3,
  sessionEvents: [v3Event],
  migrationBackup: {
    createdAt: 5_000,
    fromVersion: 2,
    toVersion: 3,
    data: { storageVersion: 2 }
  }
}, 20_000);
assert(originalMigration.sessionEventLogStartedAt === 5_000, 'original v3 evidence was ignored');

const importBackup = normalizeStoredData({
  storageVersion: 3,
  sessionEvents: [v3Event],
  migrationBackup: {
    createdAt: 4_000,
    fromVersion: 3,
    toVersion: 3,
    data: { storageVersion: 3 }
  }
}, 20_000);
assert(importBackup.sessionEventLogStartedAt === 10_000, 'v3-to-v3 import backup became coverage');

const forgedCoverage = normalizeStoredData({
  storageVersion: 3,
  sessionEvents: [v3Event],
  sessionEventLogStartedAt: 0
}, 20_000);
assert(forgedCoverage.sessionEventLogStartedAt === 10_000,
  'pre-v4 input was allowed to forge event-log coverage');

const emptyV3 = normalizeStoredData({ storageVersion: 3 }, 20_000);
assert(emptyV3.sessionEventLogStartedAt === 20_000, 'empty v3 coverage predates migration');

const normalizedGoals = normalizeFocusReviewGoals({
  dailySessions: 4,
  weeklySessions: 'bad'
});
assert(normalizedGoals.dailySessions === 4, 'valid daily goal was lost');
assert(normalizedGoals.weeklySessions === null, 'malformed weekly goal was not disabled');
assert(
  normalizeFocusReviewGoals({ dailySessions: 100, weeklySessions: 0 }).dailySessions === null,
  'out-of-range goals survived'
);

const captured = makeEvent('captured', 10_000);
assert(captured.startedLocalDate === '1970-01-01', 'captured start date was lost');
assert(captured.localStartMinute === 0, 'captured start minute was lost');
assert(typeof captured.completedLocalDate === 'string', 'completion local date was not captured');
assert(Number.isInteger(captured.timeZoneOffsetMinutes), 'completion timezone offset was not captured');
assert(normalizeSessionEvents([captured, captured]).length === 1, 'duplicate id was not first-wins');
assert(normalizeSessionEvents([{ ...captured, completedLocalDate: 'not-a-date' }]).length === 0,
  'invalid captured date survived');
assert(normalizeSessionEvents([{ ...captured, durationSeconds: 86_401 }]).length === 0,
  'unsafe imported duration survived');
assert(getNextAppWindowState('normal') === 'fullscreen', 'window did not enter fullscreen');
assert(getNextAppWindowState('fullscreen') === 'normal', 'window did not exit fullscreen');
assert(APP_WINDOW_SESSION_KEY.length > 0, 'Chrome app-window session key is missing');
assert(normalizeAppWindowId(42) === 42, 'valid Chrome app-window id was rejected');
assert(normalizeAppWindowId(-1) === null && normalizeAppWindowId('42') === null,
  'invalid Chrome app-window id survived session recovery');

const quotaStorage = new MemoryStorage({
  storageVersion: 3,
  sessionEvents: [v3Event]
});
const beforeQuotaFailure = clone(quotaStorage.value);
quotaStorage.failWrites = true;
let migrationFailed = false;
try {
  await initializeStorageWithAdapter(quotaStorage, 20_000);
} catch {
  migrationFailed = true;
}
assert(migrationFailed, 'quota failure was not surfaced');
assert(JSON.stringify(quotaStorage.value) === JSON.stringify(beforeQuotaFailure),
  'quota failure partially changed v3 storage');

const importTarget = new MemoryStorage(normalizeStoredData({
  storageVersion: 4,
  focusReviewGoals: { dailySessions: 2, weeklySessions: 8 },
  sessionEventLogStartedAt: 1_000
}, 20_000));
const importedGoals: FocusReviewGoals = { dailySessions: 3, weeklySessions: 12 };
const importDocument = JSON.stringify({
  app: 'Pomodoro Cult',
  storageVersion: 4,
  data: {
    ...normalizeStoredData({
      storageVersion: 4,
      sessionEvents: [v3Event],
      focusReviewGoals: importedGoals,
      sessionEventLogStartedAt: 10_000
    }, 20_000),
    timerState: {
      ...normalizeStoredData({}, 20_000).timerState,
      isRunning: true,
      cycleStarted: true
    }
  }
});
const imported = await importStoredDataWithAdapter(importDocument, importTarget, 20_000);
assert(importTarget.writes.length === 1, 'import was not one coherent write');
assert(imported.focusReviewGoals.weeklySessions === 12, 'goals did not round-trip');
assert(!imported.timerState.isRunning && !imported.timerState.cycleStarted,
  'import did not force safe idle');
assert(imported.sessionEvents[0].completedLocalDate === v3Event.completedLocalDate,
  'captured event metadata did not round-trip');

const queueStorage = new MemoryStorage(normalizeStoredData({
  storageVersion: 4,
  sessionEvents: [],
  focusReviewGoals: { dailySessions: null, weeklySessions: null },
  sessionEventLogStartedAt: 1_000
}, 20_000));
const queue = createSerializedOperationQueue();
const completion = queue.enqueue(async () => {
  const data = queueStorage.normalized();
  await queueStorage.write({ sessionEvents: [...data.sessionEvents, v3Event] });
});
const goalSave = queue.enqueue(async () => {
  await queueStorage.write({ focusReviewGoals: { dailySessions: 5, weeklySessions: 20 } });
});
await Promise.all([completion, goalSave]);
assert(queueStorage.normalized().sessionEvents.length === 1, 'goal save lost completion event');
assert(queueStorage.normalized().focusReviewGoals.dailySessions === 5, 'completion lost goal save');

const createRunningImportTarget = () => new MemoryStorage(normalizeStoredData({
  storageVersion: 4,
  timerState: {
    ...normalizeStoredData({}, 20_000).timerState,
    isRunning: true,
    cycleStarted: true,
    cycleId: 'running-cycle',
    cycleStartedAt: 19_000,
    cycleStartedLocalDate: '1970-01-01',
    cycleLocalStartMinute: 0
  },
  sessionEvents: [],
  sessionEventLogStartedAt: 1_000
}, 20_000));

const completeIfRunning = async (storage: MemoryStorage, eventId: string): Promise<boolean> => {
  const data = storage.normalized();
  if (!data.timerState.isRunning || !data.timerState.cycleId) return false;
  await storage.write({
    sessionEvents: [...data.sessionEvents, makeEvent(eventId, 15_000)],
    timerState: {
      ...data.timerState,
      isRunning: false,
      cycleStarted: false,
      cycleId: null,
      cycleStartedAt: null,
      cycleStartedLocalDate: null,
      cycleLocalStartMinute: null,
      targetEndTime: null,
      activeCycleSnapshot: null
    }
  });
  return true;
};

const completionBeforeImportStorage = createRunningImportTarget();
const completionBeforeImportQueue = createSerializedOperationQueue();
const queuedCompletion = completionBeforeImportQueue.enqueue(() =>
  completeIfRunning(completionBeforeImportStorage, 'completed-before-import')
);
const queuedImport = completionBeforeImportQueue.enqueue(() =>
  importStoredDataWithAdapter(importDocument, completionBeforeImportStorage, 20_000)
);
assert(await queuedCompletion, 'completion queued before import was rejected');
await queuedImport;
assert(completionBeforeImportStorage.normalized().sessionEvents.length === 1,
  'import did not replace pre-import completion with imported history');
const preImportBackup = completionBeforeImportStorage.value.migrationBackup?.data;
assert(Array.isArray(preImportBackup?.sessionEvents) && preImportBackup.sessionEvents.length === 1,
  'import backup did not preserve completion committed before import');

const importBeforeCompletionStorage = createRunningImportTarget();
const importBeforeCompletionQueue = createSerializedOperationQueue();
const importFirst = importBeforeCompletionQueue.enqueue(() =>
  importStoredDataWithAdapter(importDocument, importBeforeCompletionStorage, 20_000)
);
const staleCompletion = importBeforeCompletionQueue.enqueue(() =>
  completeIfRunning(importBeforeCompletionStorage, 'stale-after-import')
);
await importFirst;
assert(!(await staleCompletion), 'stale completion after import was accepted');
assert(importBeforeCompletionStorage.normalized().sessionEvents.length === 1,
  'stale completion changed imported history');

const reviewNow = new Date(2026, 6, 14, 12).getTime();
const fullCoverageStartedAt = new Date(2026, 5, 1).getTime();
const defaultReviewRange: ReviewDateRange = { start: '2026-07-08', end: '2026-07-14' };

interface ReviewEventOptions {
  id: string;
  completedDate: string;
  startedDate?: string;
  startMinute?: number;
  durationSeconds?: number;
  taskId?: string;
  title?: string;
  completedAt?: number;
  captured?: boolean;
}

const makeReviewEvent = ({
  id,
  completedDate,
  startedDate = completedDate,
  startMinute = 9 * 60,
  durationSeconds = 1_500,
  taskId = 'task-a',
  title = 'Task A',
  completedAt,
  captured = true
}: ReviewEventOptions): ReturnType<typeof makeEvent> => {
  const [year, month, day] = completedDate.split('-').map(Number);
  const completion = completedAt ?? new Date(year, month - 1, day, 12).getTime();
  const event = {
    id,
    taskId,
    taskTitleSnapshot: title,
    focusModeId: 'builtin-classic',
    startedAt: completion - durationSeconds * 1_000,
    completedAt: completion,
    durationSeconds
  };
  return captured ? {
    ...event,
    completedLocalDate: completedDate,
    startedLocalDate: startedDate,
    localStartMinute: startMinute
  } : event;
};

const review = (
  events: ReturnType<typeof makeEvent>[],
  options: {
    range?: ReviewDateRange;
    coverage?: number;
    goals?: FocusReviewGoals;
  } = {}
) => calculateFocusReview({
  sessionEvents: events,
  focusReviewGoals: options.goals ?? { dailySessions: null, weeklySessions: null },
  sessionEventLogStartedAt: options.coverage ?? fullCoverageStartedAt,
  range: options.range ?? defaultReviewRange,
  now: reviewNow
});

const emptyReview = review([]);
assert(emptyReview.totals.sessions === 0 && emptyReview.totals.durationSeconds === 0,
  'empty Review did not return zero observed totals');
assert(emptyReview.sessionComparison.kind === 'neutral',
  'two zero periods did not return a neutral comparison');

const oneEvent = makeReviewEvent({ id: 'one', completedDate: '2026-07-14' });
const oneReview = review([oneEvent]);
assert(oneReview.totals.sessions === 1 && oneReview.totals.durationSeconds === 1_500,
  'one-event totals require more than one event');
assert(oneReview.strongestDay === null && oneReview.strongestTask === null,
  'sparse strongest insight ignored its threshold');
assert(oneReview.sessionComparison.kind === 'new',
  'positive current data over a zero previous period was not marked new');
assert(oneReview.totals.sessions === 1,
  'event totals were double-counted as if aggregate statistics were also an input');

const boundaryReview = review([
  makeReviewEvent({ id: 'before', completedDate: '2026-07-07' }),
  makeReviewEvent({ id: 'start', completedDate: '2026-07-08' }),
  makeReviewEvent({ id: 'end', completedDate: '2026-07-14' }),
  makeReviewEvent({ id: 'after', completedDate: '2026-07-15', completedAt: reviewNow - 1 })
]);
assert(boundaryReview.events.map((event) => event.id).join(',') === 'start,end',
  'inclusive Review boundaries were incorrect');

const equalPeriodReview = review([
  makeReviewEvent({ id: 'p1', completedDate: '2026-07-01' }),
  makeReviewEvent({ id: 'p2', completedDate: '2026-07-07' }),
  makeReviewEvent({ id: 'c1', completedDate: '2026-07-08' }),
  makeReviewEvent({ id: 'c2', completedDate: '2026-07-14' })
]);
assert(equalPeriodReview.previousRange.start === '2026-07-01' &&
  equalPeriodReview.previousRange.end === '2026-07-07',
  'previous range was not the same number of calendar dates');
assert(equalPeriodReview.durationComparison.kind === 'percent' &&
  equalPeriodReview.durationComparison.percent === 0,
  'equal previous period did not produce deterministic zero percent');

const insufficientPrevious = review([oneEvent], {
  coverage: new Date(2026, 6, 5, 12).getTime()
});
assert(insufficientPrevious.coverage === 'full' &&
  insufficientPrevious.previousCoverage === 'partial' &&
  insufficientPrevious.sessionComparison.kind === 'insufficient-coverage',
  'missing previous coverage was treated as zero');

const partialCurrent = review([oneEvent], {
  coverage: new Date(2026, 6, 10, 12).getTime()
});
assert(partialCurrent.coverage === 'partial', 'partial current coverage was not explicit');

const dstRange = getPreviousReviewRange({ start: '2026-03-08', end: '2026-03-10' });
assert(dstRange.start === '2026-03-05' && dstRange.end === '2026-03-07',
  'calendar range math used elapsed milliseconds across DST dates');
assert(localDateFromOrdinal((parseLocalDateOrdinal('2026-03-08') as number) + 1) === '2026-03-09',
  'calendar-day stepping is not ordinal');

const midnightReview = review([
  makeReviewEvent({
    id: 'midnight',
    completedDate: '2026-07-14',
    startedDate: '2026-07-13',
    startMinute: 23 * 60 + 50
  })
], { range: { start: '2026-07-14', end: '2026-07-14' } });
assert(midnightReview.totals.sessions === 1 &&
  midnightReview.events[0].startedDate === '2026-07-13',
  'cross-midnight event was split or attributed by its start date');

const travelCaptured = makeReviewEvent({
  id: 'travel',
  completedDate: '2026-07-14',
  completedAt: new Date(2026, 6, 13, 12).getTime()
});
const inferred = makeReviewEvent({
  id: 'legacy-inferred',
  completedDate: '2026-07-14',
  captured: false
});
const metadataReview = review([travelCaptured, inferred]);
assert(metadataReview.events.some((event) => event.id === 'travel'),
  'captured completion date moved after a timezone-context change');
assert(metadataReview.capturedCompletionCount === 1 && metadataReview.inferredCompletionCount === 1,
  'captured and inferred completion metadata were not distinguished');
assert(metadataReview.capturedStartCount === 1 && metadataReview.inferredStartCount === 1,
  'captured and inferred start metadata were not distinguished');

const strongestReview = review([
  makeReviewEvent({ id: 'day-a1', completedDate: '2026-07-10', durationSeconds: 1_000 }),
  makeReviewEvent({ id: 'day-a2', completedDate: '2026-07-10', durationSeconds: 1_000 }),
  makeReviewEvent({ id: 'day-b', completedDate: '2026-07-11', durationSeconds: 2_000 })
]);
assert(strongestReview.strongestDay?.date === '2026-07-10',
  'strongest-day tie did not rank sessions then earlier date');
const strongestDayExactTie = review([
  makeReviewEvent({ id: 'day-tie-a1', completedDate: '2026-07-10', durationSeconds: 1_000 }),
  makeReviewEvent({ id: 'day-tie-a2', completedDate: '2026-07-10', durationSeconds: 1_000 }),
  makeReviewEvent({ id: 'day-tie-b1', completedDate: '2026-07-11', durationSeconds: 1_000 }),
  makeReviewEvent({ id: 'day-tie-b2', completedDate: '2026-07-11', durationSeconds: 1_000 })
]);
assert(strongestDayExactTie.strongestDay?.date === '2026-07-10',
  'exact strongest-day tie did not choose the earlier date');

const taskReview = review([
  makeReviewEvent({ id: 'task-old', completedDate: '2026-07-10', taskId: 'task-a', title: 'Old' }),
  makeReviewEvent({ id: 'task-new', completedDate: '2026-07-11', taskId: 'task-a', title: 'New' }),
  makeReviewEvent({ id: 'task-b', completedDate: '2026-07-12', taskId: 'task-b', title: 'Tie' })
]);
assert(taskReview.strongestTask?.taskId === 'task-a' && taskReview.strongestTask.title === 'New',
  'strongest task split rename history or lost newest title');
assert(taskReview.taskDistribution[0].taskId === 'task-a',
  'task distribution ordering ignored duration/sessions/task id');
assert(taskReview.taskDistribution.every((row) => row.previousShare === 0),
  'task distribution divided by a zero previous denominator');
const strongestTaskTie = review([
  makeReviewEvent({ id: 'task-tie-b1', completedDate: '2026-07-10', taskId: 'task-b' }),
  makeReviewEvent({ id: 'task-tie-b2', completedDate: '2026-07-11', taskId: 'task-b' }),
  makeReviewEvent({ id: 'task-tie-a1', completedDate: '2026-07-10', taskId: 'task-a' }),
  makeReviewEvent({ id: 'task-tie-a2', completedDate: '2026-07-11', taskId: 'task-a' })
]);
assert(strongestTaskTie.strongestTask?.taskId === 'task-a',
  'exact strongest-task tie did not choose the ordinal stable task id');
const nonEmptyTaskTitle = review([
  makeReviewEvent({
    id: 'title-old',
    completedDate: '2026-07-10',
    taskId: 'task-title',
    title: 'Task name'
  }),
  makeReviewEvent({
    id: 'title-empty',
    completedDate: '2026-07-11',
    taskId: 'task-title',
    title: '   '
  }),
  makeReviewEvent({
    id: 'title-threshold',
    completedDate: '2026-07-12',
    taskId: 'task-title',
    title: ''
  })
]);
assert(nonEmptyTaskTitle.strongestTask?.title === 'Task name',
  'newer empty task snapshot erased the newest eligible non-empty title');
const emptyTaskTitle = review([
  makeReviewEvent({ id: 'empty-title-1', completedDate: '2026-07-10', taskId: 'fallback', title: '' }),
  makeReviewEvent({ id: 'empty-title-2', completedDate: '2026-07-11', taskId: 'fallback', title: ' ' }),
  makeReviewEvent({ id: 'empty-title-3', completedDate: '2026-07-12', taskId: 'fallback', title: '' })
]);
assert(emptyTaskTitle.strongestTask?.taskId === 'fallback' &&
  emptyTaskTitle.strongestTask.title === '',
  'all-empty task snapshots did not preserve an honest stable-id fallback');

const streakToday = review([
  makeReviewEvent({ id: 'streak-12', completedDate: '2026-07-12' }),
  makeReviewEvent({ id: 'streak-13', completedDate: '2026-07-13' }),
  makeReviewEvent({ id: 'streak-14', completedDate: '2026-07-14' })
]);
assert(streakToday.streak.state === 'value' && streakToday.streak.days === 3,
  'streak ending today was incorrect');
const streakYesterday = review([
  makeReviewEvent({ id: 'yesterday-12', completedDate: '2026-07-12' }),
  makeReviewEvent({ id: 'yesterday-13', completedDate: '2026-07-13' })
]);
assert(streakYesterday.streak.days === 2, 'unfinished today reset the yesterday streak');
const limitedStreak = review([
  makeReviewEvent({ id: 'limited-13', completedDate: '2026-07-13' }),
  makeReviewEvent({ id: 'limited-14', completedDate: '2026-07-14' })
], { coverage: new Date(2026, 6, 13, 12).getTime() });
assert(limitedStreak.streak.state === 'coverage-limited' && limitedStreak.streak.days === 2,
  'streak crossed or hid the partial coverage boundary');

const makeWindowFixture = (count: number, distinctDates: number) =>
  Array.from({ length: count }, (_, index) => makeReviewEvent({
    id: `window-${count}-${distinctDates}-${index}`,
    completedDate: `2026-07-${String(8 + (index % distinctDates)).padStart(2, '0')}`,
    startedDate: `2026-07-${String(8 + (index % distinctDates)).padStart(2, '0')}`,
    startMinute: index === count - 1 ? 13 * 60 : 9 * 60,
    durationSeconds: index === count - 1 ? 20_000 : 1_000
  }));
assert(review(makeWindowFixture(9, 4)).bestWindow.state === 'insufficient-sessions',
  'best window appeared before ten sessions');
assert(review(makeWindowFixture(10, 3)).bestWindow.state === 'insufficient-dates',
  'best window appeared before four start dates');
const bestWindow = review(makeWindowFixture(10, 4)).bestWindow;
assert(bestWindow.state === 'value' && bestWindow.bucketStartMinute === 12 * 60,
  'best-window bucket attribution or duration ranking was incorrect');
const windowTie = review(Array.from({ length: 10 }, (_, index) => makeReviewEvent({
  id: `window-tie-${index}`,
  completedDate: `2026-07-${String(8 + (index % 4)).padStart(2, '0')}`,
  startedDate: `2026-07-${String(8 + (index % 4)).padStart(2, '0')}`,
  startMinute: index % 2 === 0 ? 60 : 13 * 60,
  durationSeconds: 1_000
}))).bestWindow;
assert(windowTie.bucketStartMinute === 0, 'best-window tie did not choose the earlier bucket');

const disabledGoals = review([oneEvent]).goals;
assert(disabledGoals.daily.state === 'disabled' && disabledGoals.weekly.state === 'disabled',
  'disabled goals were rendered as zero progress');
const goalReview = review([
  makeReviewEvent({ id: 'goal-1', completedDate: '2026-07-14' }),
  makeReviewEvent({ id: 'goal-2', completedDate: '2026-07-14' }),
  makeReviewEvent({ id: 'goal-3', completedDate: '2026-07-14' })
], { goals: { dailySessions: 2, weeklySessions: 3 } });
assert(goalReview.goals.daily.state === 'exceeded' && goalReview.goals.daily.ratio === 1.5,
  'goal progress was capped or exceeded state was lost');
assert(goalReview.goals.weekly.state === 'met', 'goal equality was not distinct from exceeded');
const belowGoal = review([oneEvent], { goals: { dailySessions: 2, weeklySessions: 5 } });
assert(belowGoal.goals.daily.state === 'below', 'fully covered goal did not report below');
const partialGoal = review([oneEvent], {
  goals: { dailySessions: 2, weeklySessions: 5 },
  coverage: new Date(2026, 6, 14, 10).getTime()
});
assert(partialGoal.goals.daily.state === 'partial-coverage',
  'partial goal coverage was reported as below');

const malformedReview = review([
  { ...oneEvent, id: 'bad-duration', durationSeconds: Number.POSITIVE_INFINITY },
  { ...oneEvent, id: 'bad-date', completedLocalDate: '2026-02-30' },
  { ...oneEvent, id: 'bad-minute', localStartMinute: 1_440 },
  { ...oneEvent, id: 'future', completedAt: reviewNow + 1, startedAt: reviewNow },
  oneEvent,
  { ...oneEvent, durationSeconds: 10 }
]);
assert(malformedReview.events.length === 1 && malformedReview.events[0].durationSeconds === 1_500,
  'malformed/future events survived or duplicate id was not first-valid-wins');

const benchmarkReview = (count: number) => {
  const events = Array.from({ length: count }, (_, index) => makeReviewEvent({
    id: `benchmark-${String(index).padStart(5, '0')}`,
    completedDate: `2026-07-${String(1 + (index % 14)).padStart(2, '0')}`,
    startedDate: `2026-07-${String(1 + (index % 14)).padStart(2, '0')}`,
    startMinute: index % 1_440,
    durationSeconds: 1 + (index % 3_600),
    taskId: `task-${index % 500}`,
    title: `Task ${index % 500}`
  }));
  const startedAt = performance.now();
  const result = review(events, { range: { start: '2026-07-01', end: '2026-07-14' } });
  const elapsedMs = performance.now() - startedAt;
  const bytes = new TextEncoder().encode(JSON.stringify(events)).length;
  assert(result.totals.sessions === count, `${count}-event Review lost events`);
  assert(result.taskDistribution.length === 500, `${count}-event Review lost task groups`);
  return { count, elapsedMs, bytes };
};

const benchmark10k = benchmarkReview(10_000);
const benchmark50k = benchmarkReview(50_000);
console.log(
  `Focus Review benchmark: ${benchmark10k.count} events, ${benchmark10k.bytes} bytes, ` +
  `${benchmark10k.elapsedMs.toFixed(1)} ms; ${benchmark50k.count} events, ` +
  `${benchmark50k.bytes} bytes, ${benchmark50k.elapsedMs.toFixed(1)} ms`
);

console.log('Phase 3 Focus Review storage/runtime foundation harness: PASS');
