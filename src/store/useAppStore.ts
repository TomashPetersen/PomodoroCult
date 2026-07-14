import { create } from 'zustand';
import { NO_TASK_ID } from '../lib/constants';
import {
  getSnapshotDurationSeconds,
  normalizeFocusModes,
  resolveActiveWorkFocusMusicSettings,
  resolveNextWorkSnapshot
} from '../lib/focusModes';
import { detectBrowserLocale, resolveLocale, t } from '../lib/i18n';
import { normalizeFocusReviewGoals } from '../lib/focusReviewGoals';
import {
  applyThemeClass,
  areTimerDurationsLocked,
  canStartTimerMode,
  clampTaskTitle,
  createExportDocument,
  defaultTimerState,
  getLocalDateKey,
  getNextTimerRevision,
  getPresetStatsRange,
  getRunningDisplaySeconds,
  hasStartedTimerCycle,
  hasActiveTaskTitle,
  isTimerTaskLocked,
  normalizeSessionEvents,
  normalizeSettings,
  readStoredData,
  removeTaskSessionEvents,
  removeTaskStatistics,
  setLocal,
  sortTasks
} from '../lib/storage';
import {
  AppScreen,
  CURRENT_STORAGE_VERSION,
  DEFAULT_SETTINGS,
  FocusMusicControlCommand,
  Locale,
  FocusMode,
  FocusModeEditableValues,
  FocusReviewGoals,
  RuntimeMessage,
  SessionEvent,
  Settings,
  Statistics,
  StatsPeriod,
  StatsView,
  StoredData,
  Task,
  ThemeMode,
  TimerMode,
  TimerState
} from '../lib/types';

type QuickStatsPeriod = Exclude<StatsPeriod, 'custom'>;

interface RuntimeResponse {
  ok: boolean;
  error?: string;
  ignored?: boolean;
  timerState?: TimerState;
  statistics?: Statistics;
  sessionEvents?: SessionEvent[];
  settings?: Settings;
  manualSettings?: Settings;
  selectedFocusModeId?: string | null;
  focusModes?: FocusMode[];
  tasks?: Task[];
  focusModeId?: string;
  taskId?: string;
  focusReviewGoals?: FocusReviewGoals;
  data?: StoredData;
}

