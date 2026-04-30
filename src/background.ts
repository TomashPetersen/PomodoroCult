import { NO_TASK_ID, NO_TASK_TITLE } from './lib/constants';
import {
  addSessionStatistics,
  ensureNoTask,
  getDurationSeconds,
  initializeStorage,
  readStoredData,
  setLocal,
  sortTasks
} from './lib/storage';
import { RuntimeMessage, StartTimerPayload, TimerMode, TimerState } from './lib/types';

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

let creatingOffscreenDocument: Promise<void> | null = null;

const sendMessage = (message: RuntimeMessage): Promise<void> =>
  new Promise((resolve) => {
    chrome.runtime.sendMessage(message, () => {
      void chrome.runtime.lastError;
      resolve();
    });
  });

const hasOffscreenDocument = async (): Promise<boolean> => {
  if (chrome.offscreen?.hasDocument) {
    return chrome.offscreen.hasDocument();
  }

  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  const workerClients = (
    globalThis as unknown as {
      clients?: { matchAll: () => Promise<Array<{ url: string }>> };
    }
  ).clients;
  if (!workerClients) return false;

  const matchedClients = await workerClients.matchAll();
  return matchedClients.some((client) => client.url === offscreenUrl);
};

const createOffscreenDocument = async (): Promise<void> => {
  if (await hasOffscreenDocument()) return;

  if (!creatingOffscreenDocument) {
    const reasonSets = [
      ['WORKERS', 'AUDIO_PLAYBACK'],
      ['DOM_PARSER', 'AUDIO_PLAYBACK'],
      ['DOM_PARSER']
    ];

    creatingOffscreenDocument = (async () => {
      let lastError: unknown;

      for (const reasons of reasonSets) {
        try {
          await chrome.offscreen.createDocument({
            url: OFFSCREEN_DOCUMENT_PATH,
            reasons: reasons as unknown as chrome.offscreen.Reason[],
            justification:
              'Runs the precise Pomodoro countdown outside the MV3 service worker and plays a completion chime.'
          });
          return;
        } catch (error) {
          lastError = error;
          if (await hasOffscreenDocument()) return;
        }
      }

      throw lastError;
    })().finally(() => {
      creatingOffscreenDocument = null;
    });
  }

  await creatingOffscreenDocument;
};

const startOffscreenTimer = async (payload: StartTimerPayload): Promise<void> => {
  await createOffscreenDocument();
  await sendMessage({ type: 'OFFSCREEN_START_TIMER', payload });
};

const stopOffscreenTimer = async (): Promise<void> => {
  if (await hasOffscreenDocument()) {
    await sendMessage({ type: 'OFFSCREEN_STOP_TIMER' });
  }
};

const resumeRunningTimer = async (): Promise<void> => {
  const { timerState } = await initializeStorage();

  if (!timerState.isRunning) return;

  await createOffscreenDocument();
  await sendMessage({ type: 'OFFSCREEN_RESUME_TIMER' });
};

const buildRunningState = (
  timerState: TimerState,
  mode: TimerMode,
  durationSeconds: number,
  activeTaskId: string | null
): TimerState => ({
  ...timerState,
  isRunning: true,
  currentMode: mode,
  remainingSeconds: durationSeconds,
  targetEndTime: null,
  activeTaskId
});

const handleStartTimer = async (mode: TimerMode): Promise<TimerState> => {
  const data = await initializeStorage();
  const { settings } = data;
  let { tasks, timerState } = data;

  if (timerState.isRunning) {
    await createOffscreenDocument();
    await sendMessage({ type: 'OFFSCREEN_RESUME_TIMER' });
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

  const durationSeconds =
    timerState.currentMode === mode && timerState.remainingSeconds > 0
      ? timerState.remainingSeconds
      : getDurationSeconds(settings, mode);
  const nextState = buildRunningState(timerState, mode, durationSeconds, activeTaskId ?? null);

  await setLocal({
    tasks: nextTasks,
    timerState: nextState
  });
  await startOffscreenTimer({
    mode,
    durationSeconds,
    activeTaskId: activeTaskId ?? null,
    statSeconds: getDurationSeconds(settings, mode)
  });

  return nextState;
};

const handlePauseTimer = async (): Promise<TimerState> => {
  const { timerState } = await readStoredData();

  if (!timerState.isRunning) {
    return timerState;
  }

  const remainingSeconds = timerState.targetEndTime
    ? Math.max(0, Math.ceil((timerState.targetEndTime - Date.now()) / 1000))
    : timerState.remainingSeconds;
  const nextState: TimerState = {
    ...timerState,
    isRunning: false,
    remainingSeconds,
    targetEndTime: null
  };

  await setLocal({ timerState: nextState });
  await sendMessage({ type: 'OFFSCREEN_PAUSE_TIMER' });
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
  await stopOffscreenTimer();
  return nextState;
};

const handleTimerCompleted = async (
  payload: Extract<RuntimeMessage, { type: 'TIMER_COMPLETED' }>['payload']
): Promise<TimerState> => {
  const data = await readStoredData();
  const { settings } = data;
  let { tasks, statistics, timerState } = data;

  if (!timerState.isRunning || timerState.currentMode !== payload.mode) {
    return timerState;
  }

  if (payload.mode === 'work') {
    tasks = ensureNoTask(tasks);
    const activeTaskId = timerState.activeTaskId ?? payload.activeTaskId ?? NO_TASK_ID;
    const activeTask = tasks.find((task) => task.id === activeTaskId);
    const taskTitle = activeTask?.title ?? NO_TASK_TITLE;
    const completedSessions = timerState.completedSessions + 1;
    const nextMode =
      completedSessions % settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak';
    const nextDuration = getDurationSeconds(settings, nextMode);

    statistics = addSessionStatistics(
      statistics,
      activeTaskId,
      taskTitle,
      payload.statSeconds || getDurationSeconds(settings, 'work')
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

chrome.runtime.onInstalled.addListener(() => {
  void resumeRunningTimer();
});

chrome.runtime.onStartup.addListener(() => {
  void resumeRunningTimer();
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
        sendResponse({ ok: true, timerState: await handleStartTimer(message.payload.mode) });
        return;
      case 'POPUP_PAUSE_TIMER':
        sendResponse({ ok: true, timerState: await handlePauseTimer() });
        return;
      case 'POPUP_RESET_TIMER':
        sendResponse({ ok: true, timerState: await handleResetTimer() });
        return;
      case 'TIMER_COMPLETED':
        sendResponse({ ok: true, timerState: await handleTimerCompleted(message.payload) });
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
