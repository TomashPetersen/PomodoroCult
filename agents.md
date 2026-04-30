# Agents Manifest

## Introduction

This document defines the minimal agent operating model for **Pomodoro Cult**.

**Project summary:** Pomodoro Cult is a Chrome Extension (Manifest V3) built with **React, TypeScript, Vite, Tailwind CSS, and Zustand**. The extension provides a focus timer, task management, statistics, and background/offscreen timing behavior.

This file is the single source of truth for:

- agent roles;
- responsibilities and limits;
- handoff flow;
- shared engineering and communication rules.

The project intentionally uses **2 permanent agents only**:

- `Codex` for implementation, coordination, architecture, documentation, and delivery readiness;
- `QA-Agent` for verification, regression control, and release confidence.

No plugin, marketplace, or custom skill scaffolding is used at this stage. The agent model is documentation-based and lives entirely in this file.

---

## Roles & Responsibilities

### 1. Codex

**Identifier:** `Codex`

**Primary goal:**

- acts as the primary delivery agent for the project.

**Responsibilities:**

- implement product changes across UI, state, storage, runtime, and configuration layers;
- make architectural decisions for small and medium changes;
- maintain consistency between `src/`, `manifest.json`, build tooling, and documentation;
- update docs when behavior or workflows change;
- prepare work for verification and final handoff;
- validate build and release readiness before completion.

**Restrictions:**

- must not publish, deploy, or distribute artifacts without explicit approval;
- must not silently change product requirements;
- must not add Chrome permissions without approval and documentation;
- must not rewrite unrelated files outside task scope;
- must not skip QA review for risky changes affecting storage, timer continuity, runtime messaging, or extension lifecycle.

**Tools:**

- read/write access to repository files;
- terminal access for build, checks, and inspection;
- project-wide search;
- optional web lookup when external verification is required;
- documentation and patch/edit workflows.

---

### 2. QA-Agent

**Identifier:** `QA-Agent`

**Primary goal:**

- verifies correctness, regressions, and delivery confidence.

**Responsibilities:**

- review implemented changes for functional and behavioral regressions;
- verify timer reliability, storage persistence, popup reopen behavior, and runtime/offscreen flows;
- confirm acceptance criteria and expected UX behavior;
- document residual risks, gaps, and edge cases before release or handoff.

**Restrictions:**

- must not approve a change it did not validate;
- must not change requirements during verification;
- must not mark runtime-sensitive changes as safe without checking extension-specific behavior;
- must not expand scope from testing into unrelated implementation work unless explicitly reassigned.

**Tools:**

- read access to repository files;
- terminal access for build/test/verification commands;
- manual verification workflows;
- structured review notes and risk reporting.

---

## Interaction Protocols

### Default workflow

1. `Codex` analyzes the task and implements the required change.
2. `Codex` prepares a short verification context: objective, affected behavior, risky areas, and expected result.
3. `QA-Agent` reviews the change and validates correctness, regressions, and edge cases.
4. If issues are found, work returns to `Codex` for fixes.
5. If validation passes, `Codex` prepares final handoff or release-ready output.

### Small change workflow

`Codex` may complete low-risk isolated work end-to-end, but `QA-Agent` review remains preferred for:

- storage changes;
- timer logic changes;
- background/offscreen changes;
- `manifest.json` updates;
- changes affecting popup reopen or state recovery behavior.

### Escalation rule

The following changes require explicit pause and review before completion:

- new Chrome permissions;
- storage schema or persistence contract changes;
- background/offscreen lifecycle changes;
- cross-cutting refactors affecting both UI state and runtime messaging;
- release or distribution workflow changes.

### Handoff rule

Every handoff from `Codex` to `QA-Agent` must include:

- objective;
- affected behavior;
- known risks;
- expected result;
- whether build verification was completed.

### ExecPlan workflow

For any task that is large, risky, cross-cutting, or likely to span multiple sessions, `Codex` must create or update an **ExecPlan** before substantial implementation begins.

An **ExecPlan** is a self-contained execution plan written so that a new contributor can complete the task with only the repository and the plan file. It must explain:

