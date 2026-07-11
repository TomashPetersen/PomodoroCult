# Pomodoro Cult v1.2.0: Donations and Local-First Pro

This ExecPlan is a living document. Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` current while implementation proceeds.

## Purpose / Big Picture

Version 1.2.0 introduces two independent monetization paths without weakening the existing free timer:

1. A voluntary `Support Pomodoro Cult` donation link that does not unlock features.
2. A one-time `Lifetime Pro` purchase that unlocks reusable Focus Modes, Focus Review analytics, goals, and local reports.

The user must be able to keep using the timer, tasks, current statistics, compact popup, large workspace, three built-in sounds, and JSON backup without paying or creating an account. Pro must add reuse and insight rather than remove existing functionality.

Payments happen on an external HTTPS page. The extension never handles card data, payment-provider credentials, or checkout forms. A small licensing service converts a verified purchase into a signed entitlement that the extension can cache and verify offline.

The developer is based in Russia and wants to accept support and sales internationally. The first provider candidate is lava.top because its current public documentation describes donations, digital products, subscriptions, API/webhooks, payments from many countries, and payout methods including Russian cards and SBP. This is a candidate, not a code dependency. Provider onboarding, KYC, a real foreign-card purchase, refund behavior, and payout must pass an operational test before monetization is enabled.

Observable outcome:

- free users retain all current data and capabilities after updating;
- supporters can open a real external donation page;
- purchasers can activate Lifetime Pro with a license key;
- Pro remains usable offline for a documented period;
- payment or license-server outages never stop timer, tasks, or access to local history;
- AMO listing, privacy policy, reviewer notes, and data disclosure match the shipped behavior.

## Progress

- [x] 2026-07-11: Audited the current Firefox branch and confirmed that donation UI is disabled, `DONATION_URL` is empty, no entitlement model exists, and no current free feature is gated.
- [x] 2026-07-11: Consolidated templates, task profiles, sound settings, and session goals into the `FocusMode` product model.
- [x] 2026-07-11: Selected a staged `Donation + Lifetime Pro` model instead of a recurring subscription for the first paid release.
- [x] 2026-07-11: Recorded lava.top as a provider candidate based on its public donation, digital-product, payout, API, and webhook documentation.
- [x] 2026-07-11 14:30 +04:00: Replaced disposable UI-owned focus music with one Firefox background-page owner and removed the obsolete `FocusMusicController` mount.
- [x] 2026-07-11 14:30 +04:00: Hardened focus-music reconciliation with an independent generation counter, bounded media playback, stale crossfade checks, and a strict non-expired running-Work predicate.
- [x] 2026-07-11 14:30 +04:00: `git diff --check` and `npx.cmd tsc --noEmit` pass after the Phase 0 runtime hardening.
- [x] 2026-07-11 21:17 +04:00: Final Firefox build, automated runtime checklist, and QA-Agent approval completed for the isolated Phase 0 commit.
- [x] 2026-07-11 14:39 +04:00: `npm.cmd run build:firefox` passes and produces the Firefox `1.1.2` manifest with only `storage`, `notifications`, and `alarms` permissions.
- [x] 2026-07-11 14:39 +04:00: QA-Agent approved the generation/ownership concurrency design after two stale-callback review cycles; no static blocking defect remains.
- [x] 2026-07-11 23:59 +04:00: `npx.cmd web-ext lint --source-dir dist-firefox` completed without adding a dependency: 0 errors, 0 notices, and four pre-existing/generated warnings.
- [x] 2026-07-11 21:17 +04:00: Automated Firefox coverage completed for timer, focus-music state, popup reopen, app-window de-duplication, completion statistics, notification count, and legacy JSON-compatible storage.
- [x] 2026-07-11 21:15 +04:00: Firefox 152.0.5 temporarily installed `dist-firefox` through WebDriver BiDi in an isolated profile and loaded the popup UI without console errors.
- [x] 2026-07-11 21:15 +04:00: Automated Firefox runtime checks passed for disabled Work/Break/Rest playback, one Work player, popup reopen state, Stream/volume reconciliation, twenty rapid Start/Pause cycles, app-window de-duplication, exact-once completion statistics, one completion chime/notification, and legacy storage normalization.
- [ ] 2026-07-11 21:15 +04:00: Pending — subjective audible continuity, full-length Stream looping, and UI-driven JSON export/import and malformed-file checks still require a short manual pass.
- [x] 2026-07-11 21:25 +04:00: Audited the Phase 1 storage, migration, JSON, Chrome offscreen, and Firefox completion contracts before changing the schema.
- [x] 2026-07-11 21:25 +04:00: Defined storage v3 with canonical built-in Focus Modes, an initially empty SessionEvent log, task mode references, and a persisted cycle start timestamp.
- [x] 2026-07-11 21:25 +04:00: QA-Agent challenged the Phase 1 design; added dedicated cycle identity, shared completion timestamps, and queued statistics deletion before implementation.
- [x] 2026-07-11 23:59 +04:00: Implemented storage v3, canonical Focus Modes, cycle identity/start persistence, exact-once SessionEvent writes, JSON portability, and aggregate/event statistics deletion on Chrome and Firefox runtimes.
- [x] 2026-07-11 23:59 +04:00: Storage harness passed v0/v1/v2 migration, idempotence, malformed/duplicate input, spoofed built-ins, dangling task references, legacy timestamp fallback, safe import, and JSON rejection checks.
- [x] 2026-07-11 23:59 +04:00: `git diff --check`, `npx.cmd tsc --noEmit`, `npm.cmd run build`, and `npm.cmd run build:firefox` pass for Phase 1.
- [x] 2026-07-11 23:59 +04:00: Firefox 152.0.5 headless runtime verification passed v2-to-v3 migration/backup, exact-once Work event creation, Pause/Resume identity, automatic Break identity, Break completion, statistics/event deletion, Reset cleanup, and console-error checks.
- [x] 2026-07-12 00:58 +04:00: QA-Agent completed the final Phase 1 review after the Chrome offscreen and legacy-start fixes; no blocking defects remain.
- [x] 2026-07-12 00:53 +04:00: Resolved QA blockers by making Chrome background the sole TimerState writer, requiring background completion acknowledgement before the offscreen chime, and preserving a null legacy cycle start across Pause/Resume.
- [x] 2026-07-12 00:53 +04:00: Re-ran `git diff --check`, TypeScript, Chrome production build, and Firefox production build after the QA fixes; all pass.
- [x] 2026-07-12 00:58 +04:00: QA-Agent re-review approved scheduler-only Chrome offscreen ownership, acknowledged completion audio, legacy null-start fallback, exact-once writes, and migration behavior.
- [x] 2026-07-11 21:17 +04:00: Baseline v1.1.x runtime fixes passed static, automated Firefox, and QA-Agent verification and were included in the isolated Phase 0 commit.
- [ ] 2026-07-11: Pending — Free/Pro product boundary approved.
- [x] 2026-07-12: Storage schema v3 and migration design implemented and tested.
- [x] 2026-07-12: Session event log implemented and populated exactly once for new completed Work sessions.
- [ ] 2026-07-11: Pending — Focus Modes implemented without a paywall.
- [ ] 2026-07-11: Pending — Focus Review and goals implemented without a paywall.
- [ ] 2026-07-11: Pending — CSV and Markdown reports implemented.
- [ ] 2026-07-11: Pending — feature gates and local developer entitlement simulator implemented.
- [ ] 2026-07-11: Pending — public support and Pro purchase pages deployed.
- [ ] 2026-07-11: Pending — payment provider KYC, international purchase, refund, and Russian payout tests completed.
- [ ] 2026-07-11: Pending — licensing backend implemented and security-reviewed.
- [ ] 2026-07-11: Pending — Lifetime Pro activation, offline verification, restore, and deactivation implemented.
- [ ] 2026-07-11: Pending — donation URL enabled only after the public route is verified.
- [ ] 2026-07-11: Pending — AMO, privacy, reviewer, and source-submission documents updated.
- [ ] 2026-07-11: Pending — QA-Agent release review completed.
- [ ] 2026-07-11: Pending — Firefox production build and AMO package validated.

## Surprises & Discoveries

- AMO distributes extensions for free but Mozilla explicitly permits charging for enhanced features and asking for donations. Payment requirements, data collection, and monetization controls must be disclosed clearly.
- AMO is not the checkout or license authority. A real Pro product requires an external purchase flow and a minimal entitlement service.
- GitHub Pages can host support and product information, but it cannot safely receive payment webhooks or hold signing secrets.
- The current statistics aggregate is sufficient for totals but not for reliable `best focus hour` calculations. New completed sessions need a timestamped event log.
- A popup is not a stable owner for background audio or licensing refresh. Runtime responsibilities must stay outside disposable UI documents.
- Focus-music priming from a popup is not a reliable Firefox user-activation boundary and can briefly call `play()` while music is disabled or a Break/Rest timer is selected.
- A storage listener without its own reconciliation generation can let a late `play()` or Stream crossfade callback outlive Pause, Stop, track changes, import, or timer completion.
- `TimerState.revision` cannot protect audio settings changes because enabled, track, and volume updates do not increment the timer revision.
- Firefox permits autoplay in extension background pages by default, but playback rejection or timeout still has to fail as an optional music error rather than blocking the timer.
- A generation check alone is insufficient when Stream reuses the same `Audio` elements: stale cleanup needs per-audio ownership so it cannot pause an element already adopted by a newer reconciliation pass.
- The existing timer state does not preserve the original cycle start across Pause/Resume. Deriving every `SessionEvent.startedAt` from completion time would corrupt time-of-day analytics, so storage v3 needs a persisted cycle start timestamp.
- Firefox already serializes timer mutations, but the Chrome service worker handles completion messages concurrently. Exact-once SessionEvents require the same operation queue around Chrome timer mutations.
- Deleting aggregate statistics for a task must also delete its raw SessionEvents; otherwise future analytics could recreate data the user explicitly removed.
- A timer mutation queue alone cannot reject a delayed Chrome completion from an older Work after a new Work starts in the same mode. Completion payloads need a dedicated cycle identity.
- Firefox headless alarm delivery for an already-expired target can vary by roughly ten seconds. Runtime acceptance must poll the resulting timer state within a bounded window instead of assuming sub-second alarm delivery.
- A first deletion assertion used `no-task` instead of the real `task-no-task` id and produced a false positive. Re-running against the actual stored id confirmed that the queued mutation removes both the aggregate and raw events.
- QA found that the Chrome offscreen tick still wrote TimerState across an await. A stale tick could therefore overwrite Reset or a newer cycle even though the background cycle guard protected statistics. Exact-once event logic alone was not enough to protect timer state or completion audio.
- A paused legacy v2 Work has no trustworthy original start timestamp. Assigning the resume click time would fabricate history, so the null start must survive Resume and reach the duration-based completion fallback.
- Donation and Pro purchase are separate concepts. A donation must not silently grant Pro and a failed donation provider must not affect licensed users.
- lava.top publicly documents donations, digital products, subscriptions, webhooks, API-key authentication, Russian-card/SBP payouts, and international payments. It still requires real operational verification and may change its availability or terms.
- A payment provider webhook can be retried. The backend must be idempotent and treat provider invoice or contract ids as unique events.
- Refund and chargeback handling is mandatory. A lifetime entitlement cannot remain permanently valid after a verified refund unless that is an explicit business decision.

## Decision Log

- Keep the current free product free. Do not move existing timer, task, app-window, chart, basic sound, or JSON backup functionality behind Pro.
- Ship one-time `Lifetime Pro` first. Defer subscriptions until purchase conversion, support load, refunds, and provider reliability are known.
- Donations do not grant entitlements in v1.2.0.
- Use one `FocusMode` entity. Tasks may reference a mode id but must not copy mode settings.
- Apply mode edits only to the next timer cycle. A running or paused cycle uses a snapshot captured at start.
- Free users receive built-in modes and one editable custom mode. Pro unlocks unlimited custom modes and task-to-mode binding.
- Focus Review, goals, previous-period comparison, and reports are Pro. The existing statistics list and chart remain Free.
- Do not promise best focus windows until timestamped session events exist and minimum sample thresholds are defined.
- Keep payment provider details out of extension code. The extension opens project-controlled HTTPS routes such as `/support` and `/pro`.
- Keep provider API keys and entitlement signing keys only in the backend secret store.
- Use asymmetric signatures for offline entitlements. The backend holds the private key; the extension contains only the public verification key.
- Do not include raw license keys or cached entitlements in JSON backup exports.
- A license outage must fail open for already validated users during a grace period and fail closed only for new activation or renewal of an expired cache. Free features always remain available.
- Do not enable monetization UI until legal copy, privacy disclosure, support contact, refund instructions, and provider tests are complete.
- Prefer ordinary HTTPS requests governed by CORS so license activation does not require permanent host access. The licensing API must support `moz-extension://` callers, preflight requests, and credential-free activation. If signed-build testing proves that a permission is required, request only the licensing API origin through `optional_host_permissions` when the user chooses `Activate Pro`; never request broad host access.
- Keep Firefox focus music background-owned and reconcile it through one coalescing worker with an audio-specific generation counter. Every asynchronous `play()` and Stream callback must reject stale generations.
- Allow focus music only for an enabled, running, unpaused Work timer whose `targetEndTime` is present and still in the future. Completion audio priming remains independent from optional focus music.
- Treat focus-music playback failures and timeouts as non-fatal. They may log a bounded warning, but they must never fail timer start, popup initialization, statistics, notifications, or JSON recovery.
- Transfer per-audio ownership when a newer generation adopts an already-playing element. Timeout and stale cleanup may dispose or reset only elements still owned by their captured generation.
- Add `cycleStartedAt` to persisted timer state. New cycles capture the user-provided start time, Pause preserves it, Resume reuses it, and Reset or a ready next mode clears it. Auto-started breaks capture their automatic start time.
- Do not synthesize SessionEvents from legacy aggregate statistics. Migration creates canonical built-in modes plus an empty event log and uses a duration-based start fallback only if a work cycle that began before storage v3 completes after migration.
- Write the aggregate statistic, SessionEvent, tasks, and next timer state in one storage update. Serialize Chrome and Firefox completion mutations so duplicate messages observe the already-transitioned timer and cannot append twice.
- Use stable built-in Focus Mode ids and timestamps so repeated normalization is idempotent. Canonical built-ins cannot be overridden by imported data; custom modes remain normalized and portable.
- Persist a stable `cycleId` with every active cycle and carry it through Chrome offscreen completion payloads. Completion requires both mode and cycle id to match; Pause/Resume preserves identity, while Reset, Stop, Skip, and ready states clear it.
- Capture one `completedAt` and one duration per Work completion and use them for both aggregate statistics and the SessionEvent so midnight cannot split the two records across dates.
- Route task-statistics deletion through the platform background queue. Delete the aggregate and matching raw events in one storage write and return both collections to the UI store.
- Keep Chrome TimerState background-owned. The offscreen document only schedules expiry and sends a cycle-scoped completion request; it never writes timer storage.
- Play the Chrome completion chime only after the serialized background handler confirms that the requested cycle was accepted and transitioned. A rejected stale completion remains silent.
- Preserve `cycleStartedAt: null` when resuming a migrated paused cycle. Generate a new cycle id for identity, but use the duration-based event start fallback when that legacy Work completes.

