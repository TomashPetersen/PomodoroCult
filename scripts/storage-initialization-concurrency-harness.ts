import { applyFocusModeMutation } from '../src/lib/focusModeMutations';
import { createSerializedOperationQueue } from '../src/lib/operationQueue';
import {
  addSessionStatistics,
  createSessionEvent,
  createTask,
  initializeStorageWithAdapter,
  normalizeStoredData
} from '../src/lib/storage';
import {
  DEFAULT_SETTINGS,
  FocusModeEditableValues,
  PersistedStorage,
  StoredData
} from '../src/lib/types';

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
};

class MemoryStorage {
  value: Partial<PersistedStorage>;
  writes: Partial<PersistedStorage>[] = [];
  private nextWriteGate: { started: Deferred<void>; release: Deferred<void> } | null = null;

  constructor(value: Partial<PersistedStorage>) {
    this.value = clone(value);
  }

  blockNextWrite(): { started: Promise<void>; release(): void } {
    const started = deferred<void>();
    const release = deferred<void>();
    this.nextWriteGate = { started, release };
    return { started: started.promise, release: () => release.resolve() };
  }

  read = async (): Promise<Partial<PersistedStorage>> => clone(this.value);

  write = async (patch: Partial<PersistedStorage>): Promise<void> => {
    const gate = this.nextWriteGate;
    this.nextWriteGate = null;
    if (gate) {
      gate.started.resolve();
      await gate.release.promise;
    }
    const copiedPatch = clone(patch);
    this.writes.push(copiedPatch);
    this.value = { ...this.value, ...copiedPatch };
  };

  normalized(): StoredData {
    return normalizeStoredData(this.value);
  }
}

const initialize = (storage: MemoryStorage): Promise<StoredData> =>
  initializeStorageWithAdapter({ read: storage.read, write: storage.write });

const currentStorageNeedingRepair = (): Partial<PersistedStorage> => {
  const data = normalizeStoredData({ storageVersion: 4 });
  const repairable = clone(data) as Partial<PersistedStorage>;
  delete repairable.manualSettings;
  return repairable;
};

const customValues: FocusModeEditableValues = {
  title: 'Concurrency Mode',
  workMinutes: 40,
  shortBreakMinutes: 7,
  longRestMinutes: 18,
  cyclesBeforeRest: 3,
  autoStartBreaks: false,
  soundTrack: 'birds',
  soundVolume: 0.3
};

const completeWork = async (storage: MemoryStorage, now = 20_000): Promise<boolean> => {
  const data = storage.normalized();
  const timerState = data.timerState;
  if (!timerState.isRunning || timerState.currentMode !== 'work' || !timerState.cycleId) {
    return false;
  }

  const taskId = timerState.activeTaskId ?? 'task-no-task';
  const taskTitle = data.tasks.find((task) => task.id === taskId)?.title ?? '';
  const durationSeconds = timerState.activeCycleSnapshot?.workMinutes
    ? timerState.activeCycleSnapshot.workMinutes * 60
    : DEFAULT_SETTINGS.workTime * 60;
  const event = createSessionEvent({
    cycleId: timerState.cycleId,
    taskId,
    taskTitleSnapshot: taskTitle,
    focusModeId: timerState.activeCycleSnapshot?.appliedFocusModeId ?? null,
    cycleStartedAt: timerState.cycleStartedAt,
    completedAt: now,
    durationSeconds
  });
  await storage.write({
    statistics: addSessionStatistics(data.statistics, taskId, taskTitle, durationSeconds, now),
    sessionEvents: [...data.sessionEvents, event],
    timerState: {
      ...timerState,
      isRunning: false,
      isPaused: false,
      currentMode: 'shortBreak',
      remainingSeconds: DEFAULT_SETTINGS.shortBreak * 60,
      targetEndTime: null,
      cycleId: null,
      cycleStartedAt: null,
      completedSessions: timerState.completedSessions + 1,
      revision: timerState.revision + 1
    }
  });
  return true;
};

const runFocusModeMutation = async (
  storage: MemoryStorage,
  message: Parameters<typeof applyFocusModeMutation>[1]
) => {
  const result = applyFocusModeMutation(storage.normalized(), message);
  await storage.write(result.patch);
  return result;
};

