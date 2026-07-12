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
- Reports are a supporting utility, not the main reason to buy Pro. CSV and Markdown come after Focus Modes and Focus Review.
- Do not introduce analytics by default. If monetization later needs licensing, store only the minimum required license state and document it.
- Focus Modes UI is implemented without payment, entitlement, or feature-gate logic. Keep it ungated while product behavior is validated; do not define paid limits in this phase.

## Outcomes & Retrospective

The roadmap now has three implemented foundations. Phase 0 stabilized the Firefox Free runtime and background focus music. Phase 1 added the platform-neutral storage v3 model and exact-once SessionEvents. Phase 2 added ungated Focus Mode selection, custom CRUD, task binding, and active-cycle isolation without permissions, payment code, entitlement state, or access limits. Focus Review is next; Android, donations, real Pro gates, and licensing remain unstarted.

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
| Statistics | Local list, chart, task totals | Same | Weekly review, trends, streaks, comparisons |
| Data | Local storage, import/export backup | Same | CSV and Markdown reports; later sync only if account infrastructure exists |
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
