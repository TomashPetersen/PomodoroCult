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
- [x] 2026-07-12 19:12 +04:00: Audited the Phase 2 repository state and all required living documents before implementation; confirmed branch `codex/firefox-port`, version `1.1.2`, the Phase 0/1 commits, and the four intentional dirty documentation paths.
- [x] 2026-07-12 19:12 +04:00: Defined the Phase 2 persisted selection, effective-mode precedence, manual-settings preservation, active-cycle snapshot, deletion, and no-version-bump contracts before changing product code.
- [x] 2026-07-12 19:12 +04:00: Sent the documented Phase 2 contracts to QA-Agent for pre-implementation challenge review.
- [x] 2026-07-12 19:20 +04:00: QA-Agent completed the first Phase 2 challenge review with `CHANGES REQUIRED`; the design was tightened around authoritative resolution, ready-Break snapshot retention, legacy snapshot persistence, serialized mutations, and snapshot-owned runtime behavior.
- [x] 2026-07-12 19:22 +04:00: QA-Agent re-reviewed the corrected Phase 2 contract and returned `DESIGN APPROVE` before implementation.
- [x] 2026-07-12 19:35 +04:00: Implemented the shared Focus Mode domain, additive storage-v3 selection/manual/snapshot normalization, serialized Chrome/Firefox mutations, snapshot-owned runtime completion/audio behavior, and scheduler-only Chrome resume payload.
- [x] 2026-07-12 19:35 +04:00: Implemented the large-window selector and accessible custom-mode manager, task binding/badges, popup effective-duration resolution, English/Russian strings, and reduced-motion fallback without gates, limits, permissions, dependencies, or version changes.
- [x] 2026-07-12 19:35 +04:00: Phase 2 TypeScript and domain/migration harness pass. The harness covers v0/v1/v2/v3 defaults, canonical/duplicate modes, CRUD, precedence, archive/binding, atomic deletion output, legacy paused snapshot/idempotence, event identity/mode retention, and safe JSON import rejection.
- [x] 2026-07-12 19:35 +04:00: Completed Phase 2 domain/storage/runtime implementation and migration harness.
- [x] 2026-07-12 19:49 +04:00: Chrome and Firefox production builds pass; `web-ext lint` reports 0 errors, 0 notices, and the same four generated/manifest-compatibility warnings.
- [x] 2026-07-12 19:49 +04:00: Firefox 152.0.5 isolated-profile runtime passed UI create/apply/bind, task-over-global precedence, Pause/Resume, edit/delete isolation, ready-Break snapshot retention, exact-once Work event, no Break event, popup/app reopen synchronization, and zero browser-console errors.
- [x] 2026-07-12 19:49 +04:00: Visual smoke passed at 400x600 popup, 1040x760 app window/editor, and 1440x900 maximized app window in light/dark and English/Russian; selector, modal scrolling, task badge/select, timer controls, and keyboard Escape remain usable without overlap.
- [x] 2026-07-12 20:27 +04:00: Closed final QA blockers: dangling selection restores manual materialization, Chrome ignores payload duration, all task mutations share the background queue, Phase 1 ready Work unlocks semantically, and the modal traps/restores focus.
- [x] 2026-07-12 20:27 +04:00: Re-ran the augmented migration/domain harness, diff check, TypeScript, both builds, Firefox lint, clean-profile Firefox runtime, keyboard assertions, and refreshed visual smoke; all required gates pass.
- [x] 2026-07-12 20:27 +04:00: QA-Agent completed final diff/runtime review with `APPROVE`; Phase 2 is ready for its isolated commit.
- [x] 2026-07-12 20:51 +04:00: Remediated `SEC-P2-001`, discovered after commit `719fe3e`: popup/app initialization could perform a stale full-storage write outside the authoritative background queue. Final runtime and QA gates closed on 2026-07-13.
- [x] 2026-07-12 21:04 +04:00: Implemented background-only queued initialization, minimal current-v3 repair writes, read-only UI hydration, Chrome expired-cycle readiness completion, and Firefox non-recursive recovery/effects separation.
- [x] 2026-07-12 21:04 +04:00: Phase 2 migration/domain harness and the new deterministic seven-scenario concurrency harness pass; diff check, TypeScript, Chrome build, Firefox build, and Firefox lint pass (0 errors, 0 notices, four existing warnings).
- [x] 2026-07-12 21:04 +04:00: The initially pending Chrome/Firefox runtime and independent QA gates were completed on 2026-07-13 through the dependency-free packaged CDP/BiDi workflow.
- [x] 2026-07-12 21:09 +04:00: QA-Agent independently repeated both harnesses, diff check, TypeScript, and both builds; no code defect was found, but verdict is `CHANGES REQUIRED` until live Chrome/Firefox lifecycle smoke passes.
- [x] 2026-07-12 21:09 +04:00: The temporary escalation-limit blocker cleared; the dependency-free Chrome CDP + Firefox WebDriver BiDi harness later ran against both packaged builds and passed.
- [x] 2026-07-13 00:07 +04:00: Packaged Chromium runtime passed zero-write readiness, popup reopen, running continuity, mode/task persistence, exact-once completion with the correct mode id, one acknowledged chime, and silent stale completion.
- [x] 2026-07-13 00:07 +04:00: Packaged Firefox runtime passed popup/app reopen, zero-write readiness, running continuity, mode/task persistence, concurrent readiness exact-once completion, and no deadlock; the single effects pipeline took 12,695 ms.
- [x] 2026-07-13 00:07 +04:00: QA-Agent independently repeated diff review, both harnesses, diff check, TypeScript, both builds, and lint, then returned final `APPROVE` for `SEC-P2-001`.
- [x] 2026-07-13 20:37 +04:00: Audited the remaining Phase 2 Focus Music blocker against `b7d2efa`, `719fe3e`, and `870a5e4`; confirmed that direct controls still save manual settings but Firefox playback rematerializes the immutable pre-edit snapshot.
- [x] 2026-07-13 20:37 +04:00: Implemented a typed `SAVE_FOCUS_MUSIC_SETTINGS` background mutation, audio-only active-Work snapshot replacement, active-snapshot UI resolution, immediate Firefox reconciliation, and stop/reset invalidation without schema, permission, manifest, version, layout, CSS, monetization, or Phase 3 changes.
- [x] 2026-07-13 20:37 +04:00: Focus Music deterministic harness passes all 15 required scenarios; Phase 2 domain/migration and seven-case storage concurrency harnesses, diff check, TypeScript, and both production builds also pass.
- [x] 2026-07-13 20:37 +04:00: The initially pending packaged Firefox runtime/audio, screenshot, and independent-QA gates were completed on 2026-07-13 at 22:35 +04:00. `web-ext` remained unavailable and was not added as a dependency.
- [x] 2026-07-13 21:14 +04:00: Replaced stale full-state UI payloads with atomic background intents (`toggle`, `set-enabled`, `set-track`, `set-volume`), so rapid controls from popup/app merge against authoritative queued state. Repeated all harnesses, diff check, TypeScript, and both builds successfully.
- [x] 2026-07-13 21:14 +04:00: The earlier QA-Agent `CHANGES REQUIRED` verdict was superseded after real packaged Firefox evidence and screenshots became available; no user Firefox process was terminated.
- [x] 2026-07-13 22:28 +04:00: After the user closed Firefox, packaged Firefox 152.0.5 completed the full background-audio smoke: Stream/Birds/Clock, immediate Off/On, volume without restart, pending-play invalidation, rapid toggles, Pause/Resume, popup/app reopen, exact-once statistics/SessionEvent, and one completion chime all passed.
- [x] 2026-07-13 22:28 +04:00: Firefox visual smoke captured and inspected six external screenshots covering popup 400×600, normal app 1100×760, maximized app 1440×900, English/Russian, and light/dark. DOM assertions found no horizontal or critical-control overflow; visual inspection found no new clipping or overlap regression.
- [x] 2026-07-13 22:35 +04:00: QA-Agent independently reviewed the full diff, production hashes, runtime report, six screenshots, all three harnesses, TypeScript, and both builds, then returned final `APPROVE`. Native notification delivery remains indirectly observed in headless Firefox; `web-ext` remains unavailable and is not claimed as PASS.
- [x] 2026-07-13 22:35 +04:00: Packaged runtime/visual evidence and independent `APPROVE` restore Phase 2 approval; the isolated Focus Music fix is ready to commit.
- [x] 2026-07-11 21:17 +04:00: Baseline v1.1.x runtime fixes passed static, automated Firefox, and QA-Agent verification and were included in the isolated Phase 0 commit.
- [ ] 2026-07-11: Pending — Free/Pro product boundary approved.
- [x] 2026-07-12: Storage schema v3 and migration design implemented and tested.
- [x] 2026-07-12: Session event log implemented and populated exactly once for new completed Work sessions.
- [x] 2026-07-12 20:27 +04:00: Focus Modes implemented and verified without a paywall, limit, entitlement, donation, or monetization code.
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
- Phase 1 persisted mode records and task references but no explicit global selection. Inferring selection by comparing live `Settings` with a mode would be ambiguous after imports, manual edits, or duplicate configurations.
- Applying a mode directly to the only persisted `Settings` object would destroy the user's previous manual configuration. Phase 2 therefore needs a small, separately persisted manual-settings baseline even though effective settings remain available for legacy UI compatibility.
- Firefox focus music currently reconciles from live `Settings`; without a cycle snapshot, changing a mode or global selection during Work could change the active track or volume even if timer duration remained stable.
- A ready Break/Rest is still part of the Work cycle chain even when auto-start is disabled. Clearing its snapshot at Work completion would let a later edit/delete/rebind change the manually started break.
- A UI-side `storage.local.set()` is not an atomic read-modify-write operation relative to background completion. Focus Mode CRUD, binding, selection, and especially deletion must share the authoritative timer operation queue to prevent lost task or selection updates.
- Normalizing a legacy active v3 timer to an in-memory snapshot is insufficient if startup does not persist the result. Firefox startup must initialize/persist normalized storage before settings can be edited.
- The existing `isResumingPausedTimer()` compared remaining duration with live settings. Once task/global modes and editable records exist, that comparison is not stable; runtime Resume now keys off persisted pause state, cycle identity, and snapshot instead.
- Chrome offscreen resume previously rebuilt `statSeconds` from live settings. It now reads only the persisted cycle snapshot and remains unable to choose or mutate a mode.
- Firefox BiDi screenshots can capture the compositor before theme transitions settle even after the DOM class changes. The visual harness now waits for the rendered theme before capture; computed styles and final light/dark screenshots match.
- A queued Focus Mode deletion was still vulnerable to a later stale full-task-array write from popup or app-window task actions. Final QA moved select/add/edit/delete/archive/restore into the same background queue, eliminating the lost-update path on both platforms.
- Phase 1 could persist a completed-Break ready Work with `cycleStarted: true` and no cycle identity. Phase 2 normalization must recognize that semantic ready state and clear its lock/snapshot while still preserving genuinely paused Work.
- Chrome offscreen previously responded `ignored` to unrelated runtime messages, which could race the authoritative background response. It now returns `false` immediately for every non-offscreen message.
- Commit `719fe3e` still lets disposable UI contexts call `initializeStorage()` before background readiness. Because its storage read and full write straddle asynchronous extension contexts, queued completion or domain mutations can be overwritten even though each mutation is individually serialized.
- Queueing Firefox's existing `resumeRunningTimer()` unchanged would deadlock when it observes an expired timer, because that path calls `completeExpiredTimer()`, which enqueues again and waits for the queue currently executing initialization.
- Snapshot ownership and direct-control ownership are distinct. Treating every snapshot field as permanently immutable protects mode edits, but it also makes an explicit user Off/On, track, or volume command appear to succeed in storage while the background player immediately restores the old snapshot audio.
- A task-bound Focus Mode is intentionally not materialized into top-level compatibility `settings`. Therefore both Focus Music UI surfaces must resolve the active Work snapshot for display and for partial direct-control payloads; otherwise the UI can show Manual audio while Firefox is correctly playing task-bound audio.
- Building a direct audio payload from the full active snapshot would overwrite the user's saved manual durations with task-bound or globally selected mode durations. The authoritative mutation now copies only enabled/track/volume into `manualSettings` and preserves every manual timer field.
- Composing a full enabled/track/volume payload in each UI document leaves rapid clicks vulnerable to stale Zustand state and lets popup/app commands clobber each other. Atomic intent messages must be merged with the latest snapshot inside the background queue.
- Firefox startup failures were environmental rather than product failures: Node-owned `%TEMP%` profiles and a PowerShell launcher that stopped only its parent PID left child headless processes behind. A clean external QA profile, explicit BiDi readiness, and cleanup filtered by the exact QA profile/port produced stable packaged runtime and visual evidence without touching user Firefox state.
- Firefox cross-compartment functions injected from a popup become `dead object` after that popup closes. Runtime instrumentation therefore belongs in a temporary script added only to the external copied package's background page; it never enters the production bundle or repository diff.
- Headless Firefox exposed one completion-chime play but did not expose a native notification event or active notification object. Exact-once completion and the notification code path remain covered, but native delivery is an explicit observation limit rather than a claimed direct PASS.
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
- Represent `Default / Manual` explicitly as `selectedFocusModeId: null`; persist a real mode id only for an explicit global selection. Never infer selection solely by comparing `Settings` with a `FocusMode` record.
- Preserve the user's last manual configuration in a normalized `manualSettings` top-level field. Applying a global mode updates effective `settings` but not `manualSettings`; returning to Default restores `manualSettings`. A manual timer or focus-music edit updates both fields and clears the global selection.
- Resolve the next Work cycle in one shared helper with this precedence: the selected ordinary task's valid `focusModeId`, then the valid global `selectedFocusModeId`, then `manualSettings`. Selecting a global mode never mutates task binding, and No Task can never hold a persistent binding.
- Capture an `activeCycleSnapshot` when a new cycle starts. The snapshot contains the applied mode id, all three durations, cycles-before-rest, auto-start preference, focus track/none, volume, and notification mode. Pause/Resume preserves it; Work completion and an auto-started Break/Rest reuse it; Reset, Stop, Skip-to-ready-Work, and completed Break/Rest ready transitions clear it.
- Use the Work snapshot's `appliedFocusModeId` for `SessionEvent.focusModeId`. Editing, deleting, or rebinding a mode after start cannot change the snapshot or historical event reference.
- Delete a custom mode with one storage update that removes the mode, clears matching task bindings, clears matching global selection, and leaves SessionEvents and any active snapshot untouched. Built-ins are never editable or deletable.
- Keep storage version 3. The new selection/manual/snapshot fields are additive and normalized from missing values, so v0/v1/v2 and existing v3 data remain backward-compatible without a semantic migration boundary or destructive transform.
- Do not expose `sessionGoal` or `notificationMode` in the Phase 2 editor. Session goals have no product effect before Phase 3, and notification variants do not yet have honest runtime behavior. Preserve normalized values in records/snapshots for forward compatibility, but avoid controls that imply implemented behavior.
- Reject duplicate custom titles case-insensitively and generate custom ids internally. CRUD helpers return explicit validation failures; canonical built-in ids and records always win normalization.
- Treat `manualSettings`, global selection, task binding, and canonical mode records as authoritative inputs. The persisted `settings` object is only a compatibility/materialized representation of the global selection or manual baseline; it never materializes a task override, and background start/completion never trusts it as the effective-mode authority.
- The UI shows active-cycle values from `activeCycleSnapshot` and next-Work values from the shared resolver. Saving the current configuration as a custom mode uses the next-Work preview (including a selected task override), never a hidden active snapshot.
- Keep the Work snapshot on both auto-started and ready Break/Rest states. Manual Break/Rest start and Pause/Resume reuse it. Determine Resume from `isPaused`, cycle identity, and snapshot rather than comparing remaining time with live settings. Completed Break/Rest, Reset/Stop, and Skip clear the snapshot and recalculate ready Work from current task/global/manual precedence.
- For legacy/existing v3 running, paused, or ready Break/Rest state without a snapshot, normalize one from the then-persisted settings and persist it during `initializeStorage`. Chrome and Firefox startup/ensure-ready paths must initialize storage before any editable UI can change settings. Imported timers are always safe idle with `activeCycleSnapshot: null`.
- Serialize create, update, delete, global selection, task binding, and manual-settings mutations through explicit typed runtime messages on the same background operation queue as timer completion. Each handler re-reads normalized storage and writes all affected keys once. UI state follows the authoritative response/storage listener.
- Resolve Firefox running-Work focus music from snapshot track/none and volume. Chrome background derives session duration, event mode id, cycles-before-rest, auto-start, and Break/Rest duration from snapshot; Chrome offscreen continues to carry only the cycle-scoped schedule payload supplied by background and never reconstructs configuration from live settings.
- A language-only settings save updates the language field in both compatibility settings and manual settings without clearing global selection. Changing any mode-controlled duration, cycle, auto-start, track, enabled state, or volume is an explicit manual edit: update the manual baseline and clear global selection.
- Serialize task select/create/edit/delete/archive/restore on the same background queue as Focus Mode mutation and timer completion. Offscreen handles only its four scheduler messages and never responds to UI/domain messages.
- Normalize Phase 1 ready Work (`work`, not running, not paused, no target or cycle id) to `cycleStarted: false` and `activeCycleSnapshot: null`; this state is a new cycle, unlike paused Work or ready Break/Rest.
- Storage initialization and migrations are background-owned operations. Chrome startup/install/readiness and Firefox startup/install/readiness use their platform's same mutation queue; UI hydration sends `POPUP_ENSURE_READY` first and then calls read-only `readStoredData()`.
- Keep storage version 3. Initialization persists a full normalized document plus one migration backup only for a real legacy-version migration; current-version normalization repairs are written as a minimal changed-key patch, and an already-normalized popup/app reopen performs no storage write.
- Firefox initialization/recovery uses one non-enqueueing implementation inside the queue. It returns any accepted expired-cycle completion for post-queue audio/notification work, so neither readiness nor startup recursively enqueues itself.
- Direct Focus Music controls use a dedicated typed background mutation. The mutation preserves the existing manual-edit behavior, including clearing an explicit global selection, and may replace only `activeCycleSnapshot.soundTrack` and `activeCycleSnapshot.soundVolume` while a Work cycle is running or paused. It must not change `appliedFocusModeId`, durations, cycles-before-rest, auto-start, notification mode, cycle identity, task binding, Focus Mode records, statistics, or SessionEvents.
- Keep storage version 3 and add no separate persisted live-override field. The two audio fields already form the cycle-owned playback contract; narrowly replacing them makes direct Off/On, track, and volume changes survive Pause/Resume and UI/runtime reopen while every non-audio snapshot invariant remains immutable. Focus Mode CRUD and selection messages continue to leave the complete active snapshot untouched.
- Direct audio mutation updates only the three audio values in `manualSettings`, clears an explicit global selection as the existing manual-edit contract requires, and materializes that preserved manual baseline into top-level `settings`. It never copies active-mode durations into the manual baseline. Popup, app window, and Firefox reconciliation share `resolveActiveWorkFocusMusicSettings` so task-bound audio is displayed and controlled from the same cycle-owned source.
- UI surfaces send one semantic audio intent, never a reconstructed full audio state. Chrome and Firefox background handlers serialize the intent with timer/domain mutations and merge it against `resolveActiveWorkFocusMusicSettings`; this makes rapid toggles and cross-window track/volume changes atomic without optimistic UI ownership.
- Keep runtime instrumentation outside the repository and production package. The QA copy may prepend a local background-realm script to observe Audio generation, play/pause, volume, completion chime, and late promises, because popup-realm monkeypatches cannot survive the required popup-close scenario.

