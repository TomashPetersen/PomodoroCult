import { create } from 'zustand';
import { NO_TASK_ID, NO_TASK_TITLE } from '../lib/constants';
import {
  applyThemeClass,
  clampTaskTitle,
  createTask,
  defaultTimerState,
  ensureNoTask,
  getDurationSeconds,
  getLocalDateKey,
  getPresetStatsRange,
  initializeStorage,
  normalizeSettings,
  setLocal,
  sortTasks
} from '../lib/storage';
import {
  AppScreen,
  DEFAULT_SETTINGS,
  RuntimeMessage,
  Settings,
  Statistics,
  StatsPeriod,
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
}

interface AppStore extends StoredData {
  hydrated: boolean;
  selectedScreen: AppScreen;
  selectedTimerMode: TimerMode;
  pulseStartMode: TimerMode | null;
  runtimeError: string | null;
  resetConfirmOpen: boolean;
  statsPeriod: StatsPeriod;
  statsRangeStart: string;
  statsRangeEnd: string;
  statsRangeModalOpen: boolean;
  selectedStatsTaskId: string | null;
  statsTaskSelectionTouched: boolean;
  settingsOpen: boolean;
  initialize: () => Promise<void>;
  setScreen: (screen: AppScreen) => void;
  setTimerMode: (mode: TimerMode) => void;
  clearRuntimeError: () => void;
  clearStartPulse: () => void;
  toggleTheme: () => Promise<void>;
  openSettings: () => void;
  closeSettings: () => void;
  saveSettings: (settings: Settings) => Promise<void>;
  startTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  openResetConfirm: () => void;
  closeResetConfirm: () => void;
  confirmReset: () => Promise<void>;
  selectTask: (taskId: string | null) => Promise<void>;
  addTask: (title: string) => Promise<void>;
  updateTask: (taskId: string, title: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  setStatsPeriod: (period: QuickStatsPeriod) => void;
  openStatsRangeModal: () => void;
  closeStatsRangeModal: () => void;
  applyCustomStatsRange: (start: string, end: string) => void;
  selectStatsTask: (taskId: string) => void;
  applyAutoStatsTask: (taskId: string | null) => void;
}

let storageListenerAttached = false;

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

const initialData: StoredData = {
  settings: DEFAULT_SETTINGS,
  tasks: [],
  timerState: defaultTimerState(DEFAULT_SETTINGS),
  statistics: {},
  theme: 'light'
};

const presetRange = getPresetStatsRange(1);

const getActionError = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialData,
  hydrated: false,
  selectedScreen: 'timer',
  selectedTimerMode: 'work',
  pulseStartMode: null,
  runtimeError: null,
  resetConfirmOpen: false,
  statsPeriod: '1d',
  statsRangeStart: presetRange.start,
  statsRangeEnd: presetRange.end,
  statsRangeModalOpen: false,
  selectedStatsTaskId: null,
  statsTaskSelectionTouched: false,
  settingsOpen: false,

