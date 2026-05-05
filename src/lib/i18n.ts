import { NO_TASK_ID } from './constants';
import { LanguagePreference, Locale, TimerMode } from './types';

const messages = {
  en: {
    appName: 'Pomodoro Cult',
    loading: 'Pomodoro Cult',
    screenTimer: 'Timer',
    screenTasks: 'Tasks',
    screenStats: 'Statistics',
    timerWork: 'Work',
    timerShortBreak: 'Break',
    timerLongBreak: 'Rest',
    timerMinutes: '{count} min',
    settings: 'Settings',
    theme: 'Theme',
    pause: 'Pause',
    start: 'Start',
    stop: 'Stop',
    close: 'Close',
    closeNotification: 'Close notification',
    taskSelect: 'Task selection',
    taskChangeRequiresStop: 'Press Stop to change the task',
    taskForCycle: 'Task for current cycle',
    taskChangeBeforeStart: 'Changes are available before start',
    taskEmpty: 'No tasks yet. Add a new one using the button below.',
    createTask: 'Create task',
    noTask: 'No task',
    newTask: 'New task',
    add: 'Add',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    stats: 'Statistics',
    range: 'Range',
    sessionsMetric: 'Sessions: {title}',
    sessionsMetricEmpty: 'Sessions count',
    timeMetric: 'Time: {title}',
    timeMetricEmpty: 'Total time',
    noStats: 'No data for the selected period',
    session_one: 'session',
    session_few: 'sessions',
    session_other: 'sessions',
    chooseDateRange: 'Choose date range',
    startDate: 'Start date',
    endDate: 'End date',
    currentSelection: 'Current selection: {start} - {end}',
    apply: 'Apply',
    confirmStop: 'Confirm stop',
    stopDescription:
      'The timer will stop, completed cycles will reset, and the screen will return to the "Work" tab. Saved statistics will stay intact.',
    decrease: 'Decrease',
    increase: 'Increase',
    settingWorkTime: 'Work time',
    settingShortBreak: 'Short break',
    settingLongBreak: 'Long rest',
    settingLongBreakInterval: 'Cycles before rest',
    settingLanguage: 'Language',
    languageAuto: 'Auto',
    languageRu: 'Russian',
    languageEn: 'English',
    period1d: '1 d',
    period7d: '7 d',
    period30d: '30 d',
    errorPrepareRuntime: 'Could not prepare the background timer.',
    errorInitRuntime: 'Could not initialize the background timer.',
    errorLoadData: 'Could not load app data.',
    errorStartTimer: 'Could not start the timer.',
    errorPauseTimer: 'Could not pause the timer.',
    errorStopTimer: 'Could not stop the timer.',
    notificationWorkDone: 'Work finished',
    notificationBreakDone: 'Break finished',
    notificationRestDone: 'Rest finished',
    notificationNextMode: 'Next: {mode}',
    notificationAudioBlocked: 'Sound was blocked by Firefox background autoplay policy.'
  },
  ru: {
    appName: 'Помодоро Культ',
    loading: 'Помодоро Культ',
    screenTimer: 'Таймер',
    screenTasks: 'Задачи',
    screenStats: 'Статистика',
    timerWork: 'Работа',
    timerShortBreak: 'Перерыв',
    timerLongBreak: 'Отдых',
    timerMinutes: '{count} мин',
    settings: 'Настройки',
    theme: 'Тема',
    pause: 'Пауза',
    start: 'Старт',
    stop: 'Стоп',
    close: 'Закрыть',
    closeNotification: 'Закрыть уведомление',
    taskSelect: 'Выбор задачи',
    taskChangeRequiresStop: 'Чтобы сменить задачу, нажмите Стоп',
    taskForCycle: 'Задача для текущего цикла',
    taskChangeBeforeStart: 'Смена доступна до старта',
    taskEmpty: 'Нет задач. Добавьте новую через кнопку ниже.',
    createTask: 'Создать задачу',
    noTask: 'Без задачи',
    newTask: 'Новая задача',
    add: 'Добавить',
    save: 'Сохранить',
    cancel: 'Отмена',
    edit: 'Редактировать',
    delete: 'Удалить',
    stats: 'Статистика',
    range: 'Диапазон',
    sessionsMetric: 'Сессии: {title}',
    sessionsMetricEmpty: 'Количество сессий',
    timeMetric: 'Время: {title}',
    timeMetricEmpty: 'Общее время',
    noStats: 'Нет данных за выбранный период',
    session_one: 'сессия',
    session_few: 'сессии',
    session_other: 'сессий',
    chooseDateRange: 'Выберите диапазон дат',
    startDate: 'Дата начала',
    endDate: 'Дата окончания',
    currentSelection: 'Текущий выбор: {start} - {end}',
    apply: 'Применить',
    confirmStop: 'Подтвердите стоп',
    stopDescription:
      'Таймер будет остановлен, счетчик циклов обнулится, а экран вернется к вкладке "Работа". Уже сохраненная статистика останется.',
    decrease: 'Уменьшить',
    increase: 'Увеличить',
    settingWorkTime: 'Рабочее время',
    settingShortBreak: 'Короткий перерыв',
    settingLongBreak: 'Длинный отдых',
    settingLongBreakInterval: 'Циклов до отдыха',
    settingLanguage: 'Язык',
    languageAuto: 'Авто',
    languageRu: 'Русский',
    languageEn: 'English',
    period1d: '1 д',
    period7d: '7 д',
    period30d: '30 д',
    errorPrepareRuntime: 'Не удалось подготовить фоновый таймер.',
    errorInitRuntime: 'Не удалось инициализировать фоновый таймер.',
    errorLoadData: 'Не удалось загрузить данные приложения.',
    errorStartTimer: 'Не удалось запустить таймер.',
    errorPauseTimer: 'Не удалось поставить таймер на паузу.',
    errorStopTimer: 'Не удалось остановить таймер.',
    notificationWorkDone: 'Работа завершена',
    notificationBreakDone: 'Перерыв завершен',
    notificationRestDone: 'Отдых завершен',
    notificationNextMode: 'Далее: {mode}',
    notificationAudioBlocked: 'Firefox заблокировал фоновое воспроизведение звука.'
  }
} as const;

