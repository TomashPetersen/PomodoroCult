import { FOCUS_MUSIC_TRACKS, FOCUS_MUSIC_VOLUME, SETTINGS_FIELDS } from './constants';
import {
  DEFAULT_SETTINGS,
  FocusMode,
  FocusModeEditableValues,
  FocusModeSnapshot,
  FocusNotificationMode,
  Settings,
  StoredData,
  Task,
  TimerMode
} from './types';

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
export const FOCUS_MODE_TITLE_MAX_LENGTH = MODE_TITLE_MAX_LENGTH;

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
  const seenTitles = new Set(normalized.map((mode) => mode.title.toLocaleLowerCase('en')));

  if (!Array.isArray(focusModes)) return normalized;

  for (const candidate of focusModes) {
    if (!candidate || typeof candidate !== 'object') continue;

    const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
    const title =
      typeof candidate.title === 'string'
        ? candidate.title.trim().replace(/\s+/g, ' ').slice(0, MODE_TITLE_MAX_LENGTH)
        : '';

    const titleKey = title.toLocaleLowerCase('en');
    if (!id || !title || BUILT_IN_IDS.has(id) || seen.has(id) || seenTitles.has(titleKey)) continue;

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
    seenTitles.add(titleKey);
  }

  return normalized;
};

const normalizeTitle = (title: unknown): string =>
  typeof title === 'string'
    ? title.trim().replace(/\s+/g, ' ').slice(0, MODE_TITLE_MAX_LENGTH)
    : '';

const getTitleKey = (title: string): string => normalizeTitle(title).toLocaleLowerCase('en');

