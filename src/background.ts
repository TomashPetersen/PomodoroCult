import { NO_TASK_ID } from './lib/constants';
import {
  APP_WINDOW_SESSION_KEY,
  getNextAppWindowState,
  normalizeAppWindowId
} from './lib/appWindow';
import {
  getSnapshotDurationSeconds,
  resolveNextWorkSnapshot
} from './lib/focusModes';
import { applyFocusModeMutation, FocusModeMutationMessage } from './lib/focusModeMutations';
import { applyTaskMutation, TaskMutationMessage } from './lib/taskMutations';
import {
  isFocusReviewGoalsPayload,
  normalizeFocusReviewGoals
} from './lib/focusReviewGoals';
import { createSerializedOperationQueue } from './lib/operationQueue';
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
  RuntimeMessage,
  StartTimerPayload,
  TimerMode,
  TimerState
} from './lib/types';

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
const APP_WINDOW_URL = 'app.html';
const APP_WINDOW_WIDTH = 1040;
const APP_WINDOW_HEIGHT = 760;

interface TimerCompletionResult {
  timerState: TimerState;
  completed: boolean;
}

let creatingOffscreenDocument: Promise<void> | null = null;
let appWindowId: number | null = null;
let openingAppWindow: Promise<void> | null = null;
const timerOperationQueue = createSerializedOperationQueue();
const enqueueTimerOperation = timerOperationQueue.enqueue;

const sendMessage = (message: RuntimeMessage): Promise<void> =>
  new Promise((resolve) => {
    chrome.runtime.sendMessage(message, () => {
      void chrome.runtime.lastError;
      resolve();
    });
  });

const buildAppWindowUrl = (options?: { screen?: string; statsView?: string }): string => {
  const url = new URL(chrome.runtime.getURL(APP_WINDOW_URL));
  if (options?.screen) url.searchParams.set('screen', options.screen);
  if (options?.statsView) url.searchParams.set('statsView', options.statsView);
  return url.toString();
};

const readRememberedAppWindowId = (): Promise<number | null> =>
  new Promise((resolve) => {
    chrome.storage.session.get([APP_WINDOW_SESSION_KEY], (stored) => {
      const error = chrome.runtime.lastError;
      resolve(error ? null : normalizeAppWindowId(stored[APP_WINDOW_SESSION_KEY]));
    });
  });

const rememberAppWindowId = (windowId: number): Promise<void> =>
  new Promise((resolve, reject) => {
    appWindowId = windowId;
    chrome.storage.session.set({ [APP_WINDOW_SESSION_KEY]: windowId }, () => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve();
    });
  });

const forgetAppWindowId = async (removedWindowId?: number): Promise<void> => {
  const rememberedWindowId = appWindowId ?? await readRememberedAppWindowId();
  if (removedWindowId !== undefined && rememberedWindowId !== removedWindowId) return;
  appWindowId = null;
  await new Promise<void>((resolve) => {
    chrome.storage.session.remove(APP_WINDOW_SESSION_KEY, () => {
      void chrome.runtime.lastError;
      resolve();
    });
  });
};

const findExistingAppWindowId = async (): Promise<number | null> => {
  const appUrl = chrome.runtime.getURL(APP_WINDOW_URL);
  if (chrome.runtime.getContexts) {
    const contexts = await new Promise<chrome.runtime.ExtensionContext[]>((resolve) => {
      chrome.runtime.getContexts(
        { contextTypes: [chrome.runtime.ContextType.TAB] },
        (items) => {
          void chrome.runtime.lastError;
          resolve(items ?? []);
        }
      );
    });
    const context = contexts.find(
      (item) => item.windowId >= 0 && item.documentUrl?.startsWith(appUrl)
    );
    if (context) {
      await rememberAppWindowId(context.windowId);
      return context.windowId;
    }
  }
  return null;
};

const focusAppWindow = (windowId: number): Promise<boolean> =>
  new Promise((resolve) => {
    chrome.windows.update(windowId, { focused: true }, (window) => {
      const error = chrome.runtime.lastError;
      resolve(!error && typeof window?.id === 'number');
    });
  });

const getKnownAppWindowId = async (): Promise<number | null> => {
  const candidate = appWindowId ?? await readRememberedAppWindowId();
  if (candidate === null) return null;

  return new Promise((resolve) => {
    chrome.windows.get(candidate, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        forgetAppWindowId(candidate).then(() => resolve(null));
        return;
      }
      appWindowId = candidate;
      resolve(candidate);
    });
  });
};

