## Parent

#4 — Spec: V1 internal infrastructure inventory

## What to build

Establish a deterministic, green implementation baseline so every later V1 slice starts from supported dependencies, a clean test database, and trustworthy CI evidence rather than inheriting known lint or runtime ambiguity.

## Acceptance criteria

- [ ] Backend build, lint, unit tests, and HTTP integration tests pass with no existing exceptions.
- [ ] Frontend build, lint, unit tests, and Playwright harness self-tests pass.
- [ ] The isolated acceptance stack can create a fresh database from migrations and explicit development fixtures.
- [ ] Test fixtures never run in production configuration and contain no production default credentials.
- [ ] Dependency advisories are classified and remediated or explicitly documented with verified runtime-compatible constraints; no force upgrade is used without regression evidence.
- [ ] CI records raw results for all required checks and cannot report success when a required process or database preflight failed.
- [ ] The repository documents the supported Node and container runtime baseline used by CI and deployment.

## Blocked by

- None (can start immediately).
