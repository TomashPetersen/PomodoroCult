## Purpose / Big Picture

Pomodoro Cult already works as a Chrome Manifest V3 extension, but Firefox needs a different background architecture and a Firefox-specific manifest. The user outcome for this work is simple: we should be able to build a Firefox package that opens the same popup UI, keeps the timer running after the popup closes, records completed work sessions, and plays the completion sound without relying on Chrome-only APIs.

## Progress

- [2026-05-04 20:27] Started Firefox port planning, verified that the current app is Chrome-first and depends on `background.service_worker` plus `chrome.offscreen`.
- [2026-05-04 20:27] Confirmed there is no repository-level `PLANS.md`, so this ExecPlan follows the local `agents.md` standard.
- [2026-05-04 20:27] Defined the Firefox-compatible build split and selected a separate background runtime instead of `offscreen`.
- [2026-05-04 20:36] Added Firefox-specific manifest/build path and a Firefox background runtime that keeps countdown logic in the background document.
- [2026-05-04 20:40] Verified `npx.cmd tsc --noEmit`, `npm.cmd run build`, and `npm.cmd run build:firefox`.
- [2026-05-04 20:40] In progress: final code review and identify any remaining manual Firefox validation gaps.

## Surprises & Discoveries

- Firefox does not support the current `background.service_worker` path used by the Chrome build.
- Firefox also does not support the `offscreen` API this project currently uses for long-running countdown and background audio.
- The current runtime logic is already mostly based on `Date.now()`, which is good news because it makes the timer logic portable once the execution host changes.

## Decision Log

- Decision: keep Chrome behavior intact and add a separate Firefox build path instead of forcing one manifest/runtime to do both jobs.
  Reason: this reduces risk to the working Chrome release and keeps browser-specific behavior explicit.
- Decision: move Firefox timing into a Firefox-compatible background runtime instead of trying to emulate `offscreen`.
  Reason: Firefox needs a different host for long-lived extension logic.
- Decision: set Firefox `strict_min_version` to `115.0` and declare `data_collection_permissions.required = ["none"]`.
  Reason: current MDN guidance for signed Firefox MV3 builds requires the Gecko ID and, for new submissions, the data collection declaration. The current update-signing floor also makes `115.0` the safer minimum.

## Outcomes & Retrospective

- The project now produces separate Chrome and Firefox artifacts from the same codebase.
- Chrome keeps the existing MV3 service worker plus `offscreen` runtime.
- Firefox now builds without the `offscreen` permission and uses a dedicated background script for countdown continuity and completion audio.
- Remaining gap: the Firefox package has not yet been manually loaded into Firefox for behavioral verification.

## Context and Orientation

Relevant files and why they matter:

- `manifest.json`: current Chrome manifest using MV3 service worker and `offscreen`.
- `vite.config.ts`: current build entrypoint that packages the Chrome extension.
- `src/background.ts`: Chrome background coordinator that creates the offscreen document and handles lifecycle events.
- `src/offscreen.ts`: Chrome offscreen timer loop and completion audio playback.
- `src/store/useAppStore.ts`: popup-side runtime messaging and state hydration.
- `src/lib/storage.ts`: timer persistence, normalization, and shared timer helpers.
- `public/sounds/completion-chime.mp3`: packaged completion audio asset that should remain available in Firefox.

External constraints:

- Firefox build needs a Gecko extension ID in `browser_specific_settings.gecko.id`.
- Firefox background execution must use a Firefox-supported background configuration.
- New permissions should be avoided unless they are clearly required.

## Plan of Work

1. Add a Firefox-specific build target and manifest.
2. Keep the popup UI shared between browsers.
3. Extract or reuse shared timer-state helpers so Chrome and Firefox runtimes stay behaviorally aligned.
4. Implement a Firefox background runtime that owns countdown continuation and completion handling without `offscreen`.
5. Build the Firefox artifact and inspect the generated manifest and assets.

## Concrete Steps

1. Inspect current manifest/build wiring and identify what must differ for Firefox.
2. Create browser-specific manifest generation or separate manifest files.
3. Add `build:firefox` script and direct output to a Firefox artifact directory or package.
4. Implement Firefox background entrypoint using supported APIs.
5. Ensure runtime messaging names stay compatible with the popup store.
6. Verify that completed work sessions still write statistics and that reset/pause/start semantics stay intact.
7. Run a production Firefox build and inspect the generated package contents.

## Validation and Acceptance

Commands to run:

```powershell
npm.cmd run build
```

Planned Firefox-specific command once added:

```powershell
npm.cmd run build:firefox
```

Acceptance checks:

- Chrome build still succeeds unchanged.
- Firefox build succeeds with a manifest that includes `browser_specific_settings.gecko.id`.
- Firefox manifest does not request `offscreen`.
- Firefox package includes popup UI, icons, locales, and completion sound asset.
- Firefox runtime path does not depend on `chrome.offscreen`.
- Completed `work` sessions continue to update statistics automatically.

## Idempotence and Recovery

- If the Firefox runtime changes break Chrome behavior, revert only the browser-splitting layer and keep shared helpers intact.
- If build wiring becomes confusing, keep separate manifest files rather than over-abstracting Vite configuration.
- If audio playback in Firefox background proves unreliable, preserve timer correctness first and downgrade audio behavior only with explicit documentation.

## Artifacts and Notes

- Expected new or changed artifacts:
  - Firefox-specific manifest file or manifest generator
  - Firefox background runtime entrypoint
  - new npm build script(s)
- Added project docs:
  - `FIREFOX.md`
- Existing stash to remember:
  - `stash@{0}` contains the earlier Firefox manifest prep from the old branch.

## Interfaces and Dependencies

- Shared interface: runtime message contract in `src/lib/types.ts`
- Shared storage contract: `StoredData`, `TimerState`, `Settings`
- Browser APIs currently used:
  - `chrome.runtime.sendMessage`
  - `chrome.storage.local`
  - `chrome.offscreen` (Chrome only; must not be used by Firefox build)

---

Updated on 2026-05-04: recorded the implemented Firefox build/runtime split, added validation results, and documented the remaining manual verification gap.
