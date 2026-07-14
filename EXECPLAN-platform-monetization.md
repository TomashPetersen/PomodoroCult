# Platform, Android, Donations, and Pro Roadmap

## Purpose / Big Picture

Pomodoro Cult is currently focused on Firefox desktop with a compact popup and a larger app window. The next product layer is broader distribution and monetization: a careful donation path, a paid-feature roadmap, Firefox for Android support, and future adapters for Firefox, Chrome, Edge, PWA, and desktop shells.

The user outcome is simple: existing users keep their local tasks and statistics, donations are honest and optional, future paid functionality is designed without breaking the free local-first timer, and Android users get a usable touch-first version after the monetization/product model is clear enough to avoid rework.

Mozilla's Android guidance makes this a compatibility project, not just a checkbox: the extension must be linted for Android, tested on device or emulator, and adapted for different APIs and form factors before `gecko_android` is enabled. Mozilla's monetization guidance allows paid features and donations, but requires clear disclosure, minimal data collection, and user control.

## Progress

- [x] 2026-07-04: Defined the strategic scope: Firefox Android compatibility, donations, Pro features, and future platform adapters.
- [x] 2026-07-04: Reviewed current Firefox manifest shape: desktop Firefox only, MV3, no host permissions, local storage, notifications, alarms.
- [x] 2026-07-04: Chose the first safe path: audit and prepare Android compatibility before enabling Android in AMO.
- [x] 2026-07-05: Rebuilt Firefox package and ran `web-ext lint` against `dist-firefox`; validation has 0 errors, 0 notices, and 4 documented warnings.
- [x] 2026-07-05: Ran a desktop-code Android risk audit and identified the platform-sensitive UI/runtime areas that must be gated or manually tested before Android is enabled.
- [x] 2026-07-05: Reordered the roadmap: design donations and Pro feature boundaries before implementing Android adaptation.
- [x] 2026-07-05: Added Russia-aware donation constraints: provider-agnostic config, no hardcoded payment dependency, and no enabled donation link until the chosen provider is manually verified.
- [x] 2026-07-06: Added official monetization/provider references and a Russia-based developer checklist to `docs/pro-roadmap.md`.
- [x] 2026-07-11: Consolidated templates, task profiles, soundscapes, and session goals into one `Focus Mode` domain instead of four overlapping paid features.
- [x] 2026-07-11: Defined a staged local-first Pro MVP with explicit entitlement, migration, audio-license, and Android constraints.
- [x] 2026-07-11: Created `EXECPLAN-v1.2.0.md` as the implementation source of truth for donations, Lifetime Pro, Focus Modes, Focus Review, reports, and licensing.
- [x] 2026-07-11: Completed and committed Phase 0 (`b7d2efa`): Firefox focus music is background-owned, survives popup closure, and does not duplicate across popup and app window.
- [x] 2026-07-12: Completed and committed Phase 1 (`1a651de`): storage v3, canonical Focus Modes, task mode references, cycle identity, and exact-once SessionEvents now exist without UI gates.
- [x] 2026-07-12: Phase 1 passed migration/storage harnesses, Chrome and Firefox builds, automated Firefox runtime verification, and final QA-Agent review.
- [x] 2026-07-12: Implemented Phase 2 as fully ungated Focus Modes: explicit global/manual selection, custom CRUD, task binding, cycle snapshots, serialized deletion, bilingual UI, and popup/app synchronization.
- [x] 2026-07-12: Phase 2 passed the domain/migration harness, TypeScript, Chrome/Firefox builds, Firefox package lint, Firefox 152 runtime automation, visual popup/app checks, and final QA-Agent review.
- [x] 2026-07-12 20:51 +04:00: Remediated post-commit finding `SEC-P2-001`, the unserialized UI initialization write found in `719fe3e`, through background-owned serialized initialization.
- [x] 2026-07-12 21:04 +04:00: Implemented the scoped initialization integrity remediation without schema, permission, layout, Focus Music, Phase 3, payment, licensing, or feature-gate changes; deterministic and build/lint gates pass.
- [x] 2026-07-12 21:04 +04:00: Independent QA and live extension runtime verification closed `SEC-P2-001` on 2026-07-13; Phase 3 remained unstarted throughout the fix.
- [x] 2026-07-12 21:09 +04:00: The temporary runtime-launch blocker cleared, both packaged platforms passed, and QA-Agent returned `APPROVE`.
- [x] 2026-07-13 00:07 +04:00: Storage initialization integrity is release-approved without schema, permission, layout, Focus Music, Phase 3, payment, licensing, or feature-gate changes.
- [x] 2026-07-13 20:37 +04:00: Implemented the remaining Phase 2 live Focus Music control fix with a typed background mutation and audio-only active Work snapshot replacement; deterministic domain/concurrency/audio checks, TypeScript, and both builds pass.
- [x] 2026-07-13 21:14 +04:00: Replaced stale full-state UI audio payloads with queued atomic commands (`toggle`, `set-enabled`, `set-track`, `set-volume`) that merge against authoritative storage; all three deterministic harnesses, diff check, TypeScript, and both builds pass after the correction.
- [x] 2026-07-13 21:14 +04:00: The earlier QA-Agent `CHANGES REQUIRED` verdict was superseded after real packaged Firefox audio and screenshot evidence became available.
- [x] 2026-07-13 22:28 +04:00: Packaged Firefox live-audio smoke and six-screenshot popup/app visual coverage now pass after isolating QA profile/process-tree issues; exact-once completion and one chime were directly observed.
- [x] 2026-07-13 22:35 +04:00: QA-Agent independently repeated the diff/harness/static/build review, audited production runtime hashes and all six screenshots, and returned `APPROVE`. Headless native notification observation and optional Firefox lint remain documented non-blocking limitations rather than claimed PASS.
- [x] 2026-07-13 22:35 +04:00: Packaged Firefox audio/runtime, visual comparison, and independent QA close the Focus Music blocker; Phase 3 remains unstarted pending this isolated commit.
- [x] 2026-07-15 00:14 +04:00: Phase 3 storage v4, event-only Review analytics, global goals, CSV, and Markdown are implemented as free ungated local capabilities. Storage and analytics commits have independent QA approval; report and final packaged/visual gates remain pending.
- [ ] Free/Supporter/Pro feature matrix approved.
- [ ] Donation provider and public URL selected and manually verified from the developer's jurisdiction.
- [ ] Android device/emulator smoke test completed.
- [ ] Android device/emulator toolchain available on the release machine.
- [ ] Android API and UX runtime audit completed on Firefox for Android.
- [ ] Platform capability layer designed and implemented.
- [ ] Donation URL and support entry finalized.
- [ ] Pro feature gates designed without locking existing free features.
- [ ] AMO reviewer notes and privacy text updated for any shipped monetization behavior.

