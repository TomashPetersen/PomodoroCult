import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FOCUS_MUSIC_TRACKS, FOCUS_MUSIC_VOLUME, SETTINGS_FIELDS } from '../lib/constants';
import { FOCUS_MODE_TITLE_MAX_LENGTH } from '../lib/focusModes';
import { MessageKey, getSettingLabel, t } from '../lib/i18n';
import { cn } from '../lib/ui';
import { FocusMode, FocusModeEditableValues, FocusModeSnapshot } from '../lib/types';
import { useAppStore } from '../store/useAppStore';
import { ActionIconButton } from './ActionIconButton';

interface FocusModeManagerModalProps {
  open: boolean;
  initialSnapshot: FocusModeSnapshot | null;
  onClose: () => void;
}

const valuesFromMode = (mode: FocusMode): FocusModeEditableValues => ({
  title: mode.title,
  workMinutes: mode.workMinutes,
  shortBreakMinutes: mode.shortBreakMinutes,
  longRestMinutes: mode.longRestMinutes,
  cyclesBeforeRest: mode.cyclesBeforeRest,
  autoStartBreaks: mode.autoStartBreaks,
  soundTrack: mode.soundTrack,
  soundVolume: mode.soundVolume
});

const valuesFromSnapshot = (snapshot: FocusModeSnapshot): FocusModeEditableValues => ({
  title: '',
  workMinutes: snapshot.workMinutes,
  shortBreakMinutes: snapshot.shortBreakMinutes,
  longRestMinutes: snapshot.longRestMinutes,
  cyclesBeforeRest: snapshot.cyclesBeforeRest,
  autoStartBreaks: snapshot.autoStartBreaks,
  soundTrack: snapshot.soundTrack,
  soundVolume: snapshot.soundVolume
});

const emptyValues = valuesFromSnapshot({
  appliedFocusModeId: null,
  workMinutes: 25,
  shortBreakMinutes: 5,
  longRestMinutes: 15,
  cyclesBeforeRest: 4,
  autoStartBreaks: false,
  soundTrack: 'none',
  soundVolume: 0.45,
  notificationMode: 'normal'
});

