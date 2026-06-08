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
    taskChangeRequiresStop: 'Press Stop to reset the timer before changing or creating a task.',
    taskForCycle: 'Task for current cycle',
    taskChangeBeforeStart: 'Changes are available before start',
    taskEmpty: 'No tasks yet. Add a new one using the button below.',
    createTask: 'Create task',
    quickCreateTask: 'Quick add task',
    taskNamePlaceholder: 'Task name',
    noTask: 'No task',
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
    settingDurationLocked: 'Press Stop to reset the timer before changing timer durations.',
    settingInvalidValue: 'Enter a value from {min} to {max}.',
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
    appName: 'РџРѕРјРѕРґРѕСЂРѕ РљСѓР»СЊС‚',
    loading: 'РџРѕРјРѕРґРѕСЂРѕ РљСѓР»СЊС‚',
    screenTimer: 'РўР°Р№РјРµСЂ',
    screenTasks: 'Р—Р°РґР°С‡Рё',
    screenStats: 'РЎС‚Р°С‚РёСЃС‚РёРєР°',
    timerWork: 'Р Р°Р±РѕС‚Р°',
    timerShortBreak: 'РџРµСЂРµСЂС‹РІ',
    timerLongBreak: 'РћС‚РґС‹С…',
    timerMinutes: '{count} РјРёРЅ',
    settings: 'РќР°СЃС‚СЂРѕР№РєРё',
    theme: 'РўРµРјР°',
    pause: 'РџР°СѓР·Р°',
    start: 'РЎС‚Р°СЂС‚',
    stop: 'РЎС‚РѕРї',
    close: 'Р—Р°РєСЂС‹С‚СЊ',
    closeNotification: 'Р—Р°РєСЂС‹С‚СЊ СѓРІРµРґРѕРјР»РµРЅРёРµ',
    taskSelect: 'Р’С‹Р±РѕСЂ Р·Р°РґР°С‡Рё',
    taskChangeRequiresStop: 'Р§С‚РѕР±С‹ РёР·РјРµРЅРёС‚СЊ РёР»Рё СЃРѕР·РґР°С‚СЊ Р·Р°РґР°С‡Сѓ, РЅР°Р¶РјРёС‚Рµ РЎС‚РѕРї Рё СЃР±СЂРѕСЃСЊС‚Рµ С‚Р°Р№РјРµСЂ.',
    taskForCycle: 'Р—Р°РґР°С‡Р° РґР»СЏ С‚РµРєСѓС‰РµРіРѕ С†РёРєР»Р°',
    taskChangeBeforeStart: 'РЎРјРµРЅР° РґРѕСЃС‚СѓРїРЅР° РґРѕ СЃС‚Р°СЂС‚Р°',
    taskEmpty: 'РќРµС‚ Р·Р°РґР°С‡. Р”РѕР±Р°РІСЊС‚Рµ РЅРѕРІСѓСЋ С‡РµСЂРµР· РєРЅРѕРїРєСѓ РЅРёР¶Рµ.',
    createTask: 'РЎРѕР·РґР°С‚СЊ Р·Р°РґР°С‡Сѓ',
    quickCreateTask: 'Р‘С‹СЃС‚СЂРѕ РґРѕР±Р°РІРёС‚СЊ',
    taskNamePlaceholder: 'РќР°Р·РІР°РЅРёРµ Р·Р°РґР°С‡Рё',
    noTask: 'Р‘РµР· Р·Р°РґР°С‡Рё',
    newTask: 'РќРѕРІР°СЏ Р·Р°РґР°С‡Р°',
    add: 'Р”РѕР±Р°РІРёС‚СЊ',
    save: 'РЎРѕС…СЂР°РЅРёС‚СЊ',
    cancel: 'РћС‚РјРµРЅР°',
    edit: 'Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ',
    delete: 'РЈРґР°Р»РёС‚СЊ',
    archive: 'РђСЂС…РёРІРёСЂРѕРІР°С‚СЊ',
    restore: 'Р’РѕСЃСЃС‚Р°РЅРѕРІРёС‚СЊ',
    deleteStats: 'Удалить статистику',
    confirmDeleteStats: 'Удалить статистику?',
    deleteStatsDescription:
      'Это безвозвратно удалит всю сохраненную статистику для "{title}". Действие нельзя отменить.',
    confirmDeleteTask: 'Удалить задачу?',
    deleteTaskDescription:
      'Это безвозвратно удалит задачу "{title}". Действие нельзя отменить.',
    deleteForever: 'Удалить навсегда',
    activeTasks: 'РђРєС‚РёРІРЅС‹Рµ',
    archivedTasks: 'РђСЂС…РёРІ',
    archivedEmpty: 'РђСЂС…РёРІ РїСѓСЃС‚',
    taskDuplicateError: 'Р—Р°РґР°С‡Р° СЃ С‚Р°РєРёРј РЅР°Р·РІР°РЅРёРµРј СѓР¶Рµ РµСЃС‚СЊ.',
    taskRestoreDuplicateError: 'РђРєС‚РёРІРЅР°СЏ Р·Р°РґР°С‡Р° СЃ С‚Р°РєРёРј РЅР°Р·РІР°РЅРёРµРј СѓР¶Рµ РµСЃС‚СЊ.',
    stats: 'РЎС‚Р°С‚РёСЃС‚РёРєР°',
    range: 'Р”РёР°РїР°Р·РѕРЅ',
    sessionsMetric: 'РЎРµСЃСЃРёРё: {title}',
    sessionsMetricEmpty: 'РљРѕР»РёС‡РµСЃС‚РІРѕ СЃРµСЃСЃРёР№',
    timeMetric: 'Р’СЂРµРјСЏ: {title}',
    timeMetricEmpty: 'РћР±С‰РµРµ РІСЂРµРјСЏ',
    noStats: 'РќРµС‚ РґР°РЅРЅС‹С… Р·Р° РІС‹Р±СЂР°РЅРЅС‹Р№ РїРµСЂРёРѕРґ',
    session_one: 'СЃРµСЃСЃРёСЏ',
    session_few: 'СЃРµСЃСЃРёРё',
    session_other: 'СЃРµСЃСЃРёР№',
    chooseDateRange: 'Р’С‹Р±РµСЂРёС‚Рµ РґРёР°РїР°Р·РѕРЅ РґР°С‚',
    startDate: 'Р”Р°С‚Р° РЅР°С‡Р°Р»Р°',
    endDate: 'Р”Р°С‚Р° РѕРєРѕРЅС‡Р°РЅРёСЏ',
    currentSelection: 'РўРµРєСѓС‰РёР№ РІС‹Р±РѕСЂ: {start} - {end}',
    apply: 'РџСЂРёРјРµРЅРёС‚СЊ',
    previousMonth: 'РџСЂРµРґС‹РґСѓС‰РёР№ РјРµСЃСЏС†',
    nextMonth: 'РЎР»РµРґСѓСЋС‰РёР№ РјРµСЃСЏС†',
    openCalendar: 'РћС‚РєСЂС‹С‚СЊ РєР°Р»РµРЅРґР°СЂСЊ',
    confirmStop: 'РџРѕРґС‚РІРµСЂРґРёС‚Рµ СЃС‚РѕРї',
    stopDescription:
      'РўР°Р№РјРµСЂ Р±СѓРґРµС‚ РѕСЃС‚Р°РЅРѕРІР»РµРЅ, Р° СЌРєСЂР°РЅ РІРµСЂРЅРµС‚СЃСЏ Рє РІРєР»Р°РґРєРµ "Р Р°Р±РѕС‚Р°". РЈР¶Рµ СЃРѕС…СЂР°РЅРµРЅРЅР°СЏ СЃС‚Р°С‚РёСЃС‚РёРєР° РїРѕ Р·Р°РґР°С‡Р°Рј РѕСЃС‚Р°РЅРµС‚СЃСЏ.',
    decrease: 'РЈРјРµРЅСЊС€РёС‚СЊ',
    increase: 'РЈРІРµР»РёС‡РёС‚СЊ',
    settingWorkTime: 'Р Р°Р±РѕС‡РµРµ РІСЂРµРјСЏ',
    settingShortBreak: 'РљРѕСЂРѕС‚РєРёР№ РїРµСЂРµСЂС‹РІ',
    settingLongBreak: 'Р”Р»РёРЅРЅС‹Р№ РѕС‚РґС‹С…',
    settingLongBreakInterval: 'Р¦РёРєР»РѕРІ РґРѕ РѕС‚РґС‹С…Р°',
    settingLanguage: 'РЇР·С‹Рє',
    settingDurationLocked: 'Р§С‚РѕР±С‹ РёР·РјРµРЅРёС‚СЊ РґР»РёС‚РµР»СЊРЅРѕСЃС‚СЊ С‚Р°Р№РјРµСЂРѕРІ, РЅР°Р¶РјРёС‚Рµ РЎС‚РѕРї Рё СЃР±СЂРѕСЃСЊС‚Рµ С‚РµРєСѓС‰РёР№ С†РёРєР».',
    settingInvalidValue: 'Р’РІРµРґРёС‚Рµ Р·РЅР°С‡РµРЅРёРµ РѕС‚ {min} РґРѕ {max}.',
    languageAuto: 'РђРІС‚Рѕ',
    languageRu: 'Р СѓСЃСЃРєРёР№',
    languageEn: 'English',
    period1d: '1 Рґ',
    period7d: '7 Рґ',
    period30d: '30 Рґ',
    errorPrepareRuntime: 'РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕРґРіРѕС‚РѕРІРёС‚СЊ С„РѕРЅРѕРІС‹Р№ С‚Р°Р№РјРµСЂ.',
    errorInitRuntime: 'РќРµ СѓРґР°Р»РѕСЃСЊ РёРЅРёС†РёР°Р»РёР·РёСЂРѕРІР°С‚СЊ С„РѕРЅРѕРІС‹Р№ С‚Р°Р№РјРµСЂ.',
    errorLoadData: 'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РґР°РЅРЅС‹Рµ РїСЂРёР»РѕР¶РµРЅРёСЏ.',
    errorStartTimer: 'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РїСѓСЃС‚РёС‚СЊ С‚Р°Р№РјРµСЂ.',
    errorPauseTimer: 'РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕСЃС‚Р°РІРёС‚СЊ С‚Р°Р№РјРµСЂ РЅР° РїР°СѓР·Сѓ.',
    errorStopTimer: 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕСЃС‚Р°РЅРѕРІРёС‚СЊ С‚Р°Р№РјРµСЂ.',
    notificationWorkDone: 'Р Р°Р±РѕС‚Р° Р·Р°РІРµСЂС€РµРЅР°',
    notificationBreakDone: 'РџРµСЂРµСЂС‹РІ Р·Р°РІРµСЂС€РµРЅ',
    notificationRestDone: 'РћС‚РґС‹С… Р·Р°РІРµСЂС€РµРЅ',
    notificationNextMode: 'Р”Р°Р»РµРµ: {mode}',
    notificationAudioBlocked: 'Firefox Р·Р°Р±Р»РѕРєРёСЂРѕРІР°Р» С„РѕРЅРѕРІРѕРµ РІРѕСЃРїСЂРѕРёР·РІРµРґРµРЅРёРµ Р·РІСѓРєР°.'
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