## Outcomes & Retrospective

Phase 0 implementation, static concurrency review, automated Firefox runtime verification, QA-Agent approval, and the scoped baseline commit are complete. The Firefox runtime has one background-owned focus-music reconciler and no UI-owned player, while layout styles, storage schema, permissions, donation configuration, entitlements, feature gates, and Focus Modes remain unchanged. Diff, TypeScript, Firefox build, popup load, timer/music state transitions, rapid pause stress, app-window de-duplication, exact-once completion, notification count, and legacy normalization checks pass without extension console errors. `web-ext lint`, subjective full-length Stream continuity, and UI-driven JSON file-picker flows remain documented manual release risks; they do not block subsequent Phase 1 planning.

Phase 1 implementation, automated verification, and QA-Agent review are complete. Storage v3 preserves legacy user data, installs canonical built-in Focus Modes without changing current settings, and records new completed Work cycles as exact-once SessionEvents alongside the existing aggregates. Cycle identity rejects stale Chrome completion messages; Pause/Resume preserves the original start; ready, Reset, Skip, Break, and Rest transitions clear identity as appropriate. Chrome background is the only TimerState writer, while offscreen only schedules expiry and plays a chime after acknowledged completion. JSON round-trips modes and events while imports force a safe idle timer. No layout, CSS, permission, donation, entitlement, feature-gate, or Focus Mode UI change is part of this phase. Firefox runtime validation passed; Chrome received static, TypeScript, build, and independent QA coverage, with live Chrome runtime remaining a non-blocking follow-up risk.

