import {
  BUILT_IN_FOCUS_MODES,
  createCustomFocusMode,
  deleteCustomFocusMode,
  resolveNextWorkSnapshot,
  updateCustomFocusMode
} from '../src/lib/focusModes';
import { applyFocusModeMutation } from '../src/lib/focusModeMutations';
import { applyTaskMutation } from '../src/lib/taskMutations';
import {
  createSessionEvent,
  createTask,
  normalizeSessionEvents,
  normalizeStoredData,
  parseExportDocument
} from '../src/lib/storage';
import { DEFAULT_SETTINGS, FocusModeEditableValues, PersistedStorage } from '../src/lib/types';

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};

const expectThrow = (operation: () => unknown, message: string): void => {
  let threw = false;
  try {
    operation();
  } catch {
    threw = true;
  }
  assert(threw, message);
};

const customValues: FocusModeEditableValues = {
  title: 'Custom Flow',
  workMinutes: 40,
  shortBreakMinutes: 7,
  longRestMinutes: 18,
  cyclesBeforeRest: 3,
  autoStartBreaks: true,
  soundTrack: 'birds',
  soundVolume: 0.3
};

for (const storageVersion of [undefined, 1, 2, 3, 4]) {
  const normalized = normalizeStoredData({ storageVersion } as Partial<PersistedStorage>);
  assert(normalized.storageVersion === 4, `v${storageVersion ?? 0} did not normalize to v4`);
  assert(normalized.focusModes.length === 5, 'canonical built-ins missing');
  assert(normalized.selectedFocusModeId === null, 'legacy global selection must be manual');
  assert(normalized.timerState.activeCycleSnapshot === null, 'idle migration created a snapshot');
}

const danglingSelection = normalizeStoredData({
  settings: { ...DEFAULT_SETTINGS, workTime: 50 },
  manualSettings: { ...DEFAULT_SETTINGS, workTime: 25 },
  selectedFocusModeId: 'missing-mode'
});
assert(danglingSelection.selectedFocusModeId === null, 'dangling selection survived');
assert(danglingSelection.settings.workTime === 25, 'dangling selection did not restore manual settings');
assert(danglingSelection.timerState.remainingSeconds === 1500, 'safe idle disagrees with manual settings');

const spoofed = normalizeStoredData({
  focusModes: [
    { ...BUILT_IN_FOCUS_MODES[0], title: 'Spoofed', workMinutes: 99 },
    { ...BUILT_IN_FOCUS_MODES[0], id: 'custom-a', builtIn: false, title: 'Unique' },
    { ...BUILT_IN_FOCUS_MODES[0], id: 'custom-b', builtIn: false, title: 'unique' }
  ]
});
assert(spoofed.focusModes[0].title === 'Classic', 'built-in record was replaced');
assert(spoofed.focusModes.filter((mode) => mode.title.toLowerCase() === 'unique').length === 1, 'duplicate titles survived');

const created = createCustomFocusMode(spoofed.focusModes, customValues, 100);
assert(created.focusMode.builtIn === false, 'custom mode marked built-in');
expectThrow(
  () => createCustomFocusMode(created.focusModes, { ...customValues, title: 'classic' }),
  'built-in duplicate title accepted'
);
const updated = updateCustomFocusMode(created.focusModes, created.focusMode.id, {
  ...customValues,
  workMinutes: 45
}, 200);
assert(updated.focusMode.workMinutes === 45, 'custom edit failed');
expectThrow(
  () => updateCustomFocusMode(updated.focusModes, 'builtin-classic', customValues),
  'built-in edit accepted'
);

