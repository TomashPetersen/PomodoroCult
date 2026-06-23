# Timer Cycle Status and Task History

## Purpose / Big Picture

Make the timer screen clearly distinguish a task selected for a future cycle from a task locked to an already started timer chain. Keep the red tomato badge as the selected task's historical completed work-session count, increasing only after a work timer completes.

## Progress

- [x] 2026-06-21: Inspected timer, task selection, statistics, and Firefox runtime behavior.
- [x] 2026-06-21: Confirmed the product decisions for cycle lifetime, status placement, and tomato count scope.
- [x] 2026-06-21: Added derived lifecycle helpers and localized status copy.
- [x] 2026-06-21: Updated timer tabs, circle status, task selector, and tomato badge semantics.
- [x] 2026-06-21: Restored the original compact timer geometry after visual comparison with the previous Firefox popup.
- [x] 2026-06-21: Ran TypeScript, Firefox build, and Playwright UI verification at the real 320x600 popup size.
- [x] 2026-06-22: Reproduced delayed storage/runtime events that caused transient Running frames.
- [x] 2026-06-22: Added explicit cycle, pause, and revision state with backward-compatible migration.
- [x] 2026-06-22: Serialized Firefox completion, pause, reset, and start state mutations.
- [x] 2026-06-22: Ran business assertions, countdown cadence measurement, Chrome/Firefox builds, and active-task lock checks.
- [x] 2026-06-23: Verified deadline behavior: Pause/Stop at `00:00` records completed Work exactly once.
- [x] 2026-06-23: QA-Agent completed the final diff review with no high or blocking findings.

## Surprises & Discoveries

- `activeTaskId` currently represents both a preselected task and a task locked to an active cycle.
- Historical tomato counting already uses stored task statistics and increments after completed work sessions.
- `completedSessions` is still required internally to choose the long-break interval and must not become the displayed historical metric.
- A 400x750 Playwright viewport was not representative: Firefox's reference screenshot is a 320x600 CSS popup rendered at 125% scale. Final visual checks therefore use 320x600.
- Inferring pause from elapsed seconds fails when Pause is pressed before the first second changes.
- `initializeStorage()` inside Firefox start handling rewrote an older persisted timer state before the new running state.
- Storage events and runtime responses need a monotonic timer revision because they can arrive in a different order from the user's actions.

## Decision Log

- 2026-06-21: A task cycle lasts until explicit Stop, including prepared/running/paused break modes.
- 2026-06-21: The red badge shows all completed work sessions for the selected task.
- 2026-06-21: Status is shown both inside the timer circle and in the task selector.
- 2026-06-21: No permissions or runtime message changes.
- 2026-06-22: Persist `cycleStarted`, `isPaused`, and `revision`; migrate older timer records from their previous fields.
- 2026-06-22: A completed Work wins if completion is queued before Pause/Stop at the deadline; Pause/Stop wins if queued first.

## Outcomes & Retrospective

The timer now distinguishes idle, running, paused, and prepared-next-mode states using explicit persisted lifecycle fields. A selected task is labeled for the next cycle while idle and for the current cycle after the timer chain starts. The red badge remains the selected task's historical completed-work count and supports compact localized values.

The first UI pass increased control heights and looked compressed when checked at the wrong viewport. The final pass restored the previous 44px task selector, 40px tomato badge, original timer circle dimensions, and compact tab markers. Playwright screenshots at 320x600 confirmed light idle and dark running layouts.

The runtime audit found two independent races. Delayed storage events could visually revert optimistic UI, and completion could interleave with Pause/Stop near zero. Timer revisions now reject stale events, while the Firefox background serializes state-changing operations.

## Context and Orientation

`TimerScreen` renders tabs, the countdown circle, controls, and the historical task badge. `TaskSelect` renders the selected task and locks changes after a cycle starts. `storage.ts` contains existing timer-state predicates and historical statistics helpers. `i18n.ts` owns all visible English and Russian strings.

## Plan of Work

Add a lifecycle type (`idle`, `running`, `paused`, `ready`) backed by explicit timer state. Render text and non-color markers for that lifecycle. Label the task as belonging either to the next cycle or the current cycle. Keep the historical badge bound to task statistics and expose its meaning to assistive technology.

## Concrete Steps

1. Add the lifecycle type and pure derivation helper.
2. Add localized lifecycle, task relationship, and tomato-count strings.
3. Update the timer tabs and central circle without changing their stable dimensions.
4. Update the task selector trigger to show a compact relationship label.
5. Verify TypeScript, Firefox production build, and representative UI states.

## Validation and Acceptance

- Idle: selected task is labeled for the next cycle; Stop is disabled.
- Running: mode is visibly running; task is labeled as current and locked.
- Paused: mode is visibly paused; only that mode can resume.
- Ready after completion: next mode is visibly available and task remains locked.
- Completed work increments historical tomatoes; pause, early Stop, break, and rest do not.
- Stop preserves the historical badge and returns the task to next-cycle status.
- English/Russian and light/dark layouts remain readable at 320-400 px width.

## Idempotence and Recovery

Older stored timer records are normalized into the explicit lifecycle fields during initialization. Rebuilding or reopening the popup produces the same lifecycle. The migration is idempotent because normalized values are written back to extension storage.

## Artifacts and Notes

Run:

    npx.cmd tsc --noEmit
    npm.cmd run build:firefox

Manual verification used Playwright at 320x600 for:

    light / idle / next-cycle task
    dark / running / current-cycle task
    dark / paused
    viewing another timer mode during a paused work cycle
    compact historical counts including 11,11 к

Automated observations:

    delayed Start samples: ["Идет"]
    delayed Pause samples: ["На паузе"]
    countdown intervals: 1002 ms, 1004 ms, 996 ms, 994 ms
    storage/business assertion harness: passed
    active-task edit during pause: blocked with no edit input
    Pause at expired Work: 1 session, next mode Break
    Stop at expired Work: 1 session, then clean Work reset

## Interfaces and Dependencies

Add `TimerLifecycleState` plus explicit `cycleStarted`, `isPaused`, and monotonic `revision` fields to shared timer state. No new dependencies or permissions.

Revision note: Created on 2026-06-21 to track the approved timer-cycle status UX implementation.

Revision note: Updated on 2026-06-21 after implementation and visual regression correction. The note records the actual 320x600 Firefox popup viewport and the restored compact geometry.

Revision note: Updated on 2026-06-22 after runtime regression testing. The timer lifecycle now uses explicit persisted fields, stale state is revision-filtered, and Firefox state mutations are serialized.
