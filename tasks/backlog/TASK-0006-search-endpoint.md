# TASK-0006: GET /api/words search endpoint

## Summary

Implement `GET /api/words`, the HTTP equivalent of the CLI search command, with
strict query validation, deterministic ordering, pagination, and a documented
response envelope.

## Context

`lib/wordBank.search()` already implements the matching semantics. This task
adds the HTTP contract: parameter names, validation bounds, error codes, and
pagination. Query behavior must remain identical to the CLI for `pattern`,
`has`, and `not`.

## Scope

### In scope

- Add `server/validation/wordQuery.js` with `parseWordQuery(query)`:
  - `pattern`: trimmed, lowercased; default `*`; max 64 chars; only
    `a-z`, `*`, and `-`.
  - `has`: trimmed, lowercased; default `""`; max 32 chars; only `a-z`.
  - `not`: trimmed, lowercased; default `""`; max 32 chars; only `a-z`.
  - `limit`: integer, default 100, range 1–1000.
  - `offset`: integer, default 0, range 0–100000.
  - Reject repeated parameters (Express yields an array) with a clear error.
  - Ignore unrecognized query parameters.
- Add `server/routes/words.js`:
  - `GET /api/words` → `{ query, total, limit, offset, results }`.
  - `results` entries: `{ word, letters, syllables, needsReview }`.
  - `total` is the full match count before pagination.
- Add error codes: `INVALID_PATTERN`, `INVALID_HAS`, `INVALID_NOT`,
  `INVALID_LIMIT`, `INVALID_OFFSET`, `INVALID_QUERY`.
- Register the route in `server/app.js`.
- Add `test/wordQuery.test.js` for the parser and extend `test/http.test.js`
  for the endpoint.

### Out of scope

- Word analysis endpoint (TASK-0007).
- CORS, rate limiting, and logging (TASK-0008).
- Fuzzy matching, relevance scoring, or syllable-count filtering.
- Returning the raw `tokens` array.

## Acceptance Criteria

- [ ] `GET /api/words?pattern=ny*nyian` matches `nyanyian`.
- [ ] `has` and `not` behave exactly as the CLI, including digraph semantics.
- [ ] `total` equals the number of matches before `limit`/`offset` are applied.
- [ ] `limit=0`, `limit=1001`, `offset=-1`, and non-integer values return 400
  with the documented error codes.
- [ ] Uppercase patterns are normalized rather than rejected.
- [ ] An empty `pattern` is treated as `*`.
- [ ] An offset beyond `total` returns 200 with an empty `results` array and the
  correct `total`.
- [ ] Repeated `pattern` parameters return 400.
- [ ] Responses never include internal token arrays.

## Implementation Plan

1. Implement and unit-test the query parser. Use a small helper that throws
   `InvalidQueryError` with `{ code, message }`.
2. Call `bank.search(filters)` from the route. Do not duplicate matching logic.
3. Keep response construction in one function so field names are consistent.
4. Add a 405 guard only if it comes for free; otherwise let the 404 handler
   cover unknown methods.
5. Add HTTP tests:
   - Exact match, wildcard match, digraph match.
   - `has` requiring a repeated letter (`aa`) and `not` banning a digraph.
   - Pagination with a fixture that has at least three matches.
   - Invalid inputs and the error envelope.
6. Open a PR using branch `feat/0006-search-endpoint`, link it in the Status
   Log, and request one reviewer.

## Validation

```sh
npm test
npm start
curl -s "http://127.0.0.1:3000/api/words?pattern=ba*a*a&limit=5" | jq
curl -s "http://127.0.0.1:3000/api/words?pattern=ny*nyian&has=ng" | jq
curl -i "http://127.0.0.1:3000/api/words?limit=0"
curl -i "http://127.0.0.1:3000/api/words?pattern=ba%20a"
```

Compare the first two results with:

```sh
node main.js "ba*a*a" --all
node main.js "ny*nyian" --has ng
```

## Risks

- **Validation drift from the CLI:** the CLI is permissive and lowercases
  internally. The API should accept the same inputs; only reject inputs that
  could not be valid patterns. Mitigation: parity tests and shared fixtures.
- **Pagination stability:** results depend on the artifact's sort order.
  Mitigation: TASK-0003 sorts and TASK-0004 asserts ordering.
- **Ambiguous parameter naming:** `not` is short but can be confused with
  negation. Mitigation: document it next to `has`; do not add aliases in v1.
- **CPU abuse:** very long patterns are cheap with the current glob matcher, but
  cap input length anyway.

## Dependencies

- TASK-0005 (app factory, error handler, fixture bank).
- TASK-0004 (`bank.search`).

## Rollout/Backout Plan

The endpoint is additive. Revert the commit to remove it; no data changes.

## Decisions Needed

- Invalid `limit` returns 400 rather than being clamped. This is explicit and
  easier to debug; confirm before implementation.

## Status Log

- 2026-10-21 — Created in `tasks/backlog`. Owner: TBD. Not started.
