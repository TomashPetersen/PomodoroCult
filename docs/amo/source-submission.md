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
.\scripts\package-firefox-artifacts.ps1
```

## Source package packaging

The packaging script above creates both:

- `artifacts/pomodoro-cult-firefox.xpi`
- `artifacts/pomodoro-cult-firefox-source.zip`

It writes zip entries with forward slashes so AMO accepts the archive on Windows.

## Notes for review

- the Firefox build has its own manifest in `manifest.firefox.ts`
- Firefox uses `src/background-firefox.ts`
- Chrome-only `offscreen` behavior remains isolated in the Chrome build
- Firefox-specific branding files live in `public/icons/firefox-icon-*.png`
- the Firefox icon set is generated from `assets/branding/source-logo.png`