const popupCompletionInterleaving = async (): Promise<void> => {
  const raw = currentStorageNeedingRepair();
  const task = createTask('Completion task');
  raw.tasks = [task];
  raw.timerState = {
    ...normalizeStoredData(raw).timerState,
    isRunning: true,
    cycleStarted: true,
    currentMode: 'work',
    remainingSeconds: 1,
    targetEndTime: 10_000,
    cycleId: 'cycle-concurrency',
    cycleStartedAt: 5_000,
    activeTaskId: task.id,
    activeCycleSnapshot: {
      appliedFocusModeId: 'builtin-classic',
      workMinutes: 25,
      shortBreakMinutes: 5,
      longRestMinutes: 15,
      cyclesBeforeRest: 4,
      autoStartBreaks: false,
      soundTrack: 'none',
      soundVolume: 0.45,
      notificationMode: 'normal'
    }
  };
  const storage = new MemoryStorage(raw);
  const queue = createSerializedOperationQueue();
  const gate = storage.blockNextWrite();
  const ensure = queue.enqueue(() => initialize(storage));
  await gate.started;
  const completion = queue.enqueue(() => completeWork(storage));
  const duplicate = queue.enqueue(() => completeWork(storage));
  gate.release();
  await Promise.all([ensure, completion, duplicate]);

  const data = storage.normalized();
  assert(data.sessionEvents.length === 1, 'popup/completion created duplicate or lost event');
  const day = Object.values(data.statistics)[0];
  assert(day?.sessions === 1, 'popup/completion did not increment statistics exactly once');
  assert(!data.timerState.isRunning && data.timerState.currentMode === 'shortBreak', 'stale running timer returned');
};

const createModeInterleaving = async (): Promise<void> => {
  const storage = new MemoryStorage(currentStorageNeedingRepair());
  const queue = createSerializedOperationQueue();
  const gate = storage.blockNextWrite();
  const ensure = queue.enqueue(() => initialize(storage));
  await gate.started;
  const created = queue.enqueue(() =>
    runFocusModeMutation(storage, { type: 'CREATE_FOCUS_MODE', payload: { values: customValues } })
  );
  gate.release();
  const [, result] = await Promise.all([ensure, created]);
  assert(storage.normalized().focusModes.some((mode) => mode.id === result.focusModeId), 'created mode was lost');
};

const deleteModeInterleaving = async (): Promise<void> => {
  const storage = new MemoryStorage(currentStorageNeedingRepair());
  const created = await runFocusModeMutation(storage, {
    type: 'CREATE_FOCUS_MODE',
    payload: { values: customValues }
  });
  const task = { ...createTask('Bound task'), focusModeId: created.focusModeId ?? null };
  storage.value = {
    ...storage.value,
    tasks: [task],
    selectedFocusModeId: created.focusModeId ?? null
  };
  delete storage.value.manualSettings;

  const queue = createSerializedOperationQueue();
  const gate = storage.blockNextWrite();
  const ensure = queue.enqueue(() => initialize(storage));
  await gate.started;
  const deletion = queue.enqueue(() =>
    runFocusModeMutation(storage, {
      type: 'DELETE_FOCUS_MODE',
      payload: { focusModeId: created.focusModeId! }
    })
  );
  gate.release();
  await Promise.all([ensure, deletion]);
  const data = storage.normalized();
  assert(!data.focusModes.some((mode) => mode.id === created.focusModeId), 'deleted mode reappeared');
  assert(data.tasks[0].focusModeId === null, 'deleted mode binding reappeared');
  assert(data.selectedFocusModeId === null, 'deleted global selection reappeared');
};

const taskBindingInterleaving = async (): Promise<void> => {
  const storage = new MemoryStorage(currentStorageNeedingRepair());
  const created = await runFocusModeMutation(storage, {
    type: 'CREATE_FOCUS_MODE',
    payload: { values: customValues }
  });
  const task = createTask('Binding task');
  storage.value = { ...storage.value, tasks: [task] };
  delete storage.value.manualSettings;

  const queue = createSerializedOperationQueue();
  const gate = storage.blockNextWrite();
  const ensure = queue.enqueue(() => initialize(storage));
  await gate.started;
  const binding = queue.enqueue(() =>
    runFocusModeMutation(storage, {
      type: 'SET_TASK_FOCUS_MODE',
      payload: { taskId: task.id, focusModeId: created.focusModeId ?? null }
    })
  );
  gate.release();
  await Promise.all([ensure, binding]);
  assert(storage.normalized().tasks[0].focusModeId === created.focusModeId, 'task binding was lost');
};

