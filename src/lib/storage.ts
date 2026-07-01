import {
  FOCUS_MUSIC_TRACKS,
  FOCUS_MUSIC_VOLUME,
  NO_TASK_ID,
  SETTINGS_FIELDS,
  TASK_TITLE_MAX_LENGTH
} from './constants';
import { getTaskTitle } from './i18n';
import {
  CURRENT_STORAGE_VERSION,
  DEFAULT_SETTINGS,
  DailyStatistics,
  ExportedDataDocument,
  Locale,
  MigrationBackup,
  PersistedStorage,
  Settings,
  Statistics,
  StoredData,
  Task,
  ThemeMode,
  TimerLifecycleState,
  TimerMode,
  TimerState
} from './types';

export const defaultTimerState = (settings: Settings = DEFAULT_SETTINGS): TimerState => ({
  isRunning: false,
  isPaused: false,
  cycleStarted: false,
  revision: 0,
  currentMode: 'work',
  remainingSeconds: settings.workTime * 60,
  targetEndTime: null,
  activeTaskId: null,
  completedSessions: 0
});

const LEGACY_STORAGE_VERSION = 0;

const getStoredVersion = (value: unknown): number => {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : LEGACY_STORAGE_VERSION;
};

export const getDurationSeconds = (settings: Settings, mode: TimerMode): number => {
  if (mode === 'work') return settings.workTime * 60;
  if (mode === 'shortBreak') return settings.shortBreak * 60;
  return settings.longBreak * 60;
};

export const getRunningDisplaySeconds = (
  targetEndTime: number,
  now = Date.now()
): number => {
  const remainingMs = targetEndTime - now;
  if (remainingMs <= 0) return 0;
  return Math.max(0, Math.ceil(remainingMs / 1000));
};

export const getNextTimerRevision = (timerState: TimerState): number =>
  timerState.revision + 1;

export const getStartDurationSeconds = (
  settings: Settings,
  timerState: TimerState,
  mode: TimerMode
): number =>
  timerState.currentMode === mode && timerState.remainingSeconds > 0
    ? timerState.remainingSeconds
    : getDurationSeconds(settings, mode);

export const isResumingPausedTimer = (
  settings: Settings,
  timerState: TimerState,
  mode: TimerMode
): boolean => {
  const fullDuration = getDurationSeconds(settings, mode);

  return (
    !timerState.isRunning &&
    timerState.targetEndTime === null &&
    timerState.currentMode === mode &&
    timerState.remainingSeconds > 0 &&
    timerState.remainingSeconds < fullDuration
  );
};

export const getStartTargetEndTime = (
  settings: Settings,
  timerState: TimerState,
  mode: TimerMode,
  now = Date.now()
): number => {
  const durationSeconds = getStartDurationSeconds(settings, timerState, mode);
  return now + durationSeconds * 1000;
};

export const canStartTimerMode = (
  settings: Settings,
  timerState: TimerState,
  mode: TimerMode
): boolean => {
  if (timerState.isRunning) {
    return timerState.currentMode === mode;
  }
  return timerState.currentMode === mode;
};

export const hasStartedTimerCycle = (
  _settings: Settings,
  timerState: TimerState
): boolean => timerState.cycleStarted;

export const getTimerLifecycleState = (
  settings: Settings,
  timerState: TimerState
): TimerLifecycleState => {
  if (timerState.isRunning) return 'running';
  if (!hasStartedTimerCycle(settings, timerState)) return 'idle';
  if (timerState.isPaused) return 'paused';
  return 'ready';
};

export const isTimerTaskLocked = (settings: Settings, timerState: TimerState): boolean => {
  return hasStartedTimerCycle(settings, timerState);
};

export const areTimerDurationsLocked = (settings: Settings, timerState: TimerState): boolean => {
  return hasStartedTimerCycle(settings, timerState);
};

export const clampTaskTitle = (title: string): string =>
  title.trim().replace(/\s+/g, ' ').slice(0, TASK_TITLE_MAX_LENGTH);

export const getTaskTitleKey = (title: string): string => clampTaskTitle(title).toLocaleLowerCase('en');

export const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

type NumericSettingKey = (typeof SETTINGS_FIELDS)[number]['key'];

export const createTask = (title: string, system = false): Task => ({
  id: system ? NO_TASK_ID : createId(),
  title: clampTaskTitle(title),
  createdAt: Date.now(),
  usageCount: 0,
  lastUsed: 0,
  system,
  archived: false,
  archivedAt: null
});

