export type TimerMode = 'work' | 'shortBreak' | 'longBreak';
export type TimerLifecycleState = 'idle' | 'running' | 'paused' | 'ready';
export type ThemeMode = 'light' | 'dark';
export type AppScreen = 'timer' | 'tasks' | 'stats';
export type StatsView = 'list' | 'chart';
export type StatsPeriod = '1d' | '7d' | '30d' | 'custom';
export type Locale = 'ru' | 'en';
export type LanguagePreference = 'auto' | Locale;
export type FocusMusicTrack = 'stream' | 'birds' | 'clock';
export type PlanTier = 'free' | 'pro';
export type FocusNotificationMode = 'normal' | 'soft' | 'sound-only';

export const CURRENT_STORAGE_VERSION = 3;

export interface Settings {
  workTime: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
  languagePreference: LanguagePreference;
  autoStartBreaks: boolean;
  focusMusicEnabled: boolean;
  focusMusicVolume: number;
  focusMusicTrack: FocusMusicTrack;
}

export interface Task {
  id: string;
  title: string;
  createdAt?: number;
  usageCount: number;
  lastUsed: number;
  system?: boolean;
  archived?: boolean;
  archivedAt?: number | null;
  focusModeId?: string | null;
}

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  cycleStarted: boolean;
  revision: number;
  currentMode: TimerMode;
  remainingSeconds: number;
  targetEndTime: number | null;
  cycleId: string | null;
  cycleStartedAt: number | null;
  activeCycleSnapshot: FocusModeSnapshot | null;
  activeTaskId: string | null;
  completedSessions: number;
}

export interface FocusModeSnapshot {
  appliedFocusModeId: string | null;
  workMinutes: number;
  shortBreakMinutes: number;
  longRestMinutes: number;
  cyclesBeforeRest: number;
  autoStartBreaks: boolean;
  soundTrack: FocusMusicTrack | 'none';
  soundVolume: number;
  notificationMode: FocusNotificationMode;
}

export interface FocusModeEditableValues {
  title: string;
  workMinutes: number;
  shortBreakMinutes: number;
  longRestMinutes: number;
  cyclesBeforeRest: number;
  autoStartBreaks: boolean;
  soundTrack: FocusMusicTrack | 'none';
  soundVolume: number;
}

export interface FocusMode {
  id: string;
  title: string;
  workMinutes: number;
  shortBreakMinutes: number;
  longRestMinutes: number;
  cyclesBeforeRest: number;
  autoStartBreaks: boolean;
  soundTrack: FocusMusicTrack | 'none';
  soundVolume: number;
  sessionGoal: number | null;
  notificationMode: FocusNotificationMode;
  accent: string | null;
  builtIn: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SessionEvent {
  id: string;
  taskId: string;
  taskTitleSnapshot: string;
  focusModeId: string | null;
  startedAt: number;
  completedAt: number;
  durationSeconds: number;
}

export interface TaskStatistics {
  taskId: string;
  title: string;
  sessions: number;
  seconds: number;
  lastSessionAt: number;
}

export interface DailyStatistics {
  date: string;
  sessions: number;
  seconds: number;
  tasks: Record<string, TaskStatistics>;
}

export type Statistics = Record<string, DailyStatistics>;

export interface StoredData {
  storageVersion: number;
  settings: Settings;
  tasks: Task[];
  timerState: TimerState;
  statistics: Statistics;
  focusModes: FocusMode[];
  selectedFocusModeId: string | null;
  manualSettings: Settings;
  sessionEvents: SessionEvent[];
  theme: ThemeMode;
}

export interface MigrationBackup {
  createdAt: number;
  fromVersion: number;
  toVersion: number;
  data: unknown;
}

export interface PersistedStorage extends StoredData {
  migrationBackup?: MigrationBackup | null;
}

export interface ExportedDataDocument {
  app: 'Pomodoro Cult';
  exportedAt: string;
  storageVersion: number;
  data: StoredData;
}

export interface StartTimerPayload {
  mode: TimerMode;
  cycleId: string;
  durationSeconds: number;
  targetEndTime: number;
  activeTaskId: string | null;
  statSeconds: number;
}

export type RuntimeMessage =
  | { type: 'POPUP_START_TIMER'; payload: { mode: TimerMode; startedAt: number } }
  | { type: 'POPUP_PAUSE_TIMER' }
  | { type: 'POPUP_RESET_TIMER' }
  | { type: 'POPUP_SKIP_SHORT_BREAK' }
  | { type: 'POPUP_ENSURE_READY' }
  | { type: 'DELETE_TASK_STATISTICS'; payload: { taskId: string } }
  | { type: 'SELECT_FOCUS_MODE'; payload: { focusModeId: string | null } }
  | { type: 'CREATE_FOCUS_MODE'; payload: { values: FocusModeEditableValues } }
  | {
      type: 'UPDATE_FOCUS_MODE';
      payload: { focusModeId: string; values: FocusModeEditableValues };
    }
  | { type: 'DELETE_FOCUS_MODE'; payload: { focusModeId: string } }
  | {
      type: 'SET_TASK_FOCUS_MODE';
      payload: { taskId: string; focusModeId: string | null };
    }
  | { type: 'SAVE_MANUAL_SETTINGS'; payload: { settings: Settings } }
  | { type: 'SELECT_TASK'; payload: { taskId: string | null } }
  | { type: 'ADD_TASK'; payload: { title: string; select: boolean } }
  | { type: 'UPDATE_TASK'; payload: { taskId: string; title: string } }
  | { type: 'DELETE_TASK'; payload: { taskId: string } }
  | { type: 'ARCHIVE_TASK'; payload: { taskId: string } }
  | { type: 'RESTORE_TASK'; payload: { taskId: string } }
  | {
      type: 'OPEN_APP_WINDOW';
      payload?: { screen?: AppScreen; statsView?: StatsView };
    }
  | { type: 'APP_WINDOW_NAVIGATE'; payload: { screen?: AppScreen; statsView?: StatsView } }
  | { type: 'APP_WINDOW_READY'; payload: { windowId: number } }
  | { type: 'TOGGLE_APP_WINDOW_MAXIMIZED' }
  | { type: 'APP_WINDOW_CLOSED' }
  | { type: 'OFFSCREEN_START_TIMER'; payload: StartTimerPayload }
  | { type: 'OFFSCREEN_PAUSE_TIMER' }
  | { type: 'OFFSCREEN_STOP_TIMER' }
  | { type: 'OFFSCREEN_RESUME_TIMER' }
  | {
      type: 'TIMER_COMPLETED';
      payload: {
        mode: TimerMode;
        cycleId: string;
        activeTaskId: string | null;
        durationSeconds: number;
        statSeconds: number;
      };
    };

export const DEFAULT_SETTINGS: Settings = {
  workTime: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 5,
  languagePreference: 'auto',
  autoStartBreaks: false,
  focusMusicEnabled: false,
  focusMusicVolume: 0.45,
  focusMusicTrack: 'stream'
};

export const STORAGE_KEYS = {
  storageVersion: 'storageVersion',
  settings: 'settings',
  tasks: 'tasks',
  timerState: 'timerState',
  statistics: 'statistics',
  focusModes: 'focusModes',
  selectedFocusModeId: 'selectedFocusModeId',
  manualSettings: 'manualSettings',
  sessionEvents: 'sessionEvents',
  theme: 'theme',
  migrationBackup: 'migrationBackup'
} as const;
