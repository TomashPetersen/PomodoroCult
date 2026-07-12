import { AlertCircle, ExternalLink, Moon, Music2, Pause, Play, Settings, SkipForward, Square, Sun, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getTaskTitle, getTimerModeLabel, t } from '../lib/i18n';
import { formatClock } from '../lib/format';
import {
  canStartTimerMode,
  formatCompactCount,
  getTimerLifecycleState,
  getTaskSessionCount,
  getRunningDisplaySeconds,
  hasStartedTimerCycle
} from '../lib/storage';
import { cn } from '../lib/ui';
import { TimerMode } from '../lib/types';
import { useAppStore } from '../store/useAppStore';
import { ActionIconButton } from './ActionIconButton';
import { TaskSelect } from './TaskSelect';
import { FocusMusicPopover } from './FocusMusicPopover';
import { TASK_TITLE_MAX_LENGTH } from '../lib/constants';
import { TooltipBubble } from './TooltipBubble';
import { getSnapshotDurationSeconds, resolveNextWorkSnapshot } from '../lib/focusModes';

interface TimerScreenProps {
  surface?: 'popup' | 'appWindow';
}

export const TimerScreen = ({ surface = 'popup' }: TimerScreenProps) => {
  const isAppWindow = surface === 'appWindow';
  const locale = useAppStore((state) => state.locale);
  const settings = useAppStore((state) => state.settings);
  const timerState = useAppStore((state) => state.timerState);
  const statistics = useAppStore((state) => state.statistics);
  const tasks = useAppStore((state) => state.tasks);
  const focusModes = useAppStore((state) => state.focusModes);
  const selectedFocusModeId = useAppStore((state) => state.selectedFocusModeId);
  const manualSettings = useAppStore((state) => state.manualSettings);
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
  const openAppWindow = useAppStore((state) => state.openAppWindow);
  const skipShortBreak = useAppStore((state) => state.skipShortBreak);
  const [now, setNow] = useState(() => Date.now());
  const [primaryActionPending, setPrimaryActionPending] = useState<'start' | 'pause' | null>(null);
  const [musicPopoverOpen, setMusicPopoverOpen] = useState(false);
  const musicPopoverRef = useRef<HTMLDivElement | null>(null);

  const displayMode = selectedMode;
  const displaySnapshot = timerState.cycleStarted && timerState.activeCycleSnapshot
    ? timerState.activeCycleSnapshot
    : resolveNextWorkSnapshot({
        focusModes,
        tasks,
        activeTaskId: timerState.activeTaskId,
        selectedFocusModeId,
        manualSettings
      });
  const modeDuration = getSnapshotDurationSeconds(displaySnapshot, displayMode);
  const runningDisplaySeconds =
    timerState.isRunning && timerState.targetEndTime
      ? getRunningDisplaySeconds(timerState.targetEndTime, now)
      : timerState.remainingSeconds;
  const displaySeconds =
    timerState.isRunning && selectedMode === timerState.currentMode
      ? runningDisplaySeconds
    : selectedMode === timerState.currentMode
      ? timerState.remainingSeconds
      : getSnapshotDurationSeconds(displaySnapshot, selectedMode);
  const progress = Math.max(0, Math.min(1, displaySeconds / Math.max(1, modeDuration)));
  const radius = 112;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const isViewingRunningMode = timerState.isRunning && selectedMode === timerState.currentMode;
  const canStartSelectedMode = canStartTimerMode(settings, timerState, selectedMode);
  const primaryBlockedByState = timerState.isRunning ? !isViewingRunningMode : !canStartSelectedMode;
  const primaryIsPause = primaryActionPending === 'start' || (primaryActionPending !== 'pause' && isViewingRunningMode);
  const primaryDisabled = primaryBlockedByState;
  const primaryBusy = primaryActionPending !== null;
  const stopDisabled = !hasStartedTimerCycle(settings, timerState);
  const startPulse = !timerState.isRunning && pulseStartMode === selectedMode;
  const showCompletedSessions = selectedMode === 'work';
  const lifecycleState =
    primaryActionPending === 'start'
      ? 'running'
      : primaryActionPending === 'pause'
        ? 'paused'
        : getTimerLifecycleState(settings, timerState);
  const isViewingCurrentMode = selectedMode === timerState.currentMode;
  const currentModeLabel = getTimerModeLabel(locale, timerState.currentMode);
  const statusLabel = isViewingCurrentMode
    ? lifecycleState === 'idle'
      ? t(locale, 'timerStatusReadyToStart')
      : lifecycleState === 'running'
        ? t(locale, 'timerStatusRunning')
        : lifecycleState === 'paused'
          ? t(locale, 'timerStatusPaused')
          : t(locale, 'timerStatusReady')
    : lifecycleState === 'running'
      ? t(locale, 'timerStatusRunningMode', { mode: currentModeLabel })
      : lifecycleState === 'paused'
        ? t(locale, 'timerStatusPausedMode', { mode: currentModeLabel })
        : t(locale, 'timerStatusAvailableMode', { mode: currentModeLabel });
  const selectedTaskTomatoes = getTaskSessionCount(statistics, timerState.activeTaskId);
  const selectedTaskTomatoLabel = formatCompactCount(locale, selectedTaskTomatoes);
  const selectedTask = tasks.find((task) => task.id === timerState.activeTaskId);
  const selectedTaskTitle = selectedTask
    ? getTaskTitle(locale, selectedTask.id, selectedTask.title)
    : t(locale, 'noTask');
  const tomatoAriaLabel = t(locale, 'tomatoesForTask', {
    title: selectedTaskTitle,
    count: selectedTaskTomatoes
  });
  const tomatoTooltipLabel = t(locale, 'tomatoesForTaskShort', {
    title: selectedTaskTitle,
    count: selectedTaskTomatoes
  });
  const tomatoTooltipMaxWidth = `min(${TASK_TITLE_MAX_LENGTH + 10}ch, calc(100vw - 2rem))`;
  const showSkipShortBreak = displayMode === 'shortBreak' && timerState.currentMode === 'shortBreak';

  useEffect(() => {
    if (!musicPopoverOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!musicPopoverRef.current?.contains(event.target as Node)) {
        setMusicPopoverOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [musicPopoverOpen]);

  useEffect(() => {
    if (!timerState.isRunning || !timerState.targetEndTime) {
      return;
    }

    let timeoutId: number | null = null;

    const scheduleNextTick = () => {
      const currentNow = Date.now();
      setNow(currentNow);

      const remainingMs = Math.max(0, timerState.targetEndTime! - currentNow);
      if (remainingMs <= 0) {
        return;
      }

      const delay = remainingMs % 1000 || 1000;
      timeoutId = window.setTimeout(scheduleNextTick, delay);
    };

    scheduleNextTick();

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [timerState.isRunning, timerState.targetEndTime]);
  const tabs: Array<{ mode: TimerMode; minutes: number }> = [
    { mode: 'work', minutes: displaySnapshot.workMinutes },
    { mode: 'shortBreak', minutes: displaySnapshot.shortBreakMinutes },
    { mode: 'longBreak', minutes: displaySnapshot.longRestMinutes }
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className={cn('grid grid-cols-[42px_1fr_42px] items-center gap-2', isAppWindow ? 'h-11' : 'h-12')}>
        <ActionIconButton
          type="button"
          onClick={openSettings}
          label={t(locale, 'settings')}
          tooltipAlign="left"
          tooltipSide="bottom"
          className="grid h-10 w-10 place-items-center rounded-xl text-zinc-600 transition hover:bg-[#eef2f6] hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]"
        >
          <Settings className="h-5 w-5" />
        </ActionIconButton>

        <div className="grid grid-cols-3 rounded-xl bg-[#eaeef2] p-1 dark:bg-[#161b22]">
          {tabs.map((tab) => {
            const active = selectedMode === tab.mode;
            const actualMode = timerState.currentMode === tab.mode && lifecycleState !== 'idle';
            const markerColor =
              tab.mode === 'work'
                ? 'text-rose-500'
                : tab.mode === 'shortBreak'
                  ? 'text-emerald-500'
                  : 'text-amber-500';

            return (
              <button
                key={tab.mode}
                type="button"
                onClick={() => setTimerMode(tab.mode)}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-lg px-1.5 text-center transition',
                  isAppWindow ? 'h-11' : 'h-12',
                  active
                    ? 'bg-[#fcfcfb] text-zinc-950 shadow-sm dark:bg-[#21262d] dark:text-[#f0f3f6]'
                    : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-[#f0f3f6]'
                )}
              >
                <span className="max-w-full truncate text-[11px] font-semibold leading-none">
                  {getTimerModeLabel(locale, tab.mode)}
                </span>
                <span className="mt-1 text-[11px] leading-none opacity-80">
                  {t(locale, 'timerMinutes', { count: tab.minutes })}
                </span>
                {actualMode && (
                  <span
                    className={cn(
                      'absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full',
                      lifecycleState === 'running' &&
                        'animate-pulse bg-current motion-reduce:animate-none',
                      lifecycleState === 'paused' && 'bg-current',
                      lifecycleState === 'ready' && 'border border-current',
                      markerColor
                    )}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        <ActionIconButton
          type="button"
          onClick={toggleTheme}
          label={t(locale, 'theme')}
          tooltipAlign="right"
          tooltipSide="bottom"
          className="grid h-10 w-10 place-items-center rounded-xl text-zinc-600 transition hover:bg-[#eef2f6] hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </ActionIconButton>
      </header>

      <section
        className={cn(
          'flex min-h-0 flex-col items-center',
          isAppWindow ? 'flex-none pt-2' : 'flex-1 justify-center pt-1'
        )}
      >
        <div className={cn('relative aspect-square w-full', isAppWindow ? 'max-w-[19.25rem]' : 'max-w-[17.25rem]')}>
          <svg className="h-full w-full -rotate-90" viewBox="0 0 258 258" aria-hidden="true">
            <circle
              cx="129"
              cy="129"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-[#eaeef2] dark:text-[#21262d]"
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

          <div className="absolute inset-0 px-5 text-center">
            <span className="absolute bottom-[calc(50%+3.15rem)] left-1/2 block -translate-x-1/2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              {getTimerModeLabel(locale, displayMode)}
            </span>
            <span
              role="status"
              aria-live="polite"
              className="absolute bottom-[calc(50%+2rem)] left-1/2 flex max-w-[11rem] -translate-x-1/2 items-center justify-center gap-1 whitespace-nowrap text-[9px] font-medium text-zinc-500 dark:text-zinc-400"
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full',
                  lifecycleState === 'running' &&
                    'animate-pulse motion-reduce:animate-none',
                  lifecycleState === 'running' &&
                    timerState.currentMode === 'work' &&
                    'bg-rose-500',
                  lifecycleState === 'running' &&
                    timerState.currentMode === 'shortBreak' &&
                    'bg-emerald-500',
                  lifecycleState === 'running' &&
                    timerState.currentMode === 'longBreak' &&
                    'bg-amber-500',
                  lifecycleState === 'paused' && 'bg-amber-500',
                  lifecycleState === 'ready' && 'border border-emerald-500',
                  lifecycleState === 'idle' && 'border border-zinc-400'
                )}
                aria-hidden="true"
              />
              {statusLabel}
            </span>
            <span
              className={cn(
                'absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 font-mono tabular-nums font-semibold leading-none text-zinc-950 dark:text-white',
                isAppWindow ? 'text-[clamp(3.1rem,4.9vw,3.65rem)]' : 'text-[clamp(2.9rem,14vw,4.6rem)]'
              )}
            >
              {formatClock(displaySeconds)}
            </span>
            {showCompletedSessions && (
              <span
                className={cn(
                  'group/tomato absolute left-1/2 top-[calc(50%+3.35rem)] inline-flex h-10 min-w-10 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-rose-500 px-2 font-semibold tabular-nums text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f7fa] dark:focus-visible:ring-offset-[#0b0f14]',
                  selectedTaskTomatoLabel.length > 3 ? 'text-[10px]' : 'text-sm'
                )}
                aria-label={tomatoAriaLabel}
                tabIndex={0}
              >
                {selectedTaskTomatoLabel}
                <TooltipBubble
                  className="left-1/2 top-[calc(100%+0.45rem)] -translate-x-1/2 overflow-hidden text-ellipsis group-hover/tomato:block group-focus-visible/tomato:block"
                  maxWidth={tomatoTooltipMaxWidth}
                >
                  {tomatoTooltipLabel}
                </TooltipBubble>
              </span>
            )}
          </div>
        </div>
      </section>

      <section className={cn(isAppWindow ? 'mt-3 space-y-2 pb-0' : 'space-y-2 pb-2')}>
        <div className="flex items-center justify-center gap-2.5">
          <ActionIconButton
            type="button"
            disabled={primaryDisabled}
            label={primaryIsPause ? t(locale, 'pause') : t(locale, 'start')}
            tooltipAlign="center"
            onClick={
              primaryIsPause
                ? async () => {
                    if (primaryBusy) {
                      return;
                    }
                    setPrimaryActionPending('pause');
                    try {
                      await pauseTimer();
                    } finally {
                      setPrimaryActionPending(null);
                    }
                  }
                : async () => {
                    if (primaryBusy) {
                      return;
                    }
                    setPrimaryActionPending('start');
                    try {
                      const startedAt = Date.now();
                      setNow(startedAt);
                      await startTimer(startedAt);
                    } finally {
                      setPrimaryActionPending(null);
                    }
                  }
            }
            className={cn(
              'grid place-items-center rounded-full bg-[#24292f] text-[#f6f8fa] shadow-sm transition',
              isAppWindow ? 'h-11 w-11' : 'h-11 w-11',
              'hover:bg-[#32383f] dark:bg-[#f0f3f6] dark:text-[#161b22] dark:hover:bg-[#d8dee4]',
              primaryDisabled && 'cursor-not-allowed opacity-40',
              primaryBusy && 'pointer-events-none',
              startPulse && 'soft-pulse'
            )}
          >
            {primaryIsPause ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </ActionIconButton>

          <ActionIconButton
            type="button"
            disabled={stopDisabled}
            onClick={openResetConfirm}
            label={t(locale, 'stop')}
            tooltipAlign="center"
            className={cn(
              'grid place-items-center rounded-full border border-zinc-200 text-zinc-700 transition',
              isAppWindow ? 'h-11 w-11' : 'h-11 w-11',
              'hover:bg-[#eef2f6] hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]',
              stopDisabled && 'cursor-not-allowed opacity-40'
            )}
          >
            <Square className="h-4 w-4 fill-current" />
          </ActionIconButton>

          {showSkipShortBreak && (
            <ActionIconButton
              type="button"
              onClick={() => void skipShortBreak()}
              label={t(locale, 'skipBreak')}
              tooltipAlign="center"
              className={cn(
                'grid place-items-center rounded-full border border-zinc-200 text-zinc-700 transition hover:bg-[#eef2f6] hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]',
                isAppWindow ? 'h-11 w-11' : 'h-11 w-11'
              )}
            >
              <SkipForward className="h-4 w-4" />
            </ActionIconButton>
          )}
        </div>

        {surface === 'popup' && (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <ActionIconButton
              type="button"
              onClick={() => void openAppWindow()}
              label={t(locale, 'openAppWindow')}
              tooltipAlign="center"
              className="flex h-8 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-[#fcfcfb] px-3 text-xs font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-[#f5f7fa] hover:text-zinc-950 dark:border-[#30363d] dark:bg-[#161b22] dark:text-zinc-300 dark:hover:border-[#484f58] dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{t(locale, 'appWindowTitle')}</span>
            </ActionIconButton>

            <div ref={musicPopoverRef} className="relative">
              <ActionIconButton
                type="button"
                onClick={() => setMusicPopoverOpen((current) => !current)}
                label={t(locale, 'focusMusic')}
                tooltipAlign="right"
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-xl border border-zinc-200 bg-[#fcfcfb] text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-[#f5f7fa] hover:text-zinc-950 dark:border-[#30363d] dark:bg-[#161b22] dark:text-zinc-300 dark:hover:border-[#484f58] dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]',
                  musicPopoverOpen && 'border-zinc-300 bg-[#f5f7fa] text-zinc-950 dark:border-[#484f58] dark:bg-[#21262d] dark:text-[#f0f3f6]'
                )}
              >
                <Music2 className="h-3.5 w-3.5" />
              </ActionIconButton>

              {musicPopoverOpen && (
                <div className="absolute bottom-[calc(100%+0.45rem)] right-0 z-50">
                  <FocusMusicPopover />
                </div>
              )}
            </div>
          </div>
        )}

        <TaskSelect />

        {runtimeError && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="min-w-0 flex-1 leading-5">{runtimeError}</p>
            <ActionIconButton
              type="button"
              onClick={clearRuntimeError}
              label={t(locale, 'closeNotification')}
              tooltipAlign="right"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md transition hover:bg-rose-100 dark:hover:bg-rose-500/10"
            >
              <X className="h-4 w-4" />
            </ActionIconButton>
          </div>
        )}
      </section>
    </div>
  );
};