## Surprises & Discoveries

- Current Firefox build already has a desktop-only app-window flow based on `browser.windows.create`. That is useful on desktop, but must be treated as a desktop capability for Android.
- The current permission set is intentionally small: `storage`, `notifications`, and `alarms`. Any monetization or Android change should avoid adding host permissions unless there is a clear product need.
- Focus music cannot be owned by a popup document: Firefox destroys that document when the popup closes. A single background audio owner is required to avoid silence without the app window and duplicate playback when both surfaces are open.
- The project already has export/import and storage migrations, which gives a good base for future platform transitions and user backups.
- `web-ext lint` passes the current Firefox package with no blocking errors. The remaining warnings are known release-review items: two compatibility warnings for `browser_specific_settings.gecko.data_collection_permissions` with `strict_min_version: 115`, and two generated-bundle warnings for dynamic `innerHTML`.
- The Firefox manifest still has no `gecko_android` block, which is intentional until the extension is tested on Firefox for Android.
- `adb` is not available on the current workstation PATH, so Android runtime validation could not be completed locally yet. This is a tooling blocker, not a product pass.
- Android-sensitive code paths found in the current desktop build: app-window management through `windows.*`, HTML Audio focus music, notification click handling, Blob/FileReader import/export, and hover/focus tooltip patterns.
- Donation support is not only a UI issue. The developer is based in Russia, so payment availability, payout routes, platform restrictions, and supported AMO contribution domains can change. The extension must not depend on one provider until the provider is chosen and tested outside the codebase.
- Timestamped analytics cannot be reconstructed honestly from legacy daily aggregates. Storage v3 therefore preserves old aggregates, starts the SessionEvent log without historical backfill, and records only new completed Work cycles.
- Chrome offscreen must remain a scheduler rather than a competing TimerState writer. Background owns state transitions and acknowledges cycle-matched completion before offscreen plays the completion chime.
- Serializing domain mutations is insufficient while popup/app hydration can still execute a full storage migration write outside that queue. Extension initialization is itself an authoritative storage operation and must use the same platform queue.
- Cycle snapshot isolation needs a narrow exception for explicit live audio commands. Keeping the saved Focus Mode immutable while replacing only the active snapshot's track/none and volume preserves timer/session identity and restores immediate user control.
- Task-bound audio cannot be displayed from top-level compatibility settings because that object intentionally never materializes a task override. Popup, app, and Firefox background now share active-Work audio resolution without changing layout or storage schema.
- A UI-computed full audio payload is unsafe even when background mutations are queued: two rapid controls can both be derived from the same stale render. Atomic intent messages let the background merge each action with the latest authoritative active-Work audio state.
- The deterministic Focus Music harness executes the production domain mutation and resolver, but its playback-generation model does not execute Firefox's real `HTMLAudioElement` reconciler. It is strong interleaving evidence, not a substitute for packaged Firefox audio smoke.
- Temporary Firefox instrumentation must execute in the background realm: functions created from a popup become dead cross-compartment wrappers when that popup closes. The successful QA run prepended a local script only to an external package copy and left the production bundle untouched.

