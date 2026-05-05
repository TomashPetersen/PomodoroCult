# AMO Reviewer Note

Pomodoro Cult is a timer extension with tasks and local statistics.

Firefox-specific runtime notes:

- the Firefox build uses a dedicated `background.scripts` runtime
- it does not use the Chrome `offscreen` API
- countdown continuity is based on persisted timer state and system time
- the extension does not load remote code
- the extension does not request host permissions
- the extension does not perform tracking or analytics

Required permission:

- `storage` - stores timer state, settings, tasks, theme, language preference, and local statistics between sessions

Data handling:

- all extension data is stored locally in browser extension storage
- no account system
- no remote backend
- no telemetry

Support contact:

- dgvolkovhard@gmail.com
