import { FOCUS_MUSIC_TRACKS, FOCUS_MUSIC_VOLUME, SETTINGS_FIELDS } from './constants';
import { FocusMode, FocusNotificationMode } from './types';

export const BUILT_IN_FOCUS_MODES: readonly FocusMode[] = [
  {
    id: 'builtin-classic',
    title: 'Classic',
    workMinutes: 25,
    shortBreakMinutes: 5,
    longRestMinutes: 15,
    cyclesBeforeRest: 4,
    autoStartBreaks: false,
    soundTrack: 'none',
    soundVolume: 0.45,
    sessionGoal: null,
    notificationMode: 'normal',
    accent: null,
    builtIn: true,
    createdAt: 0,
    updatedAt: 0
  },
  {
    id: 'builtin-deep-work',
    title: 'Deep Work',
    workMinutes: 50,
    shortBreakMinutes: 10,
    longRestMinutes: 20,
    cyclesBeforeRest: 2,
    autoStartBreaks: false,
    soundTrack: 'stream',
    soundVolume: 0.25,
    sessionGoal: 2,
    notificationMode: 'soft',
    accent: null,
    builtIn: true,
    createdAt: 0,
    updatedAt: 0
  },
  {
    id: 'builtin-writing-sprint',
    title: 'Writing Sprint',
    workMinutes: 25,
    shortBreakMinutes: 5,
    longRestMinutes: 15,
    cyclesBeforeRest: 4,
    autoStartBreaks: false,
    soundTrack: 'clock',
    soundVolume: 0.35,
    sessionGoal: 4,
    notificationMode: 'normal',
    accent: null,
    builtIn: true,
    createdAt: 0,
    updatedAt: 0
  },
  {
    id: 'builtin-study',
    title: 'Study',
    workMinutes: 30,
    shortBreakMinutes: 5,
    longRestMinutes: 15,
    cyclesBeforeRest: 4,
    autoStartBreaks: true,
    soundTrack: 'birds',
    soundVolume: 0.35,
    sessionGoal: 4,
    notificationMode: 'normal',
    accent: null,
    builtIn: true,
    createdAt: 0,
    updatedAt: 0
  },
  {
    id: 'builtin-quick-admin',
    title: 'Quick Admin',
    workMinutes: 15,
    shortBreakMinutes: 3,
    longRestMinutes: 10,
    cyclesBeforeRest: 4,
    autoStartBreaks: false,
    soundTrack: 'none',
    soundVolume: 0.45,
    sessionGoal: null,
    notificationMode: 'sound-only',
    accent: null,
    builtIn: true,
    createdAt: 0,
    updatedAt: 0
  }
] as const;

const BUILT_IN_IDS = new Set(BUILT_IN_FOCUS_MODES.map((mode) => mode.id));
const NOTIFICATION_MODES: FocusNotificationMode[] = ['normal', 'soft', 'sound-only'];
const MODE_TITLE_MAX_LENGTH = 80;

const cloneBuiltInModes = (): FocusMode[] => BUILT_IN_FOCUS_MODES.map((mode) => ({ ...mode }));

const clampInteger = (value: unknown, min: number, max: number, fallback: number): number => {
  const parsed = Math.round(Number(value));
  return Math.max(min, Math.min(max, Number.isFinite(parsed) ? parsed : fallback));
};

const clampVolume = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Math.max(
    FOCUS_MUSIC_VOLUME.min,
    Math.min(FOCUS_MUSIC_VOLUME.max, Number.isFinite(parsed) ? parsed : fallback)
  );
};

const normalizeTimestamp = (value: unknown): number => {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const normalizeFocusModes = (focusModes?: FocusMode[]): FocusMode[] => {
  const normalized = cloneBuiltInModes();
  const seen = new Set(normalized.map((mode) => mode.id));

  if (!Array.isArray(focusModes)) return normalized;

  for (const candidate of focusModes) {
    if (!candidate || typeof candidate !== 'object') continue;

    const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
    const title =
      typeof candidate.title === 'string'
        ? candidate.title.trim().replace(/\s+/g, ' ').slice(0, MODE_TITLE_MAX_LENGTH)
        : '';

    if (!id || !title || BUILT_IN_IDS.has(id) || seen.has(id)) continue;

    const createdAt = normalizeTimestamp(candidate.createdAt);
    const updatedAt = Math.max(createdAt, normalizeTimestamp(candidate.updatedAt));
    const soundTrack =
      candidate.soundTrack === 'none' ||
      FOCUS_MUSIC_TRACKS.some((track) => track.id === candidate.soundTrack)
        ? candidate.soundTrack
        : 'none';
    const notificationMode = NOTIFICATION_MODES.includes(candidate.notificationMode)
      ? candidate.notificationMode
      : 'normal';
    const rawGoal = candidate.sessionGoal;
    const sessionGoal =
      rawGoal === null || rawGoal === undefined
        ? null
        : clampInteger(rawGoal, 1, 100, 1);

    normalized.push({
      id,
      title,
      workMinutes: clampInteger(
        candidate.workMinutes,
        SETTINGS_FIELDS[0].min,
        SETTINGS_FIELDS[0].max,
        25
      ),
      shortBreakMinutes: clampInteger(
        candidate.shortBreakMinutes,
        SETTINGS_FIELDS[1].min,
        SETTINGS_FIELDS[1].max,
        5
      ),
      longRestMinutes: clampInteger(
        candidate.longRestMinutes,
        SETTINGS_FIELDS[2].min,
        SETTINGS_FIELDS[2].max,
        15
      ),
      cyclesBeforeRest: clampInteger(
        candidate.cyclesBeforeRest,
        SETTINGS_FIELDS[3].min,
        SETTINGS_FIELDS[3].max,
        4
      ),
      autoStartBreaks: Boolean(candidate.autoStartBreaks),
      soundTrack,
      soundVolume: clampVolume(candidate.soundVolume, 0.45),
      sessionGoal,
      notificationMode,
      accent:
        typeof candidate.accent === 'string' && candidate.accent.trim()
          ? candidate.accent.trim().slice(0, 64)
          : null,
      builtIn: false,
      createdAt,
      updatedAt
    });
    seen.add(id);
  }

  return normalized;
};