## Context and Orientation

Current relevant files:

- `manifest.firefox.ts`: Firefox metadata, permissions, and version.
- `src/App.tsx`: compact popup and large workspace composition; contains the disabled support entry.
- `src/lib/constants.ts`: currently contains `DONATION_URL = ''`.
- `src/lib/types.ts`: persisted settings, timer state, task and statistics contracts.
- `src/lib/storage.ts`: normalization, migrations, import/export, statistics writes.
- `src/store/useAppStore.ts`: shared UI state and storage/runtime orchestration.
- `src/background-firefox.ts`: timer runtime, notifications, background focus music, and app-window ownership.
- `src/components/TasksScreen.tsx`: active/archive task management.
- `src/components/StatsScreen.tsx`: existing Free statistics list and chart entry.
- `src/components/StatsJournalChart.tsx`: current activity chart.
- `docs/privacy/index.md`: public privacy policy.
- `docs/amo/reviewer-note.md`: AMO reviewer architecture notes.
- `docs/pro-roadmap.md`: product-level monetization decisions.
- `EXECPLAN-storage-migrations.md`: existing storage migration rules.

Terms used in this plan:

- `FocusMode`: reusable timer, sound, goal, notification, and display settings.
- `SessionEvent`: one completed work session with task, timestamps, duration, and mode snapshot metadata.
- `Entitlement`: signed statement that a license has Pro access until a specified verification time.
- `License key`: user-facing activation secret. Store only a one-way hash on the server.
- `Grace period`: time during which an already verified entitlement remains usable if the licensing service is unavailable.
- `Feature gate`: one centralized function deciding whether a capability is available for the current tier.