## Decision Log

- Do not enable Firefox Android in AMO until the extension is tested on Android with `web-ext lint` and a real device or emulator.
- Keep Firefox desktop and Firefox Android as separate capability profiles, even if they share most code.
- Design donations and the Pro feature matrix before Android adaptation. Android UI and platform choices depend on what will later be free, supporter-only, Pro, or unavailable on mobile.
- Add donations before paid Pro functionality because donations are lower risk and do not require account, license, or sync infrastructure.
- Implement v1.2.0 through the dedicated ExecPlan. This platform roadmap remains the higher-level source for Android and later cross-platform work.
- Treat the donation provider as runtime/configuration data, not as a hardcoded product assumption. For the developer's Russia context, the selected donation route must be manually verified before it appears in AMO or the app UI.
- Do not put existing free features behind a paywall. Free must keep timer, tasks, local statistics, import/export, and basic focus music.
- Product data and ungated UI may be validated before a payment route exists. Real feature gates, purchase copy, and licensing remain blocked on an approved Free/Pro boundary and operational payment plan.
- Market `Focus Modes` as one capability. Templates are saved modes; per-task profiles only bind a task to a mode; sound packs are mode ingredients rather than separate flagship products.
- Phase 3 Focus Review, global goals, CSV, and Markdown are ungated Free capabilities. Any future Pro reporting must be additive and cannot relabel or remove these shipped local tools.
- Do not introduce analytics by default. If monetization later needs licensing, store only the minimum required license state and document it.
- Focus Modes UI is implemented without payment, entitlement, or feature-gate logic. Keep it ungated while product behavior is validated; do not define paid limits in this phase.
- Treat background readiness as the storage ownership boundary on both Chrome and Firefox: startup/install/readiness queue initialization and recovery, while UI surfaces only read after a successful readiness response. This integrity fix does not change schema, permissions, layout, or monetization scope.
- Route direct Focus Music controls through one typed serialized background mutation. Preserve manual durations, write only manual audio values, and replace only active Work snapshot audio fields; Focus Mode CRUD, task binding, and global selection remain next-cycle-only for the complete snapshot.
- Express each direct audio interaction as one atomic intent and resolve it inside the authoritative background queue. Popup and app-window surfaces must not reconstruct the next audio state from a possibly stale Zustand render.
- Keep Audio/runtime instrumentation and screenshots outside the repository and release package; use them only to validate the background-owned player and layout invariants.

## Outcomes & Retrospective

Phases 0-2 and their storage-integrity/audio remediations are complete. Phase 3 now implements storage v4, honest event-log coverage, captured local-time facts, event-only Focus Review, global goals, and secure local CSV/Markdown generation without gates, permissions, dependencies, network calls, or monetization. Storage and analytics milestones are committed with independent approval; reports and final packaged runtime/visual/accessibility QA remain open. Android, donations, real Pro gates, payments, and licensing remain unstarted.

## Context and Orientation

Important current files:

- `manifest.firefox.ts`: Firefox manifest, permissions, Gecko ID, data collection declaration.
- `src/background-firefox.ts`: Firefox runtime, notifications, timer, and app-window manager.
- `src/App.tsx`: shared popup/app-window shell.
- `src/lib/types.ts`: storage contracts, settings, runtime message types.
- `src/lib/storage.ts`: migrations, normalization, import/export storage behavior.
- `src/lib/focusModes.ts`: canonical built-in modes and custom-mode normalization.
- `src/offscreen.ts`: Chrome expiry scheduler; it does not own persisted TimerState.
- `src/lib/i18n.ts`: English/Russian UI text.
- `FIREFOX.md`: Firefox build and release notes.
- `docs/amo/reviewer-note.md`: reviewer-facing architecture and permissions explanation.
- `docs/privacy/index.md`: public privacy policy.

