# TASK-0004: Word bank loader and in-memory index

## Summary

Add `lib/wordBank.js`, which loads and validates `data/word-bank.json`,
pre-tokenizes every word once at startup, freezes the index, and exposes
`search(filters)` and `getWord(word)`. This is the runtime core shared by all
HTTP routes.

## Context

The CLI tokenizes every word on every search. That is acceptable for a one-shot
command but wasteful for a server handling repeated requests. The bank is small
(~24k words), so an immutable in-memory index is both simpler and faster than a
database.

The JSON artifact is introduced in TASK-0003. This task is the only place that
knows the artifact schema; `server/` should receive a ready-to-use bank object.

## Scope

### In scope

- Add `loadWordBankFile(file)`:
  - Read and parse JSON.
  - Throw `DataMissingError` with a “run `node main.js --csv`” hint when the
    file is missing.
  - Throw `InvalidDataError` (new `AppError` subclass) on parse errors or schema
    violations.
- Add `createWordBank(artifact)`:
  - Validate `schemaVersion === 1`.
  - Require `words` to be an array and reject duplicate words so generation
    bugs surface instead of being silently collapsed.
  - Validate each entry: non-empty string `word`, integer `letters` in
    `1..MAX_GAME_LETTERS`, non-empty ascending integer array `syllables`, and
    boolean `needsReview`.
  - Require `wordCount` to equal the number of entries and `maxLetters` to equal
    `MAX_GAME_LETTERS`.
  - Allow unknown extra fields for forward compatibility.
  - Precompute `tokens: wordTokens(word)` per entry.
  - Freeze the bank and each entry.
  - Build a `Map<word, entry>` for exact lookup.
- Public API:
  - `meta` → `{ schemaVersion, generatedAt, wordCount, maxLetters }`.
  - `search({ pattern = '*', has = '', not = '', limit = 100, offset = 0 })`
    → `{ total, results }`, where results omit internal tokens.
  - `getWord(word)` → entry or `null`, case-insensitive and trimmed.
- Add `matchesConstraintsTokens(tokens, mustHave, mustNot)` to
  `helpers/tokens.js`. Implement `matchesConstraints(word, ...)` as a thin
  wrapper so existing behavior and tests are preserved.
- Add `test/wordBank.test.js` with an in-memory fixture artifact.

### Out of scope

- HTTP routes, validation of HTTP query strings, or status codes.
- Reading the CSV.
- Rebuild/hot-reload behavior.
- Caching identical queries.

## Acceptance Criteria

- [ ] A valid fixture artifact loads and `meta.wordCount` matches the input.
- [ ] A missing file produces an actionable `DataMissingError`.
- [ ] Malformed JSON, unsupported `schemaVersion`, duplicate words, and invalid
  entry fields are rejected with field-specific messages.
- [ ] `search({ pattern: '*' })` returns `total === wordCount`.
- [ ] Search results match `lib/search.js` for the same fixture and filters.
- [ ] `limit`/`offset` slice results while `total` remains the full match count.
- [ ] Mutating a returned result object cannot change the index.
- [ ] `getWord` is case-insensitive and returns `null` for unknown words.
- [ ] Existing token tests still pass after adding
  `matchesConstraintsTokens`.

## Implementation Plan

1. Add `InvalidDataError` to `lib/errors.js`.
2. Add the token-based constraint helper and delegate from
   `matchesConstraints`.
3. Implement `lib/wordBank.js`:
   - Parse and validate the artifact.
   - Fail on duplicate words rather than deduplicating silently.
   - Precompute tokens and presence counts per entry to avoid re-tokenizing.
4. Implement `search` as a single pass that counts matches and collects only the
   requested page. Sort is guaranteed by the artifact, so no runtime sort is
   needed; assert that ordering in tests.
5. Add tests using a fixture with: an exact word, a digraph word (`menggambar`),
   a hyphenated word, an ambiguous syllable word, and a duplicate case.
6. Open a PR using branch `feat/0004-word-bank-index`, link it in the Status Log,
   and request one reviewer.

## Validation

```sh
npm test
node main.js --csv
node -e "
  const { loadWordBankFile } = require('./lib/wordBank');
  const bank = loadWordBankFile('./data/word-bank.json');
  console.log(bank.meta);
  console.log(bank.search({ pattern: 'ny*nyian' }));
"
```

Measure boot time informally with `console.time`; a full load should stay well
under 100 ms on a laptop. Do not add a timing assertion to CI.

## Risks

- **Over-strict validation:** future artifact fields must not break loading.
  Mitigation: require only the documented core fields and allow extras.
- **Schema drift:** a stale `data/word-bank.json` from an older branch could be
  loaded. Mitigation: hard-fail on `schemaVersion` mismatch with a rebuild hint.
- **Memory:** the frozen entries and token arrays add a few MB. Acceptable for a
  single-instance service; revisit only if the bank grows by orders of
  magnitude.
- **Search parity:** token-based constraint checks must produce exactly the same
  result as `matchesConstraints`. Mitigation: keep both and add a parity test on
  the fixture.

## Dependencies

- TASK-0002 (shared `lib/` and error types).
- TASK-0003 (JSON artifact shape).

## Rollout/Backout Plan

No runtime surface changes yet. Revert the commit if loading proves too strict;
the CLI is unaffected because it does not use `lib/wordBank.js`.

## Decisions Needed

- Default artifact location: proposed `path.join(DATA_DIR, 'word-bank.json')`,
  with `DATA_DIR` defaulting to `./data` when the server is wired in TASK-0005.

## Status Log

- 2026-10-21 — Created in `tasks/backlog`. Owner: TBD. Not started.
