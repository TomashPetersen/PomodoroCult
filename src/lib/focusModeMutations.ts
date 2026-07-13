import {
  applyLiveFocusMusicSettings,
  applyManualSettings,
  applySelectedFocusMode,
  createCustomFocusMode,
  deleteCustomFocusMode,
  normalizeFocusModes,
  resolveActiveWorkFocusMusicSettings,
  updateCustomFocusMode
} from './focusModes';
import { FOCUS_MUSIC_TRACKS } from './constants';
import { normalizeSettings } from './storage';
import { RuntimeMessage, StoredData } from './types';

export type FocusModeMutationMessage = Extract<
  RuntimeMessage,
  | { type: 'SELECT_FOCUS_MODE' }
  | { type: 'CREATE_FOCUS_MODE' }
  | { type: 'UPDATE_FOCUS_MODE' }
  | { type: 'DELETE_FOCUS_MODE' }
  | { type: 'SET_TASK_FOCUS_MODE' }
  | { type: 'SAVE_MANUAL_SETTINGS' }
  | { type: 'SAVE_FOCUS_MUSIC_SETTINGS' }
>;

export interface FocusModeMutationResult {
  patch: Partial<StoredData>;
  focusModeId?: string;
}

export const applyFocusModeMutation = (
  data: StoredData,
  message: FocusModeMutationMessage
): FocusModeMutationResult => {
  switch (message.type) {
    case 'SELECT_FOCUS_MODE':
      return { patch: applySelectedFocusMode(data, message.payload.focusModeId) };

    case 'CREATE_FOCUS_MODE': {
      const created = createCustomFocusMode(data.focusModes, message.payload.values);
      return {
        patch: { focusModes: created.focusModes },
        focusModeId: created.focusMode.id
      };
    }

    case 'UPDATE_FOCUS_MODE': {
      const updated = updateCustomFocusMode(
        data.focusModes,
        message.payload.focusModeId,
        message.payload.values
      );
      const nextData = { ...data, focusModes: updated.focusModes };
      return {
        patch: {
          focusModes: updated.focusModes,
          ...(data.selectedFocusModeId === message.payload.focusModeId
            ? applySelectedFocusMode(nextData, message.payload.focusModeId)
            : {})
        },
        focusModeId: updated.focusMode.id
      };
    }

    case 'DELETE_FOCUS_MODE':
      return { patch: deleteCustomFocusMode(data, message.payload.focusModeId) };

    case 'SET_TASK_FOCUS_MODE': {
      const target = data.tasks.find((task) => task.id === message.payload.taskId);
      if (!target || target.system) throw new Error('Task not found.');
      const focusModeId = message.payload.focusModeId;
      if (focusModeId && !normalizeFocusModes(data.focusModes).some((mode) => mode.id === focusModeId)) {
        throw new Error('Focus Mode not found.');
      }
      return {
        patch: {
          tasks: data.tasks.map((task) =>
            task.id === target.id ? { ...task, focusModeId } : task
          )
        }
      };
    }

    case 'SAVE_MANUAL_SETTINGS': {
      const settings = normalizeSettings(message.payload.settings);
      return { patch: applyManualSettings(data, settings) };
    }

    case 'SAVE_FOCUS_MUSIC_SETTINGS': {
      const current = resolveActiveWorkFocusMusicSettings(data.settings, data.timerState);
      const payload = message.payload;
      let audioPatch: Partial<typeof current>;

      switch (payload.type) {
        case 'toggle':
          audioPatch = { focusMusicEnabled: !current.focusMusicEnabled };
          break;
        case 'set-enabled':
          if (typeof payload.enabled !== 'boolean') {
            throw new Error('Invalid focus music settings.');
          }
          audioPatch = { focusMusicEnabled: payload.enabled };
          break;
        case 'set-track':
          if (!FOCUS_MUSIC_TRACKS.some((track) => track.id === payload.track)) {
            throw new Error('Invalid focus music settings.');
          }
          audioPatch = { focusMusicTrack: payload.track };
          break;
        case 'set-volume':
          if (typeof payload.volume !== 'number' || !Number.isFinite(payload.volume)) {
            throw new Error('Invalid focus music settings.');
          }
          audioPatch = { focusMusicVolume: payload.volume };
          break;
        default:
          throw new Error('Invalid focus music settings.');
      }

      const settings = normalizeSettings({
        ...current,
        ...audioPatch
      });
      return { patch: applyLiveFocusMusicSettings(data, settings) };
    }
  }
};
