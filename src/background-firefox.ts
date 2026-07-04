import { NO_TASK_ID } from './lib/constants';
import { getTimerModeLabel, resolveLocale, t } from './lib/i18n';
import {
  COMPLETION_CHIME_DURATION_MS,
  getLastCompletionChimeError,
  playCompletionChime,
  primeCompletionAudio
} from './lib/completionChime';
import {
  addSessionStatistics,
  ensureNoTask,
  getDurationSeconds,
  getNextTimerRevision,
  getRunningDisplaySeconds,
  getStartDurationSeconds,
  getStartTargetEndTime,
  readStoredData,
  setLocal,
  sortTasks
} from './lib/storage';
import { Locale, RuntimeMessage, TimerMode, TimerState } from './lib/types';

const COMPLETION_ALARM = 'pomodoro-cult-completion';
const COMPLETION_NOTIFICATION_DELAY_MS = 500;
const COMPLETION_NOTIFICATION_PREFIX = 'pomodoro-cult-completion-';
const APP_WINDOW_URL = 'app.html';
const APP_WINDOW_WIDTH = 1040;
const APP_WINDOW_HEIGHT = 760;

let completionInFlight: Promise<void> | null = null;
let lastCompletedKey: string | null = null;
let timerOperationQueue: Promise<void> = Promise.resolve();
let appWindowId: number | null = null;
let appWindowOpenPromise: Promise<void> | null = null;

const enqueueTimerOperation = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = timerOperationQueue.then(operation, operation);
  timerOperationQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
};

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

      const nextState = currentWindow.state === 'fullscreen' ? 'normal' : 'fullscreen';

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
  activeTaskId: string | null
): TimerState => ({
  ...timerState,
  isRunning: true,
  isPaused: false,
  cycleStarted: true,
  revision: getNextTimerRevision(timerState),
  currentMode: mode,
  remainingSeconds: durationSeconds,
  targetEndTime,
  activeTaskId
});

const handleStartTimer = async (mode: TimerMode, startedAt: number): Promise<TimerState> => {
  const data = await readStoredData();
  const { settings } = data;
  let { tasks, timerState } = data;

  if (timerState.isRunning && timerState.targetEndTime) {
    await createAlarm(timerState.targetEndTime);
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

  const durationSeconds = getStartDurationSeconds(settings, timerState, mode);
  const targetEndTime = getStartTargetEndTime(settings, timerState, mode, startedAt);
  const nextState = buildRunningState(
    timerState,
    mode,
    durationSeconds,
    targetEndTime,
    activeTaskId ?? null
  );

  await setLocal({
    tasks: nextTasks,
    timerState: nextState
  });

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
  return nextState;
};

const handleResetTimer = async (): Promise<TimerState> => {
  const { settings, timerState: storedTimerState } = await readStoredData();
  const timerState =
    storedTimerState.isRunning &&
    storedTimerState.targetEndTime &&
    storedTimerState.targetEndTime <= Date.now()
      ? await handleTimerCompleted({
          ...storedTimerState,
          remainingSeconds: 0
        })
      : storedTimerState;
  const nextState: TimerState = {
    ...timerState,
    isRunning: false,
    isPaused: false,
    cycleStarted: false,
    revision: getNextTimerRevision(timerState),
    currentMode: 'work',
    remainingSeconds: getDurationSeconds(settings, 'work'),
    targetEndTime: null,
    completedSessions: 0
  };

  await setLocal({ timerState: nextState });
  await clearAlarm();
  return nextState;
};

const handleSkipShortBreak = async (): Promise<TimerState> => {
  const { settings, timerState } = await readStoredData();

  if (timerState.currentMode !== 'shortBreak') {
    return timerState;
  }

  const nextState: TimerState = {
    ...timerState,
    isRunning: false,
    isPaused: false,
    revision: getNextTimerRevision(timerState),
    currentMode: 'work',
    remainingSeconds: getDurationSeconds(settings, 'work'),
    targetEndTime: null
  };

  await setLocal({ timerState: nextState });
  await clearAlarm();
  return nextState;
};

const handleTimerCompleted = async (timerState: TimerState): Promise<TimerState> => {
  const data = await readStoredData();
  const { settings } = data;
  let { tasks, statistics } = data;

  if (!timerState.isRunning) {
    return timerState;
  }

  if (timerState.currentMode === 'work') {
    tasks = ensureNoTask(tasks);
    const activeTaskId = timerState.activeTaskId ?? NO_TASK_ID;
    const activeTask = tasks.find((task) => task.id === activeTaskId);
    const taskTitle = activeTask?.title ?? '';
    const completedSessions = timerState.completedSessions + 1;
    const nextMode =
      completedSessions % settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak';
    const nextDuration = getDurationSeconds(settings, nextMode);
    const nextTargetEndTime = settings.autoStartBreaks ? Date.now() + nextDuration * 1000 : null;

    statistics = addSessionStatistics(
      statistics,
      activeTaskId,
      taskTitle,
      getDurationSeconds(settings, 'work')
    );

    const nextState: TimerState = {
      ...timerState,
      isRunning: settings.autoStartBreaks,
      isPaused: false,
      revision: getNextTimerRevision(timerState),
      currentMode: nextMode,
      remainingSeconds: nextDuration,
      targetEndTime: nextTargetEndTime,
      activeTaskId,
      completedSessions
    };

    await setLocal({
      tasks,
      statistics,
      timerState: nextState
    });

    if (nextTargetEndTime) {
      await createAlarm(nextTargetEndTime);
    }

    return nextState;
  }

  const nextState: TimerState = {
    ...timerState,
    isRunning: false,
    isPaused: false,
    revision: getNextTimerRevision(timerState),
    currentMode: 'work',
    remainingSeconds: getDurationSeconds(settings, 'work'),
    targetEndTime: null,
    activeTaskId: timerState.activeTaskId
  };

  await setLocal({ timerState: nextState });
  return nextState;
};

const completeExpiredTimer = async (): Promise<void> => {
  if (completionInFlight) {
    await completionInFlight;
    return;
  }

  completionInFlight = (async () => {
    const completion = await enqueueTimerOperation(async () => {
      const { timerState } = await readStoredData();

      if (!timerState.isRunning || !timerState.targetEndTime) {
        await clearAlarm();
        return null;
      }

      if (timerState.targetEndTime > Date.now()) {
        await createAlarm(timerState.targetEndTime);
        return null;
      }

      const completionKey = `${timerState.currentMode}:${timerState.targetEndTime}:${timerState.completedSessions}`;
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
    });

    if (!completion) return;

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
  })();

  try {
    await completionInFlight;
  } finally {
    completionInFlight = null;
  }
};

const resumeRunningTimer = async (): Promise<void> => {
  const { timerState } = await readStoredData();

  if (!timerState.isRunning || !timerState.targetEndTime) {
    await clearAlarm();
    return;
  }

  if (timerState.targetEndTime <= Date.now()) {
    await completeExpiredTimer();
    return;
  }

  await createAlarm(timerState.targetEndTime);
};

chrome.runtime.onInstalled.addListener(() => {
  void resumeRunningTimer();
});

chrome.runtime.onStartup.addListener(() => {
  void resumeRunningTimer();
});

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
        await resumeRunningTimer();
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

void resumeRunningTimer();
