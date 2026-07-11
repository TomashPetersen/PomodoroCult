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
- [x] 2026-07-11 23:59 +04:00: Extended the schema to v3 with canonical Focus Modes, task mode references, SessionEvents, and persisted timer cycle identity/start metadata.
- [x] 2026-07-11 23:59 +04:00: Verified v0/v1/v2 migration, backup preservation, normalization idempotence, JSON portability, legacy event fallback, and malformed input rejection in an isolated storage harness.
- [x] 2026-07-11 23:59 +04:00: Verified the built Firefox package records Work events exactly once and deletes task aggregates/events together; Chrome and Firefox production builds pass.
- [x] 2026-07-12 00:58 +04:00: QA-Agent approved background-owned Chrome TimerState, acknowledged completion audio, legacy null-start fallback, exact-once writes, and migration behavior after fresh checks and builds.

## Surprises & Discoveries

- Existing `readStoredData()` already normalizes old task and timer fields, which is a good migration foundation.
- Statistics are keyed by task id and can be preserved independently from active/archived task lists.
- The current store writes top-level storage keys directly, so migration should stay compatible with existing keys.
- Importing arbitrary valid JSON is dangerous, so import now rejects JSON without known Pomodoro Cult storage keys.
- Resetting runtime before validating import is unsafe because invalid files could stop a user's active timer.
- Aggregate statistics cannot supply truthful historical timestamps, so v3 deliberately starts with an empty SessionEvent log instead of fabricating legacy events.
- An event start timestamp must survive Pause/Resume; a dedicated cycle id is also required to reject delayed completion from an older Chrome offscreen cycle.
- A scheduler document must not race the authoritative runtime for persisted timer writes. Chrome offscreen now owns only expiry scheduling; background owns every TimerState transition.
- A migrated paused cycle has no reliable original start. Resume preserves its null start so completion uses the documented duration fallback instead of inventing a resume-time timestamp.

## Decision Log

- Use `storageVersion` as a top-level storage key, starting at `1`.
- Save automatic pre-migration backups under a top-level key, not inside the active data shape.
- Export a JSON document with metadata and normalized data, not raw browser storage.
- Import should replace user data only after validation and normalization.
- Import should stop any active timer state by normalizing to a safe idle state unless the imported timer state is already idle-ready.
- Import resets runtime alarms first when possible, then writes a safe idle timer state from the imported file.
- Import validates and writes data first, preserving a backup of the true pre-import storage; runtime reset happens afterwards only as best-effort alarm cleanup.
- Version 3 installs immutable canonical built-in Focus Modes with stable ids and timestamps, while imported custom modes are normalized and portable.
- Work completion writes tasks, aggregate statistics, the SessionEvent, and the next timer state atomically with one completion timestamp and duration.
- Statistics deletion is serialized by the platform background runtime and removes matching SessionEvents in the same storage write.
- Legacy aggregate statistics are never backfilled into SessionEvents; only an in-progress legacy Work uses duration-based `startedAt` fallback when it later completes.
- Chrome completion audio is conditional on a positive, cycle-matched background acknowledgement; stale completion requests remain silent.

## Outcomes & Retrospective

Implemented schema metadata, migration backup, export/import helpers, and Settings UI controls. Storage v3 now also provides canonical Focus Modes and exact-once timestamped Work events without changing the current UI or free behavior. The first version keeps restore-from-backup manual/future-facing; automatic backup is stored for recovery but no UI is built for choosing a backup yet. Event retention remains intentionally uncapped until real storage growth is measured.

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
- `focusModes`
- `sessionEvents`

## Plan of Work

1. Extend shared types with version and backup metadata. Done.
2. Add migration helpers that read raw storage, normalize old data, and write upgraded data. Done.
3. Add export/import helpers that serialize a stable JSON format. Done.
4. Add store actions for export/import with UI status messages. Done.
5. Add Settings UI controls for download and file upload. Done.
6. Validate builds and a legacy-data migration harness. Done for v0/v1/v2 to v3 and the built Firefox runtime; UI file-picker interaction remains a release-level manual check.

## Concrete Steps

Commands:

```powershell
npx.cmd tsc --noEmit
npm.cmd run build:firefox
npm.cmd run build
npx.cmd web-ext lint --source-dir dist-firefox
```

Observed:

```text
npx.cmd tsc --noEmit
# passed

npm.cmd run build:firefox
# passed

npm.cmd run build
# passed

npx.cmd web-ext lint --source-dir dist-firefox
# passed with 0 errors, 0 notices, and four existing/generated warnings
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

- Existing users without `storageVersion`, or with versions `1` or `2`, are normalized into version `3`.
- Migration creates a backup before writing upgraded storage.
- Export produces valid JSON with app name, version, exported timestamp, storage version, and data.
- Import rejects invalid files and accepts valid exports.
- Firefox build passes.
- Chrome build passes.
- New completed Work cycles create one aggregate entry and one SessionEvent; Break and Rest create no event.
- Pause/Resume preserves cycle identity and start time, while Reset and ready states clear them.
- Deleting one task's statistics also deletes its SessionEvents.
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

2026-07-11 note: Extended this living plan for storage v3 after implementing canonical Focus Modes, exact-once SessionEvents, cycle identity, atomic aggregate/event deletion, JSON portability, and automated migration/runtime verification.

2026-07-12 note: Updated after QA found a Chrome offscreen stale-write race and a fabricated legacy resume timestamp. TimerState is now background-owned, completion audio requires acknowledgement, and null legacy starts use the duration fallback.

2026-07-12 note: Final QA re-review approved the Phase 1 migration and runtime contracts. Live Chrome runtime remains a non-blocking follow-up; static review, TypeScript, and both production builds pass.
