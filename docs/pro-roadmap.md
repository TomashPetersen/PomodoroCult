# Pomodoro Cult Monetization and Pro Roadmap

## Purpose

This document defines the first monetization model for Pomodoro Cult before Android and other platform adaptations begin.

The product should stay local-first and useful for free users. Donations and paid features must be additive, transparent, and technically easy to disable if a provider or store policy changes.

## Principles

- Keep the current free product useful: timer, tasks, local statistics, chart, app window, import/export, bilingual UI, notifications, and basic focus music stay free.
- Do not collect payment data inside the extension.
- Do not add analytics just to support monetization.
- Do not add host permissions for donations.
- Open external support/payment pages only after an explicit user click.
- Treat provider availability as operational, not permanent. This matters because the developer is based in Russia and payment routes can change.
- Do not enable store donation fields or in-app donation links until the real URL is verified.

## Current Implementation Status

Completed foundations:

- Phase 0, commit `b7d2efa`: the Firefox Free runtime is stable and one background-page player owns focus music across popup and app-window lifecycles.
- Phase 1, commit `1a651de`: storage version 3 contains canonical built-in Focus Modes, optional task-to-mode references, cycle identity/start metadata, and timestamped SessionEvents for new completed Work cycles.
- Migration preserves settings, tasks, archive state, theme, aggregates, and active timer state. Legacy aggregate statistics are not converted into fabricated timestamped events.
- Chrome background is the sole TimerState writer; offscreen only schedules expiry and plays a completion chime after cycle-matched acknowledgement.
- JSON backup/import includes Focus Modes and SessionEvents and restores the imported timer to a safe idle state.
- Phase 2 implements explicit Default / Manual and global selection, custom-mode CRUD, optional task binding, task-card badges, and active-cycle snapshots across popup/app-window and browser restarts.
- All built-in/custom modes and task binding are currently free and ungated. No count limit, entitlement, donation, or licensing behavior exists.

Not implemented yet:

- Feature gates, donations, payments, entitlement state, licensing, Android adaptation, PDF, accounts, telemetry, cloud sync, or external APIs.

The active implementation phase is final Phase 3 verification. Phase 4 feature gates must not begin until packaged runtime, visual/accessibility, documentation, and independent QA gates close.

## Tiers

| Capability | Free | Donation / Supporter | Pro candidate |
| --- | --- | --- | --- |
| Timer | Work, break, rest, pause, stop, skip short break, auto-start breaks | Same | Per-task custom cycles, multiple saved focus presets |
| Tasks | Create, select, edit, archive, delete, local history | Same | Task templates, recurring plans, task goals |
| Statistics | Local list/chart/task totals plus Focus Review, comparisons, streaks, goals, and task insights | Same | Future analytics beyond the shipped Phase 3 contract only after a separately approved boundary |
| Data | Local storage, JSON import/export, CSV session export, Markdown weekly review | Same | Scheduled backup reminders or future report formats after separate validation |
| Focus music | Built-in stream, birds, clock loops | Same | Extra sound packs and focus scenes |
| Themes | Light/dark/system | Same | Extra themes and fullscreen focus layouts |
| Sync | None | None | Later only with account/licensing infrastructure |

## Donation Model

The first donation implementation should be simple:

- A small `Support project` entry in the large app window and settings.
- Disabled by default until a verified URL is configured.
- Optional AMO Contribution URL only if the chosen provider is accepted by AMO.
- No feature unlocks tied to donation in the first version.
- No hidden network calls.

Suggested internal config shape:

```ts
interface DonationConfig {
  enabled: boolean;
  url: string;
  labelKey: string;
}
```

Provider choice is intentionally not hardcoded here. Before enabling the link, manually check:

- whether the provider accepts the developer's jurisdiction;
- whether payouts are possible;
- whether the provider URL is allowed in AMO's contribution field;
- whether the provider page has a stable public URL;
- whether the privacy policy needs an update.

If no provider is ready, keep the donation UI disabled or hidden.

## Provider Strategy

The developer is based in Russia, so the provider strategy must be checked operationally before any link is shipped. Do not assume that a globally known payment provider can onboard, verify, or pay out to the developer.

Recommended model:

