# v1.1.0 App Window, Focus Music, and Support Entry

## Purpose / Big Picture

Pomodoro Cult currently uses a compact browser-action popup. That popup is useful for quick control, but Firefox closes it when focus leaves the popup, so it is not a comfortable primary workspace for tasks, statistics, settings, music, and longer focus sessions.

Version 1.1.0 adds a hybrid product model: the popup remains a quick remote control, and a separate Firefox extension window becomes the larger app workspace. Both surfaces share the same storage, runtime timer state, tasks, statistics, theme, language, and settings.

## Progress

- [x] 2026-06-24: Defined the hybrid popup plus app-window product direction.
- [x] 2026-06-24: Inspected current popup entrypoint, Firefox manifest, store, runtime, and styling constraints.
- [x] 2026-06-24: Add Firefox app-window entrypoint and background window manager.
- [x] 2026-06-24: Add responsive app-window shell and popup open-window control.
- [x] 2026-06-24: Add local focus music settings, controller, and UI.
- [x] 2026-06-24: Add three bundled focus loops from OpenGameArt: stream, birds, and ticking clock.
- [x] 2026-06-24: Add donation/support entry infrastructure.
- [x] 2026-06-24: Validate TypeScript and Firefox build.
- [x] 2026-06-26: Restore a compact popup entry to the separate native app window without making the timer widget look like it expands in place.
- [x] 2026-06-26: Add an in-window fullscreen toggle and compact the desktop workspace layout.
- [x] 2026-06-26: Replace browser fullscreen with native window maximize/restore behavior and tighten modal/layout density for the desktop window.

## Surprises & Discoveries

- The popup dimensions are hard-coded in `src/styles.css` through `html`, `body`, and `#root`.
- The Firefox build currently has only one UI entrypoint, `index.html`.
- The source Russian i18n block is mojibake again and must be normalized before release.
- Firefox already uses a document-backed background page, which is a good place to keep the single app-window id.
- Pixabay and Wikimedia direct downloads were blocked by Cloudflare/rate limits in CLI, so the focus loops were sourced from OpenGameArt direct file URLs instead.

## Decision Log

- Keep `action.default_popup` so toolbar clicks keep opening the quick popup.
- Add `app.html` as a second Firefox UI page instead of replacing the popup.
- Use one app window at a time; repeated open requests focus the existing window.
- Focus music is local, offline, disabled by default, and available as three bundled loops: stream, birds, and ticking clock.
- Do not request a new `windows` manifest permission unless runtime testing proves Firefox requires it; the first implementation uses the existing windows API without changing permissions.
- Donation support is infrastructure-only until a real donation URL is configured.
- Do not add sidebar in 1.1.0.
- Keep the toolbar popup as a compact quick widget. The larger workspace opens as a separate Firefox popup-type window, so the operating system window frame provides minimize, maximize, restore, close, and resizing behavior.
- Firefox popup-type extension windows can show a disabled native maximize button on Windows. Use the Firefox windows API to maximize and restore the app window instead of browser fullscreen, which triggers a large native permission banner.

## Outcomes & Retrospective

Implemented the Firefox app-window foundation, restored the compact popup, added a more compact shared app-window layout with native maximize/restore behavior, tightened modal density, added three optional local focus loops, and kept the manifest permission set unchanged.

## Context and Orientation

Main areas:

- `manifest.firefox.ts`: Firefox manifest and permissions.
- `vite.config.ts`: Firefox build input pages.
- `src/background-firefox.ts`: Firefox runtime and app-window manager.
- `src/App.tsx`: shared UI shell for popup and app window.
- `src/store/useAppStore.ts`: shared UI state and runtime actions.
- `src/lib/types.ts`, `src/lib/storage.ts`, `src/lib/i18n.ts`: settings, migration, and localization.

## Plan of Work

1. Add storage fields for focus music and normalize old settings safely.
2. Add runtime messages and background handlers for opening/focusing one app window.
3. Add `app.html` and Vite input for Firefox.
4. Split the UI shell into popup and app-window surfaces while keeping shared components.
5. Add focus music controller and visible controls in the app window.
6. Add donation/support entry with disabled fallback until a URL exists.
7. Update Firefox docs and AMO reviewer notes for the new window and local audio.

## Concrete Steps

Commands:

```powershell
npx.cmd tsc --noEmit
npm.cmd run build:firefox
```

Manual Firefox check:

1. Load `dist-firefox/manifest.json` as a temporary extension.
2. Open the toolbar popup and click the app-window button.
3. Start, pause, stop, and complete timers with both surfaces open.
4. Change tasks, statistics range, settings, language, and theme; verify both surfaces stay synced.
5. Enable focus music in the app window and verify stream, birds, and ticking clock play only during a running work timer.
6. Maximize and restore the app window from the header button and verify no browser fullscreen banner appears.

## Validation and Acceptance

- Popup still opens from the toolbar and remains useful as a quick controller.
- A single app window opens and focuses on repeated requests.
- Closing the app window does not break the popup or timer runtime.
- No remote audio, analytics, host permissions, or backend calls are introduced.
- Old settings migrate to focus music defaults without losing tasks or statistics.

## Idempotence and Recovery

If app-window state gets stale, closing the Firefox app window and reopening from the popup should create a fresh window id. If music playback is blocked, the timer must continue unaffected.

## Artifacts and Notes

The focus loops are downloaded from OpenGameArt and stored under `public/sounds/`. Sources and licenses are documented in `docs/assets.md`.

## Interfaces and Dependencies

New settings:

- `focusMusicEnabled: boolean`
- `focusMusicVolume: number`
- `focusMusicTrack: 'stream' | 'birds' | 'clock'`

New runtime messages:

- `OPEN_APP_WINDOW`
- `APP_WINDOW_CLOSED`

No new npm dependencies are planned.

Revision note 2026-06-24: Created as the living implementation plan for v1.1.0.

Revision note 2026-06-24: Updated after implementation shifted from one focus loop to three bundled loops and app-window infrastructure was added.

Revision note 2026-06-24: Marked implementation and Firefox build validation complete after `npm.cmd run build:firefox` passed.

Revision note 2026-06-24: Updated audio source notes after replacing generated WAV files with OpenGameArt audio assets.