- why the change matters from a user perspective;
- what files and modules are involved;
- what commands to run;
- what results to observe;
- how to validate the work end-to-end.

If a repository-level `PLANS.md` exists, every ExecPlan must follow it exactly. If `PLANS.md` does not exist, the local default is to follow the ExecPlan standard described in this document.

`Codex` owns authoring and maintaining ExecPlans during implementation. `QA-Agent` uses the ExecPlan as the source of truth for expected behavior, acceptance checks, and regression review.

---

## How To Use In Codex

- Use `Codex` by default for implementation, refactoring, architecture, documentation, and delivery tasks.
- Invoke `QA-Agent` when a task needs review, regression checking, runtime verification, or release confidence assessment.
- Use an ExecPlan for any feature or refactor that cannot be safely completed from short-lived task context alone.
- Do not introduce extra permanent agents unless project complexity materially increases.
- If stronger structure is needed later, the next upgrade path is two local skills:
  - `codex-implementer`
  - `qa-reviewer`

---

## System Rules

### Technology standards

- Language: `TypeScript`
- UI framework: `React 18`
- Build tool: `Vite`
- Styling: `Tailwind CSS`
- State management: `Zustand`
- Extension platform: `Chrome Extension Manifest V3`

### Code standards

- Keep components focused and avoid mixing rendering, orchestration, and platform logic in one file.
- Place reusable logic in `src/lib/` or `src/store/` instead of duplicating it across components.
- Prefer explicit types for shared contracts, storage payloads, and runtime messages.
- Keep extension side effects in dedicated runtime modules rather than scattering them through UI code.
- Do not introduce new dependencies without clear justification.
- Preserve backward compatibility of persisted data when practical; otherwise document migration impact.

### Communication rules

- Team discussion language: `Russian`
- Code comments, identifiers, commit subjects, and technical artifacts: `English`
- Final technical summaries should be concise and written in Markdown.

### Output rules

- All agent reports must use valid Markdown.
- If assumptions were made, state them explicitly.
- If verification was not performed, say so directly.
- If a change impacts architecture or runtime behavior, document it in the relevant project docs.
- Long-running or multi-step implementation work must be tracked in an ExecPlan that stays current as work progresses.

### ExecPlan standard

- An ExecPlan must be fully self-contained and understandable to a novice contributor.
- An ExecPlan must be a living document and be updated as progress, discoveries, and decisions happen.
- An ExecPlan must describe observable user outcomes, not just internal code changes.
- An ExecPlan must define non-obvious terms in plain language instead of assuming repository knowledge.
- An ExecPlan must include concrete commands, expected outputs, validation steps, and recovery guidance.
- An ExecPlan must include these sections and keep them current:
  - `Purpose / Big Picture`
  - `Progress`
  - `Surprises & Discoveries`
  - `Decision Log`
  - `Outcomes & Retrospective`
  - `Context and Orientation`
  - `Plan of Work`
  - `Concrete Steps`
  - `Validation and Acceptance`
  - `Idempotence and Recovery`
  - `Artifacts and Notes`
  - `Interfaces and Dependencies`
- `Progress` must use checkbox items with timestamps and must reflect the real current state at every stopping point.
- When revising an ExecPlan, add a note at the bottom describing what changed and why.

### Commit rules

- Recommended commit format: `type(scope): summary`
- Allowed types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`
- Keep one commit focused on one coherent change whenever practical.
- Do not mix unrelated refactors with feature or bug-fix work.

### Quality gates

- Minimum completion check: project builds successfully with the current task changes.
- UI changes should be checked for layout integrity and expected interaction flow.
- Runtime changes should be checked for popup reopen behavior, timer continuity, and storage persistence.
- Documentation changes must reflect implemented behavior, not intended behavior.

---

## Future Growth

If project complexity grows, add new agents only when they reduce coordination cost rather than increase it.

Before adding a new agent, document:

- the exact gap not covered by `Codex` and `QA-Agent`;
- the new agent's decision boundary;
- required handoff changes;
- why a documentation-only model is no longer sufficient.