Useful external references:

- Firefox for Android extension development: https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/
- `browser_specific_settings` and `gecko_android`: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings
- Mozilla monetization guidance: https://extensionworkshop.com/documentation/publish/make-money-from-browser-extensions/

## Plan of Work

1. Donation and Pro product model.
2. Donation infrastructure.
3. Pro foundation.
4. Platform capability layer.
5. Android compatibility audit.
6. Mobile UX adaptation.
7. Future platform extraction.

## Concrete Steps

### 1. Donation and Pro product model

Define the tiers before mobile adaptation:

| Area | Free | Supporter / Donation | Pro candidate |
| --- | --- | --- | --- |
| Timer | Work, short break, long rest, auto-start, skip short break | Same | Per-task custom cycles, named focus plans |
| Tasks | Active/archive/delete, task selection, local history | Same | Templates, recurring plans, task goals |
| Statistics | Local list/chart/task totals plus ungated Phase 3 Review, trends, streaks, goals, and comparisons | Same | Future additive analytics only after a separately approved boundary |
| Data | Local storage, JSON backup/import, CSV session export, Markdown weekly review | Same | Scheduled backup or later sync only after separate infrastructure and approval |
| Focus environment | Built-in basic sound loops, themes | Same, plus optional thank-you state if desired | Extra sound packs, richer focus scenes, advanced themes |
| Platform | Firefox desktop first | Same | Later cross-device features only after licensing/account decisions |

Rules:

- Donations must not unlock core productivity features in the first monetization phase.
- Donation copy should be framed as support for development, not as a purchase.
- Pro must be additive. It should not remove or lock existing free flows.
- All payment, donation, and licensing assumptions must be documented before changing AMO listing text.

Russia-specific donation constraints:

- Do not enable a donation button with a placeholder or unverified URL.
- Keep the AMO Contribution URL empty until the selected provider is accepted by AMO and works for the developer's jurisdiction.
- If the chosen provider is not accepted by AMO's Contribution URL field, do not force it into that field. Keep the app-level support entry disabled or link only after checking Mozilla policy and provider availability.
- The extension must never collect card, wallet, bank, or payer identity data.
- The extension must only open an external donation URL after an explicit user click.
- Candidate providers are an operations/legal decision, not a code decision. Availability must be checked manually at the time of release because payment restrictions can change.

### 2. Donation infrastructure

Add a provider-agnostic config:

```ts
interface DonationConfig {
  enabled: boolean;
  url: string;
  labelKey: string;
}
```

Behavior:

- `enabled: false`: show a disabled `Support project` entry with a localized `Soon` label, or hide it in cramped mobile UI.
- `enabled: true` and non-empty `url`: open the donation page only after an explicit user click.
- No background requests.
- No tracking pixels.
- No analytics.
- No hidden external calls.

AMO field:

- If using a supported provider, add the same URL to Contributions URL in Developer Hub.
- If not supported, keep the field empty and avoid misleading store text.

### 3. Pro foundation

Add types without changing current access:

```ts
type PlanTier = 'free' | 'pro';
type FeatureFlag =
  | 'advancedAnalytics'
  | 'weeklyReports'
  | 'focusTemplates'
  | 'extraSoundPacks'
  | 'cloudSync';
```

Keep current free features free:

- timer;
- task list;
- local statistics;
- app window;
- import/export;
- basic bundled focus music.

Candidate Pro features:

- advanced analytics: trends, streaks, task comparisons, daily/weekly goals;
- reports: CSV and Markdown export, weekly review, task-level summaries;
- planning: recurring focus plans, templates, custom cycles per task;
- focus environment: more sound packs, richer fullscreen focus modes, themes;
- later: cloud sync, account, multi-device history, web dashboard.

### 4. Platform capability layer

Add a small capability model, for example:

```ts
type PlatformId = 'firefox-desktop' | 'firefox-android' | 'chrome' | 'edge' | 'web';

interface PlatformCapabilities {
  canOpenAppWindow: boolean;
  canUseHoverTooltips: boolean;
  canUseNotifications: boolean;
  canUseLocalAudio: boolean;
  prefersTouchUi: boolean;
}
```

