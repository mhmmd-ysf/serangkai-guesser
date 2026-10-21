# TASK-0002: Extract shared search core and remove reusable process exits

## Summary

Move search and word-list loading out of `main.js` into `lib/`, and replace
`process.exit()` calls in reusable modules with thrown errors. This makes the
core logic importable by an HTTP server while keeping CLI output and exit codes
unchanged.

## Context

Today `main.js` owns `search()`, `loadWords()`, and the top-level error handling.
`loadWords()` exits directly on a missing or unreadable file. `sources/index.js`
and `sources/url-entries.js` also call `process.exit()` on configuration or
response errors. A server cannot safely import any of this: a bad request would
kill the process.

The pure helpers in `helpers/` are already safe to reuse and need no changes
beyond tests for the new `lib/search.js` caller.

## Scope

### In scope

- Add `lib/errors.js` with a small error hierarchy:
  - `AppError` (base, carries a stable `code`)
  - `DataMissingError`
  - `ConfigError`
  - `UnknownSourceError`
  - `SourceResponseError`
- Add `lib/search.js` exporting `search(words, pattern, mustHave, mustNot)`.
  Move the implementation verbatim from `main.js`.
- Add `lib/wordList.js` exporting `loadWordList(file)` and the existing
  read/parse behavior. Throw `DataMissingError` instead of exiting, with the
  same hint text for `BANK_FILE` versus `WORDS_FILE`.
- Update `main.js` to call `lib/search.js` and `lib/wordList.js`. Wrap `main()`
  in a catch that prints `Error: <message>`, prints any hint, and sets
  `process.exitCode = 1`.
- Update `sources/index.js` and `sources/url-entries.js` to throw `AppError`
  subclasses with the existing messages.
- Add `test/search.test.js` covering wildcard matching, `has`/`not` constraints,
  digraphs, and empty results.
- Add `test/wordList.test.js` covering missing files and line parsing using a
  temporary directory.

### Out of scope

- The JSON bank artifact (TASK-0003).
- Pre-tokenized indexes or performance work (TASK-0004).
- Server code (TASK-0005+).
- Changing CLI flags, help text, or search semantics.

## Acceptance Criteria

- [ ] `node main.js "ba*a*a"` produces the same result text as before the
  change for the same `data/` contents.
- [ ] A missing bank file prints the existing guidance and exits with code 1.
- [ ] `node main.js --help` exits 0.
- [ ] `process.exit(` appears only in `main.js` (and test fixtures, if any).
- [ ] `test/search.test.js` and `test/wordList.test.js` pass.
- [ ] No changes to `helpers/tokens.js` or `helpers/syllables.js` behavior.

## Implementation Plan

1. Create `lib/errors.js` and export the classes.
2. Move `search()` into `lib/search.js`; require `patternTokens`, `globMatch`,
   `matchesConstraints` from `../helpers/tokens`.
3. Move `loadWords()` into `lib/wordList.js` as `loadWordList(file)`. Preserve
   the `ENOENT` and read-error messages and the bank-versus-words hint.
4. Refactor `main.js`:
   - Require the new modules.
   - Keep `parseArgs`, `syncWords`, `buildCsv`, and console output in place.
   - Replace `process.exit(1)` with `throw new DataMissingError(...)` or a
     caught generic error.
   - Add a single top-level `.catch` that maps `AppError` to a message and sets
     `process.exitCode`.
5. Refactor the two source files to throw:
   - Missing `DICTIONARY_API_URL` → `ConfigError`.
   - Unknown `DICTIONARY_SOURCE` → `UnknownSourceError` including the available
     names.
   - Unexpected response shape → `SourceResponseError`.
6. Add the two test files. Use a temp directory via `fs.mkdtempSync` and clean
   up in a `finally` block.
7. Open a PR using branch `refactor/0002-shared-search-core`, link it in the
   Status Log, and request one reviewer.

## Validation

```sh
npm test
node main.js --help
node main.js "ba*a*a"            # with a prepared data/ directory
node main.js "ba*a*a" --has ai --not xz
```

Also verify the failure path:

```sh
mv data/words-3syllables.txt /tmp/words-3syllables.txt
node main.js "ba*a*a"            # expect guidance + exit code 1
mv /tmp/words-3syllables.txt data/words-3syllables.txt
```

## Risks

- **Message drift:** moving errors can change wording. Mitigation: copy the
  existing strings and assert them in tests where practical.
- **Exit-code regression:** `process.exitCode` must be set even when the error
  is caught, otherwise scripts see success.
- **Source refactor scope:** `sources/` is not used by the HTTP server, but
  leaving exits there would violate the invariant that reusable modules do not
  terminate the process. Keep the change mechanical.
- **Test isolation:** tests that create files must not write into the repo
  `data/` directory; use `os.tmpdir()`.

## Dependencies

- TASK-0001 (lint and CI baseline).

## Rollout/Backout Plan

Revert the single refactor commit if CLI output regresses. No data migration or
production impact.

## Status Log

- 2026-10-21 — Created in `tasks/backlog`. Owner: TBD. Not started.
