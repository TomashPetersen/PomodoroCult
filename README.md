# Pomodoro Cult

Pomodoro Cult - это браузерное расширение с таймером фокуса, задачами и статистикой.

Проект использует:

- React 18
- TypeScript
- Vite
- Zustand
- Tailwind CSS

## Что умеет расширение

- запускать рабочий таймер, короткий перерыв и отдых;
- автоматически переключать режим после завершения рабочего цикла;
- привязывать сессию к выбранной задаче;
- сохранять состояние таймера, задачи, настройки и статистику;
- показывать историю сессий и суммарное время;
- работать на русском и английском языках.

## Сборка

Рабочая директория:

`D:\Projects\MyProjects\PomodoroCult`

### Установка зависимостей

```powershell
npm.cmd install
```

### Проверка TypeScript

```powershell
npx.cmd tsc --noEmit
```

### Chrome build

```powershell
npm.cmd run build
```

Готовый результат будет в папке `dist/`.

### Firefox build

```powershell
npm.cmd run build:firefox
```

Готовый результат будет в папке `dist-firefox/`.

## Архитектура сборок

Chrome и Firefox используют разный фоновый runtime:

- Chrome: `background.service_worker` + `offscreen`
- Firefox: `background.scripts`

UI, store, задачи, настройки и статистика остаются общими.

## Структура проекта

- `src/components/` - экраны и UI-компоненты
- `src/store/useAppStore.ts` - основное состояние popup
- `src/lib/storage.ts` - работа с сохранением данных и нормализацией
- `src/background.ts` - Chrome background/service worker
- `src/offscreen.ts` - Chrome offscreen runtime
- `src/background-firefox.ts` - Firefox background runtime
- `manifest.json` - Chrome manifest
- `manifest.firefox.ts` - Firefox manifest

## Локальная загрузка в браузер

### Chrome

1. Откройте `chrome://extensions/`
2. Включите `Developer mode`
3. Нажмите `Load unpacked`
4. Выберите папку `dist`

### Firefox

1. Откройте `about:debugging#/runtime/this-firefox`
2. Нажмите `Загрузить временное дополнение`
3. Выберите файл `dist-firefox/manifest.json`

## Подготовка Firefox-пакета

Для публикации в AMO соберите Firefox-версию, затем упакуйте содержимое `dist-firefox/` в `.xpi`.

Подробности вынесены в [FIREFOX.md](D:/Projects/MyProjects/PomodoroCult/FIREFOX.md).

## Проверки перед релизом

Минимальный набор:

- `npx.cmd tsc --noEmit`
- `npm.cmd run build`
- `npm.cmd run build:firefox`

И вручную:

- старт, пауза и стоп таймера;
- завершение рабочего цикла и запись статистики;
- завершение перерыва и возврат в рабочий режим;
- выбор задачи;
- переключение языка и настроек.