## Plan of Work

Implementation is split into seven independently releasable phases. Do not begin a later payment phase to unblock an unfinished data or product phase.

### Phase 0: Stabilize the Free Baseline

Finish and manually verify pending v1.1.x runtime changes before adding schemas or gates:

- compact-popup focus music with the large window closed;
- no duplicate audio when both surfaces are open;
- timer start/pause/stop and completion statistics;
- popup reopen and app-window de-duplication;
- JSON export/import and old-data migration.

Commit this baseline separately. Monetization work must not hide unrelated regressions.

### Phase 1: Add Product Data Without Gating

Add platform-neutral types:

```ts
type PlanTier = 'free' | 'pro';

type FocusNotificationMode = 'normal' | 'soft' | 'sound-only';

interface FocusMode {
  id: string;
  title: string;
  workMinutes: number;
  shortBreakMinutes: number;
  longRestMinutes: number;
  cyclesBeforeRest: number;
  autoStartBreaks: boolean;
  soundTrack: FocusMusicTrack | 'none';
  soundVolume: number;
  sessionGoal: number | null;
  notificationMode: FocusNotificationMode;
  accent: string | null;
  builtIn: boolean;
  createdAt: number;
  updatedAt: number;
}

interface SessionEvent {
  id: string;
  taskId: string;
  taskTitleSnapshot: string;
  focusModeId: string | null;
  startedAt: number;
  completedAt: number;
  durationSeconds: number;
}
```

