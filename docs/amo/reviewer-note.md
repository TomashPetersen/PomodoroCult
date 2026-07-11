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
- no remote audio is loaded

Required permission:

- `storage` - stores timer state, settings, tasks, theme, language preference, and local statistics between sessions
- `notifications` - shows a Firefox system notification when a timer completes
- `alarms` - schedules reliable timer completion handling when the popup is closed or the background runtime is idle

Data handling:

- all extension data is stored locally in browser extension storage
- no account system
- no remote backend
- no telemetry

Support contact:

- dgvolkovhard@gmail.com
