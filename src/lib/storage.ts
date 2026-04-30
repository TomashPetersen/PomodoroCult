import { NO_TASK_ID, NO_TASK_TITLE, TASK_TITLE_MAX_LENGTH } from './constants';
import {
  DEFAULT_SETTINGS,
  DailyStatistics,
  Settings,
  Statistics,
  StoredData,
  Task,
  ThemeMode,
  TimerMode,
  TimerState
} from './types';

export const defaultTimerState = (settings: Settings = DEFAULT_SETTINGS): TimerState => ({
  isRunning: false,
  currentMode: 'work',
  remainingSeconds: settings.workTime * 60,
  targetEndTime: null,
  activeTaskId: null,
  completedSessions: 0
});

export const getDurationSeconds = (settings: Settings, mode: TimerMode): number => {
  if (mode === 'work') return settings.workTime * 60;
  if (mode === 'shortBreak') return settings.shortBreak * 60;
  return settings.longBreak * 60;
};

export const clampTaskTitle = (title: string): string =>
  title.trim().replace(/\s+/g, ' ').slice(0, TASK_TITLE_MAX_LENGTH);

export const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const createTask = (title: string, system = false): Task => ({
  id: system ? NO_TASK_ID : createId(),
  title: clampTaskTitle(title),
  usageCount: 0,
  lastUsed: 0,
  system
});

export const createNoTask = (): Task => ({
  id: NO_TASK_ID,
  title: NO_TASK_TITLE,
  usageCount: 0,
  lastUsed: 0,
  system: true
});

export const normalizeSettings = (settings?: Partial<Settings>): Settings => ({
  workTime: Math.max(1, Math.round(Number(settings?.workTime ?? DEFAULT_SETTINGS.workTime))),
  shortBreak: Math.max(1, Math.round(Number(settings?.shortBreak ?? DEFAULT_SETTINGS.shortBreak))),
  longBreak: Math.max(1, Math.round(Number(settings?.longBreak ?? DEFAULT_SETTINGS.longBreak))),
  longBreakInterval: Math.max(
    1,
    Math.round(Number(settings?.longBreakInterval ?? DEFAULT_SETTINGS.longBreakInterval))
  )
});

export const normalizeTasks = (tasks?: Task[]): Task[] => {
  const seen = new Set<string>();
  const normalized: Task[] = [];

  for (const task of tasks ?? []) {
    const title = clampTaskTitle(task.title);
    const id = task.id === NO_TASK_ID || title === NO_TASK_TITLE ? NO_TASK_ID : task.id || createId();

    if (!title || seen.has(id)) continue;
    seen.add(id);

    normalized.push({
      id,
      title: id === NO_TASK_ID ? NO_TASK_TITLE : title,
      usageCount: Math.max(0, Number(task.usageCount) || 0),
      lastUsed: Math.max(0, Number(task.lastUsed) || 0),
      system: id === NO_TASK_ID || Boolean(task.system)
    });
  }

  return normalized.sort(sortTasksByUse);
};

export const ensureNoTask = (tasks: Task[]): Task[] => {
  const normalized = normalizeTasks(tasks);
  const existing = normalized.find((task) => task.id === NO_TASK_ID || task.title === NO_TASK_TITLE);

  if (!existing) {
    return sortTasks([createNoTask(), ...normalized]);
  }

  return sortTasks(
    normalized.map((task) =>
      task.id === existing.id
        ? {
            ...task,
            id: NO_TASK_ID,
            title: NO_TASK_TITLE,
            system: true
          }
        : task
    )
  );
};

export const sortTasksByUse = (a: Task, b: Task): number => {
  if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
  if (b.lastUsed !== a.lastUsed) return b.lastUsed - a.lastUsed;
  return a.title.localeCompare(b.title, 'ru');
};

export const sortTasks = (tasks: Task[]): Task[] => [...tasks].sort(sortTasksByUse);

export const getLocalDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDateRange = (endDateKey: string, days: number): string[] => {
  const result: string[] = [];
  const end = new Date(`${endDateKey}T12:00:00`);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(end);
    date.setDate(end.getDate() - offset);
    result.push(getLocalDateKey(date));
  }

  return result;
};

export const getDateRangeBetween = (startDateKey: string, endDateKey: string): string[] => {
  const start = new Date(`${startDateKey}T12:00:00`);
  const end = new Date(`${endDateKey}T12:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }

  const result: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    result.push(getLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
};

export const getPresetStatsRange = (
  days: number,
  endDateKey = getLocalDateKey()
): { start: string; end: string } => {
  const range = getDateRange(endDateKey, days);
  return {
    start: range[0] ?? endDateKey,
    end: range[range.length - 1] ?? endDateKey
  };
};

export const addSessionStatistics = (
  statistics: Statistics,
  taskId: string,
  title: string,
  seconds: number,
  now = Date.now()
): Statistics => {
  const date = getLocalDateKey(new Date(now));
  const day: DailyStatistics = statistics[date] ?? {
    date,
    sessions: 0,
    seconds: 0,
    tasks: {}
  };
  const taskStat = day.tasks[taskId] ?? {
    taskId,
    title,
    sessions: 0,
    seconds: 0,
    lastSessionAt: 0
  };

  return {
    ...statistics,
    [date]: {
      ...day,
      sessions: day.sessions + 1,
      seconds: day.seconds + seconds,
      tasks: {
        ...day.tasks,
        [taskId]: {
          ...taskStat,
          title,
          sessions: taskStat.sessions + 1,
          seconds: taskStat.seconds + seconds,
          lastSessionAt: now
        }
      }
    }
  };
};

export const hasChromeStorage = (): boolean =>
  typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);

const getLocal = <T extends Partial<StoredData>>(keys?: string[] | null): Promise<T> =>
  new Promise((resolve, reject) => {
    if (!hasChromeStorage()) {
      resolve({} as T);
      return;
    }

    chrome.storage.local.get(keys ?? null, (value) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(value as T);
    });
  });

export const setLocal = (value: Partial<StoredData>): Promise<void> =>
  new Promise((resolve, reject) => {
    if (!hasChromeStorage()) {
      resolve();
      return;
    }

    chrome.storage.local.set(value, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });

export const readStoredData = async (): Promise<StoredData> => {
  const stored = await getLocal<Partial<StoredData>>();
  const settings = normalizeSettings(stored.settings);
  const timerDefaults = defaultTimerState(settings);
  const timerState: TimerState = {
    ...timerDefaults,
    ...(stored.timerState ?? {}),
    currentMode: stored.timerState?.currentMode ?? timerDefaults.currentMode,
    remainingSeconds:
      Number(stored.timerState?.remainingSeconds) > 0
        ? Number(stored.timerState?.remainingSeconds)
        : timerDefaults.remainingSeconds,
    completedSessions: Math.max(0, Number(stored.timerState?.completedSessions) || 0),
    targetEndTime: stored.timerState?.targetEndTime ?? null,
    activeTaskId: stored.timerState?.activeTaskId ?? null,
    isRunning: Boolean(stored.timerState?.isRunning)
  };

  return {
    settings,
    tasks: normalizeTasks(stored.tasks),
    timerState,
    statistics: stored.statistics ?? {},
    theme: stored.theme === 'dark' ? 'dark' : 'light'
  };
};

export const initializeStorage = async (): Promise<StoredData> => {
  const data = await readStoredData();
  await setLocal(data);
  return data;
};

export const applyThemeClass = (theme: ThemeMode): void => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
};
