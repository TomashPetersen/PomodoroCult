import { Download, Minus, Plus, Save, Upload, X } from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { SETTINGS_FIELDS } from '../lib/constants';
import { getLanguagePreferenceLabel, getSettingLabel, t } from '../lib/i18n';
import { areTimerDurationsLocked } from '../lib/storage';
import { cn } from '../lib/ui';
import { LanguagePreference, Settings } from '../lib/types';
import { useAppStore } from '../store/useAppStore';

type SettingKey = (typeof SETTINGS_FIELDS)[number]['key'];
type DraftValues = Record<SettingKey, string>;

const toDraftValues = (settings: Settings): DraftValues => ({
  workTime: String(settings.workTime),
  shortBreak: String(settings.shortBreak),
  longBreak: String(settings.longBreak),
  longBreakInterval: String(settings.longBreakInterval)
});

const getFieldConfig = (key: SettingKey) => SETTINGS_FIELDS.find((field) => field.key === key)!;

const parseDraftValue = (value: string): number | null => {
  if (!/^\d+$/.test(value.trim())) return null;
  return Number(value);
};

const clampFieldValue = (key: SettingKey, value: number): number => {
  const field = getFieldConfig(key);
  return Math.max(field.min, Math.min(field.max, Math.round(value)));
};

