# Serangkai Guesser Agent Workflow

This repository uses a lightweight Kanban workflow in the `tasks/` folder with four states:

1. `backlog`
2. `in-progress`
3. `review`
4. `complete`

Each task is a Markdown file that moves between those folders as work progresses.

## Goals

- Keep work visible and easy to hand off.
- Keep changes small, testable, and reviewable.
- Enforce quality gates before merge.
- Align team habits with Airbnb-style engineering workflow principles: clear ownership, small PRs, strong reviews, and automation-first quality checks.

## Directory Contract

- `tasks/backlog`: approved but not started work.
- `tasks/in-progress`: currently being implemented.
- `tasks/review`: implementation complete, waiting for review and merge.
- `tasks/complete`: merged and verified.

Task files should be named:

`TASK-<id>-<short-kebab-title>.md`

Example:

`TASK-0001-bank-reconciliation-import-fix.md`

## Task File Schema

Every task file should include these sections:

1. `Summary`
2. `Context`
3. `Scope`
4. `Acceptance Criteria`
5. `Implementation Plan`
6. `Validation`
7. `Risks`
8. `Status Log`

Optional but recommended:

- `Dependencies`
- `Rollout/Backout Plan`
- `Screenshots` (for UI changes)

Add these sections if a task is too ambiguous to be left unattended:
- `Decisions Needed`

## Workflow Rules

### 1) Backlog -> In Progress

Move a task to `in-progress` only when:

- Scope is clear and bounded.
- Acceptance criteria are testable.
- Owner is assigned.
- Dependencies are identified.

When starting work:

- Create branch: `feat/<task-id>-<short-title>` or `fix/<task-id>-<short-title>`.
- Add start timestamp in `Status Log`.

### 2) In Progress -> Review

Move task to `review` when:

- Code is implemented.
- Tests added/updated and passing locally.
- Lint and formatting pass.
- PR opened and linked in task file.
- Reviewer requested.

### 3) Review -> Complete

Move task to `complete` only after:

- PR approved and merged.
- CI checks green.
- Post-merge verification complete (manual or automated).
- Final result and merged commit/PR links recorded.

## Airbnb-Inspired Engineering Best Practices

### Ownership and Scope

- One task, one clear owner.
- One PR should solve one problem.
- Prefer incremental delivery over large batch changes.

### Branching

- Branch from `master`.
- Keep branch current; rebase frequently for small divergence.
- Delete merged branches.

### Commits

- Use clear, imperative commit messages.
- Prefer Conventional Commit style (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`).
- Keep commits focused and logically grouped.

### Pull Requests

- Target small PRs (recommended: less than ~400 changed lines excluding generated files).
- Include problem statement, approach, risks, and validation evidence.
- Include screenshots or recordings for user-facing changes.
- Require at least one reviewer; two for risky/core accounting logic.

### Code Quality

- Lint must pass.
- Tests must pass.
- New behavior should include tests.
- Avoid unrelated refactors in the same PR.

### Reliability and Safety

- For accounting/business-critical flows, validate edge cases and rollback behavior.
- Document data-impacting changes clearly.
- Prefer feature flags or staged rollout for risky changes.

## Definition of Done

A task is done only if all are true:

- Acceptance criteria satisfied.
- Code reviewed and merged.
- CI green.
- Task file moved to `tasks/complete`.
- Status log includes completion date and final references.

## Agent Operating Instructions

When an agent works on this repository:

1. Pick or create a task in `tasks/backlog`.
2. Move it to `tasks/in-progress` before coding.
3. Keep `Status Log` updated as checkpoints are reached.
4. Move to `tasks/review` when PR is open and checks are passing.
5. Move to `tasks/complete` after merge and verification.

If blocked for more than one work day:

- Add `Blocked` entry in `Status Log` with blocker, owner, and next unblock action.