Extend `Task` with `focusModeId?: string | null`. Add `focusModes` and `sessionEvents` to persisted storage with a new storage version.

Migration requirements:

- preserve every current task, archived flag, timer state, statistic, theme, and setting;
- create built-in modes without changing the user's current settings;
- never synthesize fake timestamps for old aggregate statistics;
- old aggregates remain visible in Free statistics and total reports;
- new timestamp-based insights explicitly use only the event-log coverage period;
- include modes and session events in JSON backup/import;
- exclude license and entitlement secrets from export.

Add a retention limit only after measuring storage size. If needed, cap raw events by age or count while retaining daily aggregates.

### Phase 2: Implement Focus Modes

Built-in modes:

- `Classic`: 25/5/15, four cycles, current notification defaults;
- `Deep Work`: 50/10/20, two cycles, stream at low volume;
- `Writing Sprint`: 25/5/15, four cycles, clock or silence;
- `Study`: 30/5/15, four cycles, birds, auto-start breaks;
- `Quick Admin`: 15/3/10, four cycles, no focus sound.

UX:

- add a compact mode selector near timer settings in the large workspace;
- keep manual timer settings available;
- allow saving the current settings as a custom mode;
- show the selected mode on task cards only when a task binding exists;
- snapshot the applied mode when a cycle starts;
- editing, deleting, or rebinding a mode never mutates the active cycle;
- deleting a custom mode changes bound tasks to `Default`, preserving tasks and history.

Initially ship this phase without Pro restrictions. Use it to validate the domain model before monetization.

### Phase 3: Implement Focus Review and Reports

Focus Review Pro modules:

- total focus and completed sessions;
- previous equivalent period comparison;
- strongest day;
- strongest task;
- daily and weekly goal progress;
- consistency streak with a documented rule;
- task distribution and period-over-period change;
- best two-hour focus window only with at least 10 timestamped sessions across at least 4 distinct days.

Sparse-data behavior:

- show `Not enough data yet` below thresholds;
- show the event-log coverage date;
- never mix inferred timestamps from legacy aggregates with real session-event timestamps;
- let users inspect the formula in a small explanatory tooltip.

Reports:

- CSV: one row per `SessionEvent`, with ISO timestamps, task snapshot, duration, and mode;
- Markdown: weekly summary, totals, comparison, task ranking, goals, and coverage note;
- no PDF in v1.2.0.

### Phase 4: Add Feature Gates Without Real Payments

Create one feature registry:

```ts
type ProFeature =
  | 'unlimitedFocusModes'
  | 'taskModeBinding'
  | 'focusReview'
  | 'goals'
  | 'csvReports'
  | 'markdownReports';

interface AccessContext {
  tier: PlanTier;
  entitlementStatus: 'none' | 'valid' | 'grace' | 'expired' | 'revoked';
}
```

Provide `canUseFeature(feature, context)` and use it everywhere. Do not scatter `tier === 'pro'` conditions through components.

Add a development-only entitlement simulator that is removed from production builds. QA must test Free, Pro, grace, expired, and revoked states before payment integration.

Downgrade rules:

- existing custom modes remain visible and exportable;
- Free can select and use the designated free custom mode;
- extra modes become read-only until Pro is restored or the user deletes down to the Free limit;
- historical Focus Review data is never deleted;
- reports created previously remain user files;
- no timer or task action is blocked because entitlement refresh failed.

### Phase 5: Donations

Create project-controlled pages:

- `/support`: explains voluntary support and links to the verified provider donation page;
- `/pro`: explains Lifetime Pro, feature boundary, price, refund route, support email, privacy, and activation flow.

Extension configuration:

```ts
interface ExternalCommerceConfig {
  supportUrl: string | null;
  proUrl: string | null;
}
```

Rules:

- empty URL hides or disables the entry safely;
- open only after explicit click;
- use `noopener,noreferrer`;
- do not append task names, statistics, installation ids, locale history, or tracking parameters;
- donation success does not modify `PlanTier`;
- add support entry to the large workspace and settings; keep compact-popup placement subtle.

