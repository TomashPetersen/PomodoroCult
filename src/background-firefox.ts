import { NO_TASK_ID } from './lib/constants';
import { playCompletionChime } from './lib/completionChime';
import {
  addSessionStatistics,
  ensureNoTask,
  getDurationSeconds,
  initializeStorage,
  readStoredData,
  setLocal,
  sortTasks
} from './lib/storage';
import { RuntimeMessage, TimerMode, TimerState } from './lib/types';

let intervalId: number | null = null;
let tickInProgress = false;

const clearTimer = (): void => {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
};

const startTicking = (): void => {
  clearTimer();
  intervalId = window.setInterval(() => {
    void tick();
  }, 1000);
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

const handleStartTimer = async (mode: TimerMode): Promise<TimerState> => {
  const data = await initializeStorage();
  const { settings } = data;
  let { tasks, timerState } = data;

  if (timerState.isRunning) {
    startTicking();
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
  const targetEndTime = Date.now() + durationSeconds * 1000;
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

  startTicking();
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

  clearTimer();
  await setLocal({ timerState: nextState });
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

  clearTimer();
  await setLocal({ timerState: nextState });
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

const tick = async (): Promise<void> => {
  if (tickInProgress) return;
  tickInProgress = true;

  try {
    const { timerState } = await readStoredData();

    if (!timerState.isRunning || !timerState.targetEndTime) {
      clearTimer();
      return;
    }

    const remainingSeconds = Math.max(0, Math.ceil((timerState.targetEndTime - Date.now()) / 1000));

    if (remainingSeconds > 0) {
      await setLocal({
        timerState: {
          ...timerState,
          remainingSeconds
        }
      });
      return;
    }

    clearTimer();
    const completedState = await handleTimerCompleted({
      ...timerState,
      remainingSeconds: 0
    });
    await playCompletionChime();

    if (completedState.isRunning && completedState.targetEndTime) {
      startTicking();
    }
  } finally {
    tickInProgress = false;
  }
};

const resumeRunningTimer = async (): Promise<void> => {
  const { timerState } = await initializeStorage();

  if (!timerState.isRunning || !timerState.targetEndTime) {
    clearTimer();
    return;
  }

  await tick();

  const { timerState: refreshedState } = await readStoredData();
  if (refreshedState.isRunning && refreshedState.targetEndTime) {
    startTicking();
  }
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
