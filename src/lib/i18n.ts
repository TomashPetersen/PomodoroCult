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
    timerStatusReadyToStart: 'Ready to start',
    timerStatusRunning: 'Running',
    timerStatusPaused: 'Paused',
    timerStatusReady: 'Ready to start',
    timerStatusRunningMode: 'Running: {mode}',
    timerStatusPausedMode: 'Paused: {mode}',
    timerStatusAvailableMode: 'Available: {mode}',
    settings: 'Settings',
    theme: 'Theme',
    pause: 'Pause',
    start: 'Start',
    stop: 'Stop',
    skipBreak: 'Skip break',
    close: 'Close',
    openAppWindow: 'Open app window',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    appWindowTitle: 'Focus workspace',
    todayWidgetTitle: 'Today',
    todaySessions: 'Sessions',
    todayFocusTime: 'Focus time',
    closeNotification: 'Close notification',
    taskSelect: 'Task selection',
    taskForNextCycle: 'Task for next cycle',
    taskChangeRequiresStop: 'Press Stop to reset the timer before changing or creating a task.',
    taskForCycle: 'Task for current cycle',
    taskChangeBeforeStart: 'Changes are available before start',
    taskEmpty: 'No tasks yet. Add a new one using the button below.',
    createTask: 'Create task',
    quickCreateTask: 'Quick add task',
    taskNamePlaceholder: 'Task name',
    noTask: 'No task',
    tomatoesForTask: 'Completed for "{title}": {count}',
    tomatoesForTaskShort: '{title}: {count}',
    newTask: 'New task',
    add: 'Add',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    archive: 'Archive',
    restore: 'Restore',
    deleteStats: 'Delete statistics',
    confirmDeleteStats: 'Delete statistics?',
    deleteStatsDescription:
      'This will permanently remove all saved statistics for "{title}". This action cannot be undone.',
    confirmDeleteTask: 'Delete task?',
    deleteTaskDescription:
      'This will permanently remove the task "{title}". This action cannot be undone.',
    deleteForever: 'Delete forever',
    activeTasks: 'Active',
    archivedTasks: 'Archive',
    archivedEmpty: 'Archive is empty',
    taskDuplicateError: 'A task with this name already exists.',
    taskRestoreDuplicateError: 'An active task with this name already exists.',
    stats: 'Statistics',
    statsListView: 'List',
    statsChartView: 'Chart',
    statsChartTitle: 'Activity chart',
    statsChartTooltip: '{date}: {title}, {sessions} {sessionWord}, {time}',
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
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    openCalendar: 'Open calendar',
    confirmStop: 'Confirm stop',
    stopDescription:
      'The timer will stop and the screen will return to the "Work" tab. Saved task statistics will stay intact.',
    decrease: 'Decrease',
    increase: 'Increase',
    settingWorkTime: 'Work time',
    settingShortBreak: 'Short break',
    settingLongBreak: 'Long rest',
    settingLongBreakInterval: 'Cycles before rest',
    settingLanguage: 'Language',
    settingAutoStartBreaks: 'Auto-start breaks',
    settingAutoStartBreaksDescription: 'Start break and rest timers automatically after completed work.',
    settingData: 'Data',
    settingDataDescription:
      'Export a backup or import a Pomodoro Cult JSON file. Import replaces current local data.',
    settingIntervalAppliesAfterCurrentTimer: 'Applies after the current timer.',
    exportData: 'Export',
    importData: 'Import',
    openDataMenu: 'Export and import',
    dataMenuTitle: 'Data',
    exportMenuTitle: 'Export data',
    exportFullBackup: 'Full backup',
    exportFullBackupDescription:
      'Tasks, settings, statistics, theme, and safe timer state as a JSON file.',
    importBackup: 'Import backup',
    importBackupDescription: 'Replace current local data with a Pomodoro Cult JSON backup.',
    dataExportSuccess: 'Backup file created.',
    dataExportError: 'Could not export data.',
    dataImportSuccess: 'Data imported.',
    dataImportError: 'Could not import this file.',
    focusMusic: 'Focus music',
    focusMusicDescription: 'Local nature loop for running work sessions.',
    focusMusicOn: 'Music on',
    focusMusicOff: 'Music off',
    focusMusicVolume: 'Volume',
    focusMusicTrackStream: 'Stream',
    focusMusicTrackBirds: 'Birds',
    focusMusicTrackClock: 'Clock',
    supportProject: 'Support project',
    supportProjectDescription: 'Donation link is not configured yet.',
    supportComingSoon: 'Coming soon',
    settingDurationLocked: 'Press Stop to reset the timer before changing timer durations.',
    settingInvalidValue: 'Enter a value from {min} to {max}.',
    settingShortBreakNotLongerThanRest: 'Short break cannot be longer than long rest.',
    settingLongRestNotShorterThanBreak: 'Long rest cannot be shorter than short break.',
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
    errorSkipBreak: 'Could not skip the break.',
    errorStopTimer: 'Could not stop the timer.',
    errorOpenAppWindow: 'Could not open the app window.',
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
    timerStatusReadyToStart: 'Готово к старту',
    timerStatusRunning: 'Идет',
    timerStatusPaused: 'На паузе',
    timerStatusReady: 'К запуску',
    timerStatusRunningMode: 'Идет: {mode}',
    timerStatusPausedMode: 'На паузе: {mode}',
    timerStatusAvailableMode: 'Доступен: {mode}',
    settings: 'Настройки',
    theme: 'Тема',
    pause: 'Пауза',
    start: 'Старт',
    stop: 'Стоп',
    skipBreak: 'Пропустить перерыв',
    close: 'Закрыть',
    openAppWindow: 'Открыть окно',
    fullscreen: 'На весь экран',
    exitFullscreen: 'Выйти из полноэкранного режима',
    appWindowTitle: 'Рабочее окно',
    todayWidgetTitle: 'Сегодня',
    todaySessions: 'Сессии',
    todayFocusTime: 'Фокус',
    closeNotification: 'Закрыть уведомление',
    taskSelect: 'Выбор задачи',
    taskForNextCycle: 'Задача для следующего цикла',
    taskChangeRequiresStop: 'Чтобы изменить или создать задачу, нажмите Стоп и сбросьте таймер.',
    taskForCycle: 'Задача для текущего цикла',
    taskChangeBeforeStart: 'Смена доступна до старта',
    taskEmpty: 'Нет задач. Добавьте новую через кнопку ниже.',
    createTask: 'Создать задачу',
    quickCreateTask: 'Быстро добавить',
    taskNamePlaceholder: 'Название задачи',
    noTask: 'Без задачи',
    tomatoesForTask: 'Выполнено для «{title}»: {count}',
    tomatoesForTaskShort: '{title}: {count}',
    newTask: 'Новая задача',
    add: 'Добавить',
    save: 'Сохранить',
    cancel: 'Отмена',
    edit: 'Редактировать',
    delete: 'Удалить',
    archive: 'Архивировать',
    restore: 'Восстановить',
    deleteStats: 'Удалить статистику',
    confirmDeleteStats: 'Удалить статистику?',
    deleteStatsDescription:
      'Это безвозвратно удалит всю сохраненную статистику для «{title}». Действие нельзя отменить.',
    confirmDeleteTask: 'Удалить задачу?',
    deleteTaskDescription:
      'Это безвозвратно удалит задачу «{title}». Действие нельзя отменить.',
    deleteForever: 'Удалить навсегда',
    activeTasks: 'Активные',
    archivedTasks: 'Архив',
    archivedEmpty: 'Архив пуст',
    taskDuplicateError: 'Задача с таким названием уже есть.',
    taskRestoreDuplicateError: 'Активная задача с таким названием уже есть.',
    stats: 'Статистика',
    statsListView: 'Список',
    statsChartView: 'График',
    statsChartTitle: 'График активности',
    statsChartTooltip: '{date}: {title}, {sessions} {sessionWord}, {time}',
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
    previousMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
    openCalendar: 'Открыть календарь',
    confirmStop: 'Подтвердите стоп',
    stopDescription:
      'Таймер будет остановлен, а экран вернется к вкладке «Работа». Уже сохраненная статистика по задачам останется.',
    decrease: 'Уменьшить',
    increase: 'Увеличить',
    settingWorkTime: 'Рабочее время',
    settingShortBreak: 'Короткий перерыв',
    settingLongBreak: 'Длинный отдых',
    settingLongBreakInterval: 'Циклов до отдыха',
    settingLanguage: 'Язык',
    settingAutoStartBreaks: 'Автостарт перерывов',
    settingAutoStartBreaksDescription: 'Автоматически запускать перерыв и отдых после завершенной Работы.',
    settingData: 'Данные',
    settingDataDescription:
      'Экспортируйте резервную копию или импортируйте JSON-файл Pomodoro Cult. Импорт заменит текущие локальные данные.',
    settingIntervalAppliesAfterCurrentTimer: 'Применится после текущего таймера.',
    exportData: 'Экспорт',
    importData: 'Импорт',
    openDataMenu: 'Экспорт и импорт',
    dataMenuTitle: 'Данные',
    exportMenuTitle: 'Экспорт данных',
    exportFullBackup: 'Полная резервная копия',
    exportFullBackupDescription:
      'Задачи, настройки, статистика, тема и безопасное состояние таймера в JSON-файле.',
    importBackup: 'Импорт резервной копии',
    importBackupDescription:
      'Заменить текущие локальные данные JSON-копией Pomodoro Cult.',
    dataExportSuccess: 'Файл резервной копии создан.',
    dataExportError: 'Не удалось экспортировать данные.',
    dataImportSuccess: 'Данные импортированы.',
    dataImportError: 'Не удалось импортировать этот файл.',
    focusMusic: 'Музыка фокуса',
    focusMusicDescription: 'Локальный природный фон для рабочих сессий.',
    focusMusicOn: 'Музыка включена',
    focusMusicOff: 'Музыка выключена',
    focusMusicVolume: 'Громкость',
    focusMusicTrackStream: 'Ручей',
    focusMusicTrackBirds: 'Птицы',
    focusMusicTrackClock: 'Часы',
    supportProject: 'Поддержать проект',
    supportProjectDescription: 'Ссылка для доната пока не настроена.',
    supportComingSoon: 'Скоро',
    settingDurationLocked:
      'Чтобы изменить длительность таймеров, нажмите Стоп и сбросьте текущий цикл.',
    settingInvalidValue: 'Введите значение от {min} до {max}.',
    settingShortBreakNotLongerThanRest: 'Короткий перерыв не может быть больше длинного отдыха.',
    settingLongRestNotShorterThanBreak: 'Длинный отдых не может быть меньше короткого перерыва.',
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
    errorSkipBreak: 'Не удалось пропустить перерыв.',
    errorStopTimer: 'Не удалось остановить таймер.',
    errorOpenAppWindow: 'Не удалось открыть окно приложения.',
    notificationWorkDone: 'Работа завершена',
    notificationBreakDone: 'Перерыв завершен',
    notificationRestDone: 'Отдых завершен',
    notificationNextMode: 'Далее: {mode}',
    notificationAudioBlocked: 'Firefox заблокировал фоновое воспроизведение звука.'
  }
} as const;

export type MessageKey = keyof (typeof messages)['en'];

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
