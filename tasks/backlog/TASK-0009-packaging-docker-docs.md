# TASK-0009: Packaging, scripts, Docker, and documentation

## Summary

Make the API reproducible to run and deploy: finalize npm scripts and package
metadata, add a non-root Docker image with a health check, and document every
endpoint, environment variable, and data prerequisite.

## Context

`data/` is gitignored, the dictionary sync requires network access and a
`DICTIONARY_API_URL`, and the server fails fast when the artifact is missing.
Deployment therefore needs an explicit data-delivery step. Without that, a
container built from a fresh checkout will exit at startup.

The CLI and API share one `package.json`, so publishing must be considered.

## Scope

### In scope

- `package.json`:
  - Add `"private": true` to prevent accidentally publishing an API package.
  - Set `"engines": { "node": ">=20" }`.
  - Scripts: `sync` (existing), `csv` (`node main.js --csv`), `build:data`
    (`npm run sync && npm run csv`), `start`, `dev`, plus the lint/format
    scripts from TASK-0001.
- `Dockerfile`:
  - Base `node:22-alpine`.
  - `npm ci --omit=dev`.
  - Copy `server/`, `lib/`, `helpers/`, `sources/`, `main.js`, `package*.json`,
    and `data/`.
  - Run as the existing non-root `node` user with correct ownership.
  - `ENV NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=3000`.
  - `HEALTHCHECK` using Node's built-in `fetch` against `/health`.
  - `CMD ["node", "server/index.js"]`.
- `.dockerignore`: `node_modules/`, `.git/`, `.env`, `tasks/`, `test/`,
  coverage, and editor files. Do **not** ignore `data/`, because the image build
  consumes the generated artifact.
- README:
  - "REST API" section with endpoint table, parameters, response examples, and
    error codes.
  - "Running the server" with `npm run build:data` then `npm start`.
  - Environment variable table, including the new server variables from
    TASK-0008.
  - Deployment section describing both data strategies:
    1. Generate `data/` in CI before `docker build`, then copy it into the
       image.
    2. Build a data-only step and mount a volume at `DATA_DIR` at runtime.
  - Explicit note that `DICTIONARY_API_URL` is a build/CI concern, not a runtime
    requirement.
- Optional: a `scripts/smoke.sh` that hits `/health`, `/api/meta`, and one
  search against a running instance, exiting non-zero on failure. Include only
  if it stays small and dependency-free.

### Out of scope

- A CI/CD deployment pipeline for a specific host.
- Kubernetes manifests, Terraform, or cloud-specific configuration.
- Publishing to npm.
- TLS termination or domain setup.

## Acceptance Criteria

- [ ] `npm run build:data` regenerates all three artifacts.
- [ ] `npm start` serves `/health` and `/api/meta` locally.
- [ ] `docker build -t serangkai-api .` succeeds when `data/word-bank.json`
  exists in the build context.
- [ ] The image runs as a non-root user.
- [ ] `docker run --rm -p 3000:3000 serangkai-api` passes its health check.
- [ ] Building without `data/` fails at the `COPY` step with a clear Docker
  error, and running the image with `DATA_DIR` pointed at an empty mounted
  directory exits 1 with the app's “run `node main.js --csv`” style message.
- [ ] README examples are copy-paste valid and match the implemented routes.
- [ ] No secrets, `.env`, or generated data are committed.

## Implementation Plan

1. Finalize `package.json` metadata and scripts. Verify `npm ci` still works.
2. Write the `Dockerfile` and `.dockerignore`. Keep the image single-stage
   unless a build step becomes necessary.
3. Verify the artifact copy fails loudly and early when data is missing.
4. Run the image locally, check the non-root user with `id`, and confirm the
   health check.
5. Rewrite the README sections. Keep the existing CLI documentation intact and
   add the API as a new section rather than replacing content.
6. Add the optional smoke script only if it is under ~40 lines and needs no new
   dependency.
7. Open a PR using branch `chore/0009-packaging-docs`, link it in the Status Log,
   and request one reviewer. Include the exact `docker run` command and health
   output in the PR description.

## Validation

```sh
npm ci
npm run lint
npm run format:check
npm test
npm run build:data
npm start &
curl -s http://127.0.0.1:3000/health
curl -s http://127.0.0.1:3000/api/meta
curl -s "http://127.0.0.1:3000/api/words?limit=1"
kill %1

docker build -t serangkai-api .
docker run --rm -p 3000:3000 serangkai-api
```

For the data-missing paths, verify both failure modes:

1. Build from a context without `data/` and confirm Docker fails at `COPY` with
   an obvious missing-file error.
2. Run the built image with an empty directory mounted at `DATA_DIR` and confirm
   the process exits 1 with the app's actionable message.

## Risks

- **Large image / build context:** `data/` and `node_modules/` can inflate the
  context. Mitigation: `.dockerignore` excludes dependencies but not the
  generated artifact.
- **Secrets in image layers:** never pass `DICTIONARY_API_URL` as a build arg.
  Generate data before the build and copy only the artifact.
- **Data staleness:** the image serves whatever was generated at build time.
  Document the rebuild cadence and expose `generatedAt` through `/api/meta`.
- **Package publishing:** adding server dependencies to a package intended for
  npm would bloat installs. `"private": true` prevents accidental publication.
- **Health check environment expansion:** use `process.env.PORT` inside a Node
  one-liner rather than shell substitution, which differs across exec forms.

## Dependencies

- TASK-0006, TASK-0007, TASK-0008 (final route and middleware surface).
- TASK-0001 (lint/format scripts).

## Rollout/Backout Plan

The container is a new artifact; the CLI remains installable as before. If a
release is bad, roll back to the previous image tag. Data can be regenerated
from the same source at any time; there is no schema migration in v1.

## Decisions Needed

- **Data delivery:** choose CI-generated artifact (recommended for immutable
  deploys) or runtime volume mount (recommended if the dictionary changes
  frequently without code changes). The README should document the chosen
  default and the alternative.
- **Image registry and host:** not part of this task; record the target in the
  PR description so the follow-up deployment task can reference it.

## Status Log

- 2026-10-21 — Created in `tasks/backlog`. Owner: TBD. Not started.
