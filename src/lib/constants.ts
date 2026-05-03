import type { AppScreen, Settings, StatsPeriod, TimerMode } from './types';

export const NO_TASK_ID = 'task-no-task';
export const NO_TASK_TITLE = 'Без задачи';
export const TASK_TITLE_MAX_LENGTH = 12;

export const TIMER_MODE_LABELS: Record<TimerMode, string> = {
  work: 'Помодоро',
  shortBreak: 'Перерыв',
  longBreak: 'Отдых'
};

export const SCREEN_LABELS: Record<AppScreen, string> = {
  timer: 'Таймер',
  tasks: 'Задачи',
  stats: 'Статистика'
};

export const SETTINGS_FIELDS: Array<{
  key: keyof Settings;
  label: string;
  min: number;
  max: number;
}> = [
  { key: 'workTime', label: 'Рабочее время', min: 1, max: 180 },
  { key: 'shortBreak', label: 'Короткий перерыв', min: 1, max: 60 },
  { key: 'longBreak', label: 'Длинный отдых', min: 1, max: 120 },
  { key: 'longBreakInterval', label: 'Циклов до отдыха', min: 1, max: 20 }
];

export const QUICK_STATS_PERIODS: Array<Exclude<StatsPeriod, 'custom'>> = ['1d', '7d', '30d'];

export const STATS_PERIOD_LABELS: Record<Exclude<StatsPeriod, 'custom'>, string> = {
  '1d': '1 д',
  '7d': '7 д',
  '30d': '30 д'
};
