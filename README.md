# Pomodoro Cult

Pomodoro Cult is a focus timer browser extension with tasks, session statistics, and background countdown support.

The project targets two browser builds:

- Chrome build in `dist/`
- Firefox build in `dist-firefox/`

## Features

- Work, short break, and long rest timers
- Automatic mode switching after a completed work session
- Task selection for work sessions
- Local session statistics
- Background countdown after the popup closes
- Russian and English UI

## Stack

- React 18
- TypeScript
- Vite
- Zustand
- Tailwind CSS

## Development

Working directory:

`D:\Projects\MyProjects\PomodoroCult`

Install dependencies:

```powershell
npm.cmd install
```

Type-check:

```powershell
npx.cmd tsc --noEmit
```

Build Chrome package:

```powershell
npm.cmd run build
```

Build Firefox package:

```powershell
npm.cmd run build:firefox
```

## Browser Architecture

Chrome and Firefox use different background runtimes:

- Chrome uses `background.service_worker` with `offscreen`
- Firefox uses `background.scripts`

The popup UI, storage model, tasks, settings, and statistics behavior remain shared.

## Key Files

- `src/components/` - popup screens and UI components
- `src/store/useAppStore.ts` - shared popup state
- `src/lib/storage.ts` - storage, normalization, and timer helpers
- `src/background.ts` - Chrome runtime coordinator
- `src/offscreen.ts` - Chrome background countdown runtime
- `src/background-firefox.ts` - Firefox background countdown runtime
- `manifest.json` - Chrome manifest
- `manifest.firefox.ts` - Firefox manifest

## Local Loading

### Chrome

1. Open `chrome://extensions/`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `dist` directory

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click `Load Temporary Add-on`
3. Select `dist-firefox/manifest.json`

## Publishing Notes

- Firefox store materials live in `docs/amo/`
- Privacy policy page lives in `docs/privacy/index.md`
- Firefox build and packaging notes live in `FIREFOX.md`

## Release Checks

Minimum checks before release:

- `npx.cmd tsc --noEmit`
- `npm.cmd run build`
- `npm.cmd run build:firefox`

Manual checks:

- start, pause, and stop flow
- work session completion and statistics write
- break completion and return to work
- task selection flow
- language switching