export const createNoTask = (): Task => ({
  id: NO_TASK_ID,
  title: '',
  createdAt: 0,
  usageCount: 0,
  lastUsed: 0,
  system: true,
  archived: false,
  archivedAt: null
});

const normalizeSettingNumber = (settings: Partial<Settings> | undefined, key: NumericSettingKey): number => {
  const field = SETTINGS_FIELDS.find((item) => item.key === key)!;
  const value = Math.round(Number(settings?.[key] ?? DEFAULT_SETTINGS[key]));
  return Math.max(field.min, Math.min(field.max, Number.isFinite(value) ? value : DEFAULT_SETTINGS[key]));
};

export const normalizeSettings = (settings?: Partial<Settings>): Settings => {
  const focusMusicTrack = settings?.focusMusicTrack;

  return {
    workTime: normalizeSettingNumber(settings, 'workTime'),
    shortBreak: normalizeSettingNumber(settings, 'shortBreak'),
    longBreak: normalizeSettingNumber(settings, 'longBreak'),
    longBreakInterval: normalizeSettingNumber(settings, 'longBreakInterval'),
    languagePreference:
      settings?.languagePreference === 'ru' || settings?.languagePreference === 'en'
        ? settings.languagePreference
        : 'auto',
    autoStartBreaks: Boolean(settings?.autoStartBreaks),
    focusMusicEnabled: Boolean(settings?.focusMusicEnabled),
    focusMusicVolume: Math.max(
      FOCUS_MUSIC_VOLUME.min,
      Math.min(
        FOCUS_MUSIC_VOLUME.max,
        Number.isFinite(Number(settings?.focusMusicVolume))
          ? Number(settings?.focusMusicVolume)
          : DEFAULT_SETTINGS.focusMusicVolume
      )
    ),
    focusMusicTrack: FOCUS_MUSIC_TRACKS.some((track) => track.id === focusMusicTrack)
      ? focusMusicTrack!
      : DEFAULT_SETTINGS.focusMusicTrack
  };
};

export const normalizeTasks = (tasks?: Task[]): Task[] => {
  const seen = new Set<string>();
  const normalized: Task[] = [];

  if (!Array.isArray(tasks)) {
    return [];
  }

  for (const task of tasks) {
    if (!task || typeof task !== 'object') continue;

    const title = clampTaskTitle(typeof task.title === 'string' ? task.title : '');
    const rawId = typeof task.id === 'string' ? task.id : '';
    const id = rawId === NO_TASK_ID || task.system ? NO_TASK_ID : rawId || createId();

    if (id !== NO_TASK_ID && !title) continue;
    if (seen.has(id)) continue;
    seen.add(id);

    normalized.push({
      id,
      title: id === NO_TASK_ID ? '' : title,
      createdAt:
        id === NO_TASK_ID
          ? 0
          : Number(task.createdAt) > 0
            ? Number(task.createdAt)
            : Math.max(0, Number(task.lastUsed) || 0),
      usageCount: Math.max(0, Number(task.usageCount) || 0),
      lastUsed: Math.max(0, Number(task.lastUsed) || 0),
      system: id === NO_TASK_ID || Boolean(task.system),
      archived: id === NO_TASK_ID ? false : Boolean(task.archived),
      archivedAt: Number(task.archivedAt) > 0 ? Number(task.archivedAt) : null
    });
  }

  return normalized.sort(sortTasksByUse);
};

export const normalizeStatistics = (statistics?: Statistics): Statistics => {
  if (!statistics || typeof statistics !== 'object' || Array.isArray(statistics)) {
    return {};
  }

  return statistics;
};

export const ensureNoTask = (tasks: Task[]): Task[] => {
  const normalized = normalizeTasks(tasks);
  const existing = normalized.find((task) => task.id === NO_TASK_ID);

  if (!existing) {
    return sortTasks([createNoTask(), ...normalized]);
  }

  return sortTasks(
    normalized.map((task) =>
      task.id === NO_TASK_ID
        ? {
            ...task,
            title: '',
            createdAt: 0,
            system: true,
            archived: false,
            archivedAt: null
          }
        : task
    )
  );
};