1. Keep the extension provider-agnostic.
2. Publish a simple support page first, controlled by the project, that can later route users to an available provider.
3. Add a donation URL only after the provider account is created, KYC is completed, payout is tested, and the public URL is stable.
4. Keep AMO's Contributions URL empty until the provider is known to be supported by AMO and by the developer's jurisdiction.
5. Do not process cards, wallets, payer identity, or subscription status inside the extension.

Possible routes to evaluate manually:

| Route | Use case | Notes |
| --- | --- | --- |
| AMO-supported creator platforms | Public donation button on AMO | Only if the selected platform accepts the developer and can pay out. |
| Project support page | One stable URL in the extension and listing | Best first step because the extension does not need to change when providers change. |
| Domestic donation provider | Russian-speaking audience | Useful for local supporters, but may not cover international users. |
| Merchant-of-record or external seller | Future Pro payments | Only if the provider accepts the developer, handles taxes, and permits browser-extension/software sales. |
| Manual B2B invoicing | Early Pro validation | Useful before building account and license infrastructure. |

Avoid for the first monetization phase:

- in-extension payment forms;
- cryptocurrency as the default donation path;
- hidden network calls;
- provider SDKs inside the extension;
- claiming paid or Pro functionality in AMO before it exists.

## Pro MVP Candidates

The first paid layer should focus on features that do not require accounts:

1. Advanced local analytics beyond the free Phase 3 Review:
   - longer-term planning/coaching views that do not relabel existing free metrics;
   - optional future insights only after adequate data and user validation.

2. Export and reporting:
   - scheduled or bundled reporting beyond the free CSV and Markdown exports;
   - PDF weekly summary;
   - task-level report.

3. Planning:
   - saved focus plans;
   - recurring task templates;
   - custom cycles per task.

4. Focus environment:
   - extra sound packs;
   - richer fullscreen focus modes;
   - more visual themes.

## Competitive Reference Notes

The first Pro layer uses established Pomodoro products as pattern signals, not as features to copy one-to-one.

- Focus To-Do shows the value of a larger workspace around tasks, statistics, focus sounds, and a persistent desktop-like work mode.
- Pomofocus shows a strong free core with tasks, visual reports, templates, custom settings, background sounds, and a paid layer around projects, yearly reports, CSV downloads, and integrations.
- Classic browser extensions such as Tomato Clock and Marinara-style timers show that a compact popup must stay fast, predictable, and reliable.

The practical product split for Pomodoro Cult:

- Free should win on reliability, local-first storage, clean timer flow, tasks, charts, and the compact popup plus large workspace.
- Donation should be a voluntary support path, not a fake paywall.
- Pro should add depth for planning, review, export, and personalization without requiring a server in the first iteration.

## Optimized Pro Product

The first paid layer should be sold as two coherent outcomes rather than a collection of small settings.

### 1. Focus Modes Pro

A Focus Mode is a reusable working environment. It combines settings that already exist and gives them one understandable name.

Each mode may contain:

- work, short-break, and long-rest duration;
- cycles before long rest;
- break auto-start;
- focus sound and volume;
- target number of work sessions;
- completion notification style;
- optional accent color;
- optional default task binding.

Initial built-in modes:

- `Classic` — 25/5, long rest after four cycles;
- `Deep Work` — 50/10, quiet stream, two-session goal;
- `Writing Sprint` — 25/5, clock or silence, four-session goal;
- `Study` — 30/5, birds, automatic breaks;
- `Quick Admin` — 15/3, no background sound.

Phase 2 intentionally gives every user unlimited custom modes and task binding. A possible future count boundary is only a monetization hypothesis and must not be treated as shipped behavior. A task profile is not a separate product: it is only an optional `focusModeId` on a task. This prevents duplicated settings and keeps the task editor simple.

### 2. Focus Review (shipped ungated in Phase 3)

Focus Review turns existing local statistics into a short, actionable review:

- total focus and completed sessions for the selected period;
- comparison with the previous equivalent period;
- strongest day and strongest task;
- most productive hour block, only when enough data exists;
- daily/weekly goal progress;
- current consistency streak, using a clearly documented rule;
- task distribution and change from the previous period.

Do not ship speculative labels such as `overload` or `task drift` in the first version. They require richer event history and can sound judgmental. The review must show `Not enough data yet` instead of inventing an insight from one or two sessions.

### 3. Reports (CSV and Markdown shipped ungated in Phase 3)

Reports support Focus Review but are not a flagship feature:

- CSV session export;
- Markdown weekly review;
- PDF deferred until there is a stable print layout and a clear user need.