Commercial defaults for the launch experiment:

- donation presets are provider-page configuration, not extension code;
- suggested international presets: USD-equivalent `3`, `7`, and `15`;
- suggested Russian presets: `199`, `499`, and `999` RUB if regional pages are supported;
- suggested Lifetime Pro launch price: USD-equivalent `14.99`, with a separately configured `990 RUB` regional offer if operationally supported;
- project pages show the real settlement currency, taxes, support contact, and refund route before checkout;
- changing a price must never require an extension update.

Provider operational gate:

1. Complete real creator registration and KYC.
2. Create a donation page and a Lifetime Pro digital product.
3. Test one domestic donation and one foreign-card payment.
4. Test a refund and inspect webhook behavior.
5. Test payout to the intended Russian card or SBP route.
6. Save receipts, fees, settlement currency, payout limits, and support contacts in a private operations note outside the repository.
7. Confirm the product type permits software access/license delivery.

If any step fails, keep URLs disabled and continue shipping Free product improvements.

### Phase 6: Lifetime Pro Licensing Service

Do not place provider API keys or private signing keys in the extension.

Recommended external flow:

1. User clicks `Get Lifetime Pro` and opens the project purchase page.
2. The purchase page creates a random checkout nonce through the licensing backend.
3. The backend creates or associates the external provider invoice and stores only required purchase metadata.
4. The provider sends a signed/authenticated webhook after successful payment.
5. The webhook handler verifies authentication, checks product id and amount, and processes the invoice idempotently.
6. The success page displays a generated license key after verified payment.
7. User pastes the license key into the extension activation dialog.
8. The extension sends the key to `/v1/licenses/activate` over HTTPS.
9. The backend returns a signed entitlement. The extension verifies it using an embedded public key and caches it locally.

Network-permission strategy:

- first implementation uses a credential-free `fetch` from an extension page and a narrowly configured backend CORS policy;
- activation sends only the license key, extension version, entitlement format version, and a fresh request nonce;
- no cookies, browser history, task names, statistics, installation id, or hardware fingerprint are sent;
- verify this path in both temporary and AMO-signed Firefox builds because extension origins differ;
- only if direct CORS fails, declare the exact API origin in `optional_host_permissions` and request it after an explanatory user action;
- denial of optional permission leaves Free fully usable and lets the user retry activation later.

Minimal backend records:

```ts
interface LicenseRecord {
  id: string;
  licenseHash: string;
  provider: string;
  providerPurchaseId: string;
  productId: string;
  status: 'active' | 'refunded' | 'chargeback' | 'revoked';
  createdAt: number;
  updatedAt: number;
}

interface SignedEntitlementPayload {
  version: 1;
  licenseId: string;
  tier: 'pro';
  issuedAt: number;
  refreshAfter: number;
  graceUntil: number;
  statusVersion: number;
}
```

Security requirements:

- hash license keys with a slow password hash or keyed HMAC appropriate to random high-entropy keys;
- compare secrets in constant time;
- rate-limit activation and status endpoints;
- never log full license keys;
- validate webhook authentication and exact product id;
- make webhook processing idempotent by provider purchase id and event type;
- store secrets only in the backend environment;
- use asymmetric entitlement signatures;
- add key rotation metadata;
- support refund, chargeback, manual revoke, and replacement-key operations;
- return generic activation errors that do not reveal whether a specific key exists;
- include a documented deletion/support process for payment-linked data.

Offline policy for Lifetime Pro:

- entitlement refresh target: 30 days;
- offline grace period after refresh target: 14 additional days;
- timer and Free features always work;
- during grace, Pro remains available and UI shows a non-blocking refresh notice;
- after grace, Pro editing/creation locks, but Pro-created data remains visible and exportable;
- a permanent offline entitlement is deferred because refunds and chargebacks must be enforceable.

Activation UX:

- `Activate Pro` dialog accepts a license key;
- `Restore purchase` uses the same key; no account is required;
- show tier, last verification date, next refresh date, and support link;
- provide `Deactivate on this device`, which clears only the local entitlement;
- do not bind the first version to hardware fingerprints;
- do not silently collect email or device identifiers from the extension.

### Phase 7: Compliance and Release

Before release update:

- AMO listing: disclose that enhanced optional features require a separate external purchase;
- privacy policy: document license activation requests, fields sent, backend retention, and payment provider boundary;
- reviewer notes: explain external links, entitlement verification, no card handling, no remote code, and whether activation uses CORS alone or a narrowly scoped optional host permission;
- data collection declaration: reassess because license activation is network communication even if the extension sends only a license key;
- source submission: include reproducible build steps and public-key/config generation notes without secrets;
- support/refund page: publish working contact and process;
- release notes: list Pro additions without implying current Free features were removed.

