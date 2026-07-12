# Phase 2 Security Review

Date: 2026-07-12

## Progress

- [x] 2026-07-12 20:51 +04:00: Confirmed `SEC-P2-001` against commit `719fe3e`; the commit was created before this race was discovered, so the earlier Phase 2 QA approval does not close the finding.
- [x] 2026-07-12 20:51 +04:00: Implemented background-owned serialized initialization, deterministic concurrency regression coverage, packaged runtime smoke checks, and independent QA-Agent re-review.
- [x] 2026-07-12 21:04 +04:00: Implemented background-owned initialization and read-only UI hydration; all seven deterministic concurrency cases, existing migration/domain coverage, diff check, TypeScript, both builds, and Firefox lint pass.
- [x] 2026-07-12 21:04 +04:00: Live Chrome/Firefox runtime smoke and independent QA-Agent re-review completed on 2026-07-13.
- [x] 2026-07-12 21:09 +04:00: QA-Agent independently confirmed the code architecture, both harnesses, diff check, TypeScript, and both builds with no code blocker.
- [x] 2026-07-12 21:09 +04:00: The temporary browser-process escalation blocker cleared; both packaged runtimes passed and the final QA verdict changed to `APPROVE`.
- [x] 2026-07-13 00:07 +04:00: Closed `SEC-P2-001` after deterministic 7/7 interleavings, migration/domain PASS, TypeScript/build/lint PASS, packaged Chromium/Firefox lifecycle PASS, and independent QA-Agent `APPROVE`.

## Executive Summary

No Critical code-execution, DOM injection, external-message, permission, or secret-exposure vulnerability was found. The original review identified one High-severity storage-integrity race in commit `719fe3e`; that finding is now remediated and independently approved. Phase 2 still has a separate Focus Music functional blocker outside this security fix.

The previously reported active Focus Music control regression remains release-blocking functionality, but it is not classified as a Critical or High security vulnerability.

## High Severity

### SEC-P2-001: Unserialized full-storage initialization can overwrite newer data

- **Status:** Closed on 2026-07-13 after packaged runtime and independent QA `APPROVE`.

- **Rule ID:** PROJECT-INTEGRITY-001
- **Severity:** High
- **Locations:**
  - `src/store/useAppStore.ts:288-297`
  - `src/store/useAppStore.ts:379-380`
  - `src/lib/storage.ts:777-780`
  - `src/background-firefox.ts:1306-1307`
  - `src/background-firefox.ts:1400-1401`
- **Evidence:** UI hydration calls `initializeStorage()` before `POPUP_ENSURE_READY`. `initializeStorage()` performs `getLocal()`, normalizes the complete persisted object, and writes that complete object with `setLocal()`. The UI call is outside the background mutation queue. Firefox readiness also reaches `initializeStorage()` through an unqueued runtime synchronization path.
- **Impact:** If timer completion or a serialized Focus Mode/task mutation occurs between the full read and full write, initialization can restore stale values and lose a `SessionEvent`, aggregate statistics, timer state, custom-mode CRUD, selection, or task binding.
- **Fix:** Make storage initialization background-owned and serialized with all timer/mode/task mutations. `POPUP_ENSURE_READY` must finish queued initialization first; UI hydration must then use read-only `readStoredData()`. Firefox startup and readiness must share the same serialized initialization primitive.
- **Mitigation:** Until fixed and regression-tested, do not commit or approve Phase 2 and do not begin Phase 3.
- **False-positive notes:** JavaScript's single thread does not remove this race because the storage read and write are separated by asynchronous operations and other extension contexts can mutate storage between them.

## Critical Severity

No Critical findings.

## Surprises & Discoveries

- The existing timer/domain queues protect mutations from each other but cannot protect them from a full snapshot written by a disposable UI context that never enters the queue.
- Firefox's current expired recovery calls an enqueueing completion wrapper. Moving that wrapper wholesale inside queued initialization would create a self-waiting deadlock, so queued mutation and post-queue completion effects must be separated.

## Decision Log