### 4. Optional Pro expansion

After the first release:

- extra properly licensed sound packs;
- extra visual themes;
- recurring plans and reminders;
- integrations only after account and server infrastructure is justified.

## Free / Pro Boundary

Free remains a complete local Pomodoro application:

- timer, tasks, archive, compact popup, large workspace;
- current statistics list and activity chart;
- manual timer settings;
- three bundled focus sounds;
- JSON backup and restore;
- all currently implemented Focus Modes and task binding during the ungated validation phase.

Pro adds depth and reuse:

- future extra sound/theme packs.
- future planning, templates, or reporting capabilities that do not remove or relabel Phase 3 Review, goals, CSV, or Markdown.

Existing free capabilities must never become locked after an update.

## Why This Packaging

Pomofocus publicly combines templates, custom timer settings, alarm/background sounds, visual reports, and CSV download; its paid layer increases template limits and reporting depth. Focus To-Do emphasizes task-linked Pomodoro work, historical reports, repeating tasks, notes, reminders, and cross-device access. Pomodoro Cult should not imitate their server-heavy sync and integration surface yet. Its defensible short-term position is a reliable local-first desktop workflow with reusable focus environments and unusually clear local analytics.

## Failure Modes and Mitigations

| Risk | Why the plan can fail | Required mitigation |
| --- | --- | --- |
| Templates and task profiles diverge | Copying settings into both entities creates conflicts and confusing precedence. | Store settings once in `FocusMode`; tasks hold only an optional mode id. |
| A mode changes an active cycle | Applying new duration mid-session corrupts timer expectations and statistics. | Snapshot the applied mode on cycle start; edits apply to the next cycle. |
| Pro access disappears offline | A remote entitlement check would break the local-first promise. | Cache a signed entitlement with an expiry/grace period; never contact payment services from timer flows. |
| A user loses Pro-created data | Downgrade or expired access could hide modes and reports. | Keep data readable and exportable; block creation/editing beyond the free limit, not access to history. |
| Analytics make false claims | Best-hour and streak results are meaningless with sparse or migrated aggregates. | Define minimum sample thresholds and expose the calculation period. |
| Existing statistics are too coarse | Current per-day task totals may not contain time-of-day events. | Add a backward-compatible session event log before promising best focus windows. |
| Sound packs create legal/store risk | Unknown audio licenses can block commercial distribution. | Record source, author, license, and modification for every bundled asset. |
| Popup and app window play twice | Two UI-owned audio controllers can overlap or stop on popup close. | Use one Firefox background audio owner and UI-only controls. |
| Android cannot mirror desktop modes | Desktop windows, hover UI, and background audio differ on Firefox Android. | Put modes/analytics in platform-neutral storage; gate audio/window behavior through capabilities. |
| Payments are unavailable to the developer | Provider onboarding and payouts for a Russia-based resident can change. | Keep provider-independent entitlement/config and do not gate features until a verified payment route exists. |

## Implementation Sequence

1. Completed: stabilize free runtime and background focus music (`b7d2efa`).
2. Completed: add storage v3 and migrations for `FocusMode`, `task.focusModeId`, cycle identity, and SessionEvents without UI gates (`1a651de`).
3. Completed: implement the ungated Focus Modes selector/editor, task binding, active-cycle snapshots, deletion fallback, and responsive/accessibility verification.
4. Completed: build ungated Focus Review and global goals from SessionEvents with explicit coverage and sparse-data thresholds (`f867040`, `91aa160`).
5. Complete and independently verify the ungated CSV and Markdown report milestone.
6. Add feature flags and a developer-only entitlement simulator only in a separately authorized Phase 4.
7. Select and verify the external payment/licensing route.
8. Enable Pro gates only after offline behavior, downgrade behavior, restore/import, and AMO disclosures pass QA.

## Free Validation Baseline Before Any Commercial Release

The shipped/implemented ungated baseline is:

- unlimited Focus Modes;
- task-to-mode binding;
- weekly Focus Review with previous-period comparison;
- daily/weekly goals;
- CSV and Markdown reports.

These capabilities are not a commercial bundle and must not be gated or marketed as paid after Phase 3. A later commercial proposal must be additive and separately approved.

Do not make extra sounds the headline and do not begin with cloud sync. Sounds enrich Focus Modes; sync changes the entire security, privacy, account, and support model.

## Recommended First Commercial Path

