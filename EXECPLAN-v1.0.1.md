# v1.0.1 Task UX, Archive, Settings, and Calendar

## Purpose / Big Picture

Pomodoro Cult v1.0.1 improves the task workflow and fixes several release-readiness issues before the next Firefox Add-ons update. Users should be able to manage tasks quickly from the timer screen, keep old task statistics through archiving, see historical tomato counts per selected task, and use settings/date controls without layout jumps or confusing browser-native controls.

## Progress

- [x] 2026-06-07 00:00 Documented the implementation plan before changing runtime/storage behavior.
- [x] 2026-06-07 00:20 Implemented storage and type changes for archived tasks, duplicate handling, tomato counts, and title length.
- [x] 2026-06-07 00:28 Implemented task dropdown quick-create, lock tooltip, outside-click closing, and archive action.
- [x] 2026-06-07 00:36 Implemented tasks screen active/archive tabs, restore, duplicate errors, and new/restored highlighting.
- [x] 2026-06-07 00:40 Implemented task-based tomato badge and compact formatting.
- [x] 2026-06-07 00:52 Reworked settings numeric draft editing and fixed Russian localization mojibake.
- [x] 2026-06-07 01:04 Replaced date inputs with a local calendar popover.
- [x] 2026-06-07 23:42 Bumped Firefox/package version to 1.0.1, built Chrome/Firefox, packaged versioned Firefox artifacts, and prepared QA handoff notes.
- [x] 2026-06-08 00:06 Addressed QA-Agent findings: system max-clamp for settings, two-decimal compact tomato labels, and restore lock during active/paused timer cycles.
- [x] 2026-06-08 00:09 Re-ran TypeScript, Chrome build, Firefox build, and repackaged the final versioned Firefox artifacts.
- [x] 2026-06-08 01:12 Refined post-QA Firefox polish: centered calendar overlay, creation ordering by `createdAt`, immutable `No task` actions, softer light/dark theme surfaces, and lock messaging that no longer overlays timer controls.
- [x] 2026-06-08 01:28 Updated the calendar picker to close from any click outside the calendar inside the app frame, revised the task lock message to mention create/change, and moved the palette toward neutral GitHub/Linear-style light/dark surfaces.

## Surprises & Discoveries

- The Russian message dictionary currently contains mojibake text, so the localization fix is part of the release scope.
- `TaskSelect` currently closes when locked because the main button is disabled; v1.0.1 needs the menu to open even while task actions are locked.
- There is no archive model yet. Current delete behavior physically removes tasks from storage.
- The terminal can render valid UTF-8 Russian strings as mojibake through `Get-Content`; Node UTF-8 reads confirmed the i18n file itself contains real Russian text.
- QA-Agent found that settings normalization also needed max clamps, not only UI validation.

## Decision Log

- Use a 40-character task title limit.
- Use soft archive through `archived` / `archivedAt` on `Task`.
- Keep archived task statistics by preserving the original `taskId`.
- Do not add a calendar dependency; implement a small local popover.
- Keep Firefox permissions unchanged for this release.

## Outcomes & Retrospective

The implementation completed the planned v1.0.1 code changes and produced versioned Firefox artifacts. QA-Agent findings were addressed, follow-up Firefox UI polish was applied, and the final TypeScript, Chrome build, and Firefox build commands passed. In-app browser preview was blocked by the browser environment with `ERR_BLOCKED_BY_CLIENT`, so final UI confidence still requires manual Firefox extension loading from `dist-firefox/manifest.json`.

## Context and Orientation

The relevant modules are:

- `src/lib/types.ts` for persisted task shape and settings version contracts.
- `src/lib/storage.ts` for normalization, task sorting, timer locks, and statistics helpers.
- `src/store/useAppStore.ts` for actions that mutate tasks, settings, and timer state.
- `src/components/TaskSelect.tsx`, `TasksScreen.tsx`, `TimerScreen.tsx`, `SettingsModal.tsx`, and `StatsRangeModal.tsx` for the affected UI.
- `src/lib/i18n.ts` for all visible text in English and Russian.

## Plan of Work

1. Extend the persisted task model with archive fields while preserving existing stored tasks.
2. Add helpers for task title normalization, active/archive filtering, priority sorting, task lock checks, duplicate detection, historical tomato counting, and compact tomato labels.
3. Update the store with archive/restore actions, duplicate feedback, highlighted task state, and task creation returning the created task id.
4. Rebuild the timer task dropdown around always-open access, locked actions, quick create, archive action, and click-outside close.
5. Rebuild the tasks page around Active/Archive tabs, two-line task titles, restore/archive actions, and inline duplicate errors.
6. Switch the tomato badge to historical sessions by selected task.
7. Replace settings numeric handling with string drafts and validation.
8. Replace native date inputs with a small calendar popover.
9. Update version fields, run checks, and package Firefox artifacts.

## Concrete Steps

Run these after implementation:

```powershell
npx.cmd tsc --noEmit
npm.cmd run build:firefox
powershell -ExecutionPolicy Bypass -File .\scripts\package-firefox-artifacts.ps1
```

Expected results:

- TypeScript exits with code 0.
- Firefox build exits with code 0 and writes `dist-firefox`.
- Packaging writes `artifacts/pomodoro-cult-firefox-1.0.1.xpi` and `artifacts/pomodoro-cult-firefox-source-1.0.1.zip`.

## Validation and Acceptance

Manual QA should verify:

- Task menu opens in locked and unlocked states.
- Locked task actions keep the menu usable and show a localized inline stop/reset warning without covering timer controls.
- Quick-created tasks appear below `No task`, stay selected, and highlight.
- Active/archive tabs preserve statistics and prevent duplicate active names.
- The red badge shows historical task sessions and formats 999, 1000, 1110, and 11110 correctly.
- Settings values can be typed without jumping, save only valid changes, and clamp on blur/save.
- Calendar popovers open from the field/icon, enforce ranges, and close independently.
- Firefox timer start, pause, stop, break/rest rules, background sound, and notification still work.

## Idempotence and Recovery

All storage changes are additive. Existing tasks without archive fields normalize as active tasks. If a v1.0.1 build is reloaded against old storage, `normalizeTasks` should fill missing fields and keep the `No task` system row. If packaging fails, rerun the build and packaging commands above.

## Artifacts and Notes

The final Firefox update artifact should be `artifacts/pomodoro-cult-firefox-1.0.1.xpi` with manifest version `1.0.1`.

## Interfaces and Dependencies

No new runtime permissions or dependencies are planned. Public internal interfaces change as follows:

- `Task` gains archive fields.
- Store task creation returns the created task id or `null`.
- Store gains archive/restore methods and transient duplicate/highlight UI state.

Revision note 2026-06-07: Created this plan from the user-approved v1.0.1 scope so implementation can proceed safely across storage, UI, and release packaging.

Revision note 2026-06-07: Updated progress after the first implementation pass and TypeScript validation.

Revision note 2026-06-07: Updated completion status after successful TypeScript, Chrome build, Firefox build, and versioned artifact packaging.

Revision note 2026-06-07: Corrected the documented artifact names to match the versioned Firefox package script output.

Revision note 2026-06-08: Added QA-Agent follow-up fixes and final validation status after rebuilding and repackaging v1.0.1.

Revision note 2026-06-08: Updated the plan after the final Firefox-facing polish pass for theme surfaces, task immutability, archive action rules, and the centered calendar overlay.

Revision note 2026-06-08: Added the follow-up calendar-dismiss behavior, revised lock copy, and neutral palette adjustment after manual visual review feedback.
