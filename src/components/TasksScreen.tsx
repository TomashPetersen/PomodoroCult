import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { NO_TASK_ID, TASK_TITLE_MAX_LENGTH } from '../lib/constants';
import { getTaskTitle, t } from '../lib/i18n';
import { cn } from '../lib/ui';
import { useAppStore } from '../store/useAppStore';

export const TasksScreen = () => {
  const locale = useAppStore((state) => state.locale);
  const tasks = useAppStore((state) => state.tasks);
  const addTask = useAppStore((state) => state.addTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const canAdd = title.trim().length > 0 && title.trim().length <= TASK_TITLE_MAX_LENGTH;

  const submitTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!canAdd) return;
    await addTask(title);
    setTitle('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <form onSubmit={submitTask} className="flex h-12 items-center gap-2">
        <input
          value={title}
          maxLength={TASK_TITLE_MAX_LENGTH}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t(locale, 'newTask')}
          className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-rose-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-rose-500"
        />
        <button
          type="submit"
          disabled={!canAdd}
          className={cn(
            'grid h-10 w-10 place-items-center rounded-xl bg-zinc-950 text-white transition dark:bg-white dark:text-zinc-950',
            !canAdd && 'cursor-not-allowed opacity-35'
          )}
          aria-label={t(locale, 'add')}
          title={t(locale, 'add')}
        >
          <Plus className="h-5 w-5" />
        </button>
      </form>

      <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
        {tasks.map((task) => {
          const editing = editingId === task.id;
          const system = task.system || task.id === NO_TASK_ID;
          const canSaveEdit =
            editingTitle.trim().length > 0 && editingTitle.trim().length <= TASK_TITLE_MAX_LENGTH;

          return (
            <div
              key={task.id}
              className="flex min-h-12 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              {editing ? (
                <input
                  value={editingTitle}
                  maxLength={TASK_TITLE_MAX_LENGTH}
                  autoFocus
                  onChange={(event) => setEditingTitle(event.target.value)}
                  className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-sm text-zinc-950 outline-none focus:border-rose-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              ) : (
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {getTaskTitle(locale, task.id, task.title)}
                </span>
              )}

              {editing ? (
                <>
                  <button
                    type="button"
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
                    aria-label={t(locale, 'save')}
                    title={t(locale, 'save')}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditingTitle('');
                    }}
                    className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                    aria-label={t(locale, 'cancel')}
                    title={t(locale, 'cancel')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={system}
                    onClick={() => {
                      setEditingId(task.id);
                      setEditingTitle(task.title);
                    }}
                    className={cn(
                      'grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white',
                      system && 'cursor-not-allowed opacity-35'
                    )}
                    aria-label={t(locale, 'edit')}
                    title={t(locale, 'edit')}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={system}
                    onClick={() => void deleteTask(task.id)}
                    className={cn(
                      'grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300',
                      system && 'cursor-not-allowed opacity-35'
                    )}
                    aria-label={t(locale, 'delete')}
                    title={t(locale, 'delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
