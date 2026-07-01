import { Archive, Check, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { NO_TASK_ID, TASK_TITLE_MAX_LENGTH } from '../lib/constants';
import { getTaskTitle, t } from '../lib/i18n';
import { getActiveTasks, getArchivedTasks, hasStartedTimerCycle, isTimerTaskLocked } from '../lib/storage';
import { cn } from '../lib/ui';
import { useAppStore } from '../store/useAppStore';
import { ActionIconButton } from './ActionIconButton';

type TaskTab = 'active' | 'archive';

export const TasksScreen = () => {
  const locale = useAppStore((state) => state.locale);
  const settings = useAppStore((state) => state.settings);
  const tasks = useAppStore((state) => state.tasks);
  const timerState = useAppStore((state) => state.timerState);
  const highlightedTaskId = useAppStore((state) => state.highlightedTaskId);
  const taskActionError = useAppStore((state) => state.taskActionError);
  const addTask = useAppStore((state) => state.addTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const archiveTask = useAppStore((state) => state.archiveTask);
  const restoreTask = useAppStore((state) => state.restoreTask);
  const clearTaskActionError = useAppStore((state) => state.clearTaskActionError);
  const [tab, setTab] = useState<TaskTab>('active');
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<string | null>(null);
  const activeTasks = useMemo(() => getActiveTasks(tasks, highlightedTaskId), [highlightedTaskId, tasks]);
  const archivedTasks = useMemo(() => getArchivedTasks(tasks), [tasks]);
  const visibleTasks = tab === 'active' ? activeTasks : archivedTasks;
  const canAdd = title.trim().length > 0 && title.trim().length <= TASK_TITLE_MAX_LENGTH;
  const taskSelectionLocked = isTimerTaskLocked(settings, timerState);
  const cycleStarted = hasStartedTimerCycle(settings, timerState);
  const lockMessage = t(locale, 'taskChangeRequiresStop');
  const pendingDeleteTask = pendingDeleteTaskId ? tasks.find((task) => task.id === pendingDeleteTaskId) : null;
  const pendingDeleteTitle = pendingDeleteTaskId
    ? getTaskTitle(locale, pendingDeleteTaskId, pendingDeleteTask?.title ?? '')
    : '';

  const submitTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!canAdd) return;
    const createdTaskId = await addTask(title, {
      select: !taskSelectionLocked,
      highlight: !taskSelectionLocked
    });
    if (createdTaskId) {
      setTitle('');
      setTab('active');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <form onSubmit={submitTask} className="flex h-12 items-center gap-2">
        <input
          value={title}
          maxLength={TASK_TITLE_MAX_LENGTH}
          onFocus={clearTaskActionError}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t(locale, 'newTask')}
          className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-[#fcfcfb] px-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-rose-400 dark:border-zinc-800 dark:bg-[#161b22] dark:text-[#f0f3f6] dark:focus:border-rose-500"
        />
        <button
          type="submit"
          disabled={!canAdd}
          className={cn(
            'grid h-10 w-10 place-items-center rounded-xl bg-[#24292f] text-[#f6f8fa] transition dark:bg-[#f0f3f6] dark:text-[#161b22]',
            !canAdd && 'cursor-not-allowed opacity-35'
          )}
          aria-label={t(locale, 'add')}
        >
          <Plus className="h-5 w-5" />
        </button>
      </form>

      <div className="mt-3 grid grid-cols-2 rounded-xl bg-[#eaeef2] p-1 dark:bg-[#161b22]">
        {(['active', 'archive'] as TaskTab[]).map((item) => {
          const active = tab === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => {
                clearTaskActionError();
                setEditingId(null);
                setTab(item);
              }}
              className={cn(
                'h-9 rounded-lg text-xs font-semibold transition',
                active
                  ? 'bg-[#fcfcfb] text-zinc-950 shadow-sm dark:bg-[#21262d] dark:text-[#f0f3f6]'
                  : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-[#f0f3f6]'
              )}
            >
              {item === 'active' ? t(locale, 'activeTasks') : t(locale, 'archivedTasks')}
            </button>
          );
        })}
      </div>

      {taskActionError && (
        <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
          {taskActionError}
        </div>
      )}

      <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
        {visibleTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {tab === 'archive' ? t(locale, 'archivedEmpty') : t(locale, 'taskEmpty')}
          </div>
        ) : (
          visibleTasks.map((task) => {
            const editing = editingId === task.id;
            const system = task.system || task.id === NO_TASK_ID;
            const highlighted = task.id === highlightedTaskId;
            const canSaveEdit =
              editingTitle.trim().length > 0 && editingTitle.trim().length <= TASK_TITLE_MAX_LENGTH;
            const selectedTaskInCycle = task.id === timerState.activeTaskId && cycleStarted;
            return (
              <div
                key={task.id}
                className={cn(
                  'flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 shadow-sm transition',
                  highlighted
                    ? 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10'
                    : 'border-zinc-200 bg-[#fcfcfb] dark:border-zinc-800 dark:bg-[#161b22]'
                )}
              >
                {editing ? (
                  <input
                    value={editingTitle}
                    maxLength={TASK_TITLE_MAX_LENGTH}
                    autoFocus
                    onChange={(event) => setEditingTitle(event.target.value)}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-[#f0f3f6] px-2 text-sm text-zinc-950 outline-none focus:border-rose-400 dark:border-zinc-700 dark:bg-[#0d1117] dark:text-[#f0f3f6]"
                  />
                ) : (
                  <span
                    className={cn(
                      'line-clamp-2 min-w-0 flex-1 break-words py-0.5 font-medium leading-5 text-zinc-900 dark:text-zinc-100',
                      task.title.length > 24 ? 'text-xs' : 'text-sm'
                    )}
                  >
                    {getTaskTitle(locale, task.id, task.title)}
                  </span>
                )}

                {editing ? (
                  <>
                    <ActionIconButton
                      type="button"
                      label={t(locale, 'save')}
                      tooltipSide="bottom"
                      disabled={!canSaveEdit}
                      onClick={async () => {
                        await updateTask(task.id, editingTitle);
                        setEditingId(null);
                        setEditingTitle('');
                      }}
                      className={cn(
                        'grid h-8 w-8 place-items-center rounded-md text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10',
                        !canSaveEdit && 'cursor-not-allowed opacity-40'
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </ActionIconButton>
                    <ActionIconButton
                      type="button"
                      label={t(locale, 'cancel')}
                      tooltipSide="bottom"
                      onClick={() => {
                        setEditingId(null);
                        setEditingTitle('');
                      }}
                      className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </ActionIconButton>
                  </>
                ) : (
                  <>
                    {!system && (
                      <ActionIconButton
                        type="button"
                        label={t(locale, 'edit')}
                        tooltipSide="bottom"
                        aria-disabled={selectedTaskInCycle}
                        onClick={() => {
                          if (selectedTaskInCycle) {
                            void updateTask(task.id, task.title);
                            return;
                          }
                          clearTaskActionError();
                          setEditingId(task.id);
                          setEditingTitle(task.title);
                        }}
                        className={cn(
                          'grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white',
                          selectedTaskInCycle && 'cursor-not-allowed opacity-50'
                        )}
                      >
                        <Pencil className="h-4 w-4" />
                      </ActionIconButton>
                    )}
                    {!system && (tab === 'archive' ? (
                      <>
                        <ActionIconButton
                          type="button"
                          label={t(locale, 'restore')}
                          tooltipSide="bottom"
                          onClick={() => void restoreTask(task.id)}
                          className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-emerald-50 hover:text-emerald-600 dark:text-zinc-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </ActionIconButton>
                        <ActionIconButton
                          type="button"
                          label={t(locale, 'delete')}
                          tooltipSide="bottom"
                          onClick={() => setPendingDeleteTaskId(task.id)}
                          className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </ActionIconButton>
                      </>
                    ) : (
                      <>
                        <ActionIconButton
                          type="button"
                          label={t(locale, 'archive')}
                          tooltipSide="bottom"
                          aria-disabled={selectedTaskInCycle}
                          onClick={() => void archiveTask(task.id)}
                          className={cn(
                            'grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-amber-50 hover:text-amber-600 dark:text-zinc-400 dark:hover:bg-amber-500/10 dark:hover:text-amber-300',
                            selectedTaskInCycle && 'cursor-not-allowed opacity-50'
                          )}
                        >
                          <Archive className="h-4 w-4" />
                        </ActionIconButton>
                        <ActionIconButton
                          type="button"
                          label={t(locale, 'delete')}
                          tooltipSide="bottom"
                          aria-disabled={selectedTaskInCycle}
                          onClick={() => {
                            if (selectedTaskInCycle) {
                              void deleteTask(task.id);
                              return;
                            }
                            setPendingDeleteTaskId(task.id);
                          }}
                          className={cn(
                            'grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300',
                            selectedTaskInCycle && 'cursor-not-allowed opacity-50'
                          )}
                        >
                          <Trash2 className="h-4 w-4" />
                        </ActionIconButton>
                      </>
                    ))}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {pendingDeleteTaskId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/55 p-5 backdrop-blur-sm">
          <div className="w-full max-w-[24rem] rounded-2xl border border-zinc-200 bg-[#fcfcfb] p-4 shadow-soft dark:border-zinc-800 dark:bg-[#161b22]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                  {t(locale, 'confirmDeleteTask')}
                </h2>
                <p className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-300">
                  {t(locale, 'deleteTaskDescription', { title: pendingDeleteTitle })}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteTaskId(null)}
                className="h-10 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 transition hover:bg-[#eef2f6] hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]"
              >
                {t(locale, 'cancel')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!pendingDeleteTaskId) return;
                  const taskId = pendingDeleteTaskId;
                  setPendingDeleteTaskId(null);
                  await deleteTask(taskId);
                }}
                className="h-10 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-500"
              >
                {t(locale, 'deleteForever')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
