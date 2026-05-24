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

## Source package packaging

```powershell
$include = Get-ChildItem -Force | Where-Object { $_.Name -notin @('.git','node_modules','dist','dist-firefox','artifacts') }
Compress-Archive -Path $include.FullName -DestinationPath artifacts\pomodoro-cult-firefox-source.zip -Force
```

## Notes for review

- the Firefox build has its own manifest in `manifest.firefox.ts`
- Firefox uses `src/background-firefox.ts`
- Chrome-only `offscreen` behavior remains isolated in the Chrome build
- Firefox-specific branding files live in `public/icons/firefox-icon-*.png`
- the Firefox icon set is generated from `assets/branding/source-logo.png`