export type MessageKey = keyof (typeof messages)['en'] | keyof (typeof messages)['ru'];

const interpolate = (template: string, params?: Record<string, string | number>): string => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_match, key) => String(params[key] ?? ''));
};

export const detectBrowserLocale = (): Locale => {
  const raw =
    typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage
      ? chrome.i18n.getUILanguage()
      : typeof navigator !== 'undefined'
        ? navigator.language
        : 'en';

  return raw.toLowerCase().startsWith('ru') ? 'ru' : 'en';
};

export const resolveLocale = (preference: LanguagePreference): Locale =>
  preference === 'auto' ? detectBrowserLocale() : preference;

export const t = (
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>
): string => interpolate(messages[locale][key], params);

export const getTimerModeLabel = (locale: Locale, mode: TimerMode): string => {
  if (mode === 'work') return t(locale, 'timerWork');
  if (mode === 'shortBreak') return t(locale, 'timerShortBreak');
  return t(locale, 'timerLongBreak');
};

export const getStatsPeriodLabel = (locale: Locale, period: '1d' | '7d' | '30d'): string => {
  if (period === '1d') return t(locale, 'period1d');
  if (period === '7d') return t(locale, 'period7d');
  return t(locale, 'period30d');
};

export const getSettingLabel = (
  locale: Locale,
  key: 'workTime' | 'shortBreak' | 'longBreak' | 'longBreakInterval'
): string => {
  if (key === 'workTime') return t(locale, 'settingWorkTime');
  if (key === 'shortBreak') return t(locale, 'settingShortBreak');
  if (key === 'longBreak') return t(locale, 'settingLongBreak');
  return t(locale, 'settingLongBreakInterval');
};

export const getLanguagePreferenceLabel = (
  locale: Locale,
  preference: LanguagePreference
): string => {
  if (preference === 'auto') return t(locale, 'languageAuto');
  if (preference === 'ru') return t(locale, 'languageRu');
  return t(locale, 'languageEn');
};

export const getTaskTitle = (locale: Locale, taskId: string | null, title?: string | null): string => {
  if (taskId === NO_TASK_ID) return t(locale, 'noTask');
  return title ?? '';
};

export const pluralizeSessions = (locale: Locale, count: number): string => {
  if (locale === 'en') {
    return count === 1 ? t(locale, 'session_one') : t(locale, 'session_other');
  }

  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return t(locale, 'session_one');
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return t(locale, 'session_few');
  return t(locale, 'session_other');
};