- Background owns storage initialization and migrations on both platforms. Startup, install, and `POPUP_ENSURE_READY` use the same queue as timer, Focus Mode, task, and statistics mutations.
- UI initialization waits for readiness and then performs read-only hydration through `readStoredData()`; opening popup or app window cannot execute a full storage write.
- Storage remains version 3. Legacy migration creates one backup and persists the normalized document; already-current storage receives only necessary normalized-key repairs, while an unchanged reopen writes nothing.
- Firefox uses a single non-enqueueing initialization/recovery implementation inside the queue and performs accepted completion audio/notification effects only after leaving it.

## Verified Critical/High Boundaries

- No `dangerouslySetInnerHTML`, direct HTML injection sink, `eval`, `new Function`, remote script, or attacker-controlled navigation was found in the reviewed source paths.
- User titles and Focus Mode names are rendered through normal React interpolation and are escaped by React.
- Runtime mutation messages are extension-internal: no `externally_connectable`, external-message listener, or content-script bridge was found.
- Domain values are normalized or rejected by shared storage and mutation helpers.
- JSON import is user-initiated, requires an importable storage shape, normalizes persisted values, and resets imported timer state to safe idle. No exploitable prototype-pollution path was demonstrated.
- Phase 2 adds no permission, dependency, manifest, payment, entitlement, donation URL, or remote-code change.

## Residual Risks and Release Hygiene

- Direct Focus Music Off/track/volume controls do not reliably affect active Firefox playback because audio remains snapshot-owned. This is a Phase 0 functional regression and must be fixed before Phase 2 approval.
- `output/` is untracked, approximately 298 MB, and contains complete Firefox QA profiles and screenshots. It must not be staged or committed because profiles may include local storage and identifiers.
- The JSON import path has no explicit input-size limit. This is a local, user-initiated availability concern rather than a Critical/High vulnerability, but a bounded file-size check is reasonable future hardening.

## Approval Gate

Security status for `SEC-P2-001`: **APPROVED / CLOSED**.

Completed approval evidence:

1. Background storage initialization is serialized and UI hydration is read-only after readiness.
2. Deterministic regression coverage exercises completion, Focus Mode CRUD, binding, parallel readiness, Firefox startup, and legacy migration interleavings.
3. Diff check, TypeScript, both builds, Firefox lint, packaged Chromium/Firefox runtime, and independent QA pass.

The direct Focus Music control regression remains a separate functional release blocker and was intentionally not changed by this storage fix.

## Outcomes & Retrospective

Commit `719fe3e` predates discovery of the race. The follow-up remediation establishes background ownership, shared serialization, read-only UI hydration, minimal current-v3 repairs, and zero-write normalized reopen. Both packaged runtimes preserved mode/task mutations and completed Work exactly once without deadlock. QA-Agent verdict: **APPROVE**.

Residual observation limit: headless Firefox does not expose native audio/notification events through BiDi cross-compartment wrappers. The single 12,695 ms completion-effects pipeline and code control-flow were observed and accepted by QA; Chromium directly confirmed one chime and silent stale completion. This limitation does not reopen the storage integrity finding.

Revision note 2026-07-12 20:51 +04:00: Added living security-plan sections and recorded the pre-implementation ownership, queue, migration-write, and Firefox deadlock-avoidance decisions. `SEC-P2-001` remains open pending implementation and independent QA.

Revision note 2026-07-12 21:04 +04:00: Recorded completed remediation implementation and passing seven-case concurrency, migration/domain, TypeScript, build, and lint evidence. Kept the finding open pending live runtime smoke and independent QA-Agent verdict.

Revision note 2026-07-12 21:09 +04:00: Recorded independent QA's no-code-blocker result and overall `CHANGES REQUIRED` verdict, plus the environment escalation-limit denial of the prepared native browser smoke. No approval, finding closure, or commit was claimed.

Revision note 2026-07-13 00:07 +04:00: Closed `SEC-P2-001` after packaged Chromium/Firefox lifecycle PASS, repeated deterministic/static/build/lint evidence, and independent QA-Agent `APPROVE`; retained Firefox native-effects observability and Focus Music as separate residual items.
