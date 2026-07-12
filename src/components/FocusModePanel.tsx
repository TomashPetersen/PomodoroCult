import { Layers3, Save, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { resolveNextWorkSnapshot } from '../lib/focusModes';
import { t } from '../lib/i18n';
import { cn } from '../lib/ui';
import { FocusModeSnapshot } from '../lib/types';
import { useAppStore } from '../store/useAppStore';
import { FocusModeManagerModal } from './FocusModeManagerModal';

export const FocusModePanel = () => {
  const locale = useAppStore((state) => state.locale);
  const focusModes = useAppStore((state) => state.focusModes);
  const tasks = useAppStore((state) => state.tasks);
  const timerState = useAppStore((state) => state.timerState);
  const selectedFocusModeId = useAppStore((state) => state.selectedFocusModeId);
  const manualSettings = useAppStore((state) => state.manualSettings);
  const selectFocusMode = useAppStore((state) => state.selectFocusMode);
  const focusModeError = useAppStore((state) => state.focusModeError);
  const [pendingId, setPendingId] = useState(selectedFocusModeId ?? '');
  const [managerOpen, setManagerOpen] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState<FocusModeSnapshot | null>(null);

  useEffect(() => {
    setPendingId(selectedFocusModeId ?? '');
  }, [selectedFocusModeId]);

  const nextSnapshot = useMemo(
    () => resolveNextWorkSnapshot({
      focusModes,
      tasks,
      activeTaskId: timerState.activeTaskId,
      selectedFocusModeId,
      manualSettings
    }),
    [focusModes, manualSettings, selectedFocusModeId, tasks, timerState.activeTaskId]
  );
  const selectedTask = tasks.find((task) => !task.system && task.id === timerState.activeTaskId);
  const taskOverride = Boolean(selectedTask?.focusModeId && nextSnapshot.appliedFocusModeId === selectedTask.focusModeId);
  const nextModeTitle = nextSnapshot.appliedFocusModeId
    ? focusModes.find((mode) => mode.id === nextSnapshot.appliedFocusModeId)?.title ?? t(locale, 'focusModeDefault')
    : t(locale, 'focusModeDefault');
  const activeSnapshot = timerState.cycleStarted ? timerState.activeCycleSnapshot : null;
  const activeModeTitle = activeSnapshot?.appliedFocusModeId
    ? focusModes.find((mode) => mode.id === activeSnapshot.appliedFocusModeId)?.title ?? t(locale, 'focusModeDeleted')
    : t(locale, 'focusModeDefault');
  const selectionChanged = pendingId !== (selectedFocusModeId ?? '');

  return (
    <>
      <section className="rounded-2xl border border-zinc-200 bg-[#fcfcfb] px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-[#161b22]">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
            <Layers3 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">{t(locale, 'focusModes')}</h2>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {t(locale, 'focusModeNext', { mode: nextModeTitle })}
              {taskOverride ? ` · ${t(locale, 'focusModeTaskOverride')}` : ''}
            </p>
            {activeSnapshot && (
              <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                {t(locale, 'focusModeCurrentCycle', { mode: activeModeTitle })}
              </p>
            )}
          </div>

          <div className="col-span-3 flex min-w-0 items-center gap-2">
            <label className="sr-only" htmlFor="focus-mode-selector">{t(locale, 'focusModes')}</label>
            <select
              id="focus-mode-selector"
              value={pendingId}
              onChange={(event) => setPendingId(event.target.value)}
              className="h-9 min-w-0 flex-1 truncate rounded-xl border border-zinc-200 bg-[#f0f3f6] px-3 text-sm text-zinc-900 outline-none focus:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-200 dark:border-zinc-700 dark:bg-[#0d1117] dark:text-white"
            >
              <option value="">{t(locale, 'focusModeDefault')}</option>
              {focusModes.map((mode) => <option key={mode.id} value={mode.id}>{mode.title}</option>)}
            </select>
            <button
              type="button"
              disabled={!selectionChanged}
              onClick={() => void selectFocusMode(pendingId || null)}
              className={cn(
                'h-9 shrink-0 rounded-xl bg-[#24292f] px-3 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:bg-[#f0f3f6] dark:text-[#161b22]',
                !selectionChanged && 'cursor-not-allowed opacity-40'
              )}
            >
              {t(locale, 'focusModeApply')}
            </button>
          </div>

          <div className="col-start-3 row-start-1 flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setInitialSnapshot(nextSnapshot);
                setManagerOpen(true);
              }}
              className="flex h-9 items-center gap-2 rounded-xl border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Save className="h-4 w-4" />
              {t(locale, 'focusModeSaveCurrent')}
            </button>
            <button
              type="button"
              onClick={() => {
                setInitialSnapshot(null);
                setManagerOpen(true);
              }}
              className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label={t(locale, 'focusModeManage')}
              title={t(locale, 'focusModeManage')}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
        {focusModeError && (
          <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-300">
            {focusModeError.includes('unique') ? t(locale, 'focusModeDuplicateError') : t(locale, 'focusModeGenericError')}
          </p>
        )}
      </section>

      <FocusModeManagerModal
        open={managerOpen}
        initialSnapshot={initialSnapshot}
        onClose={() => {
          setManagerOpen(false);
          setInitialSnapshot(null);
        }}
      />
    </>
  );
};
