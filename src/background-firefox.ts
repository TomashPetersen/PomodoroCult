import { FOCUS_MUSIC_TRACKS, NO_TASK_ID } from './lib/constants';
import { getNextAppWindowState } from './lib/appWindow';
import {
  getSnapshotDurationSeconds,
  resolveActiveWorkFocusMusicSettings,
  resolveNextWorkSnapshot
} from './lib/focusModes';
import { applyFocusModeMutation, FocusModeMutationMessage } from './lib/focusModeMutations';
import { applyTaskMutation, TaskMutationMessage } from './lib/taskMutations';
import {
  isFocusReviewGoalsPayload,
  normalizeFocusReviewGoals
} from './lib/focusReviewGoals';
import { getTimerModeLabel, resolveLocale, t } from './lib/i18n';
import { createSerializedOperationQueue } from './lib/operationQueue';
import {
  COMPLETION_CHIME_DURATION_MS,
  getLastCompletionChimeError,
  playCompletionChime,
  primeCompletionAudio
} from './lib/completionChime';
import {
  addSessionStatistics,
  createCycleId,
  createSessionEvent,
  ensureNoTask,
  getLocalDateKey,
  getLocalStartMinute,
  getNextTimerRevision,
  getRunningDisplaySeconds,
  initializeStorage,
  importStoredData,
  readStoredData,
  removeTaskSessionEvents,
  removeTaskStatistics,
  setLocal,
  sortTasks
} from './lib/storage';
import {
  FocusModeSnapshot,
  Locale,
  RuntimeMessage,
  Settings,
  TimerMode,
  TimerState
} from './lib/types';

const COMPLETION_ALARM = 'pomodoro-cult-completion';
const COMPLETION_NOTIFICATION_DELAY_MS = 500;
const COMPLETION_NOTIFICATION_PREFIX = 'pomodoro-cult-completion-';
const APP_WINDOW_URL = 'app.html';
const APP_WINDOW_WIDTH = 1040;
const APP_WINDOW_HEIGHT = 760;
const FOCUS_MUSIC_PLAY_TIMEOUT_MS = 2000;
const FOCUS_MUSIC_RECONCILE_WAIT_MS = FOCUS_MUSIC_PLAY_TIMEOUT_MS + 250;

interface FirefoxTimerCompletion {
  completedMode: TimerMode;
  completedState: TimerState;
}

let completionInFlight: Promise<void> | null = null;
let lastCompletedKey: string | null = null;
const timerOperationQueue = createSerializedOperationQueue();
let appWindowId: number | null = null;
let appWindowOpenPromise: Promise<void> | null = null;

const STREAM_CROSSFADE_SECONDS = 1.4;
const STREAM_FADE_STEP_MS = 80;
let focusMusicAudios: HTMLAudioElement[] = [];
let focusMusicTrackId: Settings['focusMusicTrack'] | null = null;
let focusMusicActiveAudioIndex = 0;
let focusMusicScheduleId: number | null = null;
let focusMusicFadeId: number | null = null;
let focusMusicVolume = 0.45;
let focusMusicReconcileGeneration = 0;
let focusMusicReconcileRequested = false;
let focusMusicReconcileInFlight: Promise<void> | null = null;
const focusMusicAudioOwners = new WeakMap<HTMLAudioElement, number>();

const clampFocusMusicVolume = (volume: number): number => Math.min(1, Math.max(0, volume));

const clearFocusMusicTimers = (): void => {
  if (focusMusicScheduleId !== null) {
    window.clearTimeout(focusMusicScheduleId);
    focusMusicScheduleId = null;
  }

  if (focusMusicFadeId !== null) {
    window.clearInterval(focusMusicFadeId);
    focusMusicFadeId = null;
  }
};

const pauseFocusMusic = (): void => {
  clearFocusMusicTimers();
  focusMusicAudios.forEach((audio) => {
    audio.pause();
    audio.volume = clampFocusMusicVolume(focusMusicVolume);
  });
};

const stopAndResetFocusMusic = (): void => {
  pauseFocusMusic();
  focusMusicAudios.forEach((audio) => {
    audio.currentTime = 0;
  });
};

const disposeFocusMusicAudios = (): void => {
  pauseFocusMusic();
  focusMusicAudios.forEach((audio) => {
    audio.removeAttribute('src');
    audio.load();
    focusMusicAudioOwners.delete(audio);
  });
  focusMusicAudios = [];
  focusMusicActiveAudioIndex = 0;
  focusMusicTrackId = null;
};

const disposeFocusMusicAudio = (audio: HTMLAudioElement): void => {
  const index = focusMusicAudios.indexOf(audio);
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  focusMusicAudioOwners.delete(audio);

  if (index < 0) return;

  focusMusicAudios.splice(index, 1);
  if (focusMusicAudios.length === 0) {
    focusMusicActiveAudioIndex = 0;
  } else if (index < focusMusicActiveAudioIndex) {
    focusMusicActiveAudioIndex -= 1;
  } else if (focusMusicActiveAudioIndex >= focusMusicAudios.length) {
    focusMusicActiveAudioIndex = 0;
  }
};