Use it to gate:

- app-window open/maximize behavior;
- hover-only tooltips;
- desktop-sized modals;
- chart density;
- focus music autoplay behavior;
- donation link placement.

### 5. Android compatibility audit

Build the current Firefox package:

```powershell
npm.cmd run build:firefox
```

Run Android compatibility lint:

```powershell
npx.cmd web-ext lint --source-dir dist-firefox
```

Current result on 2026-07-05:

- `errors`: 0
- `notices`: 0
- `warnings`: 4
- warnings to document if needed: `data_collection_permissions` minimum-version compatibility and generated `innerHTML` assignments in the built bundle.

Confirm Android tooling is available:

```powershell
adb devices
```

If `adb` is not recognized, install Android Studio or Android Platform Tools, add `platform-tools` to `PATH`, then reopen the terminal.

Then test on Android Firefox:

```powershell
npx.cmd web-ext run -t firefox-android --source-dir dist-firefox --firefox-apk org.mozilla.firefox
```

If using Firefox Beta or Nightly, replace the package name with `org.mozilla.firefox_beta` or `org.mozilla.fenix`.

Expected observations:

- The linter should not report unsupported required permissions or manifest keys for the intended Android minimum version.
- The popup or extension page must be usable on a phone-size viewport.
- Timer state must survive popup close/backgrounding through persisted timestamps.
- Notifications must either work or have a documented Android fallback.
- Focus music must not autoplay unexpectedly on mobile.
- The desktop app-window button must be hidden, disabled, or converted to an Android-safe extension-page flow.
- Fullscreen and maximize controls must not rely on desktop-only `windows.*` behavior on Android.
- Task, timer, and chart tooltips must work through tap/focus/help text, not hover-only interaction.
- Export/import must be tested with Android's file picker behavior before it is advertised as supported on mobile.

### 6. Android UX adaptation

For Android, prefer:

- one-column layout;
- bottom-sheet style dropdowns/modals;
- large touch targets;
- no hover-only interactions;
- no desktop app-window dependency;
- shorter labels and less dense chart rows.

The Android UX should initially focus on:

- timer start/pause/stop;
- task selection;
- task creation;
- basic stats list;
- settings;
- import/export only if file picker behavior is reliable.

### 7. Future platform extraction

Before Chrome/Edge/PWA/desktop:

- isolate storage schema and migrations from extension APIs;
- isolate timer math and mode transitions;
- isolate i18n and formatting;
- isolate platform adapters for windows, notifications, file import/export, and external links.

## Validation and Acceptance

Android readiness:

- `web-ext lint` is clean or documented with acceptable warnings.
- Android manual smoke test passes on at least one real device or emulator.
- UI is touch-friendly and does not rely on hover.
- Timer continuity and storage persistence work after backgrounding.
- No desktop-only app-window control appears on Android.
- AMO Android compatibility is not enabled until the Android smoke test passes.

Donation readiness:

- Donation entry appears only in appropriate places.
- Empty URL state is safe and non-clickable.
- Real URL opens only after user action.
- The selected donation provider works for the developer's jurisdiction and is not only assumed from old documentation.
- The extension does not collect payment data and does not imply in-app purchases.
- Privacy policy and AMO disclosure match behavior.

Pro readiness:

- Existing users do not lose data.
- Existing free features are not locked.
- Export/import includes any new plan fields safely.
- No account or server behavior is implied unless actually implemented.

## Idempotence and Recovery

Android compatibility changes must be feature-gated so desktop Firefox can be restored by disabling the Android capability path. Storage migrations must be forward-compatible and must not remove unknown fields. Import/export remains the user recovery path if a future platform migration goes wrong.

## Artifacts and Notes

Potential future artifacts:

- `src/lib/platform.ts`
- `src/lib/features.ts`
- `src/lib/donation.ts`
- `docs/pro-roadmap.md`
- `docs/amo/android-reviewer-note.md`

Current planning artifacts:

- `docs/pro-roadmap.md` defines the Free / Donation / Pro matrix, Russia-aware provider constraints, competitive reference notes, and the fast local-only Pro MVP shortlist.

## Interfaces and Dependencies

Current permissions:

- `storage`: local tasks, settings, timer state, statistics, Focus Modes, and SessionEvents.
- `notifications`: completion fallback and timer notifications.
- `alarms`: timer continuity support.

Potential future APIs:

- `gecko_android` manifest key after Android verification.
- External donation URL, opened only on user click.
- Payment/licensing backend only if Pro becomes account-based.

Revision note 2026-07-04: Created as the living roadmap for Android compatibility, donations, Pro features, and future cross-platform work.

Revision note 2026-07-05: Recorded the first Android-readiness audit result: Firefox build and `web-ext lint` pass without errors, while Android runtime testing remains pending before adding `gecko_android`.

Revision note 2026-07-05: Reordered the roadmap so donation and Pro product design happen before Android implementation, and added Russia-aware donation constraints to avoid hardcoding an unreliable payment route.

Revision note 2026-07-06: Added explicit provider verification references and a Russia-based developer checklist so donation and Pro implementation cannot accidentally depend on an unavailable payment route.

Revision note 2026-07-06: Completed the first Pro/donation documentation pass with competitive reference notes and a fast local-only Pro MVP recommendation. The preferred first paid candidate is advanced analytics review because it builds on existing local statistics and does not require accounts, sync, or new permissions.

Revision note 2026-07-11: Reworked the Pro plan around two coherent products, `Focus Modes` and `Focus Review`, and recorded the implementation risks that must be resolved before paid access is enabled.

Revision note 2026-07-11: Linked the platform roadmap to `EXECPLAN-v1.2.0.md`, which now owns the concrete donation and Lifetime Pro implementation sequence.

Revision note 2026-07-12: Recorded completed Phase 0 and Phase 1 commits, QA/build/runtime evidence, storage v3 and SessionEvent architecture, background-owned timer state, and Focus Modes UI as the next ungated phase.

Revision note 2026-07-12: Recorded the implemented ungated Phase 2 Focus Modes workflows and their domain, build, Firefox runtime, lint, and visual evidence. Focus Review is now the next product phase; monetization and Android work remain deferred.

Revision note 2026-07-12 20:51 +04:00: Suspended the premature Phase 2 completion claim after `SEC-P2-001` was found in `719fe3e`, and recorded the shared background queue/read-only UI hydration ownership boundary. No monetization, permission, layout, or Phase 3 work was started.

Revision note 2026-07-12 21:04 +04:00: Recorded the implemented storage-only remediation and passing deterministic/static/build/lint gates while retaining the independent-QA/runtime blocker and leaving Focus Music, Phase 3, and monetization untouched.

Revision note 2026-07-12 21:09 +04:00: Recorded QA-Agent `CHANGES REQUIRED` for missing live lifecycle evidence and the environment escalation-limit denial of the prepared browser run. Phase 3 and all monetization work remain unstarted.

Revision note 2026-07-13 00:07 +04:00: Closed `SEC-P2-001` after packaged Chromium/Firefox runtime PASS and final QA approval. Kept the remaining Focus Music blocker, Phase 3, monetization, permissions, and platform roadmap outside this storage fix.

Revision note 2026-07-13 20:37 +04:00: Recorded the scoped live Focus Music remediation, audio-only snapshot exception, shared UI/runtime resolution, and passing deterministic/static/build gates while retaining packaged runtime, visual, optional lint, and independent-QA blockers. Phase 3 and monetization remain unstarted.

Revision note 2026-07-13 21:14 +04:00: Recorded the QA-discovered stale full-payload risk and its atomic-intent correction, repeated deterministic/static/build PASS, optional lint unavailability, three Firefox pre-BiDi exits with `0x593E4001`, and final QA `CHANGES REQUIRED`. Kept Phase 2, the Focus Music commit, Phase 3, and monetization blocked pending real packaged runtime and visual evidence.

Revision note 2026-07-13 22:28 +04:00: Recorded packaged Firefox live-audio/exact-once/chime PASS and six inspected screenshots after fixing external QA profile/process-tree ownership. Kept Phase 2 and the commit pending final independent QA, with native notification observation and optional lint documented honestly.

Revision note 2026-07-13 22:35 +04:00: Recorded final independent QA-Agent `APPROVE`, closed the Phase 2 Focus Music blocker, superseded stale pending entries, and retained native headless-notification observation plus unavailable optional lint as non-blocking residuals. Phase 3 and monetization remain unstarted.

Revision note 2026-07-15 00:14 +04:00: Reconciled this platform roadmap with implemented Phase 3. Review, goals, CSV, and Markdown are free ungated local features; storage and analytics milestones are approved, while report and final packaged/visual gates remain pending. No monetization, permission, payment, licensing, account, telemetry, cloud, or Android work was introduced.