export const sortTasksByUse = (a: Task, b: Task): number => {
  if (a.id === NO_TASK_ID && b.id !== NO_TASK_ID) return -1;
  if (b.id === NO_TASK_ID && a.id !== NO_TASK_ID) return 1;
  if ((b.createdAt ?? 0) !== (a.createdAt ?? 0)) return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  if (b.lastUsed !== a.lastUsed) return b.lastUsed - a.lastUsed;
  if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
  return 0;
};

export const sortTasks = (tasks: Task[]): Task[] => [...tasks].sort(sortTasksByUse);

export const getActiveTasks = (tasks: Task[], priorityTaskId?: string | null): Task[] => {
  const normalized = ensureNoTask(tasks);
  const active = normalized.filter((task) => task.id === NO_TASK_ID || !task.archived);

  return active.sort((a, b) => {
    if (a.id === NO_TASK_ID && b.id !== NO_TASK_ID) return -1;
    if (b.id === NO_TASK_ID && a.id !== NO_TASK_ID) return 1;
    if (priorityTaskId && a.id === priorityTaskId && b.id !== priorityTaskId) return -1;
    if (priorityTaskId && b.id === priorityTaskId && a.id !== priorityTaskId) return 1;
    return sortTasksByUse(a, b);
  });
};

export const getArchivedTasks = (tasks: Task[]): Task[] =>
  normalizeTasks(tasks)
    .filter((task) => task.id !== NO_TASK_ID && task.archived)
    .sort((a, b) => {
      if ((b.archivedAt ?? 0) !== (a.archivedAt ?? 0)) {
        return (b.archivedAt ?? 0) - (a.archivedAt ?? 0);
      }
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });

export const hasActiveTaskTitle = (
  tasks: Task[],
  title: string,
  excludeTaskId?: string | null
): boolean => {
  const key = getTaskTitleKey(title);
  if (!key) return false;

  return normalizeTasks(tasks).some(
    (task) =>
      task.id !== NO_TASK_ID &&
      task.id !== excludeTaskId &&
      !task.archived &&
      getTaskTitleKey(task.title) === key
  );
};

export const getTaskSessionCount = (
  statistics: Statistics,
  taskId: string | null
): number => {
  const resolvedTaskId = taskId ?? NO_TASK_ID;

  return Object.values(statistics).reduce((total, day) => {
    const taskStat = day.tasks[resolvedTaskId];
    return total + (taskStat?.sessions ?? 0);
  }, 0);
};

export const removeTaskStatistics = (
  statistics: Statistics,
  taskId: string
): Statistics => {
  const nextStatistics: Statistics = {};

  for (const [date, day] of Object.entries(statistics)) {
    const taskStat = day.tasks[taskId];

    if (!taskStat) {
      nextStatistics[date] = day;
      continue;
    }

    const nextTasks = { ...day.tasks };
    delete nextTasks[taskId];

    const nextSessions = Math.max(0, day.sessions - taskStat.sessions);
    const nextSeconds = Math.max(0, day.seconds - taskStat.seconds);

    if (Object.keys(nextTasks).length === 0 || (nextSessions === 0 && nextSeconds === 0)) {
      continue;
    }

    nextStatistics[date] = {
      ...day,
      tasks: nextTasks,
      sessions: nextSessions,
      seconds: nextSeconds
    };
  }

  return nextStatistics;
};

export const formatCompactCount = (locale: Locale, count: number): string => {
  if (count < 1000) return String(count);

  const value = count / 1000;
  const formatted = value.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });

  return locale === 'ru' ? `${formatted} к` : `${formatted}K`;
};

export const getDisplayTaskTitle = (locale: Locale, task: Pick<Task, 'id' | 'title'>): string =>
  getTaskTitle(locale, task.id, task.title);

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

const getLocal = <T extends Partial<PersistedStorage>>(keys?: string[] | null): Promise<T> =>
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

export const setLocal = (value: Partial<PersistedStorage>): Promise<void> =>
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

