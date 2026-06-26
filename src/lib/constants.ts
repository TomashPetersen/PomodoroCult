export const NO_TASK_ID = 'task-no-task';
export const TASK_TITLE_MAX_LENGTH = 40;
export const DONATION_URL = '';

export const SETTINGS_FIELDS = [
  { key: 'workTime', min: 1, max: 180 },
  { key: 'shortBreak', min: 1, max: 60 },
  { key: 'longBreak', min: 1, max: 120 },
  { key: 'longBreakInterval', min: 2, max: 20 }
] as const;

export const QUICK_STATS_PERIODS = ['1d', '7d', '30d'] as const;

export const FOCUS_MUSIC_VOLUME = {
  min: 0,
  max: 1,
  step: 0.05
} as const;

export const FOCUS_MUSIC_TRACKS = [
  {
    id: 'stream',
    labelKey: 'focusMusicTrackStream',
    src: 'sounds/focus-stream.ogg'
  },
  {
    id: 'birds',
    labelKey: 'focusMusicTrackBirds',
    src: 'sounds/focus-birds.ogg'
  },
  {
    id: 'clock',
    labelKey: 'focusMusicTrackClock',
    src: 'sounds/focus-clock.wav'
  }
] as const;