interface AppStore extends StoredData {
  hydrated: boolean;
  locale: Locale;
  selectedScreen: AppScreen;
  selectedTimerMode: TimerMode;
  pulseStartMode: TimerMode | null;
  runtimeError: string | null;
  resetConfirmOpen: boolean;
  statsPeriod: StatsPeriod;
  statsRangeStart: string;
  statsRangeEnd: string;
  statsRangeModalOpen: boolean;
  statsDeleteConfirmTaskId: string | null;
  selectedStatsTaskId: string | null;
  statsTaskSelectionTouched: boolean;
  statsView: StatsView;
  settingsOpen: boolean;
  taskActionError: string | null;
  highlightedTaskId: string | null;
  dataTransferMessage: string | null;
  dataTransferError: string | null;
  focusModeError: string | null;
  initialize: () => Promise<void>;
  setScreen: (screen: AppScreen) => void;
  setTimerMode: (mode: TimerMode) => void;
  clearRuntimeError: () => void;
  clearStartPulse: () => void;
  toggleTheme: () => Promise<void>;
  openAppWindow: (options?: { screen?: AppScreen; statsView?: StatsView }) => Promise<void>;
  openSettings: () => void;
  closeSettings: () => void;
  saveSettings: (settings: Settings) => Promise<void>;
  saveFocusMusicSettings: (command: FocusMusicControlCommand) => Promise<void>;
  saveFocusReviewGoals: (goals: FocusReviewGoals) => Promise<void>;
  selectFocusMode: (focusModeId: string | null) => Promise<void>;
  createFocusMode: (values: FocusModeEditableValues) => Promise<string | null>;
  updateFocusMode: (focusModeId: string, values: FocusModeEditableValues) => Promise<void>;
  deleteFocusMode: (focusModeId: string) => Promise<void>;
  setTaskFocusMode: (taskId: string, focusModeId: string | null) => Promise<void>;
  clearFocusModeError: () => void;
  exportUserData: () => Promise<void>;
  importUserData: (raw: string) => Promise<void>;
  clearDataTransferStatus: () => void;
  startTimer: (startedAt?: number) => Promise<void>;
  pauseTimer: () => Promise<void>;
  skipShortBreak: () => Promise<void>;
  openResetConfirm: () => void;
  closeResetConfirm: () => void;
  confirmReset: () => Promise<void>;
  selectTask: (taskId: string | null) => Promise<void>;
  addTask: (title: string, options?: { select?: boolean; highlight?: boolean }) => Promise<string | null>;
  updateTask: (taskId: string, title: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  archiveTask: (taskId: string) => Promise<void>;
  restoreTask: (taskId: string) => Promise<void>;
  clearTaskActionError: () => void;
  clearHighlightedTask: () => void;
  setStatsPeriod: (period: QuickStatsPeriod) => void;
  setStatsView: (view: StatsView) => void;
  openStatsChartWindow: () => Promise<void>;
  openStatsRangeModal: () => void;
  closeStatsRangeModal: () => void;
  applyCustomStatsRange: (start: string, end: string) => void;
  openStatsDeleteConfirm: (taskId: string) => void;
  closeStatsDeleteConfirm: () => void;
  confirmStatsDelete: () => Promise<void>;
  selectStatsTask: (taskId: string) => void;
  applyAutoStatsTask: (taskId: string | null) => void;
}

const getAuthoritativeFocusModePatch = (
  response: RuntimeResponse
): Partial<AppStore> => ({
  ...(response.settings ? { settings: response.settings } : {}),
  ...(response.manualSettings ? { manualSettings: response.manualSettings } : {}),
  ...(response.selectedFocusModeId !== undefined
    ? { selectedFocusModeId: response.selectedFocusModeId }
    : {}),
  ...(response.focusModes ? { focusModes: response.focusModes } : {}),
  ...(response.tasks ? { tasks: response.tasks } : {}),
  ...(response.timerState ? { timerState: response.timerState } : {})
});

let storageListenerAttached = false;
let highlightedTaskTimeoutId: number | null = null;

const canUseRuntime = (): boolean =>
  typeof chrome !== 'undefined' && Boolean(chrome.runtime?.sendMessage);

const sendRuntimeMessage = (message: RuntimeMessage): Promise<RuntimeResponse | null> =>
  new Promise((resolve, reject) => {
    if (!canUseRuntime()) {
      resolve(null);
      return;
    }

    chrome.runtime.sendMessage(message, (response: RuntimeResponse) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(response);
    });
  });

type BackgroundWindow = Window & {
  __pomodoroCultPrimeAudio?: () => Promise<void>;
};

type RuntimeWithBackgroundPage = {
  lastError?: { message?: string };
  getBackgroundPage?: ((callback: (page: BackgroundWindow | null) => void) => void) | (() => Promise<BackgroundWindow | null>);
};

const getExtensionRuntime = (): RuntimeWithBackgroundPage | null => {
  const browserRuntime = (
    globalThis as typeof globalThis & {
      browser?: {
        runtime?: RuntimeWithBackgroundPage;
      };
    }
  ).browser?.runtime;

  return browserRuntime ?? chrome.runtime ?? null;
};

const getBackgroundPage = async (): Promise<BackgroundWindow | null> => {
  const runtime = getExtensionRuntime();
  const getBackgroundPageMethod = runtime?.getBackgroundPage;

  if (!getBackgroundPageMethod) {
    return null;
  }

  if (getBackgroundPageMethod.length === 0) {
    return (await (
      getBackgroundPageMethod as () => Promise<BackgroundWindow | null>
    )()) ?? null;
  }

  return await new Promise<BackgroundWindow | null>((resolve) => {
    (
      getBackgroundPageMethod as (callback: (page: BackgroundWindow | null) => void) => void
    )((page) => {
      void runtime?.lastError;
      resolve(page ?? null);
    });
  });
};

const primeFirefoxBackgroundAudio = async (): Promise<void> => {
  const backgroundPage = await getBackgroundPage();

  if (backgroundPage?.__pomodoroCultPrimeAudio) {
    await backgroundPage.__pomodoroCultPrimeAudio();
  }
};