const normalizeFocusMusicOverlap = (): void => {
  const playingIndexes = focusMusicAudios
    .map((audio, index) => ({ audio, index }))
    .filter(({ audio }) => !audio.paused);

  if (playingIndexes.length === 0) return;

  const active = playingIndexes.reduce((loudest, candidate) =>
    candidate.audio.volume > loudest.audio.volume ? candidate : loudest
  );

  focusMusicActiveAudioIndex = active.index;
  focusMusicAudioOwners.set(active.audio, focusMusicReconcileGeneration);
  focusMusicAudios.forEach((audio, index) => {
    if (index === active.index) {
      audio.volume = clampFocusMusicVolume(focusMusicVolume);
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    audio.volume = clampFocusMusicVolume(focusMusicVolume);
  });
};

const invalidateFocusMusicPlayback = (stopImmediately: boolean): number => {
  focusMusicReconcileGeneration += 1;
  clearFocusMusicTimers();

  if (stopImmediately) {
    stopAndResetFocusMusic();
  } else {
    normalizeFocusMusicOverlap();
  }

  return focusMusicReconcileGeneration;
};

const ensureFocusMusicAudios = (settings: Settings): HTMLAudioElement[] => {
  const track =
    FOCUS_MUSIC_TRACKS.find((candidate) => candidate.id === settings.focusMusicTrack) ??
    FOCUS_MUSIC_TRACKS[0];

  focusMusicVolume = clampFocusMusicVolume(settings.focusMusicVolume);
  const audioUrl = chrome.runtime.getURL(track.src);
  const audioCount = track.id === 'stream' ? 2 : 1;
  const createAudio = (): HTMLAudioElement => {
    const audio = new Audio(audioUrl);
    audio.loop = track.id !== 'stream';
    audio.preload = 'auto';
    audio.volume = focusMusicVolume;
    return audio;
  };

  if (focusMusicTrackId !== track.id) {
    disposeFocusMusicAudios();
    focusMusicTrackId = track.id;
    focusMusicAudios = Array.from({ length: audioCount }, createAudio);
  } else {
    while (focusMusicAudios.length < audioCount) {
      focusMusicAudios.push(createAudio());
    }
    while (focusMusicAudios.length > audioCount) {
      const extraAudio = focusMusicAudios[focusMusicAudios.length - 1];
      disposeFocusMusicAudio(extraAudio);
    }
    focusMusicAudios.forEach((audio) => {
      audio.volume = focusMusicVolume;
    });
  }

  return focusMusicAudios;
};

type FocusMusicPlayResult = 'played' | 'failed' | 'stale' | 'timeout';

const playFocusMusicAudio = async (
  audio: HTMLAudioElement,
  generation: number,
  context: string
): Promise<FocusMusicPlayResult> => {
  let timedOut = false;
  let timeoutId: number | null = null;
  let playPromise: Promise<void>;

  try {
    focusMusicAudioOwners.set(audio, generation);
    playPromise = audio.play();
  } catch (error) {
    console.warn(`Firefox focus music ${context} failed:`, error);
    return 'failed';
  }

  void playPromise.then(() => {
    if (!focusMusicAudios.includes(audio)) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    if (
      (timedOut || generation !== focusMusicReconcileGeneration) &&
      focusMusicAudioOwners.get(audio) === generation
    ) {
      audio.pause();
      audio.currentTime = 0;
    }
  }).catch(() => {
    // The awaited branch below records the playback failure once.
  });

  const result = await Promise.race<FocusMusicPlayResult>([
    playPromise.then(() => 'played' as const).catch((error) => {
      console.warn(`Firefox focus music ${context} failed:`, error);
      return 'failed' as const;
    }),
    new Promise<FocusMusicPlayResult>((resolve) => {
      timeoutId = window.setTimeout(() => {
        timedOut = true;
        resolve('timeout');
      }, FOCUS_MUSIC_PLAY_TIMEOUT_MS);
    })
  ]);

  if (timeoutId !== null) {
    window.clearTimeout(timeoutId);
  }

  if (result === 'timeout') {
    console.warn(`Firefox focus music ${context} timed out.`);
    if (
      focusMusicAudios.includes(audio) &&
      focusMusicAudioOwners.get(audio) === generation
    ) {
      disposeFocusMusicAudio(audio);
    }
    return result;
  }

  if (result === 'played' && generation !== focusMusicReconcileGeneration) {
    if (focusMusicAudioOwners.get(audio) === generation) {
      audio.pause();
      audio.currentTime = 0;
    }
    return 'stale';
  }

  return result;
};

const scheduleStreamCrossfade = (generation: number): void => {
  clearFocusMusicTimers();
  if (generation !== focusMusicReconcileGeneration) return;

  const activeAudio = focusMusicAudios[focusMusicActiveAudioIndex];
  if (!activeAudio || activeAudio.paused) return;

  const duration = Number.isFinite(activeAudio.duration) ? activeAudio.duration : 0;
  if (duration <= 0) {
    focusMusicScheduleId = window.setTimeout(() => {
      scheduleStreamCrossfade(generation);
    }, 350);
    return;
  }

  const delayMs = Math.max(
    250,
    (duration - activeAudio.currentTime - STREAM_CROSSFADE_SECONDS) * 1000
  );

  focusMusicScheduleId = window.setTimeout(() => {
    if (generation !== focusMusicReconcileGeneration) return;

    const nextIndex = focusMusicActiveAudioIndex === 0 ? 1 : 0;
    const current = focusMusicAudios[focusMusicActiveAudioIndex];
    const next = focusMusicAudios[nextIndex];
    if (!current || !next || current.paused) return;

    next.pause();
    next.currentTime = 0;
    next.volume = 0;

    void playFocusMusicAudio(next, generation, 'crossfade').then((playResult) => {
      if (playResult !== 'played' || generation !== focusMusicReconcileGeneration) {
        if (focusMusicAudioOwners.get(next) === generation) {
          next.pause();
          next.currentTime = 0;
        }
        return;
      }

      const startedAt = performance.now();
      const fadeId = window.setInterval(() => {
        if (generation !== focusMusicReconcileGeneration) {
          window.clearInterval(fadeId);
          if (focusMusicFadeId === fadeId) {
            focusMusicFadeId = null;
          }
          if (focusMusicAudioOwners.get(next) === generation) {
            next.pause();
            next.currentTime = 0;
          }
          return;
        }

        const progress = Math.min(
          1,
          (performance.now() - startedAt) / (STREAM_CROSSFADE_SECONDS * 1000)
        );
        current.volume = focusMusicVolume * (1 - progress);
        next.volume = focusMusicVolume * progress;

        if (progress < 1) return;
        if (focusMusicFadeId !== null) {
          window.clearInterval(focusMusicFadeId);
          focusMusicFadeId = null;
        }
        current.pause();
        current.currentTime = 0;
        current.volume = focusMusicVolume;
        focusMusicActiveAudioIndex = nextIndex;
        scheduleStreamCrossfade(generation);
      }, STREAM_FADE_STEP_MS);
      focusMusicFadeId = fadeId;
    });
  }, delayMs);
};

const shouldPlayFocusMusic = (settings: Settings, timerState: TimerState): boolean =>
  settings.focusMusicEnabled &&
  timerState.currentMode === 'work' &&
  timerState.isRunning &&
  !timerState.isPaused &&
  timerState.targetEndTime !== null &&
  timerState.targetEndTime > Date.now();

const syncFocusMusic = async (
  settings: Settings,
  timerState: TimerState,
  generation: number
): Promise<void> => {
  if (generation !== focusMusicReconcileGeneration) return;

  if (!shouldPlayFocusMusic(settings, timerState)) {
    pauseFocusMusic();
    return;
  }

  const audios = ensureFocusMusicAudios(settings);
  if (generation !== focusMusicReconcileGeneration) return;

  const activeAudio = audios[focusMusicActiveAudioIndex] ?? audios[0];
  if (!activeAudio) return;

  if (!activeAudio.paused) {
    focusMusicAudioOwners.set(activeAudio, generation);
    activeAudio.volume = clampFocusMusicVolume(focusMusicVolume);
    if (settings.focusMusicTrack === 'stream') {
      scheduleStreamCrossfade(generation);
    }
    return;
  }

  const playResult = await playFocusMusicAudio(activeAudio, generation, 'playback');
  if (generation !== focusMusicReconcileGeneration) {
    return;
  }
  if (playResult !== 'played') {
    pauseFocusMusic();
    return;
  }

  if (settings.focusMusicTrack === 'stream') {
    scheduleStreamCrossfade(generation);
  }
};

const runFocusMusicReconcileWorker = async (): Promise<void> => {
  while (focusMusicReconcileRequested) {
    focusMusicReconcileRequested = false;
    const generation = focusMusicReconcileGeneration;

    try {
      const { settings, timerState } = await readStoredData();

      if (generation !== focusMusicReconcileGeneration) {
        focusMusicReconcileRequested = true;
        continue;
      }

      const focusSettings = resolveActiveWorkFocusMusicSettings(settings, timerState);
      await syncFocusMusic(focusSettings, timerState, generation);
    } catch (error) {
      console.warn('Firefox focus music reconciliation failed:', error);
      if (generation === focusMusicReconcileGeneration) {
        pauseFocusMusic();
      }
    }
  }
};

const ensureFocusMusicReconcileWorker = (): Promise<void> => {
  if (!focusMusicReconcileInFlight) {
    focusMusicReconcileInFlight = runFocusMusicReconcileWorker().finally(() => {
      focusMusicReconcileInFlight = null;
      if (focusMusicReconcileRequested) {
        void ensureFocusMusicReconcileWorker();
      }
    });
  }

  return focusMusicReconcileInFlight;
};

const requestFocusMusicReconcile = (stopImmediately = false): Promise<void> => {
  invalidateFocusMusicPlayback(stopImmediately);
  focusMusicReconcileRequested = true;
  return ensureFocusMusicReconcileWorker();
};

const requestFocusMusicReconcileBounded = async (stopImmediately = false): Promise<void> => {
  const reconcile = requestFocusMusicReconcile(stopImmediately);
  let timeoutId: number | null = null;

  try {
    await Promise.race([
      reconcile,
      new Promise<void>((resolve) => {
        timeoutId = window.setTimeout(resolve, FOCUS_MUSIC_RECONCILE_WAIT_MS);
      })
    ]);
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
};

const enqueueTimerOperation = timerOperationQueue.enqueue;

(
  globalThis as typeof globalThis & {
    __pomodoroCultPrimeAudio?: () => Promise<void>;
    __pomodoroCultGetLastAudioError?: () => string | null;
  }
).__pomodoroCultPrimeAudio = primeCompletionAudio;

(
  globalThis as typeof globalThis & {
    __pomodoroCultPrimeAudio?: () => Promise<void>;
    __pomodoroCultGetLastAudioError?: () => string | null;
  }
).__pomodoroCultGetLastAudioError = getLastCompletionChimeError;

const getNotificationsApi = (): typeof chrome.notifications | null => {
  const browserApi = (
    globalThis as typeof globalThis & {
      browser?: { notifications?: typeof chrome.notifications };
    }
  ).browser;

  if (browserApi?.notifications) {
    return browserApi.notifications;
  }

  if (typeof chrome !== 'undefined' && chrome.notifications) {
    return chrome.notifications;
  }

  return null;
};

const getAlarmsApi = (): typeof chrome.alarms | null => {
  const browserApi = (
    globalThis as typeof globalThis & {
      browser?: { alarms?: typeof chrome.alarms };
    }
  ).browser;

  if (browserApi?.alarms) {
    return browserApi.alarms;
  }

  if (typeof chrome !== 'undefined' && chrome.alarms) {
    return chrome.alarms;
  }

  return null;
};

const getWindowsApi = (): typeof chrome.windows | null => {
  const browserApi = (
    globalThis as typeof globalThis & {
      browser?: { windows?: typeof chrome.windows };
    }
  ).browser;

  if (browserApi?.windows) {
    return browserApi.windows;
  }

  if (typeof chrome !== 'undefined' && chrome.windows) {
    return chrome.windows;
  }

  return null;
};

const createAlarm = async (targetEndTime: number): Promise<void> => {
  const alarms = getAlarmsApi();
  if (!alarms) {
    console.warn('Firefox alarms API is unavailable.');
    return;
  }

  alarms.create(COMPLETION_ALARM, { when: targetEndTime });
};

const clearAlarm = async (): Promise<void> => {
  const alarms = getAlarmsApi();
  if (!alarms) return;

  await new Promise<void>((resolve) => {
    alarms.clear(COMPLETION_ALARM, () => {
      void chrome.runtime.lastError;
      resolve();
    });
  });
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const focusExistingAppWindow = async (windowId: number): Promise<boolean> => {
  const windowsApi = getWindowsApi();
  if (!windowsApi) return false;

  return await new Promise<boolean>((resolve) => {
    windowsApi.update(windowId, { focused: true }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
};

const focusLastFirefoxWindow = async (): Promise<boolean> => {
  const windowsApi = getWindowsApi();
  if (!windowsApi) return false;

  return await new Promise<boolean>((resolve) => {
    windowsApi.getLastFocused({}, (windowInfo) => {
      const getError = chrome.runtime.lastError;
      if (getError || typeof windowInfo?.id !== 'number') {
        resolve(false);
        return;
      }

      windowsApi.update(windowInfo.id, { focused: true }, () => {
        const updateError = chrome.runtime.lastError;
        resolve(!updateError);
      });
    });
  });
};

const buildAppWindowUrl = (options?: { screen?: string; statsView?: string }): string => {
  const url = new URL(chrome.runtime.getURL(APP_WINDOW_URL));

  if (options?.screen) {
    url.searchParams.set('screen', options.screen);
  }
  if (options?.statsView) {
    url.searchParams.set('statsView', options.statsView);
  }
  return url.toString();
};

const findExistingAppWindowId = async (): Promise<number | null> => {
  const windowsApi = getWindowsApi();
  if (!windowsApi) return null;

  const appWindowBaseUrl = chrome.runtime.getURL(APP_WINDOW_URL);

  return await new Promise<number | null>((resolve) => {
    windowsApi.getAll({ populate: true }, (windows) => {
      const error = chrome.runtime.lastError;
      if (error) {
        resolve(null);
        return;
      }

      for (const candidate of windows) {
        const hasAppTab = candidate.tabs?.some((tab) => tab.url?.startsWith(appWindowBaseUrl));
        if (hasAppTab && typeof candidate.id === 'number') {
          resolve(candidate.id);
          return;
        }
      }

      resolve(null);
    });
  });
};

const getKnownAppWindowId = async (): Promise<number | null> => {
  if (appWindowId === null) {
    return null;
  }

  const windowsApi = getWindowsApi();
  if (!windowsApi) {
    appWindowId = null;
    return null;
  }

  return await new Promise<number | null>((resolve) => {
    windowsApi.get(appWindowId as number, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        appWindowId = null;
        resolve(null);
        return;
      }

      resolve(appWindowId);
    });
  });
};

const notifyAppWindowNavigation = async (
  options?: { screen?: string; statsView?: string }
): Promise<void> => {
  if (!options) return;

  try {
    await chrome.runtime.sendMessage({
      type: 'APP_WINDOW_NAVIGATE',
      payload: options
    });
  } catch {
    // The app window may still be mounting; query parameters cover newly created windows.
  }
};

const doOpenAppWindow = async (options?: { screen?: string; statsView?: string }): Promise<void> => {
  const windowsApi = getWindowsApi();
  if (!windowsApi) {
    throw new Error('Firefox windows API is unavailable.');
  }

  const knownWindowId = await getKnownAppWindowId();
  if (knownWindowId !== null && (await focusExistingAppWindow(knownWindowId))) {
    await notifyAppWindowNavigation(options);
    return;
  }

  appWindowId = null;

  const existingWindowId = await findExistingAppWindowId();
  if (existingWindowId !== null && (await focusExistingAppWindow(existingWindowId))) {
    appWindowId = existingWindowId;
    await notifyAppWindowNavigation(options);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const createData: chrome.windows.CreateData & { titlePreface?: string } = {
      url: buildAppWindowUrl(options),
      type: 'popup',
      width: APP_WINDOW_WIDTH,
      height: APP_WINDOW_HEIGHT,
      focused: true,
      titlePreface: 'Pomodoro Cult'
    };

    windowsApi.create(
      createData,
      (createdWindow) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }

        appWindowId = createdWindow?.id ?? null;
        resolve();
      }
    );
  });
};

const openAppWindow = async (
  options?: { screen?: string; statsView?: string }
): Promise<void> => {
  if (appWindowOpenPromise) {
    await appWindowOpenPromise;

    const knownWindowId = await getKnownAppWindowId();
    if (knownWindowId !== null && (await focusExistingAppWindow(knownWindowId))) {
      await notifyAppWindowNavigation(options);
      return;
    }
  }

  appWindowOpenPromise = doOpenAppWindow(options);

  try {
    await appWindowOpenPromise;
  } finally {
    appWindowOpenPromise = null;
  }
};

const toggleAppWindowMaximized = async (): Promise<boolean> => {
  const windowsApi = getWindowsApi();
  if (!windowsApi) {
    return false;
  }

  const targetWindowId = (await getKnownAppWindowId()) ?? (await findExistingAppWindowId());
  if (targetWindowId === null) return false;
  appWindowId = targetWindowId;

  return await new Promise<boolean>((resolve, reject) => {
    windowsApi.get(targetWindowId, (currentWindow) => {
      const getError = chrome.runtime.lastError;
      if (getError) {
        reject(new Error(getError.message));
        return;
      }

      const nextState = getNextAppWindowState(currentWindow.state);

      windowsApi.update(targetWindowId, { state: nextState, focused: true }, () => {
        const updateError = chrome.runtime.lastError;
        if (updateError) {
          reject(new Error(updateError.message));
          return;
        }

        resolve(nextState === 'fullscreen');
      });
    });
  });
};

const getNotificationCopy = (
  locale: Locale,
  completedMode: TimerMode,
  nextMode: TimerMode
): { title: string; message: string } => {
  const title =
    completedMode === 'work'
      ? t(locale, 'notificationWorkDone')
      : completedMode === 'shortBreak'
        ? t(locale, 'notificationBreakDone')
        : t(locale, 'notificationRestDone');

  const message = t(locale, 'notificationNextMode', {
    mode: getTimerModeLabel(locale, nextMode)
  });

  return { title, message };
};

const showCompletionNotification = async (
  completedMode: TimerMode,
  nextMode: TimerMode
): Promise<void> => {
  const notifications = getNotificationsApi();
  if (!notifications) {
    console.warn('Firefox completion fallback notification is unavailable.');
    return;
  }

  const { settings } = await readStoredData();
  const locale = resolveLocale(settings.languagePreference);
  const { title, message } = getNotificationCopy(locale, completedMode, nextMode);

  await new Promise<void>((resolve) => {
    notifications.create(
      `${COMPLETION_NOTIFICATION_PREFIX}${Date.now()}`,
      {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/firefox-tomato-icon-128.png'),
        title,
        message
      },
      () => {
        void chrome.runtime.lastError;
        console.warn(
          'Firefox completion notification shown.',
          JSON.stringify({ completedMode, nextMode })
        );
        resolve();
      }
    );
  });
};

const handleCompletionNotificationClick = async (notificationId: string): Promise<void> => {
  if (!notificationId.startsWith(COMPLETION_NOTIFICATION_PREFIX)) {
    return;
  }

  const notifications = getNotificationsApi();
  notifications?.clear(notificationId, () => {
    void chrome.runtime.lastError;
  });

  try {
    await openAppWindow();
  } catch (error) {
    console.warn(
      'Could not open or focus app window from completion notification.',
      error instanceof Error ? error.message : String(error)
    );
    await focusLastFirefoxWindow();
  }
};

const buildRunningState = (
  timerState: TimerState,
  mode: TimerMode,
  durationSeconds: number,
  targetEndTime: number,
  activeTaskId: string | null,
  cycleId: string,
  cycleStartedAt: number | null,
  cycleStartedLocalDate: string | null,
  cycleLocalStartMinute: number | null,
  activeCycleSnapshot: FocusModeSnapshot
): TimerState => ({
  ...timerState,
  isRunning: true,
  isPaused: false,
  cycleStarted: true,
  revision: getNextTimerRevision(timerState),
  currentMode: mode,
  remainingSeconds: durationSeconds,
  targetEndTime,
  cycleId,
  cycleStartedAt,
  cycleStartedLocalDate,
  cycleLocalStartMinute,
  activeCycleSnapshot,
  activeTaskId
});

const handleStartTimer = async (mode: TimerMode, startedAt: number): Promise<TimerState> => {
  const data = await readStoredData();
  let { tasks, timerState } = data;

  if (timerState.isRunning && timerState.targetEndTime) {
    const targetEndTime = timerState.targetEndTime;
    if (!timerState.cycleId) {
      timerState = {
        ...timerState,
        cycleId: createCycleId(),
        revision: getNextTimerRevision(timerState)
      };
      await setLocal({ timerState });
    }
    await createAlarm(targetEndTime);
    return timerState;
  }

  let activeTaskId = timerState.activeTaskId;
  let nextTasks = tasks;

  if (mode === 'work') {
    nextTasks = ensureNoTask(tasks);
    const selectedTaskExists = nextTasks.some((task) => task.id === timerState.activeTaskId);
    activeTaskId = selectedTaskExists ? timerState.activeTaskId : NO_TASK_ID;
    const now = Date.now();

    nextTasks = sortTasks(
      nextTasks.map((task) =>
        task.id === activeTaskId
          ? {
              ...task,
              usageCount: task.usageCount + 1,
              lastUsed: now
            }
          : task
      )
    );
  }

  const isResume =
    timerState.isPaused &&
    timerState.cycleStarted &&
    timerState.currentMode === mode &&
    timerState.activeCycleSnapshot !== null;
  const activeCycleSnapshot = isResume
    ? timerState.activeCycleSnapshot!
    : mode !== 'work' && timerState.activeCycleSnapshot
      ? timerState.activeCycleSnapshot
      : resolveNextWorkSnapshot({
          focusModes: data.focusModes,
          tasks: nextTasks,
          activeTaskId: activeTaskId ?? null,
          selectedFocusModeId: data.selectedFocusModeId,
          manualSettings: data.manualSettings
        });
  const durationSeconds = isResume
    ? timerState.remainingSeconds
    : getSnapshotDurationSeconds(activeCycleSnapshot, mode);
  const targetEndTime = startedAt + durationSeconds * 1000;
  const cycleId = isResume && timerState.cycleId ? timerState.cycleId : createCycleId();
  const cycleStartedAt = isResume ? timerState.cycleStartedAt : startedAt;
  const cycleStartDate = new Date(startedAt);
  const cycleStartedLocalDate = isResume
    ? timerState.cycleStartedLocalDate
    : getLocalDateKey(cycleStartDate);
  const cycleLocalStartMinute = isResume
    ? timerState.cycleLocalStartMinute
    : getLocalStartMinute(cycleStartDate);
  const nextState = buildRunningState(
    timerState,
    mode,
    durationSeconds,
    targetEndTime,
    activeTaskId ?? null,
    cycleId,
    cycleStartedAt,
    cycleStartedLocalDate,
    cycleLocalStartMinute,
    activeCycleSnapshot
  );

  await setLocal({
    tasks: nextTasks,
    timerState: nextState
  });

  await requestFocusMusicReconcileBounded(mode !== 'work');
  await createAlarm(targetEndTime);
  return nextState;
};

const handlePauseTimer = async (): Promise<TimerState> => {
  const { timerState } = await readStoredData();

  if (!timerState.isRunning) {
    return timerState;
  }

  if (timerState.targetEndTime && timerState.targetEndTime <= Date.now()) {
    await clearAlarm();
    return handleTimerCompleted({
      ...timerState,
      remainingSeconds: 0
    });
  }

  invalidateFocusMusicPlayback(true);
  const remainingSeconds = timerState.targetEndTime
    ? getRunningDisplaySeconds(timerState.targetEndTime)
    : timerState.remainingSeconds;
  const nextState: TimerState = {
    ...timerState,
    isRunning: false,
    isPaused: true,
    revision: getNextTimerRevision(timerState),
    remainingSeconds,
    targetEndTime: null
  };

  await setLocal({ timerState: nextState });
  await clearAlarm();
  await requestFocusMusicReconcileBounded(true);
  return nextState;
};

const handleResetTimer = async (): Promise<TimerState> => {
  const data = await readStoredData();
  const { timerState: storedTimerState } = data;
  const timerState =
    storedTimerState.isRunning &&
    storedTimerState.targetEndTime &&
    storedTimerState.targetEndTime <= Date.now()
      ? await handleTimerCompleted({
          ...storedTimerState,
          remainingSeconds: 0
        })
      : storedTimerState;
  const nextWorkSnapshot = resolveNextWorkSnapshot({
    focusModes: data.focusModes,
    tasks: data.tasks,
    activeTaskId: timerState.activeTaskId,
    selectedFocusModeId: data.selectedFocusModeId,
    manualSettings: data.manualSettings
  });
  invalidateFocusMusicPlayback(true);
  const nextState: TimerState = {
    ...timerState,
    isRunning: false,
    isPaused: false,
    cycleStarted: false,
    revision: getNextTimerRevision(timerState),
    currentMode: 'work',
    remainingSeconds: getSnapshotDurationSeconds(nextWorkSnapshot, 'work'),
    targetEndTime: null,
    cycleId: null,
    cycleStartedAt: null,
    cycleStartedLocalDate: null,
    cycleLocalStartMinute: null,
    activeCycleSnapshot: null,
    completedSessions: 0
  };

  await setLocal({ timerState: nextState });
  await clearAlarm();
  await requestFocusMusicReconcileBounded(true);
  return nextState;
};

const handleSkipShortBreak = async (): Promise<TimerState> => {
  const data = await readStoredData();
  const { timerState } = data;

  if (timerState.currentMode !== 'shortBreak') {
    return timerState;
  }

  invalidateFocusMusicPlayback(true);
  const nextWorkSnapshot = resolveNextWorkSnapshot({
    focusModes: data.focusModes,
    tasks: data.tasks,
    activeTaskId: timerState.activeTaskId,
    selectedFocusModeId: data.selectedFocusModeId,
    manualSettings: data.manualSettings
  });
  const nextState: TimerState = {
    ...timerState,
    isRunning: false,
    isPaused: false,
    cycleStarted: false,
    revision: getNextTimerRevision(timerState),
    currentMode: 'work',
    remainingSeconds: getSnapshotDurationSeconds(nextWorkSnapshot, 'work'),
    targetEndTime: null,
    cycleId: null,
    cycleStartedAt: null,
    cycleStartedLocalDate: null,
    cycleLocalStartMinute: null,
    activeCycleSnapshot: null
  };

  await setLocal({ timerState: nextState });
  await clearAlarm();
  await requestFocusMusicReconcileBounded(true);
  return nextState;
};

const handleTimerCompleted = async (timerState: TimerState): Promise<TimerState> => {
  const data = await readStoredData();
  let { tasks, statistics, sessionEvents } = data;
  const storedTimerState = data.timerState;

  if (
    !timerState.isRunning ||
    !timerState.cycleId ||
    storedTimerState.cycleId !== timerState.cycleId ||
    storedTimerState.currentMode !== timerState.currentMode ||
    !storedTimerState.isRunning
  ) {
    return storedTimerState;
  }

  invalidateFocusMusicPlayback(true);

  if (timerState.currentMode === 'work') {
    const snapshot = timerState.activeCycleSnapshot;
    if (!snapshot) return storedTimerState;
    tasks = ensureNoTask(tasks);
    const activeTaskId = timerState.activeTaskId ?? NO_TASK_ID;
    const activeTask = tasks.find((task) => task.id === activeTaskId);
    const taskTitle = activeTask?.title ?? '';
    const completedSessions = timerState.completedSessions + 1;
    const nextMode =
      completedSessions % snapshot.cyclesBeforeRest === 0 ? 'longBreak' : 'shortBreak';
    const nextDuration = getSnapshotDurationSeconds(snapshot, nextMode);
    const completedAt = Date.now();
    const durationSeconds = getSnapshotDurationSeconds(snapshot, 'work');
    const nextTargetEndTime = snapshot.autoStartBreaks
      ? completedAt + nextDuration * 1000
      : null;
    const nextCycleId = nextTargetEndTime ? createCycleId() : null;

    statistics = addSessionStatistics(
      statistics,
      activeTaskId,
      taskTitle,
      durationSeconds,
      completedAt
    );
    sessionEvents = [
      ...sessionEvents,
      createSessionEvent({
        cycleId: timerState.cycleId,
        taskId: activeTaskId,
        taskTitleSnapshot: taskTitle,
        focusModeId: snapshot.appliedFocusModeId,
        cycleStartedAt: timerState.cycleStartedAt,
        cycleStartedLocalDate: timerState.cycleStartedLocalDate,
        cycleLocalStartMinute: timerState.cycleLocalStartMinute,
        completedAt,
        durationSeconds
      })
    ];

    const nextState: TimerState = {
      ...timerState,
      isRunning: snapshot.autoStartBreaks,
      isPaused: false,
      revision: getNextTimerRevision(timerState),
      currentMode: nextMode,
      remainingSeconds: nextDuration,
      targetEndTime: nextTargetEndTime,
      cycleId: nextCycleId,
      cycleStartedAt: nextTargetEndTime ? completedAt : null,
      cycleStartedLocalDate: nextTargetEndTime
        ? getLocalDateKey(new Date(completedAt))
        : null,
      cycleLocalStartMinute: nextTargetEndTime
        ? getLocalStartMinute(new Date(completedAt))
        : null,
      activeTaskId,
      completedSessions
    };

    await setLocal({
      tasks,
      statistics,
      sessionEvents,
      timerState: nextState
    });

    await requestFocusMusicReconcileBounded(true);

    if (nextTargetEndTime) {
      await createAlarm(nextTargetEndTime);
    }

    return nextState;
  }

  const nextWorkSnapshot = resolveNextWorkSnapshot({
    focusModes: data.focusModes,
    tasks: data.tasks,
    activeTaskId: timerState.activeTaskId,
    selectedFocusModeId: data.selectedFocusModeId,
    manualSettings: data.manualSettings
  });
  const nextState: TimerState = {
    ...timerState,
    isRunning: false,
    isPaused: false,
    cycleStarted: false,
    revision: getNextTimerRevision(timerState),
    currentMode: 'work',
    remainingSeconds: getSnapshotDurationSeconds(nextWorkSnapshot, 'work'),
    targetEndTime: null,
    cycleId: null,
    cycleStartedAt: null,
    cycleStartedLocalDate: null,
    cycleLocalStartMinute: null,
    activeCycleSnapshot: null,
    activeTaskId: timerState.activeTaskId
  };

  await setLocal({ timerState: nextState });
  await requestFocusMusicReconcileBounded(true);
  return nextState;
};

const handleDeleteTaskStatistics = async (taskId: string) => {
  const { statistics, sessionEvents } = await readStoredData();
  const nextStatistics = removeTaskStatistics(statistics, taskId);
  const nextSessionEvents = removeTaskSessionEvents(sessionEvents, taskId);
  await setLocal({ statistics: nextStatistics, sessionEvents: nextSessionEvents });
  return { statistics: nextStatistics, sessionEvents: nextSessionEvents };
};

const handleSaveFocusReviewGoals = async (payload: unknown) => {
  if (!isFocusReviewGoalsPayload(payload)) {
    throw new Error('Invalid Focus Review goals payload.');
  }
  const focusReviewGoals = normalizeFocusReviewGoals(payload);
  await setLocal({ focusReviewGoals });
  return { focusReviewGoals };
};

const handleFocusModeMutation = async (message: FocusModeMutationMessage) => {
  const data = await readStoredData();
  const result = applyFocusModeMutation(data, message);
  const nextData = { ...data, ...result.patch };
  const nextWorkSnapshot = resolveNextWorkSnapshot({
    focusModes: nextData.focusModes,
    tasks: nextData.tasks,
    activeTaskId: nextData.timerState.activeTaskId,
    selectedFocusModeId: nextData.selectedFocusModeId,
    manualSettings: nextData.manualSettings
  });
  const timerState = !nextData.timerState.cycleStarted && nextData.timerState.currentMode === 'work'
    ? {
        ...nextData.timerState,
        revision: getNextTimerRevision(nextData.timerState),
        remainingSeconds: getSnapshotDurationSeconds(nextWorkSnapshot, 'work'),
        activeCycleSnapshot: null
      }
    : nextData.timerState;
  const patch = timerState === nextData.timerState ? result.patch : { ...result.patch, timerState };
  await setLocal(patch);
  return { ...patch, ...(result.focusModeId ? { focusModeId: result.focusModeId } : {}) };
};

const handleTaskMutation = async (message: TaskMutationMessage) => {
  const data = await readStoredData();
  const result = applyTaskMutation(data, message);
  const nextData = { ...data, ...result.patch };
  const nextWorkSnapshot = resolveNextWorkSnapshot({
    focusModes: nextData.focusModes,
    tasks: nextData.tasks,
    activeTaskId: nextData.timerState.activeTaskId,
    selectedFocusModeId: nextData.selectedFocusModeId,
    manualSettings: nextData.manualSettings
  });
  const timerState = !nextData.timerState.cycleStarted && nextData.timerState.currentMode === 'work'
    ? {
        ...nextData.timerState,
        revision: getNextTimerRevision(nextData.timerState),
        remainingSeconds: getSnapshotDurationSeconds(nextWorkSnapshot, 'work'),
        activeCycleSnapshot: null
      }
    : nextData.timerState;
  const patch = timerState === nextData.timerState ? result.patch : { ...result.patch, timerState };
  await setLocal(patch);
  return { ...patch, ...(result.taskId ? { taskId: result.taskId } : {}) };
};

const completeExpiredTimerInQueue = async (): Promise<FirefoxTimerCompletion | null> => {
  const { timerState } = await readStoredData();

  if (!timerState.isRunning || !timerState.targetEndTime) {
    await clearAlarm();
    return null;
  }

  if (timerState.targetEndTime > Date.now()) {
    await createAlarm(timerState.targetEndTime);
    return null;
  }

  const completionKey = `${timerState.cycleId}:${timerState.currentMode}:${timerState.targetEndTime}`;
  if (lastCompletedKey === completionKey) {
    await clearAlarm();
    return null;
  }

  await clearAlarm();
  const completedMode = timerState.currentMode;
  const completedState = await handleTimerCompleted({
    ...timerState,
    remainingSeconds: 0
  });
  lastCompletedKey = completionKey;
  return { completedMode, completedState };
};

const runCompletionEffects = async (completion: FirefoxTimerCompletion): Promise<void> => {
  try {
    await playCompletionChime();
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : getLastCompletionChimeError() ?? String(error);
    console.warn('Firefox completion audio failed:', reason);
    await delay(COMPLETION_CHIME_DURATION_MS);
  }

  await delay(COMPLETION_NOTIFICATION_DELAY_MS);
  await showCompletionNotification(
    completion.completedMode,
    completion.completedState.currentMode
  );
};

const completeExpiredTimer = async (): Promise<void> => {
  if (completionInFlight) {
    await completionInFlight;
    return;
  }

  completionInFlight = (async () => {
    const completion = await enqueueTimerOperation(completeExpiredTimerInQueue);
    if (completion) await runCompletionEffects(completion);
  })();

  try {
    await completionInFlight;
  } finally {
    completionInFlight = null;
  }
};

const initializeAndRecoverTimerInQueue = async (): Promise<FirefoxTimerCompletion | null> => {
  const { timerState: storedTimerState } = await initializeStorage();
  let timerState = storedTimerState;

  if (timerState.isRunning && !timerState.cycleId) {
    timerState = {
      ...timerState,
      cycleId: createCycleId(),
      revision: getNextTimerRevision(timerState)
    };
    await setLocal({ timerState });
  }

  if (!timerState.isRunning || !timerState.targetEndTime) {
    await clearAlarm();
    return null;
  }

  if (timerState.targetEndTime <= Date.now()) {
    return completeExpiredTimerInQueue();
  }

  await createAlarm(timerState.targetEndTime);
  return null;
};

const syncBackgroundRuntime = async (): Promise<void> => {
  const completion = await enqueueTimerOperation(initializeAndRecoverTimerInQueue);
  if (completion) await runCompletionEffects(completion);
  await requestFocusMusicReconcileBounded();
};

chrome.runtime.onInstalled.addListener(() => {
  void syncBackgroundRuntime();
});

chrome.runtime.onStartup.addListener(() => {
  void syncBackgroundRuntime();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || (!changes.settings && !changes.timerState)) return;

  const settings = changes.settings?.newValue as Settings | undefined;
  const timerState = changes.timerState?.newValue as TimerState | undefined;
  const stopImmediately =
    settings?.focusMusicEnabled === false ||
    (timerState !== undefined &&
      (!timerState.isRunning ||
        timerState.isPaused ||
        timerState.currentMode !== 'work' ||
        timerState.targetEndTime === null ||
        timerState.targetEndTime <= Date.now()));

  void requestFocusMusicReconcile(stopImmediately);
});

