# AMO Source Submission Notes

## Repository

https://github.com/TomashPetersen/PomodoroCult

## Build requirements

- Node.js
- npm

## Install

```powershell
npm.cmd install
```

## Type-check

```powershell
npx.cmd tsc --noEmit
```

## Build Firefox package

```powershell
npm.cmd run build:firefox
```

Build output:

- `dist-firefox/`

The production artifact is built with Vite.

## Firefox artifact packaging

```powershell
Compress-Archive -Path dist-firefox\* -DestinationPath artifacts\pomodoro-cult-firefox.zip -Force
Move-Item -LiteralPath artifacts\pomodoro-cult-firefox.zip -Destination artifacts\pomodoro-cult-firefox.xpi -Force
```

## Notes for review

- the Firefox build has its own manifest in `manifest.firefox.ts`
- Firefox uses `src/background-firefox.ts`
- Chrome-only `offscreen` behavior remains isolated in the Chrome build