const task = { ...createTask('Bound task'), archived: true, focusModeId: created.focusMode.id };
const activeSnapshot = {
  appliedFocusModeId: created.focusMode.id,
  workMinutes: 40,
  shortBreakMinutes: 7,
  longRestMinutes: 18,
  cyclesBeforeRest: 3,
  autoStartBreaks: true,
  soundTrack: 'birds' as const,
  soundVolume: 0.3,
  notificationMode: 'normal' as const
};
const state = normalizeStoredData({
  settings: DEFAULT_SETTINGS,
  manualSettings: { ...DEFAULT_SETTINGS, workTime: 27 },
  focusModes: created.focusModes,
  selectedFocusModeId: created.focusMode.id,
  tasks: [task],
  timerState: {
    isRunning: false,
    isPaused: true,
    cycleStarted: true,
    revision: 4,
    currentMode: 'work',
    remainingSeconds: 1200,
    targetEndTime: null,
    cycleId: 'cycle-phase2',
    cycleStartedAt: null,
    activeCycleSnapshot: activeSnapshot,
    activeTaskId: task.id,
    completedSessions: 0
  }
});
assert(resolveNextWorkSnapshot(state).appliedFocusModeId === created.focusMode.id, 'task precedence failed');
const deleted = deleteCustomFocusMode(state, created.focusMode.id);
assert(deleted.selectedFocusModeId === null, 'deleted global selection survived');
assert(deleted.tasks[0].focusModeId === null && deleted.tasks[0].archived, 'binding/archive cleanup failed');
assert(
  JSON.stringify(({ ...state, ...deleted }).timerState.activeCycleSnapshot) ===
    JSON.stringify(state.timerState.activeCycleSnapshot),
  'delete mutated active snapshot'
);
const queuedDelete = applyFocusModeMutation(state, {
  type: 'DELETE_FOCUS_MODE',
  payload: { focusModeId: created.focusMode.id }
});
const afterQueuedDelete = { ...state, ...queuedDelete.patch };
const queuedTaskEdit = applyTaskMutation({
  ...afterQueuedDelete,
  timerState: {
    ...afterQueuedDelete.timerState,
    cycleStarted: false,
    isPaused: false,
    activeTaskId: null,
    activeCycleSnapshot: null
  }
}, {
  type: 'UPDATE_TASK',
  payload: { taskId: task.id, title: 'Renamed after delete' }
});
assert(
  queuedTaskEdit.patch.tasks?.find((item) => item.id === task.id)?.focusModeId === null,
  'serialized task edit restored a deleted mode binding'
);

const legacyPaused = normalizeStoredData({
  settings: { ...DEFAULT_SETTINGS, workTime: 31, focusMusicEnabled: true, focusMusicTrack: 'clock' },
  timerState: {
    ...state.timerState,
    activeCycleSnapshot: undefined
  } as never
});
assert(legacyPaused.timerState.activeCycleSnapshot?.workMinutes === 31, 'legacy paused snapshot missing');
assert(legacyPaused.timerState.cycleStartedAt === null, 'legacy null start was fabricated');
assert(
  JSON.stringify(normalizeStoredData(legacyPaused)) === JSON.stringify(legacyPaused),
  'normalization is not idempotent'
);

const phase1ReadyWork = normalizeStoredData({
  settings: DEFAULT_SETTINGS,
  timerState: {
    ...state.timerState,
    isRunning: false,
    isPaused: false,
    cycleStarted: true,
    currentMode: 'work',
    remainingSeconds: DEFAULT_SETTINGS.workTime * 60,
    targetEndTime: null,
    cycleId: null,
    cycleStartedAt: null,
    activeCycleSnapshot: undefined
  } as never
});
assert(!phase1ReadyWork.timerState.cycleStarted, 'Phase 1 ready Work stayed locked');
assert(phase1ReadyWork.timerState.activeCycleSnapshot === null, 'Phase 1 ready Work gained snapshot');

const event = createSessionEvent({
  cycleId: 'cycle-phase2',
  taskId: task.id,
  taskTitleSnapshot: task.title,
  focusModeId: activeSnapshot.appliedFocusModeId,
  cycleStartedAt: null,
  completedAt: 10_000,
  durationSeconds: 2400
});
const events = normalizeSessionEvents([event, event]);
assert(events.length === 1, 'duplicate completion event survived');
assert(events[0].focusModeId === created.focusMode.id, 'event lost snapshot mode id');

const imported = parseExportDocument(JSON.stringify({
  app: 'Pomodoro Cult',
  storageVersion: 3,
  data: { ...state, sessionEvents: [event] }
}));
assert(imported.timerState.isRunning === false, 'imported timer is not safe idle');
assert(imported.timerState.activeCycleSnapshot === null, 'imported timer retained snapshot');
assert(imported.focusModes.some((mode) => mode.id === created.focusMode.id), 'custom mode lost in JSON');
assert(imported.tasks[0].focusModeId === created.focusMode.id, 'task binding lost in JSON');
assert(imported.sessionEvents[0].focusModeId === created.focusMode.id, 'historical event lost in JSON');
expectThrow(() => parseExportDocument('{}'), 'empty object import accepted');
expectThrow(() => parseExportDocument('{broken'), 'malformed JSON accepted');

console.log('Phase 2 Focus Modes domain/migration harness: PASS');
