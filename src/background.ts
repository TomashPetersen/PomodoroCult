import { NO_TASK_ID } from './lib/constants';
import {
  addSessionStatistics,
  createCycleId,
  createSessionEvent,
  ensureNoTask,
  getDurationSeconds,
  getNextTimerRevision,
  getRunningDisplaySeconds,
  getStartDurationSeconds,
  getStartTargetEndTime,
  initializeStorage,
  isResumingPausedTimer,
  readStoredData,
  removeTaskSessionEvents,
  removeTaskStatistics,
  setLocal,
  sortTasks
} from './lib/storage';
import { RuntimeMessage, StartTimerPayload, TimerMode, TimerState } from './lib/types';

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

interface TimerCompletionResult {
  timerState: TimerState;
  completed: boolean;
}

let creatingOffscreenDocument: Promise<void> | null = null;
let timerOperationQueue: Promise<void> = Promise.resolve();

const enqueueTimerOperation = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = timerOperationQueue.then(operation, operation);
  timerOperationQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
};

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

  if (!timerState.isRunning) return;

  await createOffscreenDocument();
  await sendMessage({ type: 'OFFSCREEN_RESUME_TIMER' });
};

const buildRunningState = (
  timerState: TimerState,
  mode: TimerMode,
  durationSeconds: number,
  targetEndTime: number,
  activeTaskId: string | null,
  cycleId: string,
  cycleStartedAt: number | null
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
  activeTaskId
});

const handleStartTimer = async (mode: TimerMode, startedAt: number): Promise<TimerState> => {
  const data = await readStoredData();
  const { settings } = data;
  let { tasks, timerState } = data;

  if (timerState.isRunning) {
    if (!timerState.cycleId) {
      timerState = {
        ...timerState,
        cycleId: createCycleId(),
        revision: getNextTimerRevision(timerState)
      };
      await setLocal({ timerState });
    }
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

  const durationSeconds = getStartDurationSeconds(settings, timerState, mode);
  const targetEndTime = getStartTargetEndTime(settings, timerState, mode, startedAt);
  const isResume = isResumingPausedTimer(settings, timerState, mode);
  const cycleId = isResume && timerState.cycleId ? timerState.cycleId : createCycleId();
  const cycleStartedAt = isResume ? timerState.cycleStartedAt : startedAt;
  const nextState = buildRunningState(
    timerState,
    mode,
    durationSeconds,
    targetEndTime,
    activeTaskId ?? null,
    cycleId,
    cycleStartedAt
  );

  await setLocal({
    tasks: nextTasks,
    timerState: nextState
  });
  await startOffscreenTimer({
    mode,
    durationSeconds,
    targetEndTime,
    activeTaskId: activeTaskId ?? null,
    cycleId,
    statSeconds: getDurationSeconds(settings, mode)
  });

  return nextState;
};

const handlePauseTimer = async (): Promise<TimerState> => {
  const { timerState } = await readStoredData();

  if (!timerState.isRunning) {
    return timerState;
  }

  if (timerState.targetEndTime && timerState.targetEndTime <= Date.now()) {
    await stopOffscreenTimer();
    return (await handleTimerCompleted({
      mode: timerState.currentMode,
      activeTaskId: timerState.activeTaskId,
      durationSeconds: 0,
      statSeconds: 0,
      cycleId: timerState.cycleId ?? ''
    })).timerState;
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

  await sendMessage({ type: 'OFFSCREEN_PAUSE_TIMER' });
  await setLocal({ timerState: nextState });
  return nextState;
};

const handleResetTimer = async (): Promise<TimerState> => {
  const { settings, timerState: storedTimerState } = await readStoredData();
  const timerState =
    storedTimerState.isRunning &&
    storedTimerState.targetEndTime &&
    storedTimerState.targetEndTime <= Date.now()
      ? (await handleTimerCompleted({
          mode: storedTimerState.currentMode,
          activeTaskId: storedTimerState.activeTaskId,
          durationSeconds: 0,
          statSeconds: 0,
          cycleId: storedTimerState.cycleId ?? ''
        })).timerState
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
    cycleId: null,
    cycleStartedAt: null,
    completedSessions: 0
  };

  await stopOffscreenTimer();
  await setLocal({ timerState: nextState });
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
    targetEndTime: null,
    cycleId: null,
    cycleStartedAt: null
  };

  await stopOffscreenTimer();
  await setLocal({ timerState: nextState });
  return nextState;
};