Do not mark `data_collection_permissions: none` without re-evaluating the exact activation payload and Mozilla definitions.

## Concrete Steps

Run from the repository root:

```powershell
git status --short --branch
npx.cmd tsc --noEmit
npm.cmd run build:firefox
npx.cmd web-ext lint --source-dir dist-firefox
```

Expected baseline:

- TypeScript exits with code 0.
- Firefox build completes and produces `dist-firefox/manifest.json`.
- Lint has no blocking errors; every warning is recorded in the release checklist.

Suggested implementation commits:

1. `fix(firefox): persist focus music without app window`
2. `feat(storage): add focus modes and session events`
3. `feat(focus): add reusable focus modes`
4. `feat(analytics): add focus review and goals`
5. `feat(reports): add csv and markdown exports`
6. `feat(pro): add centralized feature gates`
7. `feat(donations): add external support entry`
8. `feat(licensing): add lifetime pro activation`
9. `docs(amo): document v1.2 monetization`

Each commit must build independently. Storage and runtime commits require QA-Agent review before continuing.

## Validation and Acceptance

### Free regression

- Updating from the latest published version preserves tasks, archives, statistics, theme, settings, timer state, and selected task.
- Work, break, rest, auto-start, pause, stop, skip, notifications, completion sound, and focus music still work.
- Popup close/reopen and app-window open/focus behavior remain correct.
- Free users can create tasks, view current list/chart statistics, use three sounds, and export/import JSON.
- No payment or licensing outage affects Free flows.

### Focus Modes

- Built-in modes cannot be accidentally deleted.
- A custom mode can be created, edited, duplicated, and deleted.
- A running cycle does not change when its mode is edited.
- Task binding applies on the next cycle and is visible in both UI surfaces.
- Deleting a mode safely unbinds tasks.
- Import/export preserves modes and bindings.

### Analytics and reports

- New completed work sessions create exactly one `SessionEvent` and increment existing aggregates exactly once.
- Pause/resume and popup reopen do not duplicate events.
- Previous-period comparisons use equal-duration ranges.
- Best-window insight stays hidden below its sample threshold.
- CSV opens correctly in common spreadsheet software and uses unambiguous ISO timestamps.
- Markdown report is readable in English and Russian.

### Donations

- Support link opens only after click and never changes entitlement.
- Empty or invalid config produces no dead clickable control.
- No payment-provider network request occurs in the background.

### Licensing

- Valid key activates Pro and returns a verifiable signed entitlement.
- Invalid, malformed, rate-limited, refunded, and revoked keys fail safely.
- Network loss during activation does not corrupt storage.
- Valid cached Pro works offline through the documented grace period.
- Expired access makes extra modes read-only but preserves all user data.
- JSON export excludes license key and entitlement token.
- Reinstall plus license-key activation restores Pro without restoring user data automatically.
- Webhook replay does not create multiple licenses.
- Refund/chargeback updates entitlement status after the next refresh.

### UI and accessibility

- Free and Pro labels are clear in Russian and English.
- Locked controls explain the benefit and never impersonate disabled core functionality.
- Keyboard navigation, focus rings, dialogs, tooltips, and narrow-window layout are checked.
- No purchase nag appears during a running timer or immediately after completion.
- Donation and Pro calls-to-action are visible but secondary to timer controls.

### Release gates

- Payment provider operational test is complete.
- Licensing backend security review is complete.
- Privacy and AMO disclosures are live before the extension update.
- QA-Agent has verified storage migration, runtime continuity, entitlement states, and downgrade behavior.
- Production package contains no mock data, API keys, private keys, or development entitlement switches.

## Idempotence and Recovery

- Every storage migration checks the stored version and can run once without deleting unknown fields.
- Before migration, preserve the existing migration backup mechanism.
- Payment webhooks are idempotent; replaying an event returns success without duplicating a license.
- Feature gates can be disabled with configuration while leaving all stored Pro data intact.
- If licensing service deployment fails, ship Focus Modes and Focus Review as ungated beta or keep Pro UI hidden; do not block the Firefox release.
- If provider availability changes, update only project-controlled `/support` and `/pro` routes and backend adapters, not the extension checkout logic.
- If a signing key is compromised, rotate the backend key, ship the new public key set, and reissue entitlements; support multiple key ids during transition.
- User recovery remains JSON backup/import for productivity data and license-key reactivation for Pro access.

## Artifacts and Notes

Planned repository artifacts:

- `src/lib/focusModes.ts`
- `src/lib/features.ts`
- `src/lib/entitlements.ts`
- `src/lib/externalCommerce.ts`
- `src/components/FocusModePicker.tsx`
- `src/components/FocusModeEditor.tsx`
- `src/components/FocusReview.tsx`
- `src/components/ProActivationModal.tsx`
- `src/components/ProUpsellModal.tsx`
- `docs/amo/v1.2-reviewer-note.md`
- `docs/privacy/index.md` updates
- `docs/operations/payment-provider-checklist.md.example` containing no private operational data

