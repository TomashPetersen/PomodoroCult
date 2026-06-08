import { Archive, Check, ChevronDown, Pencil, Plus, X } from 'lucide-react';
import { FormEvent, MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { TASK_TITLE_MAX_LENGTH } from '../lib/constants';
import { getTaskTitle, t } from '../lib/i18n';
import { getActiveTasks, getDisplayTaskTitle, isTimerTaskLocked } from '../lib/storage';
import { cn } from '../lib/ui';
import { useAppStore } from '../store/useAppStore';
import { ActionIconButton } from './ActionIconButton';

export const TaskSelect = () => {
  const [open, setOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const locale = useAppStore((state) => state.locale);
  const settings = useAppStore((state) => state.settings);
  const tasks = useAppStore((state) => state.tasks);
  const timerState = useAppStore((state) => state.timerState);
  const highlightedTaskId = useAppStore((state) => state.highlightedTaskId);
  const taskActionError = useAppStore((state) => state.taskActionError);
  const selectTask = useAppStore((state) => state.selectTask);
  const addTask = useAppStore((state) => state.addTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const archiveTask = useAppStore((state) => state.archiveTask);
  const clearTaskActionError = useAppStore((state) => state.clearTaskActionError);
  const taskSelectionLocked = isTimerTaskLocked(settings, timerState);
  const sortedTasks = useMemo(
    () => getActiveTasks(tasks, taskSelectionLocked ? timerState.activeTaskId : highlightedTaskId ?? timerState.activeTaskId),
    [highlightedTaskId, taskSelectionLocked, tasks, timerState.activeTaskId]
  );
  const selectedTask = sortedTasks.find((task) => task.id === timerState.activeTaskId);
  const canCreate = quickTitle.trim().length > 0 && quickTitle.trim().length <= TASK_TITLE_MAX_LENGTH;
  const lockMessage = t(locale, 'taskChangeRequiresStop');

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
    if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuickCreateOpen(false);
        setEditingId(null);
        setEditingTitle('');
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const submitQuickTask = async (event: FormEvent) => {
    event.preventDefault();
    if (taskSelectionLocked) return;
    if (!canCreate) return;

    const createdTaskId = await addTask(quickTitle, { select: true });
    if (createdTaskId) {
      setQuickTitle('');
      setQuickCreateOpen(false);
    }
  };

  const canSaveEdit =
    editingTitle.trim().length > 0 && editingTitle.trim().length <= TASK_TITLE_MAX_LENGTH;

  const handleLockedClick = (event: MouseEvent) => {
    if (!taskSelectionLocked) return;
    event.preventDefault();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          clearTaskActionError();
          setOpen((value) => !value);
        }}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-xl border px-3 text-left text-sm transition',
          'border-zinc-200 bg-[#fcfcfb] text-zinc-900 shadow-sm hover:border-zinc-300',
          'dark:border-zinc-800 dark:bg-[#161b22] dark:text-zinc-100 dark:hover:border-zinc-700',
          taskSelectionLocked && 'cursor-not-allowed'
        )}
        aria-label={t(locale, 'taskSelect')}
      >
        <span className={cn('truncate', !selectedTask && 'text-zinc-500 dark:text-zinc-400')}>
          {selectedTask ? getDisplayTaskTitle(locale, selectedTask) : t(locale, 'noTask')}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute inset-x-0 bottom-[calc(100%+0.5rem)] z-30 max-h-[21rem] overflow-hidden rounded-2xl border border-zinc-200 bg-[#fcfcfb] p-2 shadow-soft dark:border-zinc-800 dark:bg-[#161b22]">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-2 pb-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>{t(locale, 'taskForCycle')}</span>
            <span>{taskSelectionLocked ? t(locale, 'stop') : t(locale, 'taskChangeBeforeStart')}</span>
          </div>

          {taskSelectionLocked && (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-4 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
              {lockMessage}
            </div>
          )}

          {taskActionError && (
            <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
              {taskActionError}
            </div>
          )}

          <div className="mt-2 max-h-[11rem] space-y-1 overflow-y-auto pr-1">
            {sortedTasks.length === 0 ? (
              <div className="rounded-xl bg-[#f0f3f6] px-3 py-3 text-sm text-zinc-500 dark:bg-[#21262d] dark:text-zinc-400">
                {t(locale, 'taskEmpty')}
              </div>
            ) : (
              sortedTasks.map((task) => {
                const selected = task.id === timerState.activeTaskId;
                const highlighted = task.id === highlightedTaskId;
                const system = task.system;
                const editing = editingId === task.id;

                return (
                  <div
                    key={task.id}
                    className={cn(
                      'group flex min-h-11 items-center gap-1 rounded-xl transition',
                      selected && 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
                      highlighted && !selected && 'bg-rose-50/80 dark:bg-rose-500/10',
                      !selected && !highlighted && 'text-zinc-700 hover:bg-[#eef2f6] dark:text-zinc-200 dark:hover:bg-[#21262d]'
                    )}
                  >
                    {editing ? (
                      <div className="flex min-h-11 min-w-0 flex-1 items-center gap-1 px-2 py-1">
                        <input
                          value={editingTitle}
                          maxLength={TASK_TITLE_MAX_LENGTH}
                          autoFocus
                          onChange={(event) => setEditingTitle(event.target.value)}
                          className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-[#f0f3f6] px-2 text-sm text-zinc-950 outline-none focus:border-rose-400 dark:border-zinc-700 dark:bg-[#0d1117] dark:text-[#f0f3f6]"
                        />
                        <ActionIconButton
                          type="button"
                          label={t(locale, 'save')}
                          tooltipAlign="center"
                          onClick={async () => {
                            if (!canSaveEdit) return;
                            await updateTask(task.id, editingTitle);
                            setEditingId(null);
                            setEditingTitle('');
                          }}
                          className={cn(
                            'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10',
                            !canSaveEdit && 'cursor-not-allowed opacity-40'
                          )}
                        >
                          <Check className="h-4 w-4" />
                        </ActionIconButton>
                        <ActionIconButton
                          type="button"
                          label={t(locale, 'cancel')}
                          tooltipAlign="center"
                          onClick={() => {
                            setEditingId(null);
                            setEditingTitle('');
                          }}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-500 transition hover:bg-[#eaeef2] hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]"
                        >
                          <X className="h-4 w-4" />
                        </ActionIconButton>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          aria-disabled={taskSelectionLocked}
                          onClick={async (event) => {
                            if (taskSelectionLocked) {
                              handleLockedClick(event);
                              return;
                            }
                            await selectTask(task.id);
                            setOpen(false);
                          }}
                          className={cn(
                            'flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition',
                            taskSelectionLocked && 'cursor-not-allowed'
                          )}
                        >
                          <span
                            className={cn(
                              'line-clamp-2 min-w-0 break-words py-0.5 leading-5',
                              task.title.length > 24 && 'text-xs'
                            )}
                          >
                            {getTaskTitle(locale, task.id, task.title)}
                          </span>
                          {selected && <Check className="h-4 w-4 shrink-0" />}
                        </button>
                        {!system && (
                          <>
                            <ActionIconButton
                              type="button"
                              label={t(locale, 'edit')}
                              tooltipAlign="center"
                              aria-disabled={taskSelectionLocked}
                              onClick={(event) => {
                                if (taskSelectionLocked) {
                                  handleLockedClick(event);
                                  return;
                                }
                                setEditingId(task.id);
                                setEditingTitle(task.title);
                              }}
                              className={cn(
                                'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-[#eaeef2] hover:text-zinc-800 dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]',
                                taskSelectionLocked && 'cursor-not-allowed opacity-50'
                              )}
                            >
                              <Pencil className="h-4 w-4" />
                            </ActionIconButton>
                            <ActionIconButton
                              type="button"
                              label={t(locale, 'archive')}
                              tooltipAlign="center"
                              aria-disabled={taskSelectionLocked}
                              onClick={(event) => {
                                if (taskSelectionLocked) {
                                  handleLockedClick(event);
                                  return;
                                }
                                void archiveTask(task.id);
                              }}
                              className={cn(
                                'mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-[#eaeef2] hover:text-zinc-800 dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]',
                                taskSelectionLocked && 'cursor-not-allowed opacity-50'
                              )}
                            >
                              <Archive className="h-4 w-4" />
                            </ActionIconButton>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {quickCreateOpen ? (
            <form onSubmit={submitQuickTask} className="mt-2 flex items-center gap-1 rounded-xl border border-zinc-200 bg-[#f0f3f6] p-1 dark:border-zinc-800 dark:bg-[#21262d]">
              <input
                value={quickTitle}
                maxLength={TASK_TITLE_MAX_LENGTH}
                disabled={taskSelectionLocked}
                autoFocus
                onChange={(event) => setQuickTitle(event.target.value)}
                placeholder={t(locale, 'taskNamePlaceholder')}
                className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed dark:text-white"
              />
              <button
                type="submit"
                disabled={!canCreate || taskSelectionLocked}
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-lg text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10',
                  (!canCreate || taskSelectionLocked) && 'cursor-not-allowed opacity-40'
                )}
                aria-label={t(locale, 'add')}
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickCreateOpen(false);
                  setQuickTitle('');
                }}
                className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-[#eaeef2] hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]"
                aria-label={t(locale, 'cancel')}
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              aria-disabled={taskSelectionLocked}
              onClick={(event) => {
                if (taskSelectionLocked) {
                  handleLockedClick(event);
                  return;
                }
                clearTaskActionError();
                setQuickCreateOpen(true);
              }}
              className={cn(
                'mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-[#eef2f6] dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-[#21262d]',
                taskSelectionLocked && 'cursor-not-allowed opacity-60'
              )}
            >
              <Plus className="h-4 w-4" />
              {t(locale, 'quickCreateTask')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