## Outcomes & Retrospective

Phase 0 implementation, static concurrency review, automated Firefox runtime verification, QA-Agent approval, and the scoped baseline commit are complete. The Firefox runtime has one background-owned focus-music reconciler and no UI-owned player, while layout styles, storage schema, permissions, donation configuration, entitlements, feature gates, and Focus Modes remain unchanged. Diff, TypeScript, Firefox build, popup load, timer/music state transitions, rapid pause stress, app-window de-duplication, exact-once completion, notification count, and legacy normalization checks pass without extension console errors. `web-ext lint`, subjective full-length Stream continuity, and UI-driven JSON file-picker flows remain documented manual release risks; they do not block subsequent Phase 1 planning.

Phase 1 implementation, automated verification, and QA-Agent review are complete. Storage v3 preserves legacy user data, installs canonical built-in Focus Modes without changing current settings, and records new completed Work cycles as exact-once SessionEvents alongside the existing aggregates. Cycle identity rejects stale Chrome completion messages; Pause/Resume preserves the original start; ready, Reset, Skip, Break, and Rest transitions clear identity as appropriate. Chrome background is the only TimerState writer, while offscreen only schedules expiry and plays a chime after acknowledged completion. JSON round-trips modes and events while imports force a safe idle timer. No layout, CSS, permission, donation, entitlement, feature-gate, or Focus Mode UI change is part of this phase. Firefox runtime validation passed; Chrome received static, TypeScript, build, and independent QA coverage, with live Chrome runtime remaining a non-blocking follow-up risk.

