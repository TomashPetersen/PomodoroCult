# Firefox Build Notes

## Summary

The Firefox package is built separately from the Chrome package.

- Chrome build output: `dist/`
- Firefox build output: `dist-firefox/`

## Commands

```powershell
npm.cmd run build
npm.cmd run build:firefox
```

For AMO upload, package the contents of `dist-firefox/` into an `.xpi` archive.

Example local flow:

```powershell
Compress-Archive -Path dist-firefox\* -DestinationPath artifacts\pomodoro-cult-firefox.zip -Force
Move-Item -LiteralPath artifacts\pomodoro-cult-firefox.zip -Destination artifacts\pomodoro-cult-firefox.xpi -Force
```

## Runtime split

Chrome and Firefox do not use the same background architecture:

- Chrome uses `background.service_worker` plus `offscreen`.
- Firefox uses `background.scripts` with a document-backed background runtime.

Shared UI, storage, task logic, and statistics behavior stay in the normal `src/` modules.

## App window

Firefox v1.1.0 adds a second UI entrypoint:

- `index.html` - toolbar popup
- `app.html` - larger extension app window

The popup remains the quick controller. The app window is opened from the popup and uses the same local storage, timer state, tasks, statistics, theme, language, and settings.

The larger app window also includes in-app controls for maximizing and restoring the window without relying on browser fullscreen prompts.

## Timer settings

Settings include an optional auto-start preference for break and rest timers. It is disabled by default. When enabled, a completed work timer immediately starts the next short break or long rest; the auto-started timer can still be paused, stopped, and a short break can be skipped.

## Local focus music

The app window can play optional local focus loops during a running work timer:

- stream
- birds
- ticking clock

The loops are bundled under `public/sounds/`, disabled by default, and never loaded from a remote URL.

## Firefox-specific files

- `manifest.firefox.ts`
- `src/background-firefox.ts`
- `app.html`

## Firefox manifest expectations

The Firefox build includes:

- `browser_specific_settings.gecko.id`
- `browser_specific_settings.gecko.strict_min_version`
- `browser_specific_settings.gecko.data_collection_permissions`

The Firefox package must not request the Chrome-only `offscreen` permission.

## Firefox for Android planning

Android support is tracked separately in `EXECPLAN-platform-monetization.md`.

Do not enable Android compatibility in AMO by checkbox alone. First run Android compatibility lint, test on Firefox for Android, and confirm that desktop-only behavior such as the separate app window is feature-gated or replaced with a touch-friendly mobile flow.
