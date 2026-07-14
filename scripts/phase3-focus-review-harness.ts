import { normalizeFocusReviewGoals } from '../src/lib/focusReviewGoals';
import {
  APP_WINDOW_SESSION_KEY,
  getNextAppWindowState,
  normalizeAppWindowId
} from '../src/lib/appWindow';
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

console.log('Phase 3 Focus Review storage/runtime foundation harness: PASS');