export const SettingsModal = () => {
  const open = useAppStore((state) => state.settingsOpen);
  const locale = useAppStore((state) => state.locale);
  const settings = useAppStore((state) => state.settings);
  const timerState = useAppStore((state) => state.timerState);
  const closeSettings = useAppStore((state) => state.closeSettings);
  const saveSettings = useAppStore((state) => state.saveSettings);
  const exportUserData = useAppStore((state) => state.exportUserData);
  const importUserData = useAppStore((state) => state.importUserData);
  const clearDataTransferStatus = useAppStore((state) => state.clearDataTransferStatus);
  const dataTransferMessage = useAppStore((state) => state.dataTransferMessage);
  const dataTransferError = useAppStore((state) => state.dataTransferError);
  const [draftValues, setDraftValues] = useState<DraftValues>(() => toDraftValues(settings));
  const [draftLanguage, setDraftLanguage] = useState<LanguagePreference>(settings.languagePreference);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const timerDurationsLocked = areTimerDurationsLocked(settings, timerState);
  const timerDurationsLockedMessage = t(locale, 'settingDurationLocked');
  const languageOptions: LanguagePreference[] = ['auto', 'ru', 'en'];

  useEffect(() => {
    if (!open) return;

    setDraftValues(toDraftValues(settings));
    setDraftLanguage(settings.languagePreference);
    setExportMenuOpen(false);
  }, [open, settings]);

  useEffect(() => {
    if (!open) return;
    clearDataTransferStatus();
  }, [clearDataTransferStatus, open]);

  const validation = useMemo(() => {
    const result = new Map<SettingKey, { value: number | null; valid: boolean }>();

    for (const field of SETTINGS_FIELDS) {
      const value = parseDraftValue(draftValues[field.key]);
      result.set(field.key, {
        value,
        valid: value !== null && value >= field.min && value <= field.max
      });
    }

    return result;
  }, [draftValues]);

  if (!open) return null;

  const setValue = (key: SettingKey, value: string) => {
    if (key !== 'longBreakInterval' && timerDurationsLocked) return;
    setDraftValues((current) => ({ ...current, [key]: value.replace(/[^\d]/g, '') }));
  };

  const clampDraft = (key: SettingKey) => {
    const parsed = parseDraftValue(draftValues[key]);
    const fallback = settings[key];
    setDraftValues((current) => ({
      ...current,
      [key]: String(clampFieldValue(key, parsed ?? fallback))
    }));
  };

  const stepValue = (key: SettingKey, delta: number) => {
    if (key !== 'longBreakInterval' && timerDurationsLocked) return;
    const parsed = parseDraftValue(draftValues[key]) ?? settings[key];
    setDraftValues((current) => ({
      ...current,
      [key]: String(clampFieldValue(key, parsed + delta))
    }));
  };

  const hasInvalidValues = SETTINGS_FIELDS.some((field) => !validation.get(field.key)?.valid);
  const nextSettings: Settings | null = hasInvalidValues
    ? null
    : {
        workTime: validation.get('workTime')!.value!,
        shortBreak: validation.get('shortBreak')!.value!,
        longBreak: validation.get('longBreak')!.value!,
        longBreakInterval: validation.get('longBreakInterval')!.value!,
        languagePreference: draftLanguage
      };
  const dirty =
    Boolean(nextSettings) &&
    (nextSettings!.workTime !== settings.workTime ||
      nextSettings!.shortBreak !== settings.shortBreak ||
      nextSettings!.longBreak !== settings.longBreak ||
      nextSettings!.longBreakInterval !== settings.longBreakInterval ||
      nextSettings!.languagePreference !== settings.languagePreference);
  const canSave = Boolean(nextSettings) && dirty;

  const handleImportFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      void importUserData(reader.result);
    };
    reader.onerror = () => {
      void importUserData('');
    };
    reader.readAsText(file);
  };

  const handleExportBackup = async () => {
    await exportUserData();
    setExportMenuOpen(false);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#f6f8fa]/82 p-4 backdrop-blur-md dark:bg-[#0f141a]/82">
      <div className="w-full rounded-2xl border border-zinc-200 bg-[#fcfcfb] p-3 shadow-soft dark:border-zinc-800 dark:bg-[#161b22]">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">{t(locale, 'settings')}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExportMenuOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-[#eef2f6] hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]"
              aria-label={t(locale, 'openDataMenu')}
              title={t(locale, 'openDataMenu')}
            >
              <Upload className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={closeSettings}
              className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-[#eef2f6] hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]"
              aria-label={t(locale, 'close')}
              title={t(locale, 'close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />

          {SETTINGS_FIELDS.map((field) => {
            const locked = field.key !== 'longBreakInterval' && timerDurationsLocked;
            const invalid = !validation.get(field.key)?.valid;

            return (
              <label
                key={field.key}
                className={cn(
                  'block rounded-xl border border-zinc-200 bg-[#f0f3f6] px-3 py-2 dark:border-zinc-800 dark:bg-[#21262d]',
                  locked && 'opacity-60'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    {getSettingLabel(locale, field.key)}
                  </span>

                  <div className={cn('flex h-8 shrink-0 items-center rounded-lg border bg-[#fcfcfb] dark:bg-[#0d1117]', invalid ? 'border-rose-300 dark:border-rose-500/60' : 'border-zinc-200 dark:border-zinc-700')}>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => stepValue(field.key, -1)}
                      className={cn(
                        'grid h-8 w-9 place-items-center text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
                        locked && 'cursor-not-allowed opacity-50'
                      )}
                      aria-label={t(locale, 'decrease')}
                      title={locked ? timerDurationsLockedMessage : t(locale, 'decrease')}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={locked}
                      value={draftValues[field.key]}
                      onBlur={() => clampDraft(field.key)}
                      onChange={(event) => setValue(field.key, event.target.value)}
                      title={locked ? timerDurationsLockedMessage : undefined}
                      className="h-8 w-16 bg-transparent text-center text-sm font-semibold text-zinc-950 outline-none disabled:cursor-not-allowed dark:text-white"
                    />
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => stepValue(field.key, 1)}
                      className={cn(
                        'grid h-8 w-9 place-items-center text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
                        locked && 'cursor-not-allowed opacity-50'
                      )}
                      aria-label={t(locale, 'increase')}
                      title={locked ? timerDurationsLockedMessage : t(locale, 'increase')}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {invalid && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">
                    {t(locale, 'settingInvalidValue', { min: field.min, max: field.max })}
                  </p>
                )}
                {field.key === 'longBreakInterval' && timerDurationsLocked && (
                  <p className="mt-0.5 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
                    {t(locale, 'settingIntervalAppliesAfterCurrentTimer')}
                  </p>
                )}
              </label>
            );
          })}

          {timerDurationsLocked && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              {timerDurationsLockedMessage}
            </div>
          )}

          <div className="rounded-xl border border-zinc-200 bg-[#f0f3f6] px-3 py-2 dark:border-zinc-800 dark:bg-[#21262d]">
            <p className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {t(locale, 'settingLanguage')}
            </p>
            <div className="grid grid-cols-3 rounded-lg bg-[#fcfcfb] p-1 dark:bg-[#0d1117]">
              {languageOptions.map((option) => {
                const active = draftLanguage === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDraftLanguage(option)}
                    className={cn(
                      'h-8 rounded-md px-2 text-xs font-medium transition',
                      active
                        ? 'bg-[#24292f] text-[#f6f8fa] dark:bg-[#f0f3f6] dark:text-[#161b22]'
                        : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-[#f0f3f6]'
                    )}
                  >
                    {getLanguagePreferenceLabel(locale, option)}
                  </button>
                );
              })}
            </div>
          </div>

          {(dataTransferMessage || dataTransferError) && (
            <p
              className={cn(
                'rounded-xl px-3 py-2 text-xs leading-4',
                dataTransferError
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
              )}
            >
              {dataTransferError ?? dataTransferMessage}
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={!canSave}
          onClick={() => {
            if (!nextSettings) return;
            void saveSettings(nextSettings);
          }}
          className={cn(
            'mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#24292f] text-sm font-semibold text-[#f6f8fa] transition hover:bg-[#32383f]',
            'disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#f0f3f6] dark:text-[#161b22] dark:hover:bg-[#d8dee4]'
          )}
        >
          <Save className="h-4 w-4" />
          {t(locale, 'save')}
        </button>
      </div>

      {exportMenuOpen && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-[#f6f8fa]/65 p-6 backdrop-blur-sm dark:bg-[#0d1117]/65"
          onPointerDown={() => setExportMenuOpen(false)}
        >
          <div
            className="w-full max-w-[19rem] rounded-2xl border border-zinc-200 bg-[#fcfcfb] p-4 shadow-soft dark:border-zinc-800 dark:bg-[#161b22]"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                {t(locale, 'dataMenuTitle')}
              </h3>
              <button
                type="button"
                onClick={() => setExportMenuOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-[#eef2f6] hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]"
                aria-label={t(locale, 'close')}
                title={t(locale, 'close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => void handleExportBackup()}
              className="flex w-full items-start gap-3 rounded-xl border border-zinc-200 bg-[#f0f3f6] p-3 text-left transition hover:border-zinc-300 hover:bg-[#eef2f6] dark:border-zinc-800 dark:bg-[#21262d] dark:hover:bg-[#30363d]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#fcfcfb] text-zinc-800 dark:bg-[#0d1117] dark:text-[#f0f3f6]">
                <Download className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-zinc-900 dark:text-white">
                  {t(locale, 'exportFullBackup')}
                </span>
                <span className="mt-1 block text-xs leading-4 text-zinc-500 dark:text-zinc-400">
                  {t(locale, 'exportFullBackupDescription')}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setExportMenuOpen(false);
                importInputRef.current?.click();
              }}
              className="mt-2 flex w-full items-start gap-3 rounded-xl border border-zinc-200 bg-[#f0f3f6] p-3 text-left transition hover:border-zinc-300 hover:bg-[#eef2f6] dark:border-zinc-800 dark:bg-[#21262d] dark:hover:bg-[#30363d]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#fcfcfb] text-zinc-800 dark:bg-[#0d1117] dark:text-[#f0f3f6]">
                <Upload className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-zinc-900 dark:text-white">
                  {t(locale, 'importBackup')}
                </span>
                <span className="mt-1 block text-xs leading-4 text-zinc-500 dark:text-zinc-400">
                  {t(locale, 'importBackupDescription')}
                </span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
