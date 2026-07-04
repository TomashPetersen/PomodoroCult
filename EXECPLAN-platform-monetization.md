# Platform, Android, Donations, and Pro Roadmap

## Purpose / Big Picture

Pomodoro Cult is currently focused on Firefox desktop with a compact popup and a larger app window. The next product layer is broader distribution and monetization: Firefox for Android support, a careful donation path, and a paid-feature roadmap that can later work across Firefox, Chrome, Edge, PWA, and desktop shells.

The user outcome is simple: existing users keep their local tasks and statistics, Android users get a usable touch-first version when the platform is ready, and future paid functionality is designed without breaking the free local-first timer.

Mozilla's Android guidance makes this a compatibility project, not just a checkbox: the extension must be linted for Android, tested on device or emulator, and adapted for different APIs and form factors before `gecko_android` is enabled. Mozilla's monetization guidance allows paid features and donations, but requires clear disclosure, minimal data collection, and user control.

## Progress

- [x] 2026-07-04: Defined the strategic scope: Firefox Android compatibility, donations, Pro features, and future platform adapters.
- [x] 2026-07-04: Reviewed current Firefox manifest shape: desktop Firefox only, MV3, no host permissions, local storage, notifications, alarms.
- [x] 2026-07-04: Chose the first safe path: audit and prepare Android compatibility before enabling Android in AMO.
- [x] 2026-07-05: Rebuilt Firefox package and ran `web-ext lint` against `dist-firefox`; validation has 0 errors, 0 notices, and 4 documented warnings.
- [ ] Android device/emulator smoke test completed.
- [ ] Android API and UX audit completed.
- [ ] Platform capability layer designed and implemented.
- [ ] Donation URL and support entry finalized.
- [ ] Pro feature gates designed without locking existing free features.
- [ ] AMO reviewer notes and privacy text updated for any shipped monetization behavior.

## Surprises & Discoveries

- Current Firefox build already has a desktop-only app-window flow based on `browser.windows.create`. That is useful on desktop, but must be treated as a desktop capability for Android.
- The current permission set is intentionally small: `storage`, `notifications`, and `alarms`. Any monetization or Android change should avoid adding host permissions unless there is a clear product need.
- The project already has export/import and storage migrations, which gives a good base for future platform transitions and user backups.
- `web-ext lint` passes the current Firefox package with no blocking errors. The remaining warnings are known release-review items: two compatibility warnings for `browser_specific_settings.gecko.data_collection_permissions` with `strict_min_version: 115`, and two generated-bundle warnings for dynamic `innerHTML`.
- The Firefox manifest still has no `gecko_android` block, which is intentional until the extension is tested on Firefox for Android.

## Decision Log

- Do not enable Firefox Android in AMO until the extension is tested on Android with `web-ext lint` and a real device or emulator.
- Keep Firefox desktop and Firefox Android as separate capability profiles, even if they share most code.
- Add donations before paid Pro functionality because donations are lower risk and do not require account, license, or sync infrastructure.
- Do not put existing free features behind a paywall. Free must keep timer, tasks, local statistics, import/export, and basic focus music.
- Pro work starts with types, feature gates, and UI affordances only after a payment model is chosen.
- Do not introduce analytics by default. If monetization later needs licensing, store only the minimum required license state and document it.

## Outcomes & Retrospective

This plan is the roadmap document. No product code has been changed by this plan yet. It exists to prevent Android, donations, Pro features, and cross-platform work from being mixed into urgent release fixes.

## Context and Orientation

Important current files:

- `manifest.firefox.ts`: Firefox manifest, permissions, Gecko ID, data collection declaration.
- `src/background-firefox.ts`: Firefox runtime, notifications, timer, and app-window manager.
- `src/App.tsx`: shared popup/app-window shell.
- `src/lib/types.ts`: storage contracts, settings, runtime message types.
- `src/lib/storage.ts`: migrations, normalization, import/export storage behavior.
- `src/lib/i18n.ts`: English/Russian UI text.
- `FIREFOX.md`: Firefox build and release notes.
- `docs/amo/reviewer-note.md`: reviewer-facing architecture and permissions explanation.
- `docs/privacy/index.md`: public privacy policy.

Useful external references:

- Firefox for Android extension development: https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/
- `browser_specific_settings` and `gecko_android`: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings
- Mozilla monetization guidance: https://extensionworkshop.com/documentation/publish/make-money-from-browser-extensions/

## Plan of Work

1. Android compatibility audit.
2. Platform capability layer.
3. Mobile UX adaptation.
4. Donation infrastructure.
5. Pro foundation.
6. Future platform extraction.

## Concrete Steps

### 1. Android compatibility audit

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

### 2. Platform capability layer

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

### 3. Android UX adaptation

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

### 4. Donation infrastructure

Add config:

```ts
const DONATION_URL = '';
```

Behavior:

- Empty URL: show disabled `Support project` / `Поддержать проект` with `Soon` / `Скоро`.
- Non-empty URL: open the donation page only after an explicit user click.
- No background requests.
- No tracking pixels.
- No analytics.
- No hidden external calls.

AMO field:

- If using a supported provider, add the same URL to Contributions URL in Developer Hub.

### 5. Pro foundation

Add types without changing current access:

```ts
type PlanTier = 'free' | 'supporter' | 'pro';
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
- reports: CSV/PDF export, weekly review, task-level summaries;
- planning: recurring focus plans, templates, custom cycles per task;
- focus environment: more sound packs, richer fullscreen focus modes, themes;
- later: cloud sync, account, multi-device history, web dashboard.

### 6. Future platform extraction

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
- `docs/amo/android-reviewer-note.md`
- `docs/pro-roadmap.md`

## Interfaces and Dependencies

Current permissions:

- `storage`: local tasks, settings, timer state, statistics.
- `notifications`: completion fallback and timer notifications.
- `alarms`: timer continuity support.

Potential future APIs:

- `gecko_android` manifest key after Android verification.
- External donation URL, opened only on user click.
- Payment/licensing backend only if Pro becomes account-based.

Revision note 2026-07-04: Created as the living roadmap for Android compatibility, donations, Pro features, and future cross-platform work.

Revision note 2026-07-05: Recorded the first Android-readiness audit result: Firefox build and `web-ext lint` pass without errors, while Android runtime testing remains pending before adding `gecko_android`.
