# TASK-0001: Quality baseline — lint, format, and CI

## Summary

Add ESLint, Prettier, and a GitHub Actions workflow so every later API change is
checked for lint, formatting, and tests. This is an enabler: without it, no task
can satisfy the Definition of Done in `AGENTS.md`.

## Context

`AGENTS.md` requires lint, formatting, and green CI before review. The
repository currently has only `node --test`; there is no ESLint config, no
formatter, and no `.github/` directory. The codebase is small (four source files
plus two test files), so establishing the baseline is cheap and prevents style
drift while the server is added.

## Scope

### In scope

- Add dev dependencies: `eslint`, `@eslint/js`, `globals`, `prettier`.
- Add `eslint.config.js` (flat config) targeting CommonJS, Node 20, and
  `node:test`.
- Add `.prettierrc.json` matching the existing style: single quotes,
  semicolons, two-space indent, trailing commas, 100-column width.
- Add `.prettierignore` for `node_modules/`, `data/`, and `package-lock.json`.
- Add scripts: `lint`, `lint:fix`, `format`, `format:check`, targeting
  `**/*.{js,json}` so Markdown is not reformatted in this PR.
- Add `.github/workflows/ci.yml` running on `push` and `pull_request`:
  `npm ci`, `npm run lint`, `npm run format:check`, `npm test` on Node 20.
- Fix any lint findings in existing files without changing behavior.
- Format existing JavaScript and JSON with Prettier.

### Out of scope

- TypeScript, type-aware lint rules, or a test coverage threshold.
- Formatting Markdown files (would produce a large unrelated documentation
  diff).
- Docker or deployment workflows.
- Runtime behavior changes.

## Acceptance Criteria

- [ ] `npm run lint` exits 0 on the current codebase.
- [ ] `npm run format:check` exits 0.
- [ ] `npm test` still passes with the existing tests unchanged in intent.
- [ ] The CI workflow runs on a pull request and all three checks pass.
- [ ] No source behavior changes beyond formatting and lint fixes.

## Implementation Plan

1. Install dev dependencies with `npm install --save-dev eslint @eslint/js globals prettier`.
2. Create `eslint.config.js` using `@eslint/js` recommended rules, `sourceType:
   "commonjs"`, `ecmaVersion: 2022`, and Node + `node:test` globals. Ignore
   `node_modules/`, `data/`, and `coverage/`.
3. Add the Prettier config and ignore file. Keep Markdown out of the initial
   format check.
4. Add scripts to `package.json`. Do not add `"private": true` here; that is
   handled with packaging in TASK-0009.
5. Run `npm run lint` and `npm run format`. Review the diff to confirm it is
   mechanical.
6. Add `.github/workflows/ci.yml`. Cache npm via the built-in `setup-node`
   cache option. Tests must not require `data/` or network access.
7. Open a PR using branch `chore/0001-quality-baseline`, link it in the Status
   Log, and request one reviewer.

## Validation

```sh
npm ci
npm run lint
npm run format:check
npm test
```

Confirm the workflow file appears under the PR checks and passes. Since this is
tooling-only, manual runtime verification is limited to `node main.js --help`.

## Risks

- **Formatting churn:** Prettier may reflow existing code and make review
  noisy. Mitigation: keep the change mechanical, land it before feature work,
  and exclude Markdown.
- **Lint noise:** Strict rules may flag intentional patterns such as
  `process.exit` in `main.js`. Mitigation: fix real issues; add a narrow,
  documented disable only where behavior is intentional.
- **CI environment:** `node --test` requires Node 18.11+. Pinning CI to Node 20
  avoids surprises and matches the planned `engines` value.
- **Branch mismatch:** `AGENTS.md` mentions `master` while the repository uses
  `main`. Use the default branch as the base and record the choice.

## Dependencies

- None.

## Rollout/Backout Plan

Revert the tooling commit if the rules block unrelated work. There is no
production impact; the workflow can be disabled per-PR without reverting the
config.

## Status Log

- 2026-10-21 — Created in `tasks/backlog`. Owner: TBD. Not started.
- 2026-10-21 — Moved to `tasks/in-progress`. Owner: Zed agent. Branch: `chore/0001-quality-baseline` (base `main`, per STRATEGY.md open-decision note). Started implementation.
- 2026-10-21 — Installed dev deps (`eslint`, `@eslint/js`, `globals`, `prettier`); added `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, npm scripts (`lint`, `lint:fix`, `format`, `format:check`), and `.github/workflows/ci.yml`.
- 2026-10-21 — Validation: `npm run lint` exits 0 (no findings); `npm run format:check` exits 0 after a single mechanical semicolon fix in `main.js`; `npm test` passes 19/19. `node main.js --help` still works. Implementation complete.
