import { Check, ChevronDown, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NO_TASK_TITLE } from '../lib/constants';
import { sortTasks } from '../lib/storage';
import { cn } from '../lib/ui';
import { useAppStore } from '../store/useAppStore';

export const TaskSelect = () => {
  const [open, setOpen] = useState(false);
  const tasks = useAppStore((state) => state.tasks);
  const timerState = useAppStore((state) => state.timerState);
  const selectTask = useAppStore((state) => state.selectTask);
  const setScreen = useAppStore((state) => state.setScreen);
  const sortedTasks = useMemo(() => sortTasks(tasks), [tasks]);
  const selectedTask = sortedTasks.find((task) => task.id === timerState.activeTaskId);
  const taskSelectionLocked = timerState.isRunning;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-xl border px-3 text-left text-sm transition',
          'border-zinc-200 bg-white text-zinc-900 shadow-sm hover:border-zinc-300',
          'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-700'
        )}
      >
        <span className={cn('truncate', !selectedTask && 'text-zinc-500 dark:text-zinc-400')}>
          {selectedTask?.title ?? NO_TASK_TITLE}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-soft dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-2 pb-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>Задача для текущего цикла</span>
            {taskSelectionLocked && <span>Смена доступна после сброса</span>}
          </div>

          <div className="mt-2 max-h-[132px] space-y-1 overflow-y-auto pr-1">
            {sortedTasks.length === 0 ? (
              <div className="rounded-xl bg-zinc-50 px-3 py-3 text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                Нет задач. Добавьте новую через кнопку ниже.
              </div>
            ) : (
              sortedTasks.map((task) => {
                const selected = task.id === timerState.activeTaskId;

                return (
                  <button
                    key={task.id}
                    type="button"
                    disabled={taskSelectionLocked}
                    onClick={async () => {
                      await selectTask(task.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex h-10 w-full items-center justify-between rounded-xl px-3 text-sm transition',
                      selected
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200'
                        : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900',
                      taskSelectionLocked && 'cursor-not-allowed opacity-45'
                    )}
                  >
                    <span className="truncate">{task.title}</span>
                    {selected && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setScreen('tasks');
              setOpen(false);
            }}
            className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            <Plus className="h-4 w-4" />
            Создать задачу
          </button>
        </div>
      )}
    </div>
  );
};