const simultaneousEnsures = async (): Promise<void> => {
  const storage = new MemoryStorage({
    settings: { ...DEFAULT_SETTINGS, workTime: 31 },
    tasks: [createTask('Legacy task')],
    statistics: {},
    theme: 'dark'
  });
  const queue = createSerializedOperationQueue();
  const gate = storage.blockNextWrite();
  const first = queue.enqueue(() => initialize(storage));
  await gate.started;
  const second = queue.enqueue(() => initialize(storage));
  gate.release();
  await Promise.all([first, second]);
  assert(storage.normalized().storageVersion === 4, 'parallel ensure did not normalize storage');
  assert(storage.writes.filter((patch) => patch.migrationBackup).length === 1, 'parallel ensure created extra backups');
  assert(storage.writes.length === 1, 'idempotent second ensure wrote storage');
};

const firefoxStartupMutationInterleaving = async (): Promise<void> => {
  const raw = currentStorageNeedingRepair();
  raw.timerState = {
    ...normalizeStoredData(raw).timerState,
    isRunning: true,
    cycleStarted: true,
    currentMode: 'work',
    remainingSeconds: 1,
    targetEndTime: 10_000,
    cycleId: 'firefox-startup-cycle',
    cycleStartedAt: 5_000,
    activeCycleSnapshot: {
      appliedFocusModeId: null,
      workMinutes: 25,
      shortBreakMinutes: 5,
      longRestMinutes: 15,
      cyclesBeforeRest: 4,
      autoStartBreaks: false,
      soundTrack: 'none',
      soundVolume: 0.45,
      notificationMode: 'normal'
    }
  };
  const storage = new MemoryStorage(raw);
  const queue = createSerializedOperationQueue();
  const gate = storage.blockNextWrite();
  const mutation = queue.enqueue(() =>
    runFocusModeMutation(storage, { type: 'CREATE_FOCUS_MODE', payload: { values: customValues } })
  );
  await gate.started;
  const startup = queue.enqueue(async () => {
    await initialize(storage);
    await completeWork(storage);
  });
  gate.release();
  const [created] = await Promise.all([mutation, startup]);
  const data = storage.normalized();
  assert(data.focusModes.some((mode) => mode.id === created.focusModeId), 'Firefox startup lost queued mutation');
  assert(!data.timerState.isRunning && data.sessionEvents.length === 1, 'Firefox startup recovery failed');
};

const legacyMigrationIdempotence = async (): Promise<void> => {
  const task = createTask('Preserved legacy task');
  const legacy: Partial<PersistedStorage> = {
    settings: { ...DEFAULT_SETTINGS, workTime: 37, languagePreference: 'ru' },
    tasks: [task],
    statistics: {
      '2026-07-01': {
        date: '2026-07-01',
        sessions: 2,
        seconds: 4_440,
        tasks: {},
        lastSessionAt: 1
      }
    },
    theme: 'dark'
  };
  const storage = new MemoryStorage(legacy);
  await initialize(storage);
  const afterFirst = clone(storage.value);
  await initialize(storage);
  const data = storage.normalized();
  assert(data.tasks[0].id === task.id, 'legacy task was not preserved');
  assert(data.statistics['2026-07-01'].sessions === 2, 'legacy statistics were not preserved');
  assert(data.theme === 'dark' && data.settings.workTime === 37, 'legacy theme/settings were not preserved');
  assert(data.focusModes.length === 5 && data.sessionEvents.length === 0, 'legacy defaults are incorrect');
  assert(storage.writes.length === 1, 'repeated legacy ensure was not idempotent');
  assert(JSON.stringify(storage.value) === JSON.stringify(afterFirst), 'repeated ensure changed migrated storage');

  const alreadyCurrent = new MemoryStorage(normalizeStoredData(afterFirst));
  await initialize(alreadyCurrent);
  assert(alreadyCurrent.writes.length === 0, 'normal current-version reopen wrote storage');
};

await popupCompletionInterleaving();
console.log('1. popup initialization x Work completion: PASS');
await createModeInterleaving();
console.log('2. app initialization x CREATE_FOCUS_MODE: PASS');
await deleteModeInterleaving();
console.log('3. initialization x DELETE_FOCUS_MODE: PASS');
await taskBindingInterleaving();
console.log('4. initialization x SET_TASK_FOCUS_MODE: PASS');
await simultaneousEnsures();
console.log('5. simultaneous POPUP_ENSURE_READY: PASS');
await firefoxStartupMutationInterleaving();
console.log('6. Firefox startup x queued mutation: PASS');
await legacyMigrationIdempotence();
console.log('7. legacy migration/idempotence: PASS');
console.log('Storage initialization concurrency harness: PASS');
