import { Check, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sortTasks } from '../lib/storage';
import { cn } from '../lib/ui';
import { NO_TASK_TITLE } from '../lib/types';
import { useAppStore } from '../store/useAppStore';

export const TaskSelect = () => {
  const [open, setOpen] = useState(false);
  const tasks = useAppStore((state) => state.tasks);
  const timerState = useAppStore((state) => state.timerState);
  const selectTask = useAppStore((state) => state.selectTask);
  const sortedTasks = useMemo(() => sortTasks(tasks), [tasks]);
  const selectedTask = sortedTasks.find((task) => task.id === timerState.activeTaskId);
  const disabled = timerState.isRunning;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-lg border px-3 text-left text-sm transition',
          'border-zinc-200 bg-white text-zinc-900 shadow-sm hover:border-zinc-300',
          'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-700',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <span className={cn(!selectedTask && 'text-zinc-500 dark:text-zinc-400')}>
          {selectedTask?.title ?? NO_TASK_TITLE}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
      </button>

      {open && !disabled && sortedTasks.length > 0 && (
        <div className="absolute bottom-full z-30 mb-2 max-h-40 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-soft dark:border-zinc-800 dark:bg-zinc-950">
          {sortedTasks.map((task) => {
            const selected = task.id === timerState.activeTaskId;

            return (
              <button
                key={task.id}
                type="button"
                onClick={async () => {
                  await selectTask(task.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex h-9 w-full items-center justify-between rounded-md px-2 text-sm transition',
                  selected
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200'
                    : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900'
                )}
              >
                <span className="truncate">{task.title}</span>
                {selected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