const toggleAppWindowMaximized = async (): Promise<boolean> => {
  const targetWindowId = (await getKnownAppWindowId()) ?? (await findExistingAppWindowId());
  if (targetWindowId === null) return false;
  appWindowId = targetWindowId;

  return new Promise<boolean>((resolve, reject) => {
    chrome.windows.get(targetWindowId, (currentWindow) => {
      const getError = chrome.runtime.lastError;
      if (getError) {
        reject(new Error(getError.message));
        return;
      }

      const nextState = getNextAppWindowState(currentWindow.state);
      chrome.windows.update(targetWindowId, { state: nextState, focused: true }, () => {
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

const notifyAppWindowNavigation = async (
  options?: { screen?: string; statsView?: string }
): Promise<void> => {
  if (!options?.screen && !options?.statsView) return;
  await sendMessage({
    type: 'APP_WINDOW_NAVIGATE',
    payload: {
      ...(options.screen === 'timer' || options.screen === 'tasks' || options.screen === 'stats'
        ? { screen: options.screen }
        : {}),
      ...(options.statsView === 'list' || options.statsView === 'chart' || options.statsView === 'review'
        ? { statsView: options.statsView }
        : {})
    }
  });
};

const createAppWindow = (options?: { screen?: string; statsView?: string }): Promise<void> =>
  new Promise((resolve, reject) => {
    chrome.windows.create(
      {
        url: buildAppWindowUrl(options),
        type: 'popup',
        width: APP_WINDOW_WIDTH,
        height: APP_WINDOW_HEIGHT,
        focused: true
      },
      (window) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        const createdWindowId = normalizeAppWindowId(window?.id);
        if (createdWindowId === null) {
          reject(new Error('Chrome did not return the created app window id.'));
          return;
        }
        rememberAppWindowId(createdWindowId).then(resolve, reject);
      }
    );
  });

const openAppWindow = async (
  options?: { screen?: string; statsView?: string }
): Promise<void> => {
  if (openingAppWindow) {
    await openingAppWindow;
    if (appWindowId !== null) {
      await focusAppWindow(appWindowId);
      await notifyAppWindowNavigation(options);
    }
    return;
  }

  openingAppWindow = (async () => {
    const existingId = (await getKnownAppWindowId()) ?? await findExistingAppWindowId();
    if (existingId !== null && await focusAppWindow(existingId)) {
      await rememberAppWindowId(existingId);
      await notifyAppWindowNavigation(options);
      return;
    }
    appWindowId = null;
    await createAppWindow(options);
  })().finally(() => {
    openingAppWindow = null;
  });

  await openingAppWindow;
};

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

const initializeAndRecoverTimer = async (): Promise<TimerCompletionResult> => {
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

  if (!timerState.isRunning) return { timerState, completed: false };

  if (timerState.targetEndTime && timerState.targetEndTime <= Date.now()) {
    await stopOffscreenTimer();
    return handleTimerCompleted({
      mode: timerState.currentMode,
      activeTaskId: timerState.activeTaskId,
      durationSeconds: 0,
      statSeconds: 0,
      cycleId: timerState.cycleId ?? ''
    });
  }

  await createOffscreenDocument();
  await sendMessage({ type: 'OFFSCREEN_RESUME_TIMER' });
  return { timerState, completed: false };
};

const ensureRuntimeReady = async (): Promise<void> => {
  const result = await enqueueTimerOperation(initializeAndRecoverTimer);
  if (!result.completed) return;

  await createOffscreenDocument();
  await sendMessage({ type: 'OFFSCREEN_PLAY_COMPLETION_CHIME' });
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
  await startOffscreenTimer({
    mode,
    durationSeconds,
    targetEndTime,
    activeTaskId: activeTaskId ?? null,
    cycleId,
    statSeconds: getSnapshotDurationSeconds(activeCycleSnapshot, mode)
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
  const data = await readStoredData();
  const { timerState: storedTimerState } = data;
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
    completedSessions: 0
  };

  await stopOffscreenTimer();
  await setLocal({ timerState: nextState });
  return nextState;
};

const handleSkipShortBreak = async (): Promise<TimerState> => {
  const data = await readStoredData();
  const { timerState } = data;

  if (timerState.currentMode !== 'shortBreak') {
    return timerState;
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
    activeCycleSnapshot: null
  };

  await stopOffscreenTimer();
  await setLocal({ timerState: nextState });
  return nextState;
};

const handleTimerCompleted = async (
  payload: Extract<RuntimeMessage, { type: 'TIMER_COMPLETED' }>['payload']
): Promise<TimerCompletionResult> => {
  const data = await readStoredData();
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
    const snapshot = timerState.activeCycleSnapshot;
    if (!snapshot) return { timerState, completed: false };
    tasks = ensureNoTask(tasks);
    const activeTaskId = timerState.activeTaskId ?? payload.activeTaskId ?? NO_TASK_ID;
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

    if (nextTargetEndTime) {
      await startOffscreenTimer({
        mode: nextMode,
        durationSeconds: nextDuration,
        targetEndTime: nextTargetEndTime,
        activeTaskId,
        cycleId: nextCycleId!,
        statSeconds: getSnapshotDurationSeconds(snapshot, nextMode)
      });
    }

    return { timerState: nextState, completed: true };
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
  return { timerState: nextState, completed: true };
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

chrome.runtime.onInstalled.addListener(() => {
  void ensureRuntimeReady();
});

chrome.runtime.onStartup.addListener(() => {
  void ensureRuntimeReady();
});

chrome.windows.onRemoved.addListener((windowId) => {
  void forgetAppWindowId(windowId);
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  const respond = async (): Promise<void> => {
    if (!message?.type) {
      sendResponse({ ok: false, error: 'Unknown message' });
      return;
    }

    switch (message.type) {
      case 'POPUP_ENSURE_READY':
        await ensureRuntimeReady();
        sendResponse({ ok: true });
        return;
      case 'OPEN_APP_WINDOW':
        await openAppWindow(message.payload);
        sendResponse({ ok: true });
        return;
      case 'APP_WINDOW_READY':
        await rememberAppWindowId(message.payload.windowId);
        sendResponse({ ok: true });
        return;
      case 'APP_WINDOW_CLOSED':
        await forgetAppWindowId();
        sendResponse({ ok: true });
        return;
      case 'TOGGLE_APP_WINDOW_MAXIMIZED':
        sendResponse({ ok: true, maximized: await toggleAppWindowMaximized() });
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
      case 'SAVE_FOCUS_REVIEW_GOALS': {
        const result = await enqueueTimerOperation(() =>
          handleSaveFocusReviewGoals(message.payload)
        );
        sendResponse({ ok: true, ...result });
        return;
      }
      case 'IMPORT_USER_DATA': {
        const data = await enqueueTimerOperation(() => importStoredData(message.payload.raw));
        try {
          await stopOffscreenTimer();
        } catch (error) {
          console.warn(
            'Could not stop offscreen timer after import.',
            error instanceof Error ? error.message : String(error)
          );
        }
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