export const FocusModeManagerModal = ({
  open,
  initialSnapshot,
  onClose
}: FocusModeManagerModalProps) => {
  const locale = useAppStore((state) => state.locale);
  const focusModes = useAppStore((state) => state.focusModes);
  const focusModeError = useAppStore((state) => state.focusModeError);
  const createFocusMode = useAppStore((state) => state.createFocusMode);
  const updateFocusMode = useAppStore((state) => state.updateFocusMode);
  const deleteFocusMode = useAppStore((state) => state.deleteFocusMode);
  const clearFocusModeError = useAppStore((state) => state.clearFocusModeError);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<FocusModeEditableValues>(emptyValues);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const createButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const customModes = useMemo(() => focusModes.filter((mode) => !mode.builtIn), [focusModes]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    clearFocusModeError();
    if (initialSnapshot) {
      setEditingId('new');
      setDraft(valuesFromSnapshot(initialSnapshot));
      window.setTimeout(() => titleRef.current?.focus(), 0);
    } else {
      setEditingId(null);
      window.setTimeout(() => createButtonRef.current?.focus(), 0);
    }
    return () => {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [clearFocusModeError, initialSnapshot, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) ?? [])].filter((control) => control.getAttribute('aria-hidden') !== 'true');
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!open) return null;

  const errorMessage = focusModeError
    ? focusModeError.includes('unique')
      ? t(locale, 'focusModeDuplicateError')
      : focusModeError.includes('Built-in')
        ? t(locale, 'focusModeBuiltInError')
        : t(locale, 'focusModeGenericError')
    : null;
  const canSave =
    draft.title.trim().length > 0 &&
    draft.shortBreakMinutes <= draft.longRestMinutes;
  const startCreate = () => {
    clearFocusModeError();
    setEditingId('new');
    setDraft(initialSnapshot ? valuesFromSnapshot(initialSnapshot) : emptyValues);
    window.setTimeout(() => titleRef.current?.focus(), 0);
  };
  const startEdit = (mode: FocusMode) => {
    clearFocusModeError();
    setEditingId(mode.id);
    setDraft(valuesFromMode(mode));
    window.setTimeout(() => titleRef.current?.focus(), 0);
  };
  const setNumber = (key: keyof FocusModeEditableValues, value: string) => {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return;
    setDraft((current) => ({ ...current, [key]: number }));
  };

  const numericFields: Array<{
    key: 'workMinutes' | 'shortBreakMinutes' | 'longRestMinutes' | 'cyclesBeforeRest';
    settingKey: 'workTime' | 'shortBreak' | 'longBreak' | 'longBreakInterval';
  }> = [
    { key: 'workMinutes', settingKey: 'workTime' },
    { key: 'shortBreakMinutes', settingKey: 'shortBreak' },
    { key: 'longRestMinutes', settingKey: 'longBreak' },
    { key: 'cyclesBeforeRest', settingKey: 'longBreakInterval' }
  ];

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="focus-mode-manager-title"
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-[#fcfcfb] shadow-soft dark:border-zinc-800 dark:bg-[#161b22]"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 id="focus-mode-manager-title" className="text-base font-semibold text-zinc-950 dark:text-white">
            {t(locale, 'focusModes')}
          </h2>
          <ActionIconButton
            type="button"
            onClick={onClose}
            label={t(locale, 'close')}
            className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </ActionIconButton>
        </header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(15rem,0.8fr)_minmax(20rem,1.2fr)]">
          <div className="min-h-0 overflow-y-auto border-b border-zinc-200 p-3 md:border-b-0 md:border-r dark:border-zinc-800">
            <button
              ref={createButtonRef}
              type="button"
              onClick={startCreate}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" />
              {t(locale, 'focusModeCreate')}
            </button>
            <div className="mt-3 space-y-2">
              {focusModes.map((mode) => (
                <div key={mode.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-zinc-200 bg-[#f0f3f6] px-3 py-2 dark:border-zinc-800 dark:bg-[#21262d]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{mode.title}</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {mode.builtIn ? t(locale, 'focusModeBuiltIn') : t(locale, 'focusModeCustom')}
                      {' · '}{mode.workMinutes}/{mode.shortBreakMinutes}/{mode.longRestMinutes}
                    </p>
                  </div>
                  {!mode.builtIn && (
                    <>
                      <ActionIconButton
                        type="button"
                        onClick={() => startEdit(mode)}
                        label={t(locale, 'edit')}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-500 hover:bg-white dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </ActionIconButton>
                      <ActionIconButton
                        type="button"
                        onClick={() => {
                          if (window.confirm(t(locale, 'focusModeDeleteConfirm'))) {
                            void deleteFocusMode(mode.id);
                            if (editingId === mode.id) setEditingId(null);
                          }
                        }}
                        label={t(locale, 'delete')}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-500 hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </ActionIconButton>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto p-4">
            {editingId === null ? (
              <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                {customModes.length > 0 ? t(locale, 'focusModeEdit') : t(locale, 'focusModeCreate')}
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                  {editingId === 'new' ? t(locale, 'focusModeCreate') : t(locale, 'focusModeEdit')}
                </h3>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  {t(locale, 'focusModeTitle')}
                  <input
                    ref={titleRef}
                    value={draft.title}
                    maxLength={FOCUS_MODE_TITLE_MAX_LENGTH}
                    onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder={t(locale, 'focusModeTitlePlaceholder')}
                    className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-[#f0f3f6] px-3 text-sm text-zinc-950 outline-none focus:border-rose-400 focus-visible:ring-2 focus-visible:ring-rose-200 dark:border-zinc-700 dark:bg-[#0d1117] dark:text-white"
                  />
                </label>

                <div className="grid gap-2 sm:grid-cols-2">
                  {numericFields.map(({ key, settingKey }) => {
                    const field = SETTINGS_FIELDS.find((item) => item.key === settingKey)!;
                    return (
                      <label key={key} className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        {getSettingLabel(locale, settingKey)}
                        <input
                          type="number"
                          min={field.min}
                          max={field.max}
                          value={draft[key]}
                          onChange={(event) => setNumber(key, event.target.value)}
                          className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-[#f0f3f6] px-3 text-sm text-zinc-950 outline-none focus:border-rose-400 focus-visible:ring-2 focus-visible:ring-rose-200 dark:border-zinc-700 dark:bg-[#0d1117] dark:text-white"
                        />
                      </label>
                    );
                  })}
                </div>
                {draft.shortBreakMinutes > draft.longRestMinutes && (
                  <p className="text-xs text-rose-600 dark:text-rose-300">
                    {t(locale, 'settingShortBreakNotLongerThanRest')}
                  </p>
                )}

                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  {t(locale, 'focusModeSound')}
                  <select
                    value={draft.soundTrack}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      soundTrack: event.target.value as FocusModeEditableValues['soundTrack']
                    }))}
                    className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-[#f0f3f6] px-3 text-sm text-zinc-950 outline-none focus:border-rose-400 focus-visible:ring-2 focus-visible:ring-rose-200 dark:border-zinc-700 dark:bg-[#0d1117] dark:text-white"
                  >
                    <option value="none">{t(locale, 'focusModeSoundNone')}</option>
                    {FOCUS_MUSIC_TRACKS.map((track) => (
                      <option key={track.id} value={track.id}>{t(locale, track.labelKey as MessageKey)}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  {t(locale, 'focusMusicVolume')}: {Math.round(draft.soundVolume * 100)}%
                  <input
                    type="range"
                    min={FOCUS_MUSIC_VOLUME.min}
                    max={FOCUS_MUSIC_VOLUME.max}
                    step={FOCUS_MUSIC_VOLUME.step}
                    value={draft.soundVolume}
                    onChange={(event) => setDraft((current) => ({ ...current, soundVolume: Number(event.target.value) }))}
                    className="mt-2 w-full accent-rose-500"
                  />
                </label>

                <label className="flex min-h-11 items-center gap-3 rounded-xl border border-zinc-200 bg-[#f0f3f6] px-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-[#21262d] dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={draft.autoStartBreaks}
                    onChange={(event) => setDraft((current) => ({ ...current, autoStartBreaks: event.target.checked }))}
                    className="h-4 w-4 accent-rose-500"
                  />
                  {t(locale, 'focusModeAutoStart')}
                </label>

                {errorMessage && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{errorMessage}</p>}

                <button
                  type="button"
                  disabled={!canSave}
                  onClick={async () => {
                    if (editingId === 'new') {
                      const id = await createFocusMode(draft);
                      if (id) setEditingId(null);
                    } else {
                      await updateFocusMode(editingId, draft);
                      if (!useAppStore.getState().focusModeError) setEditingId(null);
                    }
                  }}
                  className={cn(
                    'flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#24292f] text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:bg-[#f0f3f6] dark:text-[#161b22]',
                    !canSave && 'cursor-not-allowed opacity-40'
                  )}
                >
                  <Save className="h-4 w-4" />
                  {t(locale, 'save')}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