export const normalizeStoredData = (stored: Partial<PersistedStorage> = {}): StoredData => {
  const settings = normalizeSettings(stored.settings);
  const timerDefaults = defaultTimerState(settings);
  const storedMode = stored.timerState?.currentMode ?? timerDefaults.currentMode;
  const storedRemainingSeconds =
    Number(stored.timerState?.remainingSeconds) > 0
      ? Number(stored.timerState?.remainingSeconds)
      : timerDefaults.remainingSeconds;
  const storedCompletedSessions = Math.max(
    0,
    Number(stored.timerState?.completedSessions) || 0
  );
  const legacyCycleStarted =
    Boolean(stored.timerState?.isRunning) ||
    storedMode !== 'work' ||
    storedCompletedSessions > 0 ||
    storedRemainingSeconds !== getDurationSeconds(settings, 'work');
  const legacyIsPaused =
    !stored.timerState?.isRunning &&
    stored.timerState?.targetEndTime == null &&
    storedRemainingSeconds > 0 &&
    storedRemainingSeconds < getDurationSeconds(settings, storedMode);
  const timerState: TimerState = {
    ...timerDefaults,
    ...(stored.timerState ?? {}),
    currentMode: storedMode,
    remainingSeconds: storedRemainingSeconds,
    completedSessions: storedCompletedSessions,
    targetEndTime: stored.timerState?.targetEndTime ?? null,
    activeTaskId: stored.timerState?.activeTaskId ?? null,
    isRunning: Boolean(stored.timerState?.isRunning),
    isPaused:
      typeof stored.timerState?.isPaused === 'boolean'
        ? stored.timerState.isPaused
        : legacyIsPaused,
    revision: Math.max(0, Number(stored.timerState?.revision) || 0),
    cycleStarted:
      typeof stored.timerState?.cycleStarted === 'boolean'
        ? stored.timerState.cycleStarted
        : legacyCycleStarted
  };

  return {
    storageVersion: CURRENT_STORAGE_VERSION,
    settings,
    tasks: normalizeTasks(stored.tasks),
    timerState,
    statistics: normalizeStatistics(stored.statistics),
    theme: stored.theme === 'dark' ? 'dark' : 'light'
  };
};

export const createMigrationBackup = (
  stored: Partial<PersistedStorage>,
  toVersion = CURRENT_STORAGE_VERSION
): MigrationBackup => ({
  createdAt: Date.now(),
  fromVersion: getStoredVersion(stored.storageVersion),
  toVersion,
  data: stored
});

export const migrateStoredData = (
  stored: Partial<PersistedStorage> = {}
): { data: StoredData; backup: MigrationBackup | null; migrated: boolean } => {
  const fromVersion = getStoredVersion(stored.storageVersion);
  const data = normalizeStoredData(stored);
  const migrated = fromVersion < CURRENT_STORAGE_VERSION;

  return {
    data,
    backup: migrated ? createMigrationBackup(stored) : null,
    migrated
  };
};

export const readStoredData = async (): Promise<StoredData> => {
  const stored = await getLocal<Partial<PersistedStorage>>();
  return migrateStoredData(stored).data;
};

export const initializeStorage = async (): Promise<StoredData> => {
  const stored = await getLocal<Partial<PersistedStorage>>();
  const { data, backup } = migrateStoredData(stored);
  await setLocal(backup ? { ...data, migrationBackup: backup } : data);
  return data;
};

const getSafeImportedTimerState = (data: StoredData): TimerState => ({
  ...defaultTimerState(data.settings),
  activeTaskId: data.timerState.activeTaskId
});

export const createExportDocument = async (): Promise<ExportedDataDocument> => {
  const data = await readStoredData();

  return {
    app: 'Pomodoro Cult',
    exportedAt: new Date().toISOString(),
    storageVersion: CURRENT_STORAGE_VERSION,
    data
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const hasImportableStorageKey = (value: Record<string, unknown>): boolean =>
  'settings' in value ||
  'tasks' in value ||
  'timerState' in value ||
  'statistics' in value ||
  'theme' in value;

export const parseExportDocument = (raw: string): StoredData => {
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    throw new Error('Invalid backup format.');
  }

  const candidate =
    'data' in parsed &&
    isRecord(parsed.data)
      ? parsed.data
      : parsed;

  if (!isRecord(candidate) || !hasImportableStorageKey(candidate)) {
    throw new Error('Invalid backup format.');
  }

  const data = normalizeStoredData(candidate as Partial<PersistedStorage>);

  return {
    ...data,
    timerState: getSafeImportedTimerState(data)
  };
};

export const importStoredData = async (raw: string): Promise<StoredData> => {
  const current = await getLocal<Partial<PersistedStorage>>();
  const backup = createMigrationBackup(current, CURRENT_STORAGE_VERSION);
  const data = parseExportDocument(raw);
  await setLocal({ ...data, migrationBackup: backup });
  return data;
};

export const applyThemeClass = (theme: ThemeMode): void => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
};
