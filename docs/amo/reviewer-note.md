# AMO Reviewer Note

Pomodoro Cult is a timer extension with tasks and local statistics.

This pending Firefox release adds a larger extension app window while keeping the existing toolbar popup as a quick controller.

Firefox-specific runtime notes:

- the Firefox build uses a dedicated background page runtime through `background-firefox.html`
- it does not use the Chrome `offscreen` API
- countdown continuity is based on persisted timer state and system time
- the larger app window is a bundled extension page opened from the popup
- the app window can be maximized and restored through the Firefox windows API; it does not use browser fullscreen mode
- the extension does not load remote code
- the extension does not request host permissions
- the extension does not perform tracking or analytics

Focus music notes:

- focus music is optional and disabled by default
- the three focus loops are bundled local audio files: stream, birds, and ticking clock
- focus audio sources and licenses are documented in `docs/assets.md`
- music plays only during a running work timer when enabled by the user
- one background-page player owns focus music so popup close/reopen and the separate app window do not create duplicate playback
- direct Off/On, track, and volume changes are sent to the authoritative background page and apply to the current running/paused Work cycle without changing timer durations or saved Focus Mode records
- the active cycle stores only the live track/none and volume override; popup and app window read that same state, while Focus Mode edits remain next-cycle-only
- no remote audio is loaded

Required permission:

- `storage` - stores timer state, settings, tasks, theme, language preference, and local statistics between sessions
- `notifications` - shows a Firefox system notification when a timer completes
- `alarms` - schedules reliable timer completion handling when the popup is closed or the background runtime is idle

Data handling:

- all extension data is stored locally in browser extension storage
- storage version 3 adds local Focus Mode definitions, optional task-to-mode references, timer cycle identity, and timestamped events for newly completed Work sessions
- legacy aggregate statistics are preserved and are not expanded into fabricated timestamped events
- JSON backup/import includes Focus Modes and SessionEvents; imported timers are restored to a safe idle state
- Focus Mode global/manual selection, custom modes, and optional task bindings remain local and are included in JSON backup/import
- a cycle-owned configuration snapshot prevents later mode edits, deletion, or task rebinding from changing a running or paused timer
- no account system
- no remote backend
- no telemetry

Current monetization status:

- Focus Modes selector, custom-mode editor, and task binding are available as free ungated local features
- no Focus Mode count limit or task-binding paywall is present
- no donation URL is enabled
- no Pro feature gate, entitlement, license key, payment request, or licensing server is present

Support contact:

- dgvolkovhard@gmail.com
