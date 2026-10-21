# TASK-0007: GET /api/words/:word analysis endpoint

## Summary

Implement `GET /api/words/:word` to analyze a single word: normalized form,
game-letter tokens, game-letter count, possible syllable counts, and whether the
word exists in the bank.

## Context

Clients need to explain why a guess does or does not match — especially around
digraphs (`ng`, `ny`, `sy`, `kh`) and ambiguous diphthongs (`ai`, `au`, `oi`).
The `helpers/` functions already compute all of this. This task exposes them
without requiring clients to reimplement the rules.

## Scope

### In scope

- Add `lib/analyze.js` with `analyzeWord(word)`:
  - Normalize by trimming and lowercasing.
  - Return `{ word, tokens, letters, syllables, needsReview }`.
  - Use `wordTokens`, `gameLetterCount`, and `syllablePossibilities`.
  - Throw `InvalidWordError` (new `AppError` subclass) for invalid input.
- Add `GET /api/words/:word` to `server/routes/words.js`:
  - Decode the path parameter safely; a malformed URI returns 400.
  - Accept 1–64 characters after trimming, only `a-z` and `-`.
  - Reject `*`, spaces, and non-ASCII input with 400 `INVALID_WORD`.
  - Return 200 even when the word is not in the bank, with
    `inBank: false`.
  - When present, merge the bank entry's `letters`, `syllables`, and
    `needsReview` with the computed analysis. The computed and stored values
    must agree; if they do not, log a warning and trust the stored values.
- Add route tests to `test/http.test.js` and unit tests in
  `test/analyze.test.js`.

### Out of scope

- Searching for similar words, suggestions, or spell correction.
- Returning the word's CSV row or review history.
- CORS and rate limiting (TASK-0008).

## Acceptance Criteria

- [ ] `GET /api/words/menggambar` returns tokens
  `["m","e","ng","g","a","m","b","a","r"]`, `letters: 9`, and `inBank` true
  for a fixture containing it.
- [ ] `GET /api/words/mat-matan` ignores the hyphen and returns `letters: 8`.
- [ ] `GET /api/words/nyanyi` returns `["ny","a","ny","i"]` and `letters: 4`.
- [ ] An ambiguous word such as `kain` returns `syllables: [1, 2]` and
  `needsReview: true`.
- [ ] `GET /api/words/zzzz` returns 200 with `inBank: false` and a computed
  analysis.
- [ ] Invalid input (empty, over 64 chars, `*`, space, `%` malformed) returns
  400 with `INVALID_WORD`.
- [ ] The response never includes internal token counts or mutable bank
  internals.

## Implementation Plan

1. Add `InvalidWordError` to `lib/errors.js` or reuse `InvalidQueryError` with a
   dedicated code. Prefer a dedicated class for clarity.
2. Implement `lib/analyze.js` as a pure function with no bank dependency.
3. Add the route. Compose analysis and bank lookup in the route:
   `const analysis = analyzeWord(req.params.word); const entry = bank.getWord(analysis.word);`.
4. Add tests for each acceptance case. Keep the fixture bank small but include
   a digraph word, a hyphenated word, and an ambiguous word.
5. Open a PR using branch `feat/0007-word-analysis-endpoint`, link it in the
   Status Log, and request one reviewer.

## Validation

```sh
npm test
npm start
curl -s http://127.0.0.1:3000/api/words/menggambar | jq
curl -s http://127.0.0.1:3000/api/words/mat-matan | jq
curl -s http://127.0.0.1:3000/api/words/kain | jq
curl -i http://127.0.0.1:3000/api/words/zzzz
curl -i "http://127.0.0.1:3000/api/words/bad%20word"
```

Cross-check the token output with:

```sh
node -e "console.log(require('./helpers/tokens').wordTokens('menggambar'))"
```

## Risks

- **URL encoding:** `req.params` is already decoded by Express; a second
  `decodeURIComponent` can throw on `%` input. Mitigation: wrap decoding in a
  try/catch and test it.
- **Source of truth:** computed analysis and stored bank fields should agree. A
  mismatch means the artifact is stale. Mitigation: log a warning and trust the
  stored values; do not fail the request.
- **Scope creep:** analysis is not a suggestion engine. Do not add prefix or
  similarity search here.
- **Unicode:** Indonesian dictionary entries are ASCII in this project. Reject
  other characters rather than silently normalizing them.

## Dependencies

- TASK-0006 (same route module and validation conventions).
- TASK-0004 (`bank.getWord`).

## Rollout/Backout Plan

Additive endpoint; revert to remove it. No data changes.

## Decisions Needed

- Unknown words return 200 with `inBank: false` rather than 404, because the
  analysis is still valid. Confirm this contract before implementation.

## Status Log

- 2026-10-21 — Created in `tasks/backlog`. Owner: TBD. Not started.
