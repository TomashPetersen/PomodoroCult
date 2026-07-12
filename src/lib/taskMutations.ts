import { NO_TASK_ID } from './constants';
import {
  clampTaskTitle,
  createTask,
  ensureNoTask,
  hasActiveTaskTitle,
  isTimerTaskLocked,
  sortTasks
} from './storage';
import { RuntimeMessage, StoredData } from './types';

export type TaskMutationMessage = Extract<
  RuntimeMessage,
  | { type: 'SELECT_TASK' }
  | { type: 'ADD_TASK' }
  | { type: 'UPDATE_TASK' }
  | { type: 'DELETE_TASK' }
  | { type: 'ARCHIVE_TASK' }
  | { type: 'RESTORE_TASK' }
>;

export interface TaskMutationResult {
  patch: Partial<StoredData>;
  taskId?: string;
}

export const applyTaskMutation = (
  data: StoredData,
  message: TaskMutationMessage
): TaskMutationResult => {
  const { settings, timerState } = data;

  switch (message.type) {
    case 'SELECT_TASK': {
      if (isTimerTaskLocked(settings, timerState)) throw new Error('TASK_LOCKED');
      const exists = message.payload.taskId === null ||
        data.tasks.some((task) => task.id === message.payload.taskId);
      if (!exists) throw new Error('TASK_NOT_FOUND');
      return {
        patch: { timerState: { ...timerState, activeTaskId: message.payload.taskId } }
      };
    }

    case 'ADD_TASK': {
      const title = clampTaskTitle(message.payload.title);
      if (!title) throw new Error('TASK_INVALID');
      if (hasActiveTaskTitle(data.tasks, title)) throw new Error('TASK_DUPLICATE');
      const task = createTask(title);
      const tasks = sortTasks([...ensureNoTask(data.tasks), task]);
      const canSelect = message.payload.select && !isTimerTaskLocked(settings, timerState);
      return {
        taskId: task.id,
        patch: {
          tasks,
          ...(canSelect
            ? { timerState: { ...timerState, activeTaskId: task.id } }
            : {})
        }
      };
    }

    case 'UPDATE_TASK': {
      const target = data.tasks.find((task) => task.id === message.payload.taskId);
      if (!target || target.system || target.id === NO_TASK_ID) throw new Error('TASK_NOT_FOUND');
      if (isTimerTaskLocked(settings, timerState) && target.id === timerState.activeTaskId) {
        throw new Error('TASK_LOCKED');
      }
      const title = clampTaskTitle(message.payload.title);
      if (!title) throw new Error('TASK_INVALID');
      if (hasActiveTaskTitle(data.tasks, title, target.id)) throw new Error('TASK_DUPLICATE');
      return {
        patch: {
          tasks: sortTasks(data.tasks.map((task) =>
            task.id === target.id ? { ...task, title } : task
          ))
        }
      };
    }

    case 'DELETE_TASK': {
      const target = data.tasks.find((task) => task.id === message.payload.taskId);
      if (!target || target.system || target.id === NO_TASK_ID) throw new Error('TASK_NOT_FOUND');
      if (isTimerTaskLocked(settings, timerState) && target.id === timerState.activeTaskId) {
        throw new Error('TASK_LOCKED');
      }
      return {
        patch: {
          tasks: sortTasks(data.tasks.filter((task) => task.id !== target.id)),
          ...(timerState.activeTaskId === target.id
            ? { timerState: { ...timerState, activeTaskId: null } }
            : {})
        }
      };
    }

    case 'ARCHIVE_TASK': {
      const target = data.tasks.find((task) => task.id === message.payload.taskId);
      if (!target || target.system || target.id === NO_TASK_ID) throw new Error('TASK_NOT_FOUND');
      if (isTimerTaskLocked(settings, timerState) && target.id === timerState.activeTaskId) {
        throw new Error('TASK_LOCKED');
      }
      return {
        patch: {
          tasks: sortTasks(data.tasks.map((task) => task.id === target.id
            ? { ...task, archived: true, archivedAt: Date.now() }
            : task)),
          ...(timerState.activeTaskId === target.id
            ? { timerState: { ...timerState, activeTaskId: null } }
            : {})
        }
      };
    }

    case 'RESTORE_TASK': {
      const target = data.tasks.find((task) => task.id === message.payload.taskId);
      if (!target || target.system || target.id === NO_TASK_ID || !target.archived) {
        throw new Error('TASK_NOT_FOUND');
      }
      if (hasActiveTaskTitle(data.tasks, target.title, target.id)) {
        throw new Error('TASK_RESTORE_DUPLICATE');
      }
      return {
        patch: {
          tasks: sortTasks(data.tasks.map((task) => task.id === target.id
            ? { ...task, archived: false, archivedAt: null }
            : task))
        }
      };
    }
  }
};
