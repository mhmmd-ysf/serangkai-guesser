# TASK-0008: Operational hardening — CORS, rate limiting, logging

## Summary

Add CORS configuration, per-IP rate limiting, structured request logging, proxy
trust, and corresponding tests so the API is safe to expose beyond localhost.

## Context

The v1 API is read-only and has no authentication. The main risks are unbounded
request volume, unexpected cross-origin usage, and missing visibility into
errors. The bank is in memory, so rate limits protect CPU rather than a
database.

## Scope

### In scope

- Add runtime dependencies `cors` and `express-rate-limit`.
- Extend `server/config.js`:
  - `corsOrigin`: comma-separated allowlist, `*`, or empty (same-origin only).
    Default empty.
  - `rateLimitWindowMs`: default `60000`.
  - `rateLimitMax`: default `120`.
  - `trustProxy`: boolean, default `false`.
  - Validate all values and throw `ConfigError` on invalid input.
- Add `server/middleware/logger.js`:
  - Log `method`, `path` (no query string), `status`, and `durationMs` as one
    JSON line.
  - Disabled when `nodeEnv === 'test'`.
  - Never log request bodies or environment secrets.
- Add `server/middleware/rateLimit.js` or wire `express-rate-limit` directly in
  `server/app.js`:
  - Apply to `/api/*` only; keep `/health` unlimited for probes.
  - Standard headers enabled; legacy headers disabled.
  - 429 response uses the standard error envelope:
    `{ "error": { "code": "RATE_LIMITED", "message": "..." } }`.
- Add CORS:
  - No credentials.
  - Allow `GET` and `OPTIONS`.
  - Reflect only configured origins; reject others without throwing.
  - Handle preflight with 204.
- Update `server/app.js` middleware order: trust proxy → logger → helmet →
  CORS → body parser → rate limit → routes → 404 → error handler.
- Update the README environment table.
- Add tests:
  - Allowed origin gets `Access-Control-Allow-Origin`.
  - Disallowed origin does not get the header.
  - Preflight returns 204.
  - Rate limit returns 429 after the configured number of requests.
  - Logger is silent in tests and emits one line per request in development
    (capture stdout with a test helper).
  - `/health` is not rate limited.

### Out of scope

- Authentication or API keys.
- A shared rate-limit store (Redis). Single-instance in-memory counters are
  acceptable for v1; document the limitation.
- WAF, TLS termination, or reverse-proxy configuration.
- Metrics or tracing.

## Acceptance Criteria

- [ ] Default config (no `CORS_ORIGIN`) does not grant cross-origin access.
- [ ] `CORS_ORIGIN=*` works for demos and is documented as unsafe for
  credentialed APIs (this API has no credentials).
- [ ] An allowlisted origin receives the header; a non-allowlisted origin does
  not.
- [ ] Request N+1 within the window returns 429 with `RATE_LIMITED`.
- [ ] `/health` remains reachable after the `/api/*` limit is exhausted.
- [ ] Logs contain no query strings, bodies, or secrets.
- [ ] Invalid numeric env values fail startup with `ConfigError`.
- [ ] All existing HTTP tests still pass.

## Implementation Plan

1. Add dependencies and config fields with validation.
2. Add the logger middleware and unit-test its output shape with a fake `res`.
3. Wire `express-rate-limit` with injected `windowMs` and `max` from config so
   tests can use very low values.
4. Wire `cors` with an origin callback that checks the allowlist.
5. Update middleware order and the README table.
6. Add HTTP tests using low limits and a fixture bank.
7. Open a PR using branch `feat/0008-api-hardening`, link it in the Status Log,
   and request one reviewer.

## Validation

```sh
npm test
CORS_ORIGIN=http://localhost:5173 RATE_LIMIT_MAX=3 npm start
curl -i -H "Origin: http://localhost:5173" http://127.0.0.1:3000/api/meta
curl -i -H "Origin: http://evil.example" http://127.0.0.1:3000/api/meta
curl -i -X OPTIONS -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" http://127.0.0.1:3000/api/words
for i in 1 2 3 4; do curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/words; done
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/health
```

The four `/api/words` calls should end with `429`; the health call should stay
`200`.

## Risks

- **Proxy IP handling:** behind a load balancer, all requests share one IP
  unless `TRUST_PROXY` is enabled correctly. Enabling it blindly allows clients
  to spoof `X-Forwarded-For`. Mitigation: default `false` and document the
  setting.
- **Per-instance limits:** horizontal scaling multiplies the effective limit.
  Acceptable for v1; note it in the README.
- **CORS misconfiguration:** `*` plus credentials would be unsafe. This API has
  no credentials, and credentials are explicitly disabled.
- **Log volume:** per-request JSON logs can be noisy. Mitigation: disable in
  tests and document that a log shipper is the deployment's responsibility.

## Dependencies

- TASK-0006 and TASK-0007 (stable route set).
- TASK-0005 (config/app factory).

## Rollout/Backout Plan

Ship behind environment defaults that preserve local behavior (no CORS, 120
requests/minute). If limits are too strict, raise `RATE_LIMIT_MAX` without a
code change. Revert the commit to remove the middleware entirely.

## Decisions Needed

- Confirm the default rate limit (`120` requests per minute per IP) is
  acceptable. If the API will back a public frontend with many concurrent
  users, plan a shared store before launch.

## Status Log

- 2026-10-21 — Created in `tasks/backlog`. Owner: TBD. Not started.
