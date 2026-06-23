import {
  getDurationSeconds,
  getNextTimerRevision,
  getRunningDisplaySeconds,
  readStoredData,
  setLocal
} from './lib/storage';
import { playCompletionChime } from './lib/completionChime';
import { RuntimeMessage, StartTimerPayload, TimerMode, TimerState } from './lib/types';

let intervalId: number | null = null;
let targetEndTime: number | null = null;
let activePayload: StartTimerPayload | null = null;
let tickInProgress = false;

const clearTimer = (): void => {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
};

const runtimeSendMessage = (message: RuntimeMessage): Promise<void> =>
  new Promise((resolve) => {
    chrome.runtime.sendMessage(message, () => {
      void chrome.runtime.lastError;
      resolve();
    });
  });

const writeTimerState = async (patch: Partial<TimerState>): Promise<TimerState> => {
  const { timerState } = await readStoredData();
  const nextState: TimerState = {
    ...timerState,
    revision: getNextTimerRevision(timerState),
    ...patch
  };

  await setLocal({ timerState: nextState });
  return nextState;
};

const completeTimer = async (): Promise<void> => {
  if (!activePayload) return;

  const completedPayload = activePayload;
  clearTimer();
  targetEndTime = null;
  activePayload = null;

  try {
    await playCompletionChime();
  } catch (error) {
    console.warn(
      'Completion audio failed:',
      error instanceof Error ? error.message : String(error)
    );
  }
  await runtimeSendMessage({
    type: 'TIMER_COMPLETED',
    payload: {
      mode: completedPayload.mode,
      activeTaskId: completedPayload.activeTaskId,
      durationSeconds: completedPayload.durationSeconds,
      statSeconds: completedPayload.statSeconds
    }
  });
};

const tick = async (): Promise<void> => {
  if (!targetEndTime || !activePayload || tickInProgress) return;
  tickInProgress = true;

  try {
    const remainingSeconds = getRunningDisplaySeconds(targetEndTime);

    await writeTimerState({
      isRunning: true,
      currentMode: activePayload.mode,
      remainingSeconds,
      targetEndTime,
      activeTaskId: activePayload.activeTaskId
    });

    if (remainingSeconds <= 0) {
      await completeTimer();
    }
  } finally {
    tickInProgress = false;
  }
};

const startTimer = async (payload: StartTimerPayload): Promise<void> => {
  clearTimer();

  activePayload = payload;
  targetEndTime = payload.targetEndTime;

  await writeTimerState({
    isRunning: true,
    isPaused: false,
    cycleStarted: true,
    currentMode: payload.mode,
    remainingSeconds: payload.durationSeconds,
    targetEndTime,
    activeTaskId: payload.activeTaskId
  });

  await tick();
  intervalId = window.setInterval(() => {
    void tick();
  }, 1000);
};

const pauseTimer = async (): Promise<void> => {
  const remainingSeconds = targetEndTime
    ? getRunningDisplaySeconds(targetEndTime)
    : undefined;

  clearTimer();
  targetEndTime = null;
  activePayload = null;

  await writeTimerState({
    isRunning: false,
    isPaused: true,
    ...(remainingSeconds !== undefined ? { remainingSeconds } : {}),
    targetEndTime: null
  });
};

const stopTimer = async (): Promise<void> => {
  clearTimer();
  targetEndTime = null;
  activePayload = null;
};

const resumeTimer = async (): Promise<void> => {
  const { settings, timerState } = await readStoredData();

  if (!timerState.isRunning || !timerState.targetEndTime) return;

  clearTimer();
  targetEndTime = timerState.targetEndTime;
  activePayload = {
    mode: timerState.currentMode,
    durationSeconds: timerState.remainingSeconds,
    targetEndTime: timerState.targetEndTime,
    activeTaskId: timerState.activeTaskId,
    statSeconds: getDurationSeconds(settings, timerState.currentMode)
  };

  await tick();

  if (activePayload) {
    intervalId = window.setInterval(() => {
      void tick();
    }, 1000);
  }
};

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  const respond = async (): Promise<void> => {
    switch (message.type) {
      case 'OFFSCREEN_START_TIMER':
        await startTimer(message.payload);
        sendResponse({ ok: true });
        return;
      case 'OFFSCREEN_PAUSE_TIMER':
        await pauseTimer();
        sendResponse({ ok: true });
        return;
      case 'OFFSCREEN_STOP_TIMER':
        await stopTimer();
        sendResponse({ ok: true });
        return;
      case 'OFFSCREEN_RESUME_TIMER':
        await resumeTimer();
        sendResponse({ ok: true });
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

void resumeTimer();