void syncBackgroundRuntime();

const alarmsApi = getAlarmsApi();
alarmsApi?.onAlarm.addListener((alarm) => {
  if (alarm.name !== COMPLETION_ALARM) return;
  void completeExpiredTimer();
});

const windowsApi = getWindowsApi();
windowsApi?.onRemoved.addListener((windowId) => {
  if (windowId === appWindowId) {
    appWindowId = null;
  }
});

const notificationsApi = getNotificationsApi();
notificationsApi?.onClicked.addListener((notificationId) => {
  void handleCompletionNotificationClick(notificationId);
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  const respond = async (): Promise<void> => {
    if (!message?.type) {
      sendResponse({ ok: false, error: 'Unknown message' });
      return;
    }

    switch (message.type) {
      case 'POPUP_ENSURE_READY':
        await syncBackgroundRuntime();
        sendResponse({ ok: true });
        return;
      case 'OPEN_APP_WINDOW':
        await openAppWindow(message.payload);
        sendResponse({ ok: true });
        return;
      case 'APP_WINDOW_READY':
        appWindowId = message.payload.windowId;
        sendResponse({ ok: true });
        return;
      case 'TOGGLE_APP_WINDOW_MAXIMIZED':
        sendResponse({ ok: true, maximized: await toggleAppWindowMaximized() });
        return;
      case 'APP_WINDOW_CLOSED':
        appWindowId = null;
        sendResponse({ ok: true });
        return;
      case 'POPUP_START_TIMER':
        sendResponse({
          ok: true,
          timerState: await enqueueTimerOperation(() =>
            handleStartTimer(message.payload.mode, message.payload.startedAt)
          )
        });
        return;
      case 'POPUP_PAUSE_TIMER':
        sendResponse({
          ok: true,
          timerState: await enqueueTimerOperation(handlePauseTimer)
        });
        return;
      case 'POPUP_RESET_TIMER':
        sendResponse({
          ok: true,
          timerState: await enqueueTimerOperation(handleResetTimer)
        });
        return;
      case 'POPUP_SKIP_SHORT_BREAK':
        sendResponse({
          ok: true,
          timerState: await enqueueTimerOperation(handleSkipShortBreak)
        });
        return;
      case 'DELETE_TASK_STATISTICS': {
        const result = await enqueueTimerOperation(() =>
          handleDeleteTaskStatistics(message.payload.taskId)
        );
        sendResponse({ ok: true, ...result });
        return;
      }
      case 'SAVE_FOCUS_REVIEW_GOALS': {
        const result = await enqueueTimerOperation(() =>
          handleSaveFocusReviewGoals(message.payload)
        );
        sendResponse({ ok: true, ...result });
        return;
      }
      case 'IMPORT_USER_DATA': {
        const data = await enqueueTimerOperation(() => importStoredData(message.payload.raw));
        invalidateFocusMusicPlayback(true);
        await clearAlarm();
        await requestFocusMusicReconcileBounded(true);
        sendResponse({ ok: true, data });
        return;
      }
      case 'SELECT_FOCUS_MODE':
      case 'CREATE_FOCUS_MODE':
      case 'UPDATE_FOCUS_MODE':
      case 'DELETE_FOCUS_MODE':
      case 'SET_TASK_FOCUS_MODE':
      case 'SAVE_MANUAL_SETTINGS':
      case 'SAVE_FOCUS_MUSIC_SETTINGS': {
        const result = await enqueueTimerOperation(() => handleFocusModeMutation(message));
        if (message.type === 'SAVE_FOCUS_MUSIC_SETTINGS') {
          await requestFocusMusicReconcileBounded(result.settings?.focusMusicEnabled === false);
        }
        sendResponse({ ok: true, ...result });
        return;
      }
      case 'SELECT_TASK':
      case 'ADD_TASK':
      case 'UPDATE_TASK':
      case 'DELETE_TASK':
      case 'ARCHIVE_TASK':
      case 'RESTORE_TASK': {
        const result = await enqueueTimerOperation(() => handleTaskMutation(message));
        sendResponse({ ok: true, ...result });
        return;
      }
      default:
        sendResponse({ ok: true, ignored: true });
    }
  };

  respond().catch((error) => {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  });

  return true;
});
