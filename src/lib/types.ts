export type TimerMode = 'work' | 'shortBreak' | 'longBreak';
export type ThemeMode = 'light' | 'dark';
export type AppScreen = 'timer' | 'tasks' | 'stats';
export type StatsPeriod = '1d' | '7d' | '30d' | 'custom';
export type Locale = 'ru' | 'en';
export type LanguagePreference = 'auto' | Locale;

export interface Settings {
  workTime: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
  languagePreference: LanguagePreference;
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
}

export interface TimerState {
  isRunning: boolean;
  currentMode: TimerMode;
  remainingSeconds: number;
  targetEndTime: number | null;
  activeTaskId: string | null;
  completedSessions: number;
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
  settings: Settings;
  tasks: Task[];
  timerState: TimerState;
  statistics: Statistics;
  theme: ThemeMode;
}

export interface StartTimerPayload {
  mode: TimerMode;
  durationSeconds: number;
  targetEndTime: number;
  activeTaskId: string | null;
  statSeconds: number;
}

export type RuntimeMessage =
  | { type: 'POPUP_START_TIMER'; payload: { mode: TimerMode; startedAt: number } }
  | { type: 'POPUP_PAUSE_TIMER' }
  | { type: 'POPUP_RESET_TIMER' }
  | { type: 'POPUP_ENSURE_READY' }
  | { type: 'OFFSCREEN_START_TIMER'; payload: StartTimerPayload }
  | { type: 'OFFSCREEN_PAUSE_TIMER' }
  | { type: 'OFFSCREEN_STOP_TIMER' }
  | { type: 'OFFSCREEN_RESUME_TIMER' }
  | {
      type: 'TIMER_COMPLETED';
      payload: {
        mode: TimerMode;
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
  languagePreference: 'auto'
};

export const STORAGE_KEYS = {
  settings: 'settings',
  tasks: 'tasks',
  timerState: 'timerState',
  statistics: 'statistics',
  theme: 'theme'
} as const;
