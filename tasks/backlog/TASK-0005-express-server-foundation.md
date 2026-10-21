# TASK-0005: Express server foundation

## Summary

Add an Express 5 application factory, environment configuration, `GET /health`,
`GET /api/meta`, JSON 404/error handling, and a boot entry point with graceful
shutdown. No search endpoint yet; this task proves the server can start, serve,
and fail fast without a bank.

## Context

The API needs an app that can be created without binding a port, so HTTP tests
are fast and deterministic. Configuration and data loading must happen in the
entry point, not inside route handlers. The bank introduced in TASK-0004 is
injected into the app factory.

## Scope

### In scope

- Add runtime dependency `express@^5` and `helmet`; add dev dependency
  `supertest`.
- Add `server/config.js` with `loadConfig(env = process.env)`:
  - `port` (default `3000`, integer `1..65535`)
  - `host` (default `127.0.0.1`)
  - `dataDir` (default `data`)
  - `nodeEnv` (default `development`)
  - Throw `ConfigError` with a clear message on invalid values.
- Add `server/app.js` with `createApp({ bank, config })`:
  - `helmet()`
  - `express.json({ limit: '10kb' })`
  - `GET /health` → `{ "status": "ok" }`
  - `GET /api/meta` → `{ schemaVersion, generatedAt, wordCount, maxLetters }`
  - JSON 404: `{ "error": { "code": "NOT_FOUND", "message": "..." } }`
  - Centralized error handler: `AppError` → its status/code; unknown errors →
    500 with a generic message. Log the stack in non-production only.
  - The factory must not read files, bind a port, or call `process.exit`.
- Add `server/routes/meta.js`.
- Add `server/index.js`:
  - Load config, load the bank from `dataDir`, create the app, listen.
  - Log the bound host/port and word count.
  - Handle `SIGTERM` and `SIGINT`: stop accepting connections, close within 10
    seconds, then exit.
  - On startup failure, print `Error: <message>` and set exit code 1.
- Add `package.json` scripts `start` (`node server/index.js`) and
  `dev` (`node --watch server/index.js`).
- Add `test/http.test.js` using `supertest` and a fixture bank.

### Out of scope

- `GET /api/words` (TASK-0006) and word analysis (TASK-0007).
- CORS, rate limiting, and request logging (TASK-0008).
- Docker and deployment docs (TASK-0009).
- Authentication.

## Acceptance Criteria

- [ ] `createApp` can be called in tests without opening a port.
- [ ] `GET /health` returns 200 and `{ "status": "ok" }`.
- [ ] `GET /api/meta` returns the bank metadata and no word list.
- [ ] Unknown routes return 404 with the JSON error shape.
- [ ] Invalid `PORT` or `DATA_DIR` fails with a readable `ConfigError`.
- [ ] Starting without `data/word-bank.json` exits 1 with a message pointing to
  `node main.js --csv`.
- [ ] `SIGTERM` closes the server without an unhandled rejection.
- [ ] `test/http.test.js` passes without `data/` or network access.

## Implementation Plan

1. Install dependencies and add the scripts.
2. Create `server/config.js` and test it with a small unit test or table-driven
   assertions inside `test/http.test.js`.
3. Create `server/app.js`. Keep middleware order: security → body parser →
   routes → 404 → error handler.
4. Create `server/routes/meta.js` that reads only `bank.meta`.
5. Create `server/index.js`. Load the bank before calling `listen`; wire signal
   handlers; use `server.close()` with a timeout guard.
6. Add `test/http.test.js`:
   - Build a fixture bank with `createWordBank` from TASK-0004.
   - Assert health, meta, 404, and a deliberately thrown error through a test
     route or by calling the error handler directly.
7. Open a PR using branch `feat/0005-server-foundation`, link it in the Status
   Log, and request one reviewer.

## Validation

```sh
npm test
npm run sync && npm run csv     # only needed for a real boot
npm start
curl -i http://127.0.0.1:3000/health
curl -i http://127.0.0.1:3000/api/meta
curl -i http://127.0.0.1:3000/nope
```

Then stop the process with `Ctrl+C` and confirm a clean shutdown log.

## Risks

- **Express 5 differences:** route syntax and error propagation changed from
  Express 4. Mitigation: pin `^5` and test the 404 and error paths explicitly.
- **Config validation scope:** over-validating `HOST` can reject valid bind
  addresses. Mitigation: validate port strictly and only require a non-empty
  host string.
- **Error leakage:** returning stack traces in production is unsafe.
  Mitigation: gate details on `nodeEnv !== 'production'` and test the generic
  shape.
- **Startup coupling:** importing `server/index.js` in tests would start the
  server. Mitigation: keep all testable logic in `server/app.js`.

## Dependencies

- TASK-0004 (bank loader and fixture-friendly factory).
- TASK-0001 (lint/CI) for PR gates.

## Rollout/Backout Plan

The server is additive; the CLI remains untouched. Revert the commit to remove
the server. There is no data migration.

## Decisions Needed

- Confirm the default bind host. `127.0.0.1` is safer for local development;
  containers will override with `HOST=0.0.0.0` in TASK-0009.

## Status Log

- 2026-10-21 — Created in `tasks/backlog`. Owner: TBD. Not started.