External non-repository artifacts:

- project-controlled `/support` page;
- project-controlled `/pro` purchase and activation page;
- licensing API and database;
- provider product and donation pages;
- private provider/KYC/payout operations record.

Official references to re-check at implementation and release time:

- Mozilla monetization guidance: `https://extensionworkshop.com/documentation/publish/make-money-from-browser-extensions/`
- Mozilla Add-on Policies: `https://extensionworkshop.com/documentation/publish/add-on-policies/`
- Mozilla host-permission reference: `https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions`
- Mozilla optional host-permission reference: `https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_host_permissions`
- lava.top public product/payment page: `https://lava.top/ru`
- lava.top developer API/webhook documentation: `https://developers.lava.top/en`
- lava.top creator payout documentation: `https://lava.top/wiki/finances/for-creators`

Provider availability and legal/tax obligations are operational facts, not permanent technical facts. Re-check them before enabling production URLs.

## Interfaces and Dependencies

No permanent Firefox host permission is expected if the licensing API passes the signed-build CORS test. If it does not, use only `optional_host_permissions` for the exact API origin and request it at activation time. Reassess and document the final behavior rather than adding broad permissions preemptively.

Extension interfaces:

```ts
interface ExternalCommerceConfig {
  supportUrl: string | null;
  proUrl: string | null;
  licensingApiBaseUrl: string | null;
  entitlementPublicKeys: Record<string, string>;
}

interface EntitlementState {
  tier: 'free' | 'pro';
  status: 'none' | 'valid' | 'grace' | 'expired' | 'revoked';
  token: string | null;
  verifiedAt: number | null;
  refreshAfter: number | null;
  graceUntil: number | null;
}
```

Backend endpoints:

```text
POST /v1/checkout/session
POST /v1/webhooks/provider
POST /v1/licenses/activate
POST /v1/licenses/refresh
POST /v1/licenses/deactivate
GET  /v1/health
```

The extension must not call provider APIs directly. The provider adapter belongs only in the backend.

Revision note 2026-07-11: Created a decision-complete v1.2.0 plan that separates donations from Lifetime Pro, consolidates paid features around Focus Modes and Focus Review, defines a Russia-aware external payment candidate, and specifies storage, licensing, offline, downgrade, security, compliance, and QA requirements.

Revision note 2026-07-11: Added launch pricing defaults and corrected the Firefox network-permission strategy after checking Mozilla's current host-permission documentation. Activation should use credential-free CORS first, with an exact-origin optional permission only as a tested fallback.

Revision note 2026-07-11 14:30 +04:00: Updated the living plan with the actual Phase 0 focus-music race findings, the single background reconciler decision, completed static checks, and the remaining Firefox/QA/commit gates.

Revision note 2026-07-11 14:39 +04:00: Recorded the per-audio ownership fix, successful Firefox build, QA-Agent static approval, blocked optional lint download, and the remaining interactive runtime gate.

Revision note 2026-07-11 21:15 +04:00: Recorded the isolated Firefox 152 WebDriver BiDi runtime evidence and narrowed the remaining manual gate to subjective audio continuity, full Stream looping, and UI-driven JSON file handling.

Revision note 2026-07-11 21:17 +04:00: Recorded final QA-Agent approval for the scoped Phase 0 commit and reclassified subjective Stream continuity, optional lint, and UI file-picker checks as non-blocking manual release risks.

Revision note 2026-07-11 21:17 +04:00: Finalized the Phase 0 outcome after creating the isolated baseline commit; no Phase 1 implementation was started.

Revision note 2026-07-11 21:25 +04:00: Started Phase 1 after auditing migration and runtime completion paths; recorded the cycle-start, exact-once queue, canonical built-in mode, and statistics-deletion decisions before implementation.

Revision note 2026-07-11 21:25 +04:00: Incorporated the QA design challenge by adding cycle identity, shared completion timestamps, and serialized aggregate/event deletion to the Phase 1 contract.

Revision note 2026-07-11 23:59 +04:00: Recorded the completed storage v3 implementation, storage harness, Chrome/Firefox builds, Firefox runtime evidence, successful optional lint, alarm-delay discovery, corrected deletion assertion, and the remaining QA/commit gate.

Revision note 2026-07-12 00:53 +04:00: Recorded QA's offscreen stale-write and legacy paused-start findings, the background-owned Chrome TimerState decision, acknowledged completion audio, null-start preservation, successful rebuilds, and the pending QA re-review.

Revision note 2026-07-12 00:58 +04:00: Recorded final QA-Agent approval, completed Phase 1 storage/event milestones, fresh successful checks and builds, and the non-blocking absence of a live Chrome runtime pass.