const createCustomModeId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `custom-${crypto.randomUUID()}`;
  }
  return `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeEditableValues = (
  values: FocusModeEditableValues,
  fallback?: FocusMode
): FocusModeEditableValues => {
  const candidate = normalizeFocusModes([
    {
      id: 'custom-normalization-candidate',
      title: values.title,
      workMinutes: values.workMinutes,
      shortBreakMinutes: values.shortBreakMinutes,
      longRestMinutes: values.longRestMinutes,
      cyclesBeforeRest: values.cyclesBeforeRest,
      autoStartBreaks: values.autoStartBreaks,
      soundTrack: values.soundTrack,
      soundVolume: values.soundVolume,
      sessionGoal: null,
      notificationMode: 'normal',
      accent: null,
      builtIn: false,
      createdAt: 0,
      updatedAt: 0
    }
  ]).find((mode) => mode.id === 'custom-normalization-candidate');

  if (!candidate) {
    throw new Error('Invalid Focus Mode values.');
  }
  if (candidate.shortBreakMinutes > candidate.longRestMinutes) {
    throw new Error('Short break cannot be longer than long rest.');
  }

  return {
    title: candidate.title || fallback?.title || '',
    workMinutes: candidate.workMinutes,
    shortBreakMinutes: candidate.shortBreakMinutes,
    longRestMinutes: candidate.longRestMinutes,
    cyclesBeforeRest: candidate.cyclesBeforeRest,
    autoStartBreaks: candidate.autoStartBreaks,
    soundTrack: candidate.soundTrack,
    soundVolume: candidate.soundVolume
  };
};

const assertUniqueTitle = (
  focusModes: FocusMode[],
  title: string,
  excludeId?: string
): void => {
  const key = getTitleKey(title);
  if (!key || focusModes.some((mode) => mode.id !== excludeId && getTitleKey(mode.title) === key)) {
    throw new Error('Focus Mode title must be unique.');
  }
};

export const createCustomFocusMode = (
  focusModes: FocusMode[],
  values: FocusModeEditableValues,
  now = Date.now()
): { focusModes: FocusMode[]; focusMode: FocusMode } => {
  const normalizedModes = normalizeFocusModes(focusModes);
  const normalizedValues = normalizeEditableValues(values);
  assertUniqueTitle(normalizedModes, normalizedValues.title);

  const focusMode: FocusMode = {
    id: createCustomModeId(),
    ...normalizedValues,
    sessionGoal: null,
    notificationMode: 'normal',
    accent: null,
    builtIn: false,
    createdAt: now,
    updatedAt: now
  };

  return {
    focusMode,
    focusModes: normalizeFocusModes([...normalizedModes, focusMode])
  };
};

export const updateCustomFocusMode = (
  focusModes: FocusMode[],
  focusModeId: string,
  values: FocusModeEditableValues,
  now = Date.now()
): { focusModes: FocusMode[]; focusMode: FocusMode } => {
  const normalizedModes = normalizeFocusModes(focusModes);
  const current = normalizedModes.find((mode) => mode.id === focusModeId);
  if (!current || current.builtIn) throw new Error('Built-in Focus Modes cannot be edited.');

  const normalizedValues = normalizeEditableValues(values, current);
  assertUniqueTitle(normalizedModes, normalizedValues.title, focusModeId);
  const focusMode: FocusMode = {
    ...current,
    ...normalizedValues,
    updatedAt: Math.max(current.createdAt, now)
  };

  return {
    focusMode,
    focusModes: normalizeFocusModes(
      normalizedModes.map((mode) => (mode.id === focusModeId ? focusMode : mode))
    )
  };
};

export const settingsToFocusModeSnapshot = (
  settings: Settings,
  appliedFocusModeId: string | null = null
): FocusModeSnapshot => ({
  appliedFocusModeId,
  workMinutes: settings.workTime,
  shortBreakMinutes: settings.shortBreak,
  longRestMinutes: settings.longBreak,
  cyclesBeforeRest: settings.longBreakInterval,
  autoStartBreaks: settings.autoStartBreaks,
  soundTrack: settings.focusMusicEnabled ? settings.focusMusicTrack : 'none',
  soundVolume: settings.focusMusicVolume,
  notificationMode: 'normal'
});

export const focusModeToSnapshot = (focusMode: FocusMode): FocusModeSnapshot => ({
  appliedFocusModeId: focusMode.id,
  workMinutes: focusMode.workMinutes,
  shortBreakMinutes: focusMode.shortBreakMinutes,
  longRestMinutes: focusMode.longRestMinutes,
  cyclesBeforeRest: focusMode.cyclesBeforeRest,
  autoStartBreaks: focusMode.autoStartBreaks,
  soundTrack: focusMode.soundTrack,
  soundVolume: focusMode.soundVolume,
  notificationMode: focusMode.notificationMode
});

export const normalizeFocusModeSnapshot = (
  snapshot: FocusModeSnapshot | null | undefined,
  fallbackSettings = DEFAULT_SETTINGS
): FocusModeSnapshot | null => {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const candidate = normalizeFocusModes([
    {
      id: 'snapshot-normalization-candidate',
      title: 'Snapshot',
      workMinutes: snapshot.workMinutes,
      shortBreakMinutes: snapshot.shortBreakMinutes,
      longRestMinutes: snapshot.longRestMinutes,
      cyclesBeforeRest: snapshot.cyclesBeforeRest,
      autoStartBreaks: snapshot.autoStartBreaks,
      soundTrack: snapshot.soundTrack,
      soundVolume: snapshot.soundVolume,
      sessionGoal: null,
      notificationMode: snapshot.notificationMode,
      accent: null,
      builtIn: false,
      createdAt: 0,
      updatedAt: 0
    }
  ]).find((mode) => mode.id === 'snapshot-normalization-candidate');

  return candidate
    ? {
        ...focusModeToSnapshot(candidate),
        appliedFocusModeId:
          typeof snapshot.appliedFocusModeId === 'string' && snapshot.appliedFocusModeId.trim()
            ? snapshot.appliedFocusModeId.trim()
            : null
      }
    : settingsToFocusModeSnapshot(fallbackSettings);
};

export const getSnapshotDurationSeconds = (
  snapshot: FocusModeSnapshot,
  mode: TimerMode
): number => {
  if (mode === 'work') return snapshot.workMinutes * 60;
  if (mode === 'shortBreak') return snapshot.shortBreakMinutes * 60;
  return snapshot.longRestMinutes * 60;
};

export const materializeSnapshotSettings = (
  snapshot: FocusModeSnapshot,
  base: Settings
): Settings => ({
  ...base,
  workTime: snapshot.workMinutes,
  shortBreak: snapshot.shortBreakMinutes,
  longBreak: snapshot.longRestMinutes,
  longBreakInterval: snapshot.cyclesBeforeRest,
  autoStartBreaks: snapshot.autoStartBreaks,
  focusMusicEnabled: snapshot.soundTrack !== 'none',
  focusMusicTrack: snapshot.soundTrack === 'none' ? base.focusMusicTrack : snapshot.soundTrack,
  focusMusicVolume: snapshot.soundVolume
});

export const resolveNextWorkSnapshot = (input: {
  focusModes: FocusMode[];
  tasks: Task[];
  activeTaskId: string | null;
  selectedFocusModeId: string | null;
  manualSettings: Settings;
}): FocusModeSnapshot => {
  const modes = normalizeFocusModes(input.focusModes);
  const modeById = new Map(modes.map((mode) => [mode.id, mode]));
  const selectedTask = input.tasks.find(
    (task) => !task.system && task.id === input.activeTaskId
  );
  const taskMode = selectedTask?.focusModeId
    ? modeById.get(selectedTask.focusModeId)
    : undefined;
  if (taskMode) return focusModeToSnapshot(taskMode);

  const globalMode = input.selectedFocusModeId
    ? modeById.get(input.selectedFocusModeId)
    : undefined;
  return globalMode
    ? focusModeToSnapshot(globalMode)
    : settingsToFocusModeSnapshot(input.manualSettings);
};

const modeControlledSettingsChanged = (left: Settings, right: Settings): boolean =>
  left.workTime !== right.workTime ||
  left.shortBreak !== right.shortBreak ||
  left.longBreak !== right.longBreak ||
  left.longBreakInterval !== right.longBreakInterval ||
  left.autoStartBreaks !== right.autoStartBreaks ||
  left.focusMusicEnabled !== right.focusMusicEnabled ||
  left.focusMusicTrack !== right.focusMusicTrack ||
  left.focusMusicVolume !== right.focusMusicVolume;

export const applySelectedFocusMode = (
  data: StoredData,
  focusModeId: string | null
): Pick<StoredData, 'settings' | 'manualSettings' | 'selectedFocusModeId'> => {
  if (focusModeId === null) {
    return {
      settings: data.manualSettings,
      manualSettings: data.manualSettings,
      selectedFocusModeId: null
    };
  }

  const mode = normalizeFocusModes(data.focusModes).find((item) => item.id === focusModeId);
  if (!mode) throw new Error('Focus Mode not found.');
  return {
    settings: materializeSnapshotSettings(focusModeToSnapshot(mode), data.settings),
    manualSettings: data.manualSettings,
    selectedFocusModeId: mode.id
  };
};

export const applyManualSettings = (
  data: StoredData,
  settings: Settings
): Pick<StoredData, 'settings' | 'manualSettings' | 'selectedFocusModeId'> => {
  if (!modeControlledSettingsChanged(data.settings, settings)) {
    const manualSettings = {
      ...data.manualSettings,
      languagePreference: settings.languagePreference
    };
    const selected = data.selectedFocusModeId
      ? normalizeFocusModes(data.focusModes).find((mode) => mode.id === data.selectedFocusModeId)
      : undefined;
    return {
      manualSettings,
      selectedFocusModeId: selected?.id ?? null,
      settings: selected
        ? materializeSnapshotSettings(focusModeToSnapshot(selected), {
            ...data.settings,
            languagePreference: settings.languagePreference
          })
        : manualSettings
    };
  }

  return { settings, manualSettings: settings, selectedFocusModeId: null };
};

export const deleteCustomFocusMode = (
  data: StoredData,
  focusModeId: string
): Pick<StoredData, 'focusModes' | 'tasks' | 'settings' | 'manualSettings' | 'selectedFocusModeId'> => {
  const modes = normalizeFocusModes(data.focusModes);
  const target = modes.find((mode) => mode.id === focusModeId);
  if (!target || target.builtIn) throw new Error('Built-in Focus Modes cannot be deleted.');

  const selectedFocusModeId = data.selectedFocusModeId === focusModeId
    ? null
    : data.selectedFocusModeId;
  return {
    focusModes: modes.filter((mode) => mode.id !== focusModeId),
    tasks: data.tasks.map((task) =>
      task.focusModeId === focusModeId ? { ...task, focusModeId: null } : task
    ),
    settings: selectedFocusModeId === null && data.selectedFocusModeId === focusModeId
      ? data.manualSettings
      : data.settings,
    manualSettings: data.manualSettings,
    selectedFocusModeId
  };
};
