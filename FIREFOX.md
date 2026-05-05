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

## Firefox-specific files

- `manifest.firefox.ts`
- `src/background-firefox.ts`

## Firefox manifest expectations

The Firefox build includes:

- `browser_specific_settings.gecko.id`
- `browser_specific_settings.gecko.strict_min_version`
- `browser_specific_settings.gecko.data_collection_permissions`

The Firefox package must not request the Chrome-only `offscreen` permission.
