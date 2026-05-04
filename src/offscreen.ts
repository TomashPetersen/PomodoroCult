import { getDurationSeconds, readStoredData, setLocal } from './lib/storage';
import { RuntimeMessage, StartTimerPayload, TimerMode, TimerState } from './lib/types';

let intervalId: number | null = null;
let targetEndTime: number | null = null;
let activePayload: StartTimerPayload | null = null;
let tickInProgress = false;
let fallbackChimeUrl: string | null = null;

const COMPLETION_CHIME_PATH = 'sounds/completion-chime.mp3';

const clearTimer = (): void => {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
};

const createFallbackChimeUrl = (): string => {
  const sampleRate = 44100;
  const durationSeconds = 0.65;
  const frameCount = Math.floor(sampleRate * durationSeconds);
  const headerBytes = 44;
  const dataBytes = frameCount * 2;
  const buffer = new ArrayBuffer(headerBytes + dataBytes);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string): void => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataBytes, true);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const t = frame / sampleRate;
    const envelope = Math.min(1, t / 0.04) * Math.min(1, (durationSeconds - t) / 0.16);
    const firstTone = Math.sin(2 * Math.PI * 660 * t);
    const secondTone = Math.sin(2 * Math.PI * 880 * t) * (t > 0.22 ? 0.72 : 0);
    const sample = Math.max(-1, Math.min(1, (firstTone + secondTone) * 0.26 * envelope));
    view.setInt16(headerBytes + frame * 2, sample * 0x7fff, true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
};

const getCompletionChimeUrl = (): string =>
  chrome.runtime?.getURL?.(COMPLETION_CHIME_PATH) ?? COMPLETION_CHIME_PATH;

const playAudio = async (src: string, volume: number): Promise<void> => {
  const audio = new Audio(src);
  audio.volume = volume;
  await audio.play();
};

const playCompletionChime = async (): Promise<void> => {
  try {
    await playAudio(getCompletionChimeUrl(), 0.92);
  } catch {
    fallbackChimeUrl ??= createFallbackChimeUrl();

    try {
      await playAudio(fallbackChimeUrl, 0.8);
    } catch {
      // Chrome may reject playback in unusual extension states; the timer state still advances.
    }
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

  await playCompletionChime();
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
    const remainingSeconds = Math.max(
      0,
      Math.ceil((targetEndTime - Date.now()) / 1000)
    );

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
  targetEndTime = Date.now() + payload.durationSeconds * 1000;

  await writeTimerState({
    isRunning: true,
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
    ? Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000))
    : undefined;

  clearTimer();
  targetEndTime = null;
  activePayload = null;

  await writeTimerState({
    isRunning: false,
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
