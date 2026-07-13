import { Music2, Volume2 } from 'lucide-react';
import { FOCUS_MUSIC_TRACKS, FOCUS_MUSIC_VOLUME } from '../lib/constants';
import { resolveActiveWorkFocusMusicSettings } from '../lib/focusModes';
import { MessageKey, t } from '../lib/i18n';
import { cn } from '../lib/ui';
import { useAppStore } from '../store/useAppStore';

export const FocusMusicPanel = () => {
  const locale = useAppStore((state) => state.locale);
  const settings = useAppStore((state) => state.settings);
  const timerState = useAppStore((state) => state.timerState);
  const saveFocusMusicSettings = useAppStore((state) => state.saveFocusMusicSettings);
  const focusMusicSettings = resolveActiveWorkFocusMusicSettings(settings, timerState);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-[#fcfcfb] px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-[#161b22]">
      <div className="space-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
            <Music2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
              {t(locale, 'focusMusic')}
            </h2>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {t(locale, 'focusMusicDescription')}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void saveFocusMusicSettings({ type: 'toggle' })
            }
            className={cn(
              'ml-auto h-8 shrink-0 rounded-lg px-3 text-[11px] font-semibold transition',
              focusMusicSettings.focusMusicEnabled
                ? 'bg-rose-500 text-white hover:bg-rose-400'
                : 'bg-[#eef2f6] text-zinc-700 hover:bg-[#e3e8ef] dark:bg-[#21262d] dark:text-zinc-200 dark:hover:bg-[#30363d]'
            )}
          >
            {focusMusicSettings.focusMusicEnabled ? t(locale, 'focusMusicOn') : t(locale, 'focusMusicOff')}
          </button>
        </div>

        <div className="grid items-center gap-3 lg:grid-cols-[minmax(220px,0.85fr)_minmax(190px,1fr)]">
          <div className="grid grid-cols-3 rounded-xl bg-[#eef2f6] p-1 dark:bg-[#0d1117]">
            {FOCUS_MUSIC_TRACKS.map((track) => {
              const active = focusMusicSettings.focusMusicTrack === track.id;

              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => void saveFocusMusicSettings({ type: 'set-track', track: track.id })}
                  className={cn(
                    'h-8 rounded-lg px-2 text-xs font-semibold transition',
                    active
                      ? 'bg-[#24292f] text-[#f6f8fa] shadow-sm dark:bg-[#f0f3f6] dark:text-[#161b22]'
                      : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white'
                  )}
                >
                  {t(locale, track.labelKey as MessageKey)}
                </button>
              );
            })}
          </div>

          <label className="flex min-w-0 items-center gap-2">
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <Volume2 className="h-4 w-4" />
              {t(locale, 'focusMusicVolume')}
            </span>
            <input
              type="range"
              min={FOCUS_MUSIC_VOLUME.min}
              max={FOCUS_MUSIC_VOLUME.max}
              step={FOCUS_MUSIC_VOLUME.step}
              value={focusMusicSettings.focusMusicVolume}
              onChange={(event) =>
                void saveFocusMusicSettings({
                  type: 'set-volume',
                  volume: Number(event.target.value)
                })
              }
              className="min-w-0 flex-1 accent-rose-500"
            />
          </label>
        </div>

      </div>
    </section>
  );
};
