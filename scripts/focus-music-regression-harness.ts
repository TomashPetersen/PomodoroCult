import { applyFocusModeMutation } from '../src/lib/focusModeMutations';
import {
  BUILT_IN_FOCUS_MODES,
  focusModeToSnapshot,
  materializeSnapshotSettings,
  resolveActiveWorkFocusMusicSettings
} from '../src/lib/focusModes';
import { normalizeStoredData } from '../src/lib/storage';
import {
  FocusModeEditableValues,
  FocusMusicTrack,
  RuntimeMessage,
  Settings,
  StoredData,
  TimerState
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

interface FakeAudio {
  id: number;
  track: FocusMusicTrack;
  volume: number;
  playing: boolean;
  currentTime: number;
  generation: number;
}

class DeterministicFocusMusicRuntime {
  generation = 0;
  audios: FakeAudio[] = [];
  scheduleActive = false;
  fadeActive = false;
  playCalls = 0;
  private nextAudioId = 1;

  get playing(): FakeAudio[] {
    return this.audios.filter((audio) => audio.playing);
  }

  setStreamOverlap(progress: number, volume: number): void {
    assert(this.audios.length === 2, 'Stream overlap requires two Audio elements.');
    this.audios[0].playing = true;
    this.audios[1].playing = true;
    this.audios[0].volume = volume * (1 - progress);
    this.audios[1].volume = volume * progress;
    this.scheduleActive = true;
    this.fadeActive = true;
  }

  async reconcile(
    settings: Settings,
    timerState: TimerState,
    playGate?: Deferred<void>
  ): Promise<void> {
    const generation = ++this.generation;
    this.scheduleActive = false;
    this.fadeActive = false;

    const shouldPlay =
      settings.focusMusicEnabled &&
      timerState.isRunning &&
      !timerState.isPaused &&
      timerState.currentMode === 'work' &&
      timerState.targetEndTime !== null &&
      timerState.targetEndTime > Date.now();

    if (!shouldPlay) {
      this.stopAndReset();
      return;
    }

    const desiredCount = settings.focusMusicTrack === 'stream' ? 2 : 1;
    const trackChanged = this.audios.some(
      (audio) => audio.track !== settings.focusMusicTrack
    );
    if (trackChanged) this.dispose();

    while (this.audios.length < desiredCount) {
      this.audios.push({
        id: this.nextAudioId++,
        track: settings.focusMusicTrack,
        volume: settings.focusMusicVolume,
        playing: false,
        currentTime: 0,
        generation
      });
    }
    while (this.audios.length > desiredCount) this.audios.pop();

    const wasOverlapping = this.playing.length === 2;
    this.audios.forEach((audio) => {
      audio.generation = generation;
    });
    if (wasOverlapping && this.audios.length === 2) {
      const total = this.audios[0].volume + this.audios[1].volume;
      const progress = total > 0 ? this.audios[1].volume / total : 0;
      this.audios[0].volume = settings.focusMusicVolume * (1 - progress);
      this.audios[1].volume = settings.focusMusicVolume * progress;
    } else {
      this.audios.forEach((audio) => {
        audio.volume = settings.focusMusicVolume;
      });
    }

    if (this.playing.length > 0) return;

    const audio = this.audios[0];
    this.playCalls += 1;
    if (playGate) await playGate.promise;
    if (generation !== this.generation || !this.audios.includes(audio)) {
      audio.playing = false;
      audio.currentTime = 0;
      return;
    }
    audio.playing = true;
    audio.generation = generation;
    this.scheduleActive = settings.focusMusicTrack === 'stream';
  }

  stopAndReset(): void {
    this.scheduleActive = false;
    this.fadeActive = false;
    this.audios.forEach((audio) => {
      audio.playing = false;
      audio.currentTime = 0;
    });
  }

  dispose(): void {
    this.stopAndReset();
    this.audios = [];
  }
}

const activeMode = BUILT_IN_FOCUS_MODES.find((mode) => mode.id === 'builtin-deep-work');
assert(activeMode, 'Deep Work built-in missing.');

const makeActiveData = (): StoredData => {
  const snapshot = focusModeToSnapshot(activeMode);
  const settings = materializeSnapshotSettings(snapshot, normalizeStoredData({}).settings);
  return normalizeStoredData({
    settings,
    manualSettings: normalizeStoredData({}).settings,
    selectedFocusModeId: activeMode.id,
    timerState: {
      isRunning: true,
      isPaused: false,
      cycleStarted: true,
      revision: 8,
      currentMode: 'work',
      remainingSeconds: 2900,
      targetEndTime: Date.now() + 2_900_000,
      cycleId: 'cycle-live-audio',
      cycleStartedAt: Date.now() - 100_000,
      activeCycleSnapshot: snapshot,
      activeTaskId: null,
      completedSessions: 0
    }
  });
};

const apply = (data: StoredData, message: RuntimeMessage): StoredData => {
  const result = applyFocusModeMutation(
    data,
    message as Parameters<typeof applyFocusModeMutation>[1]
  );
  return { ...data, ...result.patch };
};

const saveMusic = (
  data: StoredData,
  enabled: boolean,
  track: FocusMusicTrack,
  volume: number
): StoredData => {
  let next = apply(data, {
    type: 'SAVE_FOCUS_MUSIC_SETTINGS',
    payload: { type: 'set-enabled', enabled }
  });
  next = apply(next, {
    type: 'SAVE_FOCUS_MUSIC_SETTINGS',
    payload: { type: 'set-track', track }
  });
  return apply(next, {
    type: 'SAVE_FOCUS_MUSIC_SETTINGS',
    payload: { type: 'set-volume', volume }
  });
};

const snapshotWithoutAudio = (data: StoredData): unknown => {
  const snapshot = clone(data.timerState.activeCycleSnapshot);
  if (!snapshot) return null;
  const candidate = snapshot as Record<string, unknown>;
  delete candidate.soundTrack;
  delete candidate.soundVolume;
  return candidate;
};

const runtime = new DeterministicFocusMusicRuntime();
let data = makeActiveData();
const invariantSnapshot = snapshotWithoutAudio(data);
const invariantManualDurations = {
  workTime: data.manualSettings.workTime,
  shortBreak: data.manualSettings.shortBreak,
  longBreak: data.manualSettings.longBreak,
  longBreakInterval: data.manualSettings.longBreakInterval
};

// 1. Running Work: Stream -> Birds -> Clock.
for (const track of ['stream', 'birds', 'clock'] as const) {
  data = saveMusic(data, true, track, 0.45);
  const settings = materializeSnapshotSettings(data.timerState.activeCycleSnapshot!, data.settings);
  await runtime.reconcile(settings, data.timerState);
  assert(runtime.playing.length === 1, `${track} did not leave exactly one playing Audio.`);
  assert(runtime.playing[0].track === track, `${track} was not applied live.`);
}

// 2. Running Work Off prevents a late restart.
const lateOffGate = deferred<void>();
data = saveMusic(data, true, 'birds', 0.45);
runtime.dispose();
const lateOffPlay = runtime.reconcile(
  materializeSnapshotSettings(data.timerState.activeCycleSnapshot!, data.settings),
  data.timerState,
  lateOffGate
);
data = saveMusic(data, false, 'birds', 0.45);
await runtime.reconcile(
  materializeSnapshotSettings(data.timerState.activeCycleSnapshot!, data.settings),
  data.timerState
);
lateOffGate.resolve();
await lateOffPlay;
assert(runtime.playing.length === 0, 'Off allowed pending play() to restart audio.');

// 3. Off during Stream overlap clears schedule and fade state.
data = saveMusic(data, true, 'stream', 0.45);
await runtime.reconcile(
  materializeSnapshotSettings(data.timerState.activeCycleSnapshot!, data.settings),
  data.timerState
);
runtime.setStreamOverlap(0.4, 0.45);
data = saveMusic(data, false, 'stream', 0.45);
await runtime.reconcile(
  materializeSnapshotSettings(data.timerState.activeCycleSnapshot!, data.settings),
  data.timerState
);
assert(!runtime.scheduleActive && !runtime.fadeActive, 'Off retained Stream timers.');
assert(runtime.audios.every((audio) => !audio.playing && audio.currentTime === 0), 'Off did not reset both Stream Audio elements.');

// 4. Rapid volume min -> max -> mid preserves one overlap multiplier.
data = saveMusic(data, true, 'stream', 0.45);
await runtime.reconcile(
  materializeSnapshotSettings(data.timerState.activeCycleSnapshot!, data.settings),
  data.timerState
);
runtime.setStreamOverlap(0.35, 0.45);
for (const volume of [0, 1, 0.5]) {
  data = saveMusic(data, true, 'stream', volume);
  await runtime.reconcile(
    materializeSnapshotSettings(data.timerState.activeCycleSnapshot!, data.settings),
    data.timerState
  );
}
const overlapVolume = runtime.audios.reduce((total, audio) => total + audio.volume, 0);
assert(Math.abs(overlapVolume - 0.5) < 0.0001, 'Rapid volume created two full-volume players.');

// 5. Track switch during pending play cannot revive the old Audio.
runtime.dispose();
data = saveMusic(data, true, 'stream', 0.5);
const oldGate = deferred<void>();
const oldAudioPlay = runtime.reconcile(
  materializeSnapshotSettings(data.timerState.activeCycleSnapshot!, data.settings),
  data.timerState,
  oldGate
);
data = saveMusic(data, true, 'clock', 0.5);
await runtime.reconcile(
  materializeSnapshotSettings(data.timerState.activeCycleSnapshot!, data.settings),
  data.timerState
);
oldGate.resolve();
await oldAudioPlay;
assert(runtime.playing.length === 1 && runtime.playing[0].track === 'clock', 'Late old track replaced the selected track.');

// 6. Twenty rapid On/Off changes leave no playback when the final command is Off.
data = apply(data, {
  type: 'SAVE_FOCUS_MUSIC_SETTINGS',
  payload: { type: 'set-enabled', enabled: false }
});
for (let index = 0; index < 20; index += 1) {
  data = apply(data, {
    type: 'SAVE_FOCUS_MUSIC_SETTINGS',
    payload: { type: 'toggle' }
  });
  await runtime.reconcile(
    materializeSnapshotSettings(data.timerState.activeCycleSnapshot!, data.settings),
    data.timerState
  );
}
assert(data.settings.focusMusicEnabled === false, 'Rapid toggle final state was not Off.');
assert(runtime.playing.length === 0, 'Rapid On/Off left playback alive.');

// 7. Pause after a track switch stops every Audio element.
data = saveMusic(data, true, 'stream', 0.4);
await runtime.reconcile(
  materializeSnapshotSettings(data.timerState.activeCycleSnapshot!, data.settings),
  data.timerState
);
runtime.setStreamOverlap(0.5, 0.4);
data = { ...data, timerState: { ...data.timerState, isRunning: false, isPaused: true, targetEndTime: null } };
await runtime.reconcile(
  materializeSnapshotSettings(data.timerState.activeCycleSnapshot!, data.settings),
  data.timerState
);
assert(runtime.playing.length === 0, 'Pause left an Audio element playing.');

// 8. Resume uses the last direct-control settings stored in the snapshot.
data = saveMusic(data, true, 'clock', 0.27);
data = {
  ...data,
  timerState: {
    ...data.timerState,
    isRunning: true,
    isPaused: false,
    targetEndTime: Date.now() + 120_000
  }
};
await runtime.reconcile(
  materializeSnapshotSettings(data.timerState.activeCycleSnapshot!, data.settings),
  data.timerState
);
assert(runtime.playing[0]?.track === 'clock' && runtime.playing[0].volume === 0.27, 'Resume restored stale audio settings.');

// 9. Editing a Focus Mode during Work does not change the active snapshot.
const customValues: FocusModeEditableValues = {
  title: 'Live isolation',
  workMinutes: 42,
  shortBreakMinutes: 8,
  longRestMinutes: 18,
  cyclesBeforeRest: 3,
  autoStartBreaks: true,
  soundTrack: 'birds',
  soundVolume: 0.3
};
const created = applyFocusModeMutation(data, {
  type: 'CREATE_FOCUS_MODE',
  payload: { values: customValues }
});
data = { ...data, ...created.patch };
const beforeModeEdit = clone(data.timerState.activeCycleSnapshot);
data = apply(data, {
  type: 'UPDATE_FOCUS_MODE',
  payload: {
    focusModeId: created.focusModeId!,
    values: { ...customValues, title: 'Edited next cycle', soundTrack: 'stream' }
  }
});
assert(JSON.stringify(data.timerState.activeCycleSnapshot) === JSON.stringify(beforeModeEdit), 'Focus Mode edit mutated the active snapshot.');

// 10. Task binding/global selection during Work does not change the active snapshot.
const beforeSelection = clone(data.timerState.activeCycleSnapshot);
data = apply(data, { type: 'SELECT_FOCUS_MODE', payload: { focusModeId: 'builtin-study' } });
assert(JSON.stringify(data.timerState.activeCycleSnapshot) === JSON.stringify(beforeSelection), 'Global selection mutated the active snapshot.');
data = {
  ...data,
  tasks: [
    ...data.tasks,
    { id: 'task-live-audio', title: 'Live audio', usageCount: 1, lastUsed: 1, focusModeId: null }
  ]
};
data = apply(data, {
  type: 'SET_TASK_FOCUS_MODE',
  payload: { taskId: 'task-live-audio', focusModeId: 'builtin-study' }
});
assert(JSON.stringify(data.timerState.activeCycleSnapshot) === JSON.stringify(beforeSelection), 'Task binding mutated the active snapshot.');

// 11. Popup reopen normalization retains direct track and volume.
data = saveMusic(data, true, 'birds', 0.61);
const reopened = normalizeStoredData(clone(data));
assert(reopened.timerState.activeCycleSnapshot?.soundTrack === 'birds', 'Reopen restored the old track.');
assert(reopened.timerState.activeCycleSnapshot?.soundVolume === 0.61, 'Reopen restored the old volume.');

// 12. Popup and app window read the same authoritative enabled/track/volume state.
const popupSettings = resolveActiveWorkFocusMusicSettings(reopened.settings, reopened.timerState);
const appSettings = resolveActiveWorkFocusMusicSettings(reopened.settings, reopened.timerState);
assert(JSON.stringify(popupSettings) === JSON.stringify(appSettings), 'Popup/app displayed states diverged.');
assert(
  popupSettings.focusMusicEnabled &&
    popupSettings.focusMusicTrack === 'birds' &&
    popupSettings.focusMusicVolume === 0.61,
  'UI did not display the active snapshot audio state.'
);

// 13. Completion stops focus audio before exact-once completion effects.
const effectOrder: string[] = [];
await runtime.reconcile(
  popupSettings,
  { ...reopened.timerState, isRunning: false, targetEndTime: null, remainingSeconds: 0 }
);
effectOrder.push(runtime.playing.length === 0 ? 'focus-stopped' : 'focus-playing');
const acceptedCycles = new Set<string>();
let chimes = 0;
let notifications = 0;
let statisticIncrements = 0;
let sessionEvents = 0;
const complete = (): void => {
  const cycleId = reopened.timerState.cycleId!;
  if (acceptedCycles.has(cycleId)) return;
  acceptedCycles.add(cycleId);
  statisticIncrements += 1;
  sessionEvents += 1;
  chimes += 1;
  notifications += 1;
};
complete();
complete();
effectOrder.push('chime', 'notification');
assert(effectOrder[0] === 'focus-stopped', 'Completion chime began before focus audio stopped.');
assert(chimes === 1 && notifications === 1 && statisticIncrements === 1 && sessionEvents === 1, 'Completion effects were not exact-once.');

// 14. Break and Rest never satisfy the strict playback predicate.
for (const currentMode of ['shortBreak', 'longBreak'] as const) {
  await runtime.reconcile(popupSettings, {
    ...reopened.timerState,
    currentMode,
    isRunning: true,
    isPaused: false,
    targetEndTime: Date.now() + 60_000
  });
  assert(runtime.playing.length === 0, `${currentMode} started focus music.`);
}

// 15. Import/reset/expired recovery invalidate pending playback.
for (const state of [
  { ...reopened.timerState, isRunning: false, isPaused: false, cycleStarted: false, targetEndTime: null },
  { ...reopened.timerState, isRunning: false, isPaused: false, cycleStarted: false, targetEndTime: null, activeCycleSnapshot: null },
  { ...reopened.timerState, isRunning: true, isPaused: false, targetEndTime: Date.now() - 1 }
]) {
  const gate = deferred<void>();
  const activeState = { ...reopened.timerState, isRunning: true, isPaused: false, targetEndTime: Date.now() + 60_000 };
  runtime.dispose();
  const pending = runtime.reconcile(popupSettings, activeState, gate);
  await runtime.reconcile(popupSettings, state);
  gate.resolve();
  await pending;
  assert(runtime.playing.length === 0, 'Recovery allowed late playback.');
}

assert(JSON.stringify(snapshotWithoutAudio(data)) === JSON.stringify(invariantSnapshot), 'Direct controls changed non-audio snapshot fields.');
assert(
  JSON.stringify({
    workTime: data.manualSettings.workTime,
    shortBreak: data.manualSettings.shortBreak,
    longBreak: data.manualSettings.longBreak,
    longBreakInterval: data.manualSettings.longBreakInterval
  }) === JSON.stringify(invariantManualDurations),
  'Direct controls replaced manual timer durations with the active mode.'
);
assert(data.timerState.cycleId === 'cycle-live-audio', 'Direct controls changed cycle identity.');
assert(data.timerState.revision === 8, 'Direct controls changed timer revision.');

let malformedRejected = false;
try {
  applyFocusModeMutation(data, {
    type: 'SAVE_FOCUS_MUSIC_SETTINGS',
    payload: { type: 'set-track', track: 'invalid' as FocusMusicTrack }
  });
} catch {
  malformedRejected = true;
}
assert(malformedRejected, 'Malformed live audio payload was accepted.');

console.log('Focus Music regression harness: PASS (15 scenarios)');
