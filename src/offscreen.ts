import {
  getDurationSeconds,
  getRunningDisplaySeconds,
  readStoredData
} from './lib/storage';
import { playCompletionChime } from './lib/completionChime';
import { RuntimeMessage, StartTimerPayload } from './lib/types';

let intervalId: number | null = null;
let targetEndTime: number | null = null;
let activePayload: StartTimerPayload | null = null;
let tickInProgress = false;
let timerGeneration = 0;

interface TimerCompletionResponse {
  ok?: boolean;
  completed?: boolean;
}

const clearTimer = (): void => {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
};

const runtimeSendMessage = <T>(message: RuntimeMessage): Promise<T | undefined> =>
  new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: T | undefined) => {
      const error = chrome.runtime.lastError;
      resolve(error ? undefined : response);
    });
  });

const completeTimer = async (
  expectedGeneration: number,
  expectedPayload: StartTimerPayload
): Promise<void> => {
  if (
    timerGeneration !== expectedGeneration ||
    activePayload?.cycleId !== expectedPayload.cycleId
  ) {
    return;
  }

  clearTimer();
  targetEndTime = null;
  activePayload = null;

  const response = await runtimeSendMessage<TimerCompletionResponse>({
    type: 'TIMER_COMPLETED',
    payload: {
      mode: expectedPayload.mode,
      activeTaskId: expectedPayload.activeTaskId,
      durationSeconds: expectedPayload.durationSeconds,
      statSeconds: expectedPayload.statSeconds,
      cycleId: expectedPayload.cycleId
    }
  });

  if (!response?.ok || !response.completed) return;

  try {
    await playCompletionChime();
  } catch (error) {
    console.warn(
      'Completion audio failed:',
      error instanceof Error ? error.message : String(error)
    );
  }
};

const tick = async (): Promise<void> => {
  if (!targetEndTime || !activePayload || tickInProgress) return;
  tickInProgress = true;
  const expectedGeneration = timerGeneration;
  const expectedTargetEndTime = targetEndTime;
  const expectedPayload = activePayload;

  try {
    const remainingSeconds = getRunningDisplaySeconds(expectedTargetEndTime);

    if (
      remainingSeconds <= 0 &&
      timerGeneration === expectedGeneration &&
      activePayload?.cycleId === expectedPayload.cycleId &&
      targetEndTime === expectedTargetEndTime
    ) {
      await completeTimer(expectedGeneration, expectedPayload);
    }
  } finally {
    tickInProgress = false;
  }
};

const startTimer = async (payload: StartTimerPayload): Promise<void> => {
  timerGeneration += 1;
  clearTimer();

  activePayload = payload;
  targetEndTime = payload.targetEndTime;

  await tick();
  if (activePayload?.cycleId === payload.cycleId) {
    intervalId = window.setInterval(() => {
      void tick();
    }, 1000);
  }
};

const pauseTimer = async (): Promise<void> => {
  timerGeneration += 1;
  clearTimer();
  targetEndTime = null;
  activePayload = null;
};

const stopTimer = async (): Promise<void> => {
  timerGeneration += 1;
  clearTimer();
  targetEndTime = null;
  activePayload = null;
};

const resumeTimer = async (): Promise<void> => {
  timerGeneration += 1;
  const expectedGeneration = timerGeneration;
  const { settings, timerState } = await readStoredData();

  if (
    timerGeneration !== expectedGeneration ||
    !timerState.isRunning ||
    !timerState.targetEndTime ||
    !timerState.cycleId
  ) {
    return;
  }

  clearTimer();
  targetEndTime = timerState.targetEndTime;
  activePayload = {
    mode: timerState.currentMode,
    durationSeconds: timerState.remainingSeconds,
    targetEndTime: timerState.targetEndTime,
    activeTaskId: timerState.activeTaskId,
    cycleId: timerState.cycleId,
    statSeconds: getDurationSeconds(settings, timerState.currentMode)
  };

  await tick();

  if (activePayload?.cycleId === timerState.cycleId) {
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
