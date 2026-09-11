# V1.1 Release Acceptance Evidence — 2026-09-11

## Result

**PASS for the current working tree and isolated production Compose acceptance stack.**

This evidence closes the implementation/runtime gate for the V1.1 consistency and realistic-acceptance scope. No Git push, merge, deployment, or mutation of the user's main database was performed.

## Product and test changes covered

- Shared loading, error, forbidden, not-found, empty, filtered-empty, retry, and stale-refresh behavior across accepted list/detail surfaces.
- Truthful Dashboard/Data Quality failure states; unavailable data is not rendered as zero or empty inventory.
- Application search/archive/restore action reliability, sticky row actions, status semantics, and accessible action labels.
- Shared row actions/status badges and document/category/detail editor query-state handling.
- Production verifier packaging: the runner contains only the golden verifier source it needs; the rest of the application source remains excluded.
- Query-state E2E uses the configured Playwright base URL rather than a hard-coded development origin.

## Verification matrix

| Gate | Evidence |
| --- | --- |
| Frontend lint | PASS — `npm run lint` |
| Frontend production build | PASS — Next.js 16.3.4, TypeScript completed with no issues |
| Backend unit tests | PASS — 48 suites, 184 tests |
| Backend build | PASS — TSC 0 issues, 141 files compiled |
| Backend ESLint | PASS — 0 errors; one pre-existing warning in `vm.curation-contract.service.spec.ts:38` |
| Fresh migrations | PASS — all 37 migrations applied and `prisma migrate status` is up to date |
| Fresh normal seed | PASS — deterministic Users/Application/Asset/VM/Database/Document fixtures |
| Golden invariant verifier | PASS — 10/10 checks, 0 violations on a fresh normal-seed database |
| Dense fixture verifier | PASS — 225 Assets, 225 Databases, 1,025 VM Inventory, 1,025 VM Discoveries, 125 Audit Logs; marker `T16-DENSE-RELEASE` |
| Full browser acceptance | PASS — Playwright 102/102, serial worker, production HTTPS gateway |
| HTTPS runtime | PASS — `/api/health/live` and `/api/health/ready` return 200 |
| HTTP redirect | PASS — HTTP returns 308 to HTTPS |
| Auth cookie | PASS — login returns 200 with Secure, HttpOnly, SameSite=Lax flags |
| Restart persistence | PASS — database fingerprint and upload marker SHA-256 unchanged after force-recreate |
| Compose contract | PASS — exactly backend/frontend/gateway/postgres, no PostgreSQL host port, persisted uploads, same-origin `/api`, healthchecks, Caddy TLS/redirect |
| Diff hygiene | PASS — `git diff --check` |

## Runtime details

- Acceptance project: `infrapilot-e2e-release-final-20260911`
- Isolated dense database: `infrapilot_e2e_dense_release_final_20260911`
- All four Compose services were healthy after the final backend image rollout.
- Persistence fingerprint before/after recreate: `a639f24c0d0e641ca1d0e25cd64463a6bcc0f259c5ab8d9ff822e824a9f0310e`
- Upload marker fingerprint: `7eb0434dabf1b84699e8b4b6b24f5e7404d4743f793b5fc92a52ec75e4a296a5`

## Boundaries

The acceptance stack uses deterministic local fixtures and disables vCenter mock mode. It does not claim connectivity to an external vCenter, production data quality, production credentials, or an authorized production deployment. Those require a separately approved environment and change window.
