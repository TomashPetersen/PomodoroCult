# AMO Reviewer Note

Pomodoro Cult is a timer extension with tasks and local statistics.

This pending Firefox release keeps the runtime behavior unchanged and refreshes only the public-facing metadata, localized listing copy, and Firefox icon set.

Firefox-specific runtime notes:

- the Firefox build uses a dedicated background page runtime through `background-firefox.html`
- it does not use the Chrome `offscreen` API
- countdown continuity is based on persisted timer state and system time
- the extension does not load remote code
- the extension does not request host permissions
- the extension does not perform tracking or analytics

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
