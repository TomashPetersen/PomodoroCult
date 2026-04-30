import { AlertCircle, Moon, Pause, Play, RotateCcw, Settings, Sun, X } from 'lucide-react';
import { TIMER_MODE_LABELS } from '../lib/constants';
import { formatClock } from '../lib/format';
import { getDurationSeconds } from '../lib/storage';
import { cn } from '../lib/ui';
import { TimerMode } from '../lib/types';
import { useAppStore } from '../store/useAppStore';
import { TaskSelect } from './TaskSelect';

export const TimerScreen = () => {
  const settings = useAppStore((state) => state.settings);
  const timerState = useAppStore((state) => state.timerState);
  const selectedMode = useAppStore((state) => state.selectedTimerMode);
  const pulseStartMode = useAppStore((state) => state.pulseStartMode);
  const runtimeError = useAppStore((state) => state.runtimeError);
  const theme = useAppStore((state) => state.theme);
  const setTimerMode = useAppStore((state) => state.setTimerMode);
  const openSettings = useAppStore((state) => state.openSettings);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const clearRuntimeError = useAppStore((state) => state.clearRuntimeError);
  const startTimer = useAppStore((state) => state.startTimer);
  const pauseTimer = useAppStore((state) => state.pauseTimer);
  const openResetConfirm = useAppStore((state) => state.openResetConfirm);

  const displayMode = timerState.isRunning ? timerState.currentMode : selectedMode;
  const modeDuration = getDurationSeconds(settings, displayMode);
  const displaySeconds = timerState.isRunning
    ? timerState.remainingSeconds
    : selectedMode === timerState.currentMode
      ? timerState.remainingSeconds
      : getDurationSeconds(settings, selectedMode);
  const progress = Math.max(0, Math.min(1, displaySeconds / Math.max(1, modeDuration)));
  const radius = 112;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const isViewingRunningMode = timerState.isRunning && selectedMode === timerState.currentMode;
  const primaryDisabled = timerState.isRunning && !isViewingRunningMode;
  const primaryIsPause = isViewingRunningMode;
  const startPulse = !timerState.isRunning && pulseStartMode === selectedMode;
  const showRunningHint = timerState.isRunning && selectedMode !== timerState.currentMode;

  const tabs: Array<{ mode: TimerMode; minutes: number }> = [
    { mode: 'work', minutes: settings.workTime },
    { mode: 'shortBreak', minutes: settings.shortBreak },
    { mode: 'longBreak', minutes: settings.longBreak }
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="grid h-12 grid-cols-[42px_1fr_42px] items-center gap-2">
        <button
          type="button"
          onClick={openSettings}
          className="grid h-10 w-10 place-items-center rounded-xl text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
          aria-label="Настройки"
          title="Настройки"
        >
          <Settings className="h-5 w-5" />
        </button>

        <div className="grid grid-cols-3 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
          {tabs.map((tab) => {
            const active = selectedMode === tab.mode;
            const running = timerState.isRunning && timerState.currentMode === tab.mode;

            return (
              <button
                key={tab.mode}
                type="button"
                onClick={() => setTimerMode(tab.mode)}
                className={cn(
                  'relative flex h-12 flex-col items-center justify-center rounded-lg px-1 text-center transition',
                  active
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100'
                )}
              >
                <span className="text-[11px] font-semibold leading-none">
                  {TIMER_MODE_LABELS[tab.mode]}
                </span>
                <span className="mt-1 text-[11px] leading-none opacity-80">{tab.minutes} мин</span>
                {running && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="grid h-10 w-10 place-items-center rounded-xl text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
          aria-label="Тема"
          title="Тема"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </header>

      <section className="flex flex-1 min-h-0 flex-col items-center justify-center pt-3">
        <div className="relative aspect-square w-full max-w-[18rem]">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 258 258" aria-hidden="true">
            <circle
              cx="129"
              cy="129"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-zinc-100 dark:text-zinc-900"
            />
            <circle
              cx="129"
              cy="129"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className={cn(
                'transition-[stroke-dashoffset] duration-700 ease-out',
                displayMode === 'work' && 'text-rose-500',
                displayMode === 'shortBreak' && 'text-emerald-500',
                displayMode === 'longBreak' && 'text-amber-500'
              )}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
            <span className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              {TIMER_MODE_LABELS[displayMode]}
            </span>
            <span className="font-mono tabular-nums text-[clamp(2.9rem,14vw,4.6rem)] font-semibold leading-none text-zinc-950 dark:text-white">
              {formatClock(displaySeconds)}
            </span>
            <span className="mt-4 inline-flex min-h-10 min-w-10 items-center justify-center rounded-full bg-rose-500 px-3 text-xs font-semibold text-white shadow-sm">
              {timerState.completedSessions}
            </span>
          </div>
        </div>

        {showRunningHint && (
          <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Сейчас активен таймер «{TIMER_MODE_LABELS[timerState.currentMode]}». Для паузы вернитесь
            на его вкладку.
          </p>
        )}
      </section>

      <section className="space-y-3 pb-2">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={primaryDisabled}
            onClick={primaryIsPause ? () => void pauseTimer() : () => void startTimer()}
            className={cn(
              'grid h-12 w-12 place-items-center rounded-full bg-zinc-950 text-white shadow-sm transition',
              'hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200',
              primaryDisabled && 'cursor-not-allowed opacity-40',
              startPulse && 'soft-pulse'
            )}
            aria-label={primaryIsPause ? 'Пауза' : 'Старт'}
            title={primaryIsPause ? 'Пауза' : 'Старт'}
          >
            {primaryIsPause ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={openResetConfirm}
            className={cn(
              'grid h-12 w-12 place-items-center rounded-full border border-zinc-200 text-zinc-700 transition',
              'hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white'
            )}
            aria-label="Сброс"
            title="Сброс"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>

        <TaskSelect />

        {runtimeError && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="min-w-0 flex-1 leading-5">{runtimeError}</p>
            <button
              type="button"
              onClick={clearRuntimeError}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md transition hover:bg-rose-100 dark:hover:bg-rose-500/10"
              aria-label="Закрыть уведомление"
              title="Закрыть уведомление"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