const initialData: StoredData = {
  storageVersion: CURRENT_STORAGE_VERSION,
  settings: DEFAULT_SETTINGS,
  tasks: [],
  timerState: defaultTimerState(DEFAULT_SETTINGS),
  statistics: {},
  focusModes: normalizeFocusModes(),
  selectedFocusModeId: null,
  manualSettings: DEFAULT_SETTINGS,
  sessionEvents: [],
  focusReviewGoals: { dailySessions: null, weeklySessions: null },
  sessionEventLogStartedAt: Date.now(),
  theme: 'light'
};

const presetRange = getPresetStatsRange(1);

const getActionError = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const scheduleHighlightedTaskClear = (set: (partial: Partial<AppStore>) => void): void => {
  if (typeof window === 'undefined') return;

  if (highlightedTaskTimeoutId !== null) {
    window.clearTimeout(highlightedTaskTimeoutId);
  }

  highlightedTaskTimeoutId = window.setTimeout(() => {
    highlightedTaskTimeoutId = null;
    set({ highlightedTaskId: null });
  }, 1800);
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialData,
  hydrated: false,
  locale: detectBrowserLocale(),
  selectedScreen: 'timer',
  selectedTimerMode: 'work',
  pulseStartMode: null,
  runtimeError: null,
  resetConfirmOpen: false,
  statsPeriod: '1d',
  statsRangeStart: presetRange.start,
  statsRangeEnd: presetRange.end,
  statsRangeModalOpen: false,
  statsDeleteConfirmTaskId: null,
  selectedStatsTaskId: null,
  statsTaskSelectionTouched: false,
  statsView: 'list',
  settingsOpen: false,
  taskActionError: null,
  highlightedTaskId: null,
  dataTransferMessage: null,
  dataTransferError: null,
  focusModeError: null,

  initialize: async () => {
    try {
      const readinessLocale = get().locale;
      const response = await sendRuntimeMessage({ type: 'POPUP_ENSURE_READY' });
      if (!response?.ok) {
        throw new Error(response?.error || t(readinessLocale, 'errorPrepareRuntime'));
      }

      const data = await readStoredData();
      const locale = resolveLocale(data.settings.languagePreference);
      applyThemeClass(data.theme);

      set({
        ...data,
        locale,
        hydrated: true,
        selectedTimerMode: data.timerState.currentMode
      });

      if (!storageListenerAttached && typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName !== 'local') return;

          set((state) => {
            const patch: Partial<AppStore> = {};

            if (changes.settings?.newValue) {
              const settings = normalizeSettings(changes.settings.newValue);
              patch.settings = settings;
              patch.locale = resolveLocale(settings.languagePreference);
            }

            if (changes.tasks?.newValue) {
              patch.tasks = sortTasks(changes.tasks.newValue as Task[]);
            }

            if (changes.statistics?.newValue) {
              patch.statistics = changes.statistics.newValue as Statistics;
            }

            if (changes.focusModes?.newValue !== undefined) {
              patch.focusModes = normalizeFocusModes(changes.focusModes.newValue);
            }

            if (changes.selectedFocusModeId) {
              patch.selectedFocusModeId =
                typeof changes.selectedFocusModeId.newValue === 'string'
                  ? changes.selectedFocusModeId.newValue
                  : null;
            }

            if (changes.manualSettings?.newValue) {
              patch.manualSettings = normalizeSettings(changes.manualSettings.newValue);
            }

            if (changes.sessionEvents?.newValue !== undefined) {
              patch.sessionEvents = normalizeSessionEvents(changes.sessionEvents.newValue);
            }

            if (
              changes.focusReviewGoals?.newValue !== undefined ||
              changes.sessionEventLogStartedAt?.newValue !== undefined
            ) {
              if (changes.focusReviewGoals?.newValue !== undefined) {
                patch.focusReviewGoals = normalizeFocusReviewGoals(
                  changes.focusReviewGoals.newValue
                );
              }
              const coverage = Number(changes.sessionEventLogStartedAt?.newValue);
              if (
                Number.isInteger(coverage) && coverage >= 0 &&
                coverage <= Date.now()
              ) {
                patch.sessionEventLogStartedAt = coverage;
              }
            }

            if (changes.theme?.newValue) {
              const theme = changes.theme.newValue as ThemeMode;
              patch.theme = theme;
              applyThemeClass(theme);
            }

            if (changes.timerState?.newValue) {
              const timerState = changes.timerState.newValue as TimerState;
              const incomingRevision = Math.max(0, Number(timerState.revision) || 0);
              if (incomingRevision < state.timerState.revision) {
                return patch;
              }
              patch.timerState = {
                ...timerState,
                revision: incomingRevision
              };

              if (state.timerState.currentMode !== timerState.currentMode) {
                patch.selectedTimerMode = timerState.currentMode;
              }

              if (
                state.timerState.isRunning &&
                !timerState.isRunning &&
                state.timerState.currentMode === 'work' &&
                timerState.completedSessions > state.timerState.completedSessions
              ) {
                patch.selectedTimerMode = timerState.currentMode;
                patch.pulseStartMode = timerState.currentMode;
              }
            }

            return patch;
          });
        });
        storageListenerAttached = true;
      }

    } catch (error) {
      set((state) => ({
        hydrated: true,
        runtimeError: getActionError(error, t(state.locale, 'errorInitRuntime'))
      }));
    }
  },

  setScreen: (screen) => set({ selectedScreen: screen }),

  setTimerMode: (mode) => set({ selectedTimerMode: mode }),

  clearRuntimeError: () => set({ runtimeError: null }),

  clearStartPulse: () => set({ pulseStartMode: null }),

  toggleTheme: async () => {
    const theme: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    applyThemeClass(theme);
    set({ theme });
    await setLocal({ theme });
  },

  openAppWindow: async (options) => {
    try {
      const response = await sendRuntimeMessage({
        type: 'OPEN_APP_WINDOW',
        ...(options ? { payload: options } : {})
      });
      if (response && !response.ok) {
        throw new Error(response.error || t(get().locale, 'errorOpenAppWindow'));
      }
    } catch (error) {
      set({
        runtimeError: getActionError(error, t(get().locale, 'errorOpenAppWindow'))
      });
    }
  },

  openSettings: () => set({ settingsOpen: true }),

  closeSettings: () => set({ settingsOpen: false }),

  saveSettings: async (rawSettings) => {
    const { settings: currentSettings, timerState } = get();
    const normalizedSettings = normalizeSettings(rawSettings);
    const durationsLocked = areTimerDurationsLocked(currentSettings, timerState);
    const settings = durationsLocked
      ? {
          ...normalizedSettings,
          workTime: currentSettings.workTime,
          shortBreak: currentSettings.shortBreak,
          longBreak: currentSettings.longBreak
        }
      : normalizedSettings;
    const response = await sendRuntimeMessage({
      type: 'SAVE_MANUAL_SETTINGS',
      payload: { settings }
    });
    if (!response?.ok) throw new Error(response?.error || 'Unable to save settings.');
    const nextSettings = response.settings ?? settings;
    set({
      ...getAuthoritativeFocusModePatch(response),
      settings: nextSettings,
      locale: resolveLocale(nextSettings.languagePreference),
      settingsOpen: false
    });
  },

  saveFocusMusicSettings: async (command) => {
    const response = await sendRuntimeMessage({
      type: 'SAVE_FOCUS_MUSIC_SETTINGS',
      payload: command
    });
    if (!response?.ok) {
      set({ focusModeError: response?.error || 'Unable to save focus music settings.' });
      return;
    }
    set({ ...getAuthoritativeFocusModePatch(response), focusModeError: null });
  },

  saveFocusReviewGoals: async (goals) => {
    const response = await sendRuntimeMessage({
      type: 'SAVE_FOCUS_REVIEW_GOALS',
      payload: goals
    });
    if (!response?.ok || !response.focusReviewGoals) {
      throw new Error(response?.error || 'Unable to save Focus Review goals.');
    }
    set({ focusReviewGoals: response.focusReviewGoals });
  },

  selectFocusMode: async (focusModeId) => {
    try {
      const response = await sendRuntimeMessage({
        type: 'SELECT_FOCUS_MODE',
        payload: { focusModeId }
      });
      if (!response?.ok) throw new Error(response?.error || 'Unable to select Focus Mode.');
      set({ ...getAuthoritativeFocusModePatch(response), focusModeError: null });
    } catch (error) {
      set({ focusModeError: getActionError(error, 'Unable to select Focus Mode.') });
    }
  },

  createFocusMode: async (values) => {
    try {
      const response = await sendRuntimeMessage({ type: 'CREATE_FOCUS_MODE', payload: { values } });
      if (!response?.ok) throw new Error(response?.error || 'Unable to create Focus Mode.');
      set({ ...getAuthoritativeFocusModePatch(response), focusModeError: null });
      return response.focusModeId ?? null;
    } catch (error) {
      set({ focusModeError: getActionError(error, 'Unable to create Focus Mode.') });
      return null;
    }
  },

  updateFocusMode: async (focusModeId, values) => {
    try {
      const response = await sendRuntimeMessage({
        type: 'UPDATE_FOCUS_MODE',
        payload: { focusModeId, values }
      });
      if (!response?.ok) throw new Error(response?.error || 'Unable to update Focus Mode.');
      set({ ...getAuthoritativeFocusModePatch(response), focusModeError: null });
    } catch (error) {
      set({ focusModeError: getActionError(error, 'Unable to update Focus Mode.') });
    }
  },

  deleteFocusMode: async (focusModeId) => {
    try {
      const response = await sendRuntimeMessage({
        type: 'DELETE_FOCUS_MODE',
        payload: { focusModeId }
      });
      if (!response?.ok) throw new Error(response?.error || 'Unable to delete Focus Mode.');
      set({ ...getAuthoritativeFocusModePatch(response), focusModeError: null });
    } catch (error) {
      set({ focusModeError: getActionError(error, 'Unable to delete Focus Mode.') });
    }
  },

  setTaskFocusMode: async (taskId, focusModeId) => {
    try {
      const response = await sendRuntimeMessage({
        type: 'SET_TASK_FOCUS_MODE',
        payload: { taskId, focusModeId }
      });
      if (!response?.ok) throw new Error(response?.error || 'Unable to bind Focus Mode.');
      set({ ...getAuthoritativeFocusModePatch(response), focusModeError: null });
    } catch (error) {
      set({ focusModeError: getActionError(error, 'Unable to bind Focus Mode.') });
    }
  },

  clearFocusModeError: () => set({ focusModeError: null }),

  exportUserData: async () => {
    try {
      const document = await createExportDocument();
      const blob = new Blob([JSON.stringify(document, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);

      anchor.href = url;
      anchor.download = `pomodoro-cult-backup-${date}.json`;
      anchor.click();
      URL.revokeObjectURL(url);

      set({
        dataTransferMessage: t(get().locale, 'dataExportSuccess'),
        dataTransferError: null
      });
    } catch (error) {
      set({
        dataTransferMessage: null,
        dataTransferError: getActionError(error, t(get().locale, 'dataExportError'))
      });
    }
  },

  importUserData: async (raw) => {
    const { locale } = get();

    try {
      const response = await sendRuntimeMessage({ type: 'IMPORT_USER_DATA', payload: { raw } });
      if (!response?.ok || !response.data) {
        throw new Error(response?.error || t(locale, 'dataImportError'));
      }
      const data = response.data;

      const nextLocale = resolveLocale(data.settings.languagePreference);
      applyThemeClass(data.theme);

      set({
        ...data,
        locale: nextLocale,
        selectedTimerMode: data.timerState.currentMode,
        resetConfirmOpen: false,
        runtimeError: null,
        dataTransferMessage: t(nextLocale, 'dataImportSuccess'),
        dataTransferError: null
      });
    } catch (error) {
      set({
        dataTransferMessage: null,
        dataTransferError: getActionError(error, t(locale, 'dataImportError'))
      });
    }
  },

  clearDataTransferStatus: () =>
    set({
      dataTransferMessage: null,
      dataTransferError: null
    }),

  startTimer: async (startedAt = Date.now()) => {
    const {
      selectedTimerMode,
      locale,
      timerState,
      settings,
      focusModes,
      selectedFocusModeId,
      manualSettings,
      tasks
    } = get();
    if (!canStartTimerMode(settings, timerState, selectedTimerMode)) {
      return;
    }

    const isResume =
      timerState.isPaused &&
      timerState.currentMode === selectedTimerMode &&
      timerState.activeCycleSnapshot !== null;
    const activeCycleSnapshot = isResume ||
      (selectedTimerMode !== 'work' && timerState.activeCycleSnapshot)
      ? timerState.activeCycleSnapshot!
      : resolveNextWorkSnapshot({
          focusModes,
          tasks,
          activeTaskId: timerState.activeTaskId,
          selectedFocusModeId,
          manualSettings
        });
    const optimisticDuration = isResume
      ? timerState.remainingSeconds
      : getSnapshotDurationSeconds(activeCycleSnapshot, selectedTimerMode);
    const optimisticTargetEndTime = startedAt + optimisticDuration * 1000;
    const optimisticTimerState: TimerState = {
      ...timerState,
      isRunning: true,
      isPaused: false,
      cycleStarted: true,
      revision: getNextTimerRevision(timerState),
      currentMode: selectedTimerMode,
      remainingSeconds: optimisticDuration,
      targetEndTime: optimisticTargetEndTime,
      activeCycleSnapshot
    };

    set({
      runtimeError: null,
      pulseStartMode: null,
      timerState: optimisticTimerState,
      selectedTimerMode
    });

    try {
      await primeFirefoxBackgroundAudio();

      const response = await sendRuntimeMessage({
        type: 'POPUP_START_TIMER',
        payload: { mode: selectedTimerMode, startedAt }
      });

      if (!response?.ok) {
        throw new Error(response?.error || t(locale, 'errorStartTimer'));
      }

      if (response.timerState) {
        const responseTimerState = response.timerState;
        set((state) =>
          responseTimerState.revision < state.timerState.revision
            ? {}
            : {
                timerState: responseTimerState,
                selectedTimerMode: responseTimerState.currentMode
              }
        );
      }
    } catch (error) {
      set({
        timerState,
        runtimeError: getActionError(error, t(locale, 'errorStartTimer'))
      });
    }
  },

  pauseTimer: async () => {
    const { timerState, selectedTimerMode, locale } = get();
    if (!timerState.isRunning || timerState.currentMode !== selectedTimerMode) {
      return;
    }

    const optimisticTimerState: TimerState = {
      ...timerState,
      isRunning: false,
      isPaused: true,
      revision: getNextTimerRevision(timerState),
      remainingSeconds: timerState.targetEndTime
        ? getRunningDisplaySeconds(timerState.targetEndTime)
        : timerState.remainingSeconds,
      targetEndTime: null
    };

    set({
      runtimeError: null,
      timerState: optimisticTimerState
    });

    try {
      const response = await sendRuntimeMessage({ type: 'POPUP_PAUSE_TIMER' });

      if (!response?.ok) {
        throw new Error(response?.error || t(locale, 'errorPauseTimer'));
      }

      if (response.timerState) {
        const responseTimerState = response.timerState;
        set((state) =>
          responseTimerState.revision < state.timerState.revision
            ? {}
            : { timerState: responseTimerState }
        );
      }
    } catch (error) {
      set({
        timerState,
        runtimeError: getActionError(error, t(locale, 'errorPauseTimer'))
      });
    }
  },

  skipShortBreak: async () => {
    const { locale, timerState } = get();
    if (timerState.currentMode !== 'shortBreak') {
      return;
    }

    try {
      const response = await sendRuntimeMessage({ type: 'POPUP_SKIP_SHORT_BREAK' });

      if (!response?.ok) {
        throw new Error(response?.error || t(locale, 'errorSkipBreak'));
      }

      if (response.timerState) {
        set({
          timerState: response.timerState,
          selectedTimerMode: response.timerState.currentMode,
          runtimeError: null
        });
      }
    } catch (error) {
      set({
        runtimeError: getActionError(error, t(locale, 'errorSkipBreak'))
      });
    }
  },

  openResetConfirm: () => set({ resetConfirmOpen: true }),

  closeResetConfirm: () => set({ resetConfirmOpen: false }),

  confirmReset: async () => {
    const { locale } = get();

    set({
      resetConfirmOpen: false,
      runtimeError: null,
      pulseStartMode: null
    });

    try {
      const response = await sendRuntimeMessage({ type: 'POPUP_RESET_TIMER' });

      if (!response?.ok) {
        throw new Error(response?.error || t(locale, 'errorStopTimer'));
      }

      set({
        ...(response.timerState ? { timerState: response.timerState } : {}),
        selectedTimerMode: 'work'
      });
    } catch (error) {
      set({
        runtimeError: getActionError(error, t(locale, 'errorStopTimer'))
      });
    }
  },

  selectTask: async (taskId) => {
    const { settings, timerState, locale } = get();
    if (isTimerTaskLocked(settings, timerState)) return;
    try {
      const response = await sendRuntimeMessage({ type: 'SELECT_TASK', payload: { taskId } });
      if (!response?.ok) throw new Error(response?.error || 'TASK_NOT_FOUND');
      set({ ...getAuthoritativeFocusModePatch(response), taskActionError: null });
    } catch (error) {
      set({ taskActionError: getActionError(error, t(locale, 'taskChangeRequiresStop')) });
    }
  },

  addTask: async (rawTitle, options) => {
    const title = clampTaskTitle(rawTitle);
    if (!title) return null;

    const { tasks } = get();
    if (hasActiveTaskTitle(tasks, title)) {
      set({ taskActionError: t(get().locale, 'taskDuplicateError') });
      return null;
    }

    const shouldSelect = options?.select ?? true;
    const shouldHighlight = options?.highlight ?? true;
    try {
      const response = await sendRuntimeMessage({
        type: 'ADD_TASK',
        payload: { title, select: shouldSelect }
      });
      if (!response?.ok || !response.taskId) throw new Error(response?.error || 'TASK_INVALID');
      set({
        ...getAuthoritativeFocusModePatch(response),
        highlightedTaskId: shouldHighlight ? response.taskId : null,
        taskActionError: null
      });
      if (shouldHighlight) scheduleHighlightedTaskClear(set);
      return response.taskId;
    } catch (error) {
      const message = getActionError(error, 'TASK_INVALID');
      set({
        taskActionError: message.includes('DUPLICATE')
          ? t(get().locale, 'taskDuplicateError')
          : message
      });
      return null;
    }
  },

  updateTask: async (taskId, rawTitle) => {
    const title = clampTaskTitle(rawTitle);
    if (!title) return;

    const { settings, tasks, timerState, locale } = get();
    const target = tasks.find((task) => task.id === taskId);
    if (!target || target.system || taskId === NO_TASK_ID) return;

    if (isTimerTaskLocked(settings, timerState) && taskId === timerState.activeTaskId) {
      set({ taskActionError: t(locale, 'taskChangeRequiresStop') });
      return;
    }

    if (hasActiveTaskTitle(tasks, title, taskId)) {
      set({ taskActionError: t(get().locale, 'taskDuplicateError') });
      return;
    }

    try {
      const response = await sendRuntimeMessage({
        type: 'UPDATE_TASK',
        payload: { taskId, title }
      });
      if (!response?.ok) throw new Error(response?.error || 'TASK_INVALID');
      set({ ...getAuthoritativeFocusModePatch(response), taskActionError: null });
    } catch (error) {
      const message = getActionError(error, 'TASK_INVALID');
      set({
        taskActionError: message.includes('LOCKED')
          ? t(locale, 'taskChangeRequiresStop')
          : message.includes('DUPLICATE')
            ? t(locale, 'taskDuplicateError')
            : message
      });
    }
  },

  deleteTask: async (taskId) => {
    const { settings, tasks, timerState, locale } = get();
    const target = tasks.find((task) => task.id === taskId);
    if (!target || target.system || taskId === NO_TASK_ID) return;

    if (isTimerTaskLocked(settings, timerState) && taskId === timerState.activeTaskId) {
      set({ taskActionError: t(locale, 'taskChangeRequiresStop') });
      return;
    }

    try {
      const response = await sendRuntimeMessage({ type: 'DELETE_TASK', payload: { taskId } });
      if (!response?.ok) throw new Error(response?.error || 'TASK_NOT_FOUND');
      set({ ...getAuthoritativeFocusModePatch(response), taskActionError: null });
    } catch (error) {
      const message = getActionError(error, 'TASK_NOT_FOUND');
      set({ taskActionError: message.includes('LOCKED') ? t(locale, 'taskChangeRequiresStop') : message });
    }
  },

  archiveTask: async (taskId) => {
    const { settings, tasks, timerState, locale } = get();
    if (isTimerTaskLocked(settings, timerState) && taskId === timerState.activeTaskId) {
      set({ taskActionError: t(locale, 'taskChangeRequiresStop') });
      return;
    }

    const target = tasks.find((task) => task.id === taskId);
    if (!target || target.system || taskId === NO_TASK_ID) return;

    try {
      const response = await sendRuntimeMessage({ type: 'ARCHIVE_TASK', payload: { taskId } });
      if (!response?.ok) throw new Error(response?.error || 'TASK_NOT_FOUND');
      set({ ...getAuthoritativeFocusModePatch(response), taskActionError: null });
    } catch (error) {
      const message = getActionError(error, 'TASK_NOT_FOUND');
      set({ taskActionError: message.includes('LOCKED') ? t(locale, 'taskChangeRequiresStop') : message });
    }
  },

  restoreTask: async (taskId) => {
    const { tasks } = get();
    const target = tasks.find((task) => task.id === taskId);
    if (!target || target.system || taskId === NO_TASK_ID || !target.archived) return;

    if (hasActiveTaskTitle(tasks, target.title, taskId)) {
      set({ taskActionError: t(get().locale, 'taskRestoreDuplicateError') });
      return;
    }

    try {
      const response = await sendRuntimeMessage({ type: 'RESTORE_TASK', payload: { taskId } });
      if (!response?.ok) throw new Error(response?.error || 'TASK_NOT_FOUND');
      set({
        ...getAuthoritativeFocusModePatch(response),
        highlightedTaskId: taskId,
        taskActionError: null
      });
      scheduleHighlightedTaskClear(set);
    } catch (error) {
      const message = getActionError(error, 'TASK_NOT_FOUND');
      set({
        taskActionError: message.includes('RESTORE_DUPLICATE')
          ? t(get().locale, 'taskRestoreDuplicateError')
          : message
      });
    }
  },

  clearTaskActionError: () => set({ taskActionError: null }),

  clearHighlightedTask: () => set({ highlightedTaskId: null }),

  setStatsPeriod: (period) => {
    const today = getLocalDateKey();
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    const range = getPresetStatsRange(days, today);

    set({
      statsPeriod: period,
      statsRangeStart: range.start,
      statsRangeEnd: range.end
    });
  },

  setStatsView: (view) => set({ statsView: view }),

  openStatsChartWindow: async () => {
    try {
      set({ selectedScreen: 'stats', statsView: 'chart' });
      await get().openAppWindow({ screen: 'stats', statsView: 'chart' });
    } catch (error) {
      set({
        runtimeError: getActionError(error, t(get().locale, 'errorOpenAppWindow'))
      });
    }
  },

  openStatsRangeModal: () => set({ statsRangeModalOpen: true }),

  closeStatsRangeModal: () => set({ statsRangeModalOpen: false }),

  applyCustomStatsRange: (start, end) => {
    const today = getLocalDateKey();
    if (!start || !end || start > end || end > today) return;

    set({
      statsPeriod: 'custom',
      statsRangeStart: start,
      statsRangeEnd: end,
      statsRangeModalOpen: false
    });
  },

  openStatsDeleteConfirm: (taskId) => set({ statsDeleteConfirmTaskId: taskId }),

  closeStatsDeleteConfirm: () => set({ statsDeleteConfirmTaskId: null }),

  confirmStatsDelete: async () => {
    const { statistics, sessionEvents, statsDeleteConfirmTaskId, selectedStatsTaskId } = get();
    if (!statsDeleteConfirmTaskId) return;

    const response = await sendRuntimeMessage({
      type: 'DELETE_TASK_STATISTICS',
      payload: { taskId: statsDeleteConfirmTaskId }
    });
    if (response && !response.ok) {
      throw new Error(response.error || 'Unable to delete task statistics.');
    }

    const nextStatistics = response?.statistics ??
      removeTaskStatistics(statistics, statsDeleteConfirmTaskId);
    const nextSessionEvents = response?.sessionEvents ??
      removeTaskSessionEvents(sessionEvents, statsDeleteConfirmTaskId);

    if (!response) {
      await setLocal({ statistics: nextStatistics, sessionEvents: nextSessionEvents });
    }

    set({
      statistics: nextStatistics,
      sessionEvents: nextSessionEvents,
      statsDeleteConfirmTaskId: null,
      selectedStatsTaskId:
        selectedStatsTaskId === statsDeleteConfirmTaskId ? null : selectedStatsTaskId
    });

  },

  selectStatsTask: (taskId) =>
    set({
      selectedStatsTaskId: taskId,
      statsTaskSelectionTouched: true
    }),

  applyAutoStatsTask: (taskId) =>
    set({
      selectedStatsTaskId: taskId,
      statsTaskSelectionTouched: false
    })
}));
