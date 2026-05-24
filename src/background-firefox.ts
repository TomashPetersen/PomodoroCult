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
  getRunningDisplaySeconds,
  getStartDurationSeconds,
  getStartTargetEndTime,
  initializeStorage,
  readStoredData,
  setLocal,
  sortTasks
} from './lib/storage';
import { Locale, RuntimeMessage, TimerMode, TimerState } from './lib/types';

const COMPLETION_ALARM = 'pomodoro-cult-completion';
const COMPLETION_NOTIFICATION_DELAY_MS = 500;

let completionInFlight: Promise<void> | null = null;
let lastCompletedKey: string | null = null;

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
      `pomodoro-cult-${Date.now()}`,
      {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/firefox-icon-128.png'),
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

const buildRunningState = (
  timerState: TimerState,
  mode: TimerMode,
  durationSeconds: number,
  targetEndTime: number,
  activeTaskId: string | null
): TimerState => ({
  ...timerState,
  isRunning: true,
  currentMode: mode,
  remainingSeconds: durationSeconds,
  targetEndTime,
  activeTaskId
});

const handleStartTimer = async (mode: TimerMode, startedAt: number): Promise<TimerState> => {
  const data = await initializeStorage();
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

  const remainingSeconds = timerState.targetEndTime
    ? getRunningDisplaySeconds(timerState.targetEndTime)
    : timerState.remainingSeconds;
  const nextState: TimerState = {
    ...timerState,
    isRunning: false,
    remainingSeconds,
    targetEndTime: null
  };

  await setLocal({ timerState: nextState });
  await clearAlarm();
  return nextState;
};

const handleResetTimer = async (): Promise<TimerState> => {
  const { settings, timerState } = await readStoredData();
  const nextState: TimerState = {
    ...timerState,
    isRunning: false,
    currentMode: 'work',
    remainingSeconds: getDurationSeconds(settings, 'work'),
    targetEndTime: null,
    completedSessions: 0
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

    statistics = addSessionStatistics(
      statistics,
      activeTaskId,
      taskTitle,
      getDurationSeconds(settings, 'work')
    );

    const nextState: TimerState = {
      ...timerState,
      isRunning: false,
      currentMode: nextMode,
      remainingSeconds: nextDuration,
      targetEndTime: null,
      activeTaskId,
      completedSessions
    };

    await setLocal({
      tasks,
      statistics,
      timerState: nextState
    });

    return nextState;
  }

  const nextState: TimerState = {
    ...timerState,
    isRunning: false,
    currentMode: 'work',
    remainingSeconds: getDurationSeconds(settings, 'work'),
    targetEndTime: null,
    activeTaskId: timerState.activeTaskId
  };

  await setLocal({ timerState: nextState });
  return nextState;
};

const completeExpiredTimer = async (): Promise<void> => {
  const { timerState } = await readStoredData();

  if (!timerState.isRunning || !timerState.targetEndTime) {
    await clearAlarm();
    return;
  }

  if (timerState.targetEndTime > Date.now()) {
    await createAlarm(timerState.targetEndTime);
    return;
  }
  const completionKey = `${timerState.currentMode}:${timerState.targetEndTime}:${timerState.completedSessions}`;

  if (lastCompletedKey === completionKey) {
    await clearAlarm();
    return;
  }

  if (completionInFlight) {
    await completionInFlight;
    return;
  }

  completionInFlight = (async () => {
    await clearAlarm();
    const completedMode = timerState.currentMode;
    const completedState = await handleTimerCompleted({
      ...timerState,
      remainingSeconds: 0
    });

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
    await showCompletionNotification(completedMode, completedState.currentMode);
    lastCompletedKey = completionKey;
  })();

  try {
    await completionInFlight;
  } finally {
    completionInFlight = null;
  }
};

const resumeRunningTimer = async (): Promise<void> => {
  const { timerState } = await initializeStorage();

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
      case 'POPUP_START_TIMER':
        sendResponse({
          ok: true,
          timerState: await handleStartTimer(message.payload.mode, message.payload.startedAt)
        });
        return;
      case 'POPUP_PAUSE_TIMER':
        sendResponse({ ok: true, timerState: await handlePauseTimer() });
        return;
      case 'POPUP_RESET_TIMER':
        sendResponse({ ok: true, timerState: await handleResetTimer() });
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
