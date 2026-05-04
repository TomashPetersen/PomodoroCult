export const NO_TASK_ID = 'task-no-task';
export const TASK_TITLE_MAX_LENGTH = 12;

export const SETTINGS_FIELDS = [
  { key: 'workTime', min: 1, max: 180 },
  { key: 'shortBreak', min: 1, max: 60 },
  { key: 'longBreak', min: 1, max: 120 },
  { key: 'longBreakInterval', min: 2, max: 20 }
] as const;

export const QUICK_STATS_PERIODS = ['1d', '7d', '30d'] as const;