  initialize: async () => {
    try {
      const data = await initializeStorage();
      applyThemeClass(data.theme);

      set({
        ...data,
        hydrated: true,
        selectedTimerMode: data.timerState.currentMode
      });

      if (!storageListenerAttached && typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName !== 'local') return;

          set((state) => {
            const patch: Partial<AppStore> = {};

            if (changes.settings?.newValue) {
              patch.settings = normalizeSettings(changes.settings.newValue);
            }

            if (changes.tasks?.newValue) {
              patch.tasks = sortTasks(changes.tasks.newValue as Task[]);
            }

            if (changes.statistics?.newValue) {
              patch.statistics = changes.statistics.newValue as Statistics;
            }

            if (changes.theme?.newValue) {
              const theme = changes.theme.newValue as ThemeMode;
              patch.theme = theme;
              applyThemeClass(theme);
            }

            if (changes.timerState?.newValue) {
              const timerState = changes.timerState.newValue as TimerState;
              patch.timerState = timerState;

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

      try {
        const response = await sendRuntimeMessage({ type: 'POPUP_ENSURE_READY' });
        if (response && !response.ok) {
          throw new Error(response.error || 'Runtime initialization failed');
        }
      } catch (error) {
        set({
          runtimeError: getActionError(error, 'Не удалось инициализировать фоновый таймер.')
        });
      }
    } catch (error) {
      set({
        hydrated: true,
        runtimeError: getActionError(error, 'Не удалось загрузить данные приложения.')
      });
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

  openSettings: () => set({ settingsOpen: true }),

  closeSettings: () => set({ settingsOpen: false }),

  saveSettings: async (rawSettings) => {
    const settings = normalizeSettings(rawSettings);
    const { timerState } = get();
    const nextTimerState = timerState.isRunning
      ? timerState
      : {
          ...timerState,
          remainingSeconds: getDurationSeconds(settings, timerState.currentMode),
          targetEndTime: null
        };

    set({
      settings,
      timerState: nextTimerState,
      settingsOpen: false
    });
    await setLocal({
      settings,
      timerState: nextTimerState
    });
  },

  startTimer: async () => {
    const { selectedTimerMode } = get();

    set({ runtimeError: null, pulseStartMode: null });

    try {
      const response = await sendRuntimeMessage({
        type: 'POPUP_START_TIMER',
        payload: { mode: selectedTimerMode }
      });

      if (!response?.ok) {
        throw new Error(response?.error || 'Start timer failed');
      }
    } catch (error) {
      set({
        runtimeError: getActionError(error, 'Не удалось запустить таймер.')
      });
    }
  },

  pauseTimer: async () => {
    const { timerState, selectedTimerMode } = get();
    if (!timerState.isRunning || timerState.currentMode !== selectedTimerMode) {
      return;
    }

    set({ runtimeError: null });

    try {
      const response = await sendRuntimeMessage({ type: 'POPUP_PAUSE_TIMER' });

      if (!response?.ok) {
        throw new Error(response?.error || 'Pause timer failed');
      }
    } catch (error) {
      set({
        runtimeError: getActionError(error, 'Не удалось остановить таймер.')
      });
    }
  },

  openResetConfirm: () => set({ resetConfirmOpen: true }),

  closeResetConfirm: () => set({ resetConfirmOpen: false }),

  confirmReset: async () => {
    set({
      resetConfirmOpen: false,
      runtimeError: null,
      pulseStartMode: null
    });

    try {
      const response = await sendRuntimeMessage({ type: 'POPUP_RESET_TIMER' });

      if (!response?.ok) {
        throw new Error(response?.error || 'Reset timer failed');
      }

      set({
        selectedTimerMode: 'work'
      });
    } catch (error) {
      set({
        runtimeError: getActionError(error, 'Не удалось сбросить таймер.')
      });
    }
  },

  selectTask: async (taskId) => {
    const { timerState, tasks } = get();
    if (timerState.isRunning) return;

    const exists = taskId === null || tasks.some((task) => task.id === taskId);
    if (!exists) return;

    const nextTimerState: TimerState = {
      ...timerState,
      activeTaskId: taskId
    };

    set({ timerState: nextTimerState });
    await setLocal({ timerState: nextTimerState });
  },

  addTask: async (rawTitle) => {
    const title = clampTaskTitle(rawTitle);
    if (!title) return;

    const { tasks } = get();
    const duplicate = tasks.some((task) => task.title.toLowerCase() === title.toLowerCase());
    if (duplicate) return;

    const nextTasks =
      title === NO_TASK_TITLE
        ? ensureNoTask(tasks)
        : sortTasks([...tasks, createTask(title)]);

    set({ tasks: nextTasks });
    await setLocal({ tasks: nextTasks });
  },

  updateTask: async (taskId, rawTitle) => {
    const title = clampTaskTitle(rawTitle);
    if (!title) return;

    const { tasks } = get();
    const target = tasks.find((task) => task.id === taskId);
    if (!target || target.system || taskId === NO_TASK_ID) return;

    const duplicate = tasks.some(
      (task) => task.id !== taskId && task.title.toLowerCase() === title.toLowerCase()
    );
    if (duplicate) return;

    const nextTasks = sortTasks(
      tasks.map((task) => (task.id === taskId ? { ...task, title } : task))
    );

    set({ tasks: nextTasks });
    await setLocal({ tasks: nextTasks });
  },

  deleteTask: async (taskId) => {
    const { tasks, timerState } = get();
    const target = tasks.find((task) => task.id === taskId);
    if (!target || target.system || taskId === NO_TASK_ID) return;

    const nextTasks = tasks.filter((task) => task.id !== taskId);
    const nextTimerState =
      timerState.activeTaskId === taskId
        ? {
            ...timerState,
            activeTaskId: null
          }
        : timerState;

    set({
      tasks: nextTasks,
      timerState: nextTimerState
    });
    await setLocal({
      tasks: nextTasks,
      timerState: nextTimerState
    });
  },

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
