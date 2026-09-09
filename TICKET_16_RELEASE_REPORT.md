# Ticket 16 release regression report

Date: 2026-09-09
Branch: `agent/v1.1-16-dense-data-release-regression-gate`
Verdict: **BLOCKED — dense-data gate passes, but the complete V1.1 release gate is not green.**

## Scope delivered

- `backend/prisma/generate-dense-fixture.ts` creates a deterministic, marker-scoped fixture only when an explicit isolated acceptance/test database URL is supplied. It rejects missing URLs and main/production database names, uses synthetic values only, and never creates credentials.
- `backend/prisma/verify-dense-fixture.ts` verifies the persisted fixture counts and emits a machine-readable report.
- `frontend/e2e/dense-data-release-regression-v1-1.spec.ts` exercises the real frontend/backend/PostgreSQL path without `page.route` mocking. It covers server-authoritative boundary searches, page metadata, old audit records, selected-item retention, and persisted Document links for Asset/Database/VM records beyond the historical caps.
- `backend/package.json` adds the repeatable `generate:dense` and `verify:dense` commands.

Fixture minimums and persisted counts:

| Dataset | Minimum | Actual |
| --- | ---: | ---: |
| Assets | 225 | 225 |
| Databases | 225 | 225 |
| VM Inventory | 1,025 | 1,025 |
| VM Discovery | 1,025 | 1,025 |
| Audit Logs | 125 | 125 |

## Ticket 16 evidence

All of the following used isolated PostgreSQL databases in the dedicated acceptance container; the main/production database was not reset or modified.

- Dense fixture generation passed twice with identical deterministic IDs and counts.
- `npm run verify:dense -- --database-url <redacted> --json` passed with `passed: true` and the counts above.
- The generator safety checks passed: no explicit `--database-url` exited 2; a main database URL was refused and exited 2.
- Ticket 16 Playwright run passed: **5 passed (9.6s)**. This included the three existing setup tests and the two dense-data gate tests.
- Ticket 13 golden verifier on the normal-plus-dense acceptance data passed: **10 checks, 0 failures/violations**.
- Ticket 14 and Ticket 15 real-runtime regression tests passed: **6 passed (1.3m)**.

## Build and test evidence

- Backend build: passed.
- Backend TypeScript seed compilation: passed.
- Backend focused contract tests: **4 suites, 22 tests passed**.
- Backend full unit suite: **48 suites, 180 tests passed**. Existing invalid-input tests emit expected `console.error` output while passing.
- Frontend ESLint: passed, exit code 0.
- Frontend TypeScript check: passed.
- Frontend production build: passed.
- `git diff --check`: passed.

## Release-gate blocker

The broad existing V1 Playwright run against a fresh normal acceptance database was not green. It reported these four existing failures before the run was stopped; they are outside Ticket 16 and were not changed:

1. `frontend/e2e/admin-audit-logs.spec.ts:27` — timeout while clearing the audit-log search.
2. `frontend/e2e/assets-crud.spec.ts:57` — `OS / Firmware Version` field was not found.
3. `frontend/e2e/assets-detail.spec.ts:26` — exact `SERVER` content was not visible.
4. `frontend/e2e/assets-list.spec.ts:179` — `Clear owner filter` matched two controls under strict locator mode.

The full V1 run therefore cannot be reported green. HTTPS redirect/secure-cookie/gateway-health and a fresh process-restart persistence pass were not re-run in this worker, so they remain unconfirmed current evidence. This report intentionally does not claim a release PASS or repair those out-of-scope failures.

## Audit finding coverage

The 47 findings in `SYSTEM_CONSISTENCY_AUDIT_2026-09-08.md` are mapped to the integrated ticket ownership below. Ticket 16 directly adds the final SCL-002 and historical-cap evidence; it does not reimplement dependency contracts.

| Findings | Owning ticket / evidence |
| --- | --- |
| CXR-001..006 | Tickets 01–02; Ticket 14 cross-domain runtime evidence |
| APP-001 | Ticket 05 |
| APP-002..006 | Ticket 04 |
| APP-007 | Ticket 03; Ticket 16 Asset/VM/Database boundary evidence |
| AST-001..006 | Ticket 06 |
| VM-001/002/004/005/006/007 | Ticket 07 |
| VM-003 | Ticket 08; Ticket 16 VM Inventory/Discovery boundary evidence |
| DB-001..005 | Ticket 09 |
| VCS-001..003 | Ticket 10 |
| DOC-001/002 | Tickets 03 and 11; Ticket 16 persisted Document-link evidence |
| AUD-001/002 | Ticket 12, with AUD-002 coordinated with Ticket 10 |
| USR-001/002 | Ticket 12 |
| DQ-001 | Ticket 12 |
| DQ-002/003 | Ticket 07; Ticket 14 runtime evidence |
| SCL-001 | Tickets 03 and 11 |
| SCL-002 | Ticket 08 implementation; Ticket 16 dense-data regression gate |
| REL-001/002 | Tickets 04, 09, 13, and 15; Ticket 13 verifier passed |

The remaining release blockers are the four broad-suite failures and the unconfirmed current HTTPS/restart checks above. They require supervisor direction or a later scoped ticket; they are intentionally not fixed here.

## Follow-up evidence addendum — 2026-09-09

The four originally reported specs were rerun against a fresh isolated PostgreSQL database with local HTTP frontend/backend fallback because the local HTTPS-by-IP path is blocked by the known TLS/SNI issue.

Final focused run:

- Command: `playwright test e2e/admin-audit-logs.spec.ts e2e/assets-crud.spec.ts e2e/assets-detail.spec.ts e2e/assets-list.spec.ts --project=chromium --workers=1 --retries=0`
- Result: **18 passed, 2 failed (1.6m)**, including three setup tests.
- `assets-crud`, `assets-detail`, and the original owner-clear locator failure were test locator/expectation drift and are fixed only in their spec files.
- `admin-audit-logs.spec.ts:35` remains a product/UI-state blocker: once a search returns filtered-empty, `InventoryQueryStateView` replaces the page content and removes the search input, so the test cannot clear the active search.
- `assets-list.spec.ts:192` exposes the same product/UI-state blocker after a no-match owner filter: the `Clear filters` button is removed with the filtered-empty content.

HTTP restart-persistence check passed against the isolated seeded database:

- Before restart: Asset API HTTP 200, seeded `DEV-ASSET-001` present, Asset count 10.
- Backend restarted with the same database and signing configuration.
- After restart: readiness HTTP 200, Asset API HTTP 200, `DEV-ASSET-001` still present, Asset count still 10.

HTTPS remains **BLOCKED** by the previously recorded Windows Schannel/Node IP-SNI handshake failure. Secure/HttpOnly cookie verification was not claimed from HTTP. All local processes, the temporary database, Playwright artifacts, Next build artifacts, logs, and generated Next agent files were removed after the run.