Phase 2 was committed as `719fe3e` before a post-commit security review found `SEC-P2-001`: UI initialization could overwrite newer authoritative storage with a stale full snapshot. The remediation is now complete. Initialization/migration is background-owned and serialized, UI hydration is read-only, legacy backup behavior is idempotent, and normalized reopen performs no storage write.

Deterministic interleavings, static gates, both packaged runtimes, and independent QA pass. Chromium supplied direct one-chime/stale-silence evidence. Headless Firefox does not expose native audio/notification events through BiDi cross-compartment wrappers, but exact-once completion, no-deadlock behavior, and the single 12,695 ms effects pipeline were observed; QA accepted this as a non-blocking observation limitation for the storage finding. `SEC-P2-001` is closed. Focus Music remains a separate Phase 2 blocker and Phase 3 has not started.

The final Phase 2 Focus Music blocker is closed. Atomic intents update the manual audio baseline and only the active Work snapshot's audio fields; all deterministic/static/build gates pass. Packaged Firefox confirms the production reconciler's live controls, popup/app continuity, and exact-once completion, while six screenshots confirm unchanged layout across required sizes, themes, and languages. QA-Agent independently returned `APPROVE`. Native notification observability and unavailable optional lint remain explicit non-blocking residual limits.

Across the complete Phase 2 delivery, the augmented domain/migration and concurrency harnesses, Focus Music 15-scenario harness, diff check, TypeScript, both production builds, clean-profile Firefox 152 runtime automation, keyboard checks, and visual checks across popup/normal/maximized surfaces, light/dark themes, and English/Russian pass. QA-Agent verdict is `APPROVE`. No feature gate, count limit, entitlement, donation, dependency, permission, manifest version, or application version was added. Residual non-blocking risks are unavailable current `web-ext` lint, live Chrome runtime coverage for this audio-only follow-up, and native notification observability in headless Firefox; the notification code was not changed by this diff.

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

