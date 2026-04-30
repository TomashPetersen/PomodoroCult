import { create } from 'zustand';
import {
  applyThemeClass,
  clampTaskTitle,
  createTask,
  defaultTimerState,
  ensureNoTask,
  getDurationSeconds,
  getLocalDateKey,
  initializeStorage,
  normalizeSettings,
  setLocal,
  sortTasks
} from '../lib/storage';
import {
  AppScreen,
  DEFAULT_SETTINGS,
  NO_TASK_ID,
  NO_TASK_TITLE,
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

interface AppStore extends StoredData {
  hydrated: boolean;
  selectedScreen: AppScreen;
  selectedTimerMode: TimerMode;
  statsPeriod: StatsPeriod;
  statsDate: string;
  selectedStatsTaskId: string | null;
  settingsOpen: boolean;
  initialize: () => Promise<void>;
  setScreen: (screen: AppScreen) => void;
  setTimerMode: (mode: TimerMode) => void;
  toggleTheme: () => Promise<void>;
  openSettings: () => void;
  closeSettings: () => void;
  saveSettings: (settings: Settings) => Promise<void>;
  startTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  resetTimer: () => Promise<void>;
  selectTask: (taskId: string | null) => Promise<void>;
  addTask: (title: string) => Promise<void>;
  updateTask: (taskId: string, title: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  setStatsPeriod: (period: StatsPeriod) => void;
  setStatsDate: (date: string) => void;
  toggleStatsTask: (taskId: string) => void;
}

let storageListenerAttached = false;

const canUseRuntime = (): boolean =>
  typeof chrome !== 'undefined' && Boolean(chrome.runtime?.sendMessage);

const sendRuntimeMessage = <T>(message: RuntimeMessage): Promise<T | null> =>
  new Promise((resolve, reject) => {
    if (!canUseRuntime()) {
      resolve(null);
      return;
    }

    chrome.runtime.sendMessage(message, (response: T) => {
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

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialData,
  hydrated: false,
  selectedScreen: 'timer',
  selectedTimerMode: 'work',
  statsPeriod: '1d',
  statsDate: getLocalDateKey(),
  selectedStatsTaskId: null,
  settingsOpen: false,

  initialize: async () => {
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
          }

          return patch;
        });
      });
      storageListenerAttached = true;
    }

    await sendRuntimeMessage({ type: 'POPUP_ENSURE_READY' });
  },

  setScreen: (screen) => set({ selectedScreen: screen }),

  setTimerMode: (mode) => set({ selectedTimerMode: mode }),

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
    await sendRuntimeMessage({ type: 'POPUP_START_TIMER' });
  },

  pauseTimer: async () => {
    await sendRuntimeMessage({ type: 'POPUP_PAUSE_TIMER' });
  },

  resetTimer: async () => {
    await sendRuntimeMessage({ type: 'POPUP_RESET_TIMER' });
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

  setStatsPeriod: (period) => set({ statsPeriod: period, selectedStatsTaskId: null }),

  setStatsDate: (date) => {
    const today = getLocalDateKey();
    if (date > today) return;
    set({ statsDate: date, selectedStatsTaskId: null });
  },

  toggleStatsTask: (taskId) =>
    set((state) => ({
      selectedStatsTaskId: state.selectedStatsTaskId === taskId ? null : taskId
    }))
}));
