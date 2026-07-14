export type AppWindowState = 'fullscreen' | 'normal';

export const APP_WINDOW_SESSION_KEY = 'pomodoroCultAppWindowId';

export const normalizeAppWindowId = (value: unknown): number | null =>
  Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;

export const getNextAppWindowState = (currentState: string | undefined): AppWindowState =>
  currentState === 'fullscreen' ? 'normal' : 'fullscreen';