Phase 2 local-only interfaces extend storage v3 additively:

```ts
interface FocusModeSnapshot {
  appliedFocusModeId: string | null;
  workMinutes: number;
  shortBreakMinutes: number;
  longRestMinutes: number;
  cyclesBeforeRest: number;
  autoStartBreaks: boolean;
  soundTrack: FocusMusicTrack | 'none';
  soundVolume: number;
  notificationMode: FocusNotificationMode;
}

interface StoredData {
  selectedFocusModeId: string | null;
  manualSettings: Settings;
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

Revision note 2026-07-12 19:12 +04:00: Started Phase 2 after the mandatory repository/document audit. Added the explicit Default/global/task selection model, shared precedence, preserved manual baseline, active-cycle snapshot lifecycle, atomic deletion semantics, deferred non-functional editor fields, and the backward-compatible decision to keep storage version 3 before substantial implementation.

Revision note 2026-07-12 19:20 +04:00: Incorporated QA-Agent's first design challenge. Clarified authoritative inputs versus compatibility settings, retained snapshots through ready Break/Rest, required persisted legacy snapshot normalization, moved all mode mutations onto the background queue, made runtime audio/completion snapshot-owned, and defined language-only/manual-edit and Save-current-preview behavior.

Revision note 2026-07-12 19:35 +04:00: Recorded QA design approval and the first complete Phase 2 implementation slice: domain/storage/runtime contracts, large-window UI, task binding, bilingual accessibility strings, successful TypeScript, and a passing migration/domain harness. Build, packaged runtime, visual QA, documentation reconciliation, and final QA remain pending.

Revision note 2026-07-12 19:49 +04:00: Recorded passing Chrome/Firefox builds, Firefox lint, isolated Firefox 152 runtime coverage, final visual evidence for popup/normal/maximized light/dark RU/EN layouts, the compositor-settle discovery, and the remaining final QA/commit gate.

Revision note 2026-07-12 20:27 +04:00: Closed final QA findings around dangling materialization, authoritative duration, stale task writes, legacy ready Work, offscreen message ownership, and modal focus containment. Recorded repeated post-fix harness/static/build/lint/runtime/keyboard/visual PASS, final QA-Agent `APPROVE`, Phase 2 completion, and residual non-blocking risks.

Revision note 2026-07-12 20:51 +04:00: Reopened the Phase 2 approval gate after `SEC-P2-001` was found in commit `719fe3e`. Recorded background ownership, shared-queue initialization, read-only UI hydration, minimal current-version repairs, and the Firefox no-nested-enqueue completion contract before implementation.

Revision note 2026-07-12 21:04 +04:00: Recorded the implemented initialization ownership fix, seven deterministic interleaving passes, successful TypeScript/build/lint gates, and the remaining live-runtime plus independent-QA gates without closing `SEC-P2-001` prematurely.

Revision note 2026-07-12 21:09 +04:00: Recorded independent QA's code/static PASS but overall `CHANGES REQUIRED`, plus the environment denial that prevented the prepared native Chrome/Firefox runtime harness from launching. Kept the finding open and did not create the commit.

Revision note 2026-07-13 00:07 +04:00: Closed `SEC-P2-001` after packaged Chromium and Firefox lifecycle smoke, repeated deterministic/static/build/lint gates, and independent QA-Agent `APPROVE`. Recorded the Firefox native-effects observation limitation and kept Focus Music and Phase 3 outside this fix.

Revision note 2026-07-13 20:37 +04:00: Reopened the Phase 2 release gate for the remaining direct Focus Music control regression. Recorded the pre-implementation invariant analysis and chose a typed background mutation that replaces only the active Work snapshot's audio fields, with no storage-version, permission, UI, monetization, or Phase 3 change.

Revision note 2026-07-13 20:37 +04:00: Recorded the implemented live-audio contract, preservation of manual timer fields, shared active-snapshot UI/runtime resolution, 15-scenario Focus Music harness PASS, existing harness/static/build PASS, and the still-pending packaged runtime, screenshot, lint, and independent-QA gates.

Revision note 2026-07-13 21:14 +04:00: Incorporated QA's stale UI payload finding by replacing full audio state with queued atomic intents and repeated all deterministic/static/build gates. Recorded QA `CHANGES REQUIRED`, the production-runtime test gap, optional lint download failure, and three Firefox BiDi startup exits; Phase 2 and the commit remain blocked.

Revision note 2026-07-13 22:28 +04:00: Recorded successful packaged Firefox Focus Music runtime and six-screenshot visual evidence after isolating QA process-tree/profile issues. Added the external background-realm instrumentation decision, direct chime evidence, native-notification observation limit, and the remaining independent-QA gate without claiming Phase 2 completion prematurely.

Revision note 2026-07-13 22:35 +04:00: Recorded independent QA-Agent `APPROVE`, closed the final Phase 2 Focus Music residual, superseded stale pending-runtime/QA entries, and retained unavailable optional lint plus native headless-notification observability as explicit non-blocking limits. The isolated fix is ready for its required commit; Phase 3 remains unstarted.
