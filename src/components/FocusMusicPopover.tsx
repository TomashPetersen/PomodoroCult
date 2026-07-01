import { Music2, Volume2 } from 'lucide-react';
import { FOCUS_MUSIC_TRACKS, FOCUS_MUSIC_VOLUME } from '../lib/constants';
import { MessageKey, t } from '../lib/i18n';
import { cn } from '../lib/ui';
import { useAppStore } from '../store/useAppStore';

export const FocusMusicPopover = () => {
  const locale = useAppStore((state) => state.locale);
  const settings = useAppStore((state) => state.settings);
  const saveFocusMusicSettings = useAppStore((state) => state.saveFocusMusicSettings);

  return (
    <div className="w-[17.5rem] rounded-2xl border border-zinc-200 bg-[#fcfcfb] p-3 shadow-soft dark:border-zinc-800 dark:bg-[#161b22]">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
          <Music2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
            {t(locale, 'focusMusic')}
          </h3>
          <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {t(locale, 'focusMusicDescription')}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void saveFocusMusicSettings({ enabled: !settings.focusMusicEnabled })}
        className={cn(
          'mt-3 h-9 w-full rounded-xl text-xs font-semibold transition',
          settings.focusMusicEnabled
            ? 'bg-rose-500 text-white hover:bg-rose-400'
            : 'bg-[#eef2f6] text-zinc-700 hover:bg-[#e3e8ef] dark:bg-[#21262d] dark:text-zinc-200 dark:hover:bg-[#30363d]'
        )}
      >
        {settings.focusMusicEnabled ? t(locale, 'focusMusicOn') : t(locale, 'focusMusicOff')}
      </button>

      <div className="mt-3 grid grid-cols-3 rounded-xl bg-[#eef2f6] p-1 dark:bg-[#0d1117]">
        {FOCUS_MUSIC_TRACKS.map((track) => {
          const active = settings.focusMusicTrack === track.id;

          return (
            <button
              key={track.id}
              type="button"
              onClick={() => void saveFocusMusicSettings({ track: track.id })}
              className={cn(
                'h-8 rounded-lg px-2 text-[11px] font-semibold transition',
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

      <label className="mt-3 flex items-center gap-2">
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          <Volume2 className="h-3.5 w-3.5" />
          {t(locale, 'focusMusicVolume')}
        </span>
        <input
          type="range"
          min={FOCUS_MUSIC_VOLUME.min}
          max={FOCUS_MUSIC_VOLUME.max}
          step={FOCUS_MUSIC_VOLUME.step}
          value={settings.focusMusicVolume}
          onChange={(event) => void saveFocusMusicSettings({ volume: Number(event.target.value) })}
          className="min-w-0 flex-1 accent-rose-500"
        />
      </label>
    </div>
  );
};
