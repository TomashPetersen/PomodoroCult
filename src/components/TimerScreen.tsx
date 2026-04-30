import { Moon, Pause, Play, RotateCcw, Settings, Sun } from 'lucide-react';
import { getDurationSeconds } from '../lib/storage';
import { formatClock } from '../lib/format';
import { cn } from '../lib/ui';
import { TimerMode } from '../lib/types';
import { useAppStore } from '../store/useAppStore';
import { TaskSelect } from './TaskSelect';

const modeLabels: Record<TimerMode, string> = {
  work: 'Работа',
  shortBreak: 'Перерыв',
  longBreak: 'Долгий'
};

export const TimerScreen = () => {
  const settings = useAppStore((state) => state.settings);
  const timerState = useAppStore((state) => state.timerState);
  const selectedMode = useAppStore((state) => state.selectedTimerMode);
  const theme = useAppStore((state) => state.theme);
  const setTimerMode = useAppStore((state) => state.setTimerMode);
  const openSettings = useAppStore((state) => state.openSettings);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const startTimer = useAppStore((state) => state.startTimer);
  const pauseTimer = useAppStore((state) => state.pauseTimer);
  const resetTimer = useAppStore((state) => state.resetTimer);

  const modeDuration = getDurationSeconds(settings, selectedMode);
  const isLiveMode = selectedMode === timerState.currentMode;
  const displaySeconds = isLiveMode ? timerState.remainingSeconds : modeDuration;
  const progress = Math.max(0, Math.min(1, displaySeconds / Math.max(1, modeDuration)));
  const radius = 112;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const canControlWork =
    selectedMode === 'work' && (!timerState.isRunning || timerState.currentMode === 'work');
  const isRunningWork = timerState.isRunning && timerState.currentMode === 'work';

  const tabs: Array<{ mode: TimerMode; label: string }> = [
    { mode: 'work', label: `${settings.workTime} мин` },
    { mode: 'shortBreak', label: `${settings.shortBreak} мин` },
    { mode: 'longBreak', label: `${settings.longBreak} мин` }
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="grid h-12 grid-cols-[42px_1fr_42px] items-center gap-2">
        <button
          type="button"
          onClick={openSettings}
          className="grid h-10 w-10 place-items-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
          aria-label="Настройки"
          title="Настройки"
        >
          <Settings className="h-5 w-5" />
        </button>

        <div className="grid grid-cols-3 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
          {tabs.map((tab) => (
            <button
              key={tab.mode}
              type="button"
              onClick={() => setTimerMode(tab.mode)}
              className={cn(
                'h-8 rounded-md text-xs font-medium transition',
                selectedMode === tab.mode
                  ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="grid h-10 w-10 place-items-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
          aria-label="Тема"
          title="Тема"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </header>

      <section className="flex flex-1 min-h-0 flex-col items-center justify-center pt-2">
        <div className="relative grid h-[258px] w-[258px] place-items-center">
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
                selectedMode === 'work' && 'text-rose-500',
                selectedMode === 'shortBreak' && 'text-emerald-500',
                selectedMode === 'longBreak' && 'text-amber-500'
              )}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
              {modeLabels[selectedMode]}
            </span>
            <span className="mt-2 font-mono text-[56px] font-semibold leading-none text-zinc-950 dark:text-white">
              {formatClock(displaySeconds)}
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-3 pb-2">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={!canControlWork}
            onClick={isRunningWork ? pauseTimer : startTimer}
            className={cn(
              'grid h-12 w-12 place-items-center rounded-full bg-zinc-950 text-white shadow-sm transition',
              'hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200',
              !canControlWork && 'cursor-not-allowed opacity-40'
            )}
            aria-label={isRunningWork ? 'Пауза' : 'Старт'}
            title={isRunningWork ? 'Пауза' : 'Старт'}
          >
            {isRunningWork ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>

          <button
            type="button"
            disabled={!canControlWork}
            onClick={resetTimer}
            className={cn(
              'grid h-12 w-12 place-items-center rounded-full border border-zinc-200 text-zinc-700 transition',
              'hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white',
              !canControlWork && 'cursor-not-allowed opacity-40'
            )}
            aria-label="Сброс"
            title="Сброс"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>

        <TaskSelect />
      </section>
    </div>
  );
};
