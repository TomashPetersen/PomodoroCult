# Storage Migrations and Data Portability

## Purpose / Big Picture

Pomodoro Cult stores user tasks, timer state, settings, theme, and statistics in extension local storage. Firefox keeps this storage across add-on updates when the extension id stays the same, but future features such as a standalone window, richer task metadata, and expanded statistics need an explicit migration contract.

This plan adds a storage schema version, safe migration path, automatic backup before schema upgrades, and user-facing JSON export/import from Settings. The goal is that users can update the extension without losing task history and can manually back up or move data.

## Progress

- [x] 2026-06-23: Created this ExecPlan and inspected current storage boundaries.
- [x] 2026-06-23: Added typed storage metadata and migration helpers.
- [x] 2026-06-23: Added export/import store actions.
- [x] 2026-06-23: Added Settings UI controls and localized messages.
- [x] 2026-06-23: Validated TypeScript and Firefox build.
- [x] 2026-06-23: QA found import ordering and weak JSON validation issues; fixed and rebuilt.

## Surprises & Discoveries

- Existing `readStoredData()` already normalizes old task and timer fields, which is a good migration foundation.
- Statistics are keyed by task id and can be preserved independently from active/archived task lists.
- The current store writes top-level storage keys directly, so migration should stay compatible with existing keys.
- Importing arbitrary valid JSON is dangerous, so import now rejects JSON without known Pomodoro Cult storage keys.
- Resetting runtime before validating import is unsafe because invalid files could stop a user's active timer.

## Decision Log

- Use `storageVersion` as a top-level storage key, starting at `1`.
- Save automatic pre-migration backups under a top-level key, not inside the active data shape.
- Export a JSON document with metadata and normalized data, not raw browser storage.
- Import should replace user data only after validation and normalization.
- Import should stop any active timer state by normalizing to a safe idle state unless the imported timer state is already idle-ready.
- Import resets runtime alarms first when possible, then writes a safe idle timer state from the imported file.
- Import validates and writes data first, preserving a backup of the true pre-import storage; runtime reset happens afterwards only as best-effort alarm cleanup.

## Outcomes & Retrospective

Implemented schema metadata, migration backup, export/import helpers, and Settings UI controls. The first version keeps restore-from-backup manual/future-facing; automatic backup is stored for recovery but no UI is built for choosing a backup yet.

## Context and Orientation

Main files:

- `src/lib/types.ts`: persisted data types.
- `src/lib/storage.ts`: normalization, storage IO, and migration logic.
- `src/store/useAppStore.ts`: UI actions that write storage.
- `src/components/SettingsModal.tsx`: import/export controls.
- `src/lib/i18n.ts`: localized labels, messages, and errors.

Storage keys currently used:

- `settings`
- `tasks`
- `timerState`
- `statistics`
- `theme`

New keys:

- `storageVersion`
- `migrationBackup`

## Plan of Work

1. Extend shared types with version and backup metadata. Done.
2. Add migration helpers that read raw storage, normalize old data, and write upgraded data. Done.
3. Add export/import helpers that serialize a stable JSON format. Done.
4. Add store actions for export/import with UI status messages. Done.
5. Add Settings UI controls for download and file upload. Done.
6. Validate builds and a legacy-data migration harness. Build done; manual legacy harness still recommended before release.

## Concrete Steps

Commands:

```powershell
npx.cmd tsc --noEmit
npm.cmd run build:firefox
```

Observed:

```text
npx.cmd tsc --noEmit
# passed

npm.cmd run build:firefox
# passed
```

Manual verification:

1. Open Settings.
2. Export data and inspect JSON metadata.
3. Import the exported JSON.
4. Confirm tasks, settings, statistics, theme, and selected task remain available.
5. Try invalid JSON and confirm a localized error appears without stopping the current timer.
6. Try `{ "storageVersion": 1 }` and confirm it is rejected.

## Validation and Acceptance

Accepted when:

- Existing users without `storageVersion` are normalized into version `1`.
- Migration creates a backup before writing upgraded storage.
- Export produces valid JSON with app name, version, exported timestamp, storage version, and data.
- Import rejects invalid files and accepts valid exports.
- Firefox build passes.
- Settings modal remains scrollable on small popup heights.

## Idempotence and Recovery

Migrations must be idempotent: running them multiple times should not duplicate tasks, reset statistics, or change task ids.

If a migration fails after backup creation, the previous backup remains in `migrationBackup` for manual recovery or future restore UI.

## Artifacts and Notes

No external artifacts are required.

## Interfaces and Dependencies

No new npm dependencies. Import/export uses browser file APIs and JSON.

2026-06-23 note: Initial plan added because the change affects persisted storage, Settings UI, and future release safety.

2026-06-23 note: Updated after implementation to record the chosen import safety behavior and validation results.

2026-06-23 note: Updated after QA review. The import order now protects active timers on invalid files and keeps backup data from before import.
