import { Minus, Plus, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SETTINGS_FIELDS } from '../lib/constants';
import { getLanguagePreferenceLabel, getSettingLabel, t } from '../lib/i18n';
import { cn } from '../lib/ui';
import { LanguagePreference, Settings } from '../lib/types';
import { useAppStore } from '../store/useAppStore';

export const SettingsModal = () => {
  const open = useAppStore((state) => state.settingsOpen);
  const locale = useAppStore((state) => state.locale);
  const settings = useAppStore((state) => state.settings);
  const closeSettings = useAppStore((state) => state.closeSettings);
  const saveSettings = useAppStore((state) => state.saveSettings);
  const [draft, setDraft] = useState<Settings>(settings);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  if (!open) return null;

  const setValue = (
    key: (typeof SETTINGS_FIELDS)[number]['key'],
    value: number
  ) => {
    const field = SETTINGS_FIELDS.find((item) => item.key === key);
    const min = field?.min ?? 1;
    const max = field?.max ?? 999;
    const nextValue = Math.max(min, Math.min(max, Math.round(value || min)));
    setDraft((current) => ({
      ...current,
      [key]: nextValue
    }));
  };

  const languageOptions: LanguagePreference[] = ['auto', 'ru', 'en'];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/82 p-5 backdrop-blur-md dark:bg-zinc-950/82">
      <div className="w-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-soft dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">{t(locale, 'settings')}</h2>
          <button
            type="button"
            onClick={closeSettings}
            className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
            aria-label={t(locale, 'close')}
            title={t(locale, 'close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {SETTINGS_FIELDS.map((field) => (
            <label
              key={field.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="min-w-0 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {getSettingLabel(locale, field.key)}
              </span>

              <div className="flex h-9 shrink-0 items-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
                <button
                  type="button"
                  onClick={() => setValue(field.key, draft[field.key] - 1)}
                  className="grid h-9 w-9 place-items-center text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                  aria-label={t(locale, 'decrease')}
                  title={t(locale, 'decrease')}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  value={draft[field.key]}
                  onChange={(event) => setValue(field.key, Number(event.target.value))}
                  className="h-9 w-16 bg-transparent text-center text-sm font-semibold text-zinc-950 outline-none dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setValue(field.key, draft[field.key] + 1)}
                  className="grid h-9 w-9 place-items-center text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                  aria-label={t(locale, 'increase')}
                  title={t(locale, 'increase')}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </label>
          ))}

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {t(locale, 'settingLanguage')}
            </p>
            <div className="grid grid-cols-3 rounded-lg bg-white p-1 dark:bg-zinc-950">
              {languageOptions.map((option) => {
                const active = draft.languagePreference === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        languagePreference: option
                      }))
                    }
                    className={cn(
                      'h-9 rounded-md px-2 text-xs font-medium transition',
                      active
                        ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                        : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white'
                    )}
                  >
                    {getLanguagePreferenceLabel(locale, option)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void saveSettings(draft)}
          className={cn(
            'mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800',
            'dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200'
          )}
        >
          <Save className="h-4 w-4" />
          {t(locale, 'save')}
        </button>
      </div>
    </div>
  );
};
