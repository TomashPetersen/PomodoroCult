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

Chrome background is the authoritative TimerState writer. Its offscreen document only schedules expiry and requests cycle-scoped completion; it cannot overwrite a newer timer state. Firefox keeps timer and completion ownership in its background page and alarms runtime.

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

The compact popup and app window control one optional background-owned focus-music player during a running work timer:

- stream
- birds
- ticking clock

The loops are bundled under `public/sounds/`, disabled by default, and never loaded from a remote URL. Playback is owned by `src/background-firefox.ts`, so closing the compact popup does not stop the selected loop and opening both UI surfaces does not create duplicate audio.

Direct Off/On, track, and volume controls use a typed serialized background mutation. During a running or paused Work cycle, that mutation changes only the cycle snapshot's audio fields and the saved manual audio baseline. Focus Mode records, timer durations, auto-start, mode/cycle identity, task bindings, statistics, and SessionEvents remain unchanged. Popup, app window, and Firefox background resolve the same active-Work audio state, including task-bound modes. Immediate stop paths invalidate the audio generation, clear Stream timers, and reset owned Audio elements before an old asynchronous play can resume.

## Storage v3 foundation

Phase 1 added platform-neutral product data without changing the current UI or permissions:

- five canonical built-in Focus Modes plus normalized custom modes;
- optional `task.focusModeId` references;
- `cycleId` and `cycleStartedAt` for reliable completion identity;
- one timestamped `SessionEvent` for each newly completed Work cycle;
- JSON import/export for modes and events with imported timers restored to safe idle.

Legacy daily statistics remain intact and are not converted into synthetic timestamped events.

## Ungated Focus Review and local reports

Phase 3 raises local storage to version 4 and remains free for every user:

- timestamped Review metrics use normalized `SessionEvent` records only and never add legacy aggregates;
- `sessionEventLogStartedAt` exposes honest full/partial/none coverage instead of treating missing pre-log history as zero;
- new Work events capture immutable completion date, start date/minute, and completion timezone offset; legacy events remain valid and are labeled inferred;
- global nullable daily/weekly goals are independent of `FocusMode.sessionGoal` and save through the Firefox background mutation queue;
- the large app window contains Review, while the popup only opens or focuses that existing window;
- CSV exports selected real sessions with BOM, RFC-compatible quoting, and formula-injection neutralization;
- Markdown exports the current Monday-to-Sunday week through today with escaped user task text;
- downloads use local Blob URLs after a user click and perform no network request.

JSON import/export includes goals, coverage, and available event metadata. Import remains queued, creates a safe-idle timer, and does not start Focus Music. No permission, dependency, donation, entitlement, licensing, manifest version, or application version change is part of Phase 3.

Phase 3 packaged verification used Firefox 152.0.6 with a temporary isolated profile. Core runtime checks passed v3-to-v4 recovery, app-window de-duplication, goals, natural exact-once completion, Pause/Resume, statistics/event deletion, JSON safe-idle import, popup reopen, and secure click-driven reports. A separate visual/accessibility pass inspected empty, sparse, and populated Review states plus the popup across English/Russian, light/dark, 400x600, 1040x760, and 1440x900 surfaces; keyboard formula help, reduced motion, long titles, overflow, and extension-console checks passed. The split avoids a headless Firefox focus artifact after automated downloads and does not change the packaged files under test.

## Ungated Focus Modes

Phase 2 adds free local Focus Mode workflows without feature gates or monetization:

- explicit Default / Manual and global mode selection;
- task-bound mode precedence over global selection;
- custom mode create, edit, and delete in the large app window;
- task-card binding and mode badge/select;
- popup/app-window synchronization through local storage;
- cycle-owned snapshots so edits, deletion, rebinding, and reopen cannot change a running or paused cycle;
- deletion clears global/task references but preserves historical SessionEvents and an active snapshot.

The Firefox background page serializes mode and task mutations with timer completion. Running Work focus music reads the cycle snapshot rather than live mode/settings records. No new permission, remote audio, dependency, donation, entitlement, license, feature gate, or version change is part of Phase 2.

The live-control remediation keeps that snapshot isolation narrow: editing, deleting, selecting, or rebinding a Focus Mode still cannot change any field of a running/paused snapshot. Only an explicit Focus Music control command can replace `soundTrack` and `soundVolume` for the active Work cycle.

Phase 2 verification exercised the packaged Firefox background player with Stream/Birds/Clock, immediate Off/On, rapid volume and toggle changes, pending-play invalidation, Pause/Resume, popup/app reopen, and natural completion. One chime plus exact-once statistics and SessionEvent were observed. Six popup/app screenshots cover English/Russian and light/dark at compact, normal, and maximized sizes. Native notification delivery is not directly observable in the current headless Firefox harness; notification code is unchanged by the live-control fix.

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

Do not enable Android compatibility in AMO by checkbox alone. First finalize the donation/Pro product boundaries in `docs/pro-roadmap.md`, then run Android compatibility lint, test on Firefox for Android, and confirm that desktop-only behavior such as the separate app window is feature-gated or replaced with a touch-friendly mobile flow.

The current strategic order is:

1. define Free / Donation / Pro feature boundaries;
2. choose a verified donation provider and URL, or keep donation UI disabled;
3. add platform capability gates;
4. test Firefox for Android on a real device or emulator;
5. only then add Android compatibility metadata and enable Android in AMO.

Recommended audit flow:

```powershell
npm.cmd run build:firefox
npx.cmd web-ext lint --source-dir dist-firefox
adb devices
npx.cmd web-ext run -t firefox-android --source-dir dist-firefox --firefox-apk org.mozilla.firefox
```

Use `org.mozilla.firefox_beta` or `org.mozilla.fenix` instead of `org.mozilla.firefox` when testing Firefox Beta or Nightly on Android.

If `adb` is not recognized, install Android Studio or Android Platform Tools and add the `platform-tools` directory to `PATH` before running the Android smoke test.

Android smoke testing must specifically cover desktop-sensitive features:

- app-window open/maximize controls;
- notification click behavior;
- focus music start/stop behavior after mobile backgrounding;
- import/export file picker behavior;
- tap-friendly replacements for hover-only tooltips.

Only add `browser_specific_settings.gecko_android` after the Android smoke test passes.

## Donations and Pro planning

Donation and Pro feature planning lives in `docs/pro-roadmap.md` and is tracked through `EXECPLAN-platform-monetization.md`.

Current release direction:

- keep the existing timer, tasks, local statistics, app window, import/export, bilingual UI, notifications, and basic focus music free;
- add donations only through a provider-agnostic external support URL after the payment route is manually verified;
- keep payment data, provider SDKs, analytics, and hidden network calls out of the extension;
- keep the shipped Phase 3 Review, goals, CSV, and Markdown free; any future Pro work must be additive, such as templates or extra sound/theme packs;
- defer account licensing, cloud sync, and cross-device Pro state until there is a validated payment and support model.

Completed implementation checkpoints:

- Phase 0: `b7d2efa fix(firefox): persist focus music without app window`
- Phase 1: `1a651de feat(storage): add focus modes and session events`
- Phase 3 storage: `f867040 feat(storage): add focus review metadata and goals`
- Phase 3 analytics: `91aa160 feat(analytics): add focus review and goals`

The current checkpoint is final Phase 3 report, packaged-runtime, visual/accessibility, and independent QA closure described in `EXECPLAN-v1.2.0.md`. Phase 4 is not authorized.