const handleTimerCompleted = async (
  payload: Extract<RuntimeMessage, { type: 'TIMER_COMPLETED' }>['payload']
): Promise<TimerCompletionResult> => {
  const data = await readStoredData();
  const { settings } = data;
  let { tasks, statistics, sessionEvents, timerState } = data;

  if (
    !timerState.isRunning ||
    timerState.currentMode !== payload.mode ||
    !timerState.cycleId ||
    timerState.cycleId !== payload.cycleId
  ) {
    return { timerState, completed: false };
  }

  if (payload.mode === 'work') {
    tasks = ensureNoTask(tasks);
    const activeTaskId = timerState.activeTaskId ?? payload.activeTaskId ?? NO_TASK_ID;
    const activeTask = tasks.find((task) => task.id === activeTaskId);
    const taskTitle = activeTask?.title ?? '';
    const completedSessions = timerState.completedSessions + 1;
    const nextMode =
      completedSessions % settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak';
    const nextDuration = getDurationSeconds(settings, nextMode);
    const completedAt = Date.now();
    const durationSeconds = payload.statSeconds || getDurationSeconds(settings, 'work');
    const nextTargetEndTime = settings.autoStartBreaks
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
        focusModeId: null,
        cycleStartedAt: timerState.cycleStartedAt,
        completedAt,
        durationSeconds
      })
    ];

    const nextState: TimerState = {
      ...timerState,
      isRunning: settings.autoStartBreaks,
      isPaused: false,
      revision: getNextTimerRevision(timerState),
      currentMode: nextMode,
      remainingSeconds: nextDuration,
      targetEndTime: nextTargetEndTime,
      cycleId: nextCycleId,
      cycleStartedAt: nextTargetEndTime ? completedAt : null,
      activeTaskId,
      completedSessions
    };

    await setLocal({
      tasks,
      statistics,
      sessionEvents,
      timerState: nextState
    });

    if (nextTargetEndTime) {
      await startOffscreenTimer({
        mode: nextMode,
        durationSeconds: nextDuration,
        targetEndTime: nextTargetEndTime,
        activeTaskId,
        cycleId: nextCycleId!,
        statSeconds: getDurationSeconds(settings, nextMode)
      });
    }

    return { timerState: nextState, completed: true };
  }

  const nextState: TimerState = {
    ...timerState,
    isRunning: false,
    isPaused: false,
    revision: getNextTimerRevision(timerState),
    currentMode: 'work',
    remainingSeconds: getDurationSeconds(settings, 'work'),
    targetEndTime: null,
    cycleId: null,
    cycleStartedAt: null,
    activeTaskId: timerState.activeTaskId
  };

  await setLocal({ timerState: nextState });
  return { timerState: nextState, completed: true };
};

const handleDeleteTaskStatistics = async (taskId: string) => {
  const { statistics, sessionEvents } = await readStoredData();
  const nextStatistics = removeTaskStatistics(statistics, taskId);
  const nextSessionEvents = removeTaskSessionEvents(sessionEvents, taskId);
  await setLocal({ statistics: nextStatistics, sessionEvents: nextSessionEvents });
  return { statistics: nextStatistics, sessionEvents: nextSessionEvents };
};

chrome.runtime.onInstalled.addListener(() => {
  void enqueueTimerOperation(resumeRunningTimer);
});

chrome.runtime.onStartup.addListener(() => {
  void enqueueTimerOperation(resumeRunningTimer);
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  const respond = async (): Promise<void> => {
    if (!message?.type) {
      sendResponse({ ok: false, error: 'Unknown message' });
      return;
    }

    switch (message.type) {
      case 'POPUP_ENSURE_READY':
        await enqueueTimerOperation(resumeRunningTimer);
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
        sendResponse({ ok: true, timerState: await enqueueTimerOperation(handlePauseTimer) });
        return;
      case 'POPUP_RESET_TIMER':
        sendResponse({ ok: true, timerState: await enqueueTimerOperation(handleResetTimer) });
        return;
      case 'POPUP_SKIP_SHORT_BREAK':
        sendResponse({ ok: true, timerState: await enqueueTimerOperation(handleSkipShortBreak) });
        return;
      case 'TIMER_COMPLETED':
        sendResponse({
          ok: true,
          ...(await enqueueTimerOperation(() => handleTimerCompleted(message.payload)))
        });
        return;
      case 'DELETE_TASK_STATISTICS': {
        const result = await enqueueTimerOperation(() =>
          handleDeleteTaskStatistics(message.payload.taskId)
        );
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