1. Ship a disabled or hidden provider-agnostic donation entry until the real URL is verified.
2. Add a simple project-controlled support page as the stable public target.
3. Route that support page to whatever provider is legally and operationally available.
4. Keep the existing `PlanTier` product type ungated and add provider-agnostic donation configuration only after a real support URL is verified.
5. Launch donations first, then ship the first local-only Pro feature after the UX and legal/payment path are clear.
6. Do not build account licensing, remote entitlement checks, or in-extension payment forms until there is enough demand to justify the infrastructure.

## Deferred

These features need more infrastructure and should not be first:

- account login;
- licensing server;
- cloud sync;
- cross-device history;
- team workflows;
- AI recommendations;
- payment processing inside the extension.

## AMO Compliance Notes

Mozilla allows monetization around extensions, but AMO does not provide a built-in paid-extension checkout. The listing and privacy text must clearly disclose any paid services or donation behavior once enabled.

For the first monetization iteration:

- keep AMO payment-related fields unchanged unless a real provider exists;
- do not claim Pro features until they are implemented;
- do not imply cloud, sync, account, or paid services unless shipped;
- update reviewer notes if a donation link or paid feature gate is added.

Official references to re-check before shipping monetization:

- Mozilla monetization guidance: https://extensionworkshop.com/documentation/publish/make-money-from-browser-extensions/
- Mozilla add-on policies: https://extensionworkshop.com/documentation/publish/add-on-policies/
- AMO source submission guidance: https://extensionworkshop.com/documentation/publish/source-code-submission/
- Stripe global availability: https://stripe.com/global

Provider availability is not a stable code fact. Before any release that enables donations or Pro payments, repeat the provider check manually and record the result in the release notes or reviewer notes. For example, Stripe's public availability list describes supported business countries and regions and does not make Russia a default supported onboarding jurisdiction at the time this note was written. That does not mean Stripe is impossible forever; it means the extension must not rely on Stripe-specific code or copy until the real legal and payment path is verified.

Russia-based developer checklist:

1. Confirm whether the provider accepts the developer's residency, business form, and payout country.
2. Confirm whether the provider can accept payments from the target audience, including international cards or wallets.
3. Confirm tax, refund, and support obligations before calling anything a paid Pro product.
4. Keep payment processing outside the extension. The extension may only open an external HTTPS page after a user click.
5. Do not use sanctions evasion, fake residency, hidden intermediaries, or unverified accounts as a product dependency.
6. Keep the in-app donation/pro entry disabled or hidden if any of the above is unresolved.

## Android Implications

Android support should come after this product model because mobile layout and platform capabilities depend on what is free, supporter-only, Pro, or disabled.

Android-specific decisions still needed:

- hide or replace desktop app-window behavior;
- replace hover tooltips with tap/focus help;
- test notifications and audio behavior on device;
- verify import/export through Android file picker;
- keep donation/support entries touch-friendly and non-intrusive.

## Next Steps

Implementation is now governed by `EXECPLAN-v1.2.0.md`.

1. Keep the implemented Focus Modes UI ungated and validate real usage before defining limits.
2. Complete packaged runtime, visual, accessibility, and independent QA for ungated Phase 3 Review, goals, CSV, and Markdown.
3. Revisit the Free/Pro boundary only after Focus Modes and Focus Review behavior are stable; do not reclassify shipped Phase 3 capabilities.
4. Add centralized feature gates only in a separately authorized Phase 4 after the ungated product behavior is stable.
5. Deploy project-controlled support and Pro information pages.
6. Complete provider KYC, international purchase, refund, and Russian payout tests.
7. Implement the external Lifetime Pro licensing service and activation flow.
8. Update AMO/privacy disclosures and enable monetization only after QA and operational gates pass.

2026-07-12 note: Updated implementation status after ungated Phase 2. Focus Modes selector/editor, custom CRUD, task binding, snapshots, deletion cleanup, bilingual UI, and popup/app synchronization are implemented and verified; all monetization behavior remains unimplemented.

2026-07-15 note: Reconciled the roadmap with the Phase 3 source of truth. Focus Review, global daily/weekly goals, CSV, and Markdown are implemented as free ungated local capabilities; older Pro-candidate and deferred-goal/report labels are superseded. Monetization, feature gates, licensing, donations, payments, Android, PDF, telemetry, accounts, and cloud work remain unimplemented.
