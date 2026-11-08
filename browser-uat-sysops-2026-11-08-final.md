# Browser UAT — SysOps Application relationship journey

## 1. Test charter

**Objective:** Verify whether an internal IT operator can open an Application, understand its Environment/component relationships, find the relevant Asset, VM, Logical Database, access point, and Document, and safely use representative role-controlled actions.

**Application under test:** SysOps, cloned repository in the shared workspace.

**Environment:** local production build (Next standalone frontend and compiled backend) at `http://localhost:3000`; isolated PostgreSQL acceptance database `sysops_ux_final_acceptance_20261107`; local Playwright Chromium for repeatable checks; Codex in-app browser for manual orientation. Admin and Viewer states. The user’s personal Chrome was not used in the final walkthrough.

**Test data:** deterministic Treasury Registry Application, PROD Web/API components, seeded Asset/VM/Database/Logical Database/Document records, plus isolated temporary records created and cleaned up by focused tests. The VM progressive-acceptance scenario can add `vm-e2e-needs-context` to the seed graph.

**Hypotheses:** (1) an operator can identify which infrastructure record belongs to a component; (2) a child Database link preserves its Logical Database context; (3) Environment and lifecycle states are visible where they affect interpretation; (4) Viewer cannot reveal or change secrets; (5) failed copy auditing does not change clipboard contents.

**Success criteria:** expected record identity and state are visible; selected-child navigation reaches the intended Logical Database; role restrictions match the V1 behavior; high-risk failures are reported in the UI without unintended data or clipboard change; targeted V1/V1.1 journeys pass on a fresh fixture.

**Known risks / out of scope:** no production VM deployment, real organizational inventory, live vCenter or database connection, backup/recovery validation, full suite completion, complete keyboard/screen-reader test, or browser console/network diagnostic session.

## 2. Readiness and method

- Confirmed the local backend used only the isolated acceptance database; seed output verified the Application, VM, Database, Document, and credential fixtures.
- Checked an Admin and a Viewer session. Focused E2E used existing local authentication states and ran with one worker after reseeding to avoid shared-fixture mutation races.
- Final selected run: 25 tests passed in 1.6 minutes. The command covered `application-relationships.spec.ts`, `assets-crud.spec.ts`, `asset-credential-metadata-preservation.spec.ts`, `database-v1-acceptance.spec.ts`, `vm-v1-acceptance.spec.ts`, `docs-crud.spec.ts`, `document-header-navigation.spec.ts`, and `lazy-dialog-loading.spec.ts`.
- Captured 13 final screenshots in [`browser-uat-sysops-2026-11-08-final-evidence/`](browser-uat-sysops-2026-11-08-final-evidence/). E2E assertions also verify mutation responses and state transitions; not every mutation step has a separate saved screenshot.

## 3. Scenario results

| Scenario | Expected | Actual | Evidence | Severity | Likely cause | Next action |
|---|---|---|---|---|---|---|
| Application topology — Admin | Component lists identify linked Assets, VMs and Logical Databases; links open the correct record. | Pass. Web→Asset, Web→VM, Web→registry and API→audit reached named detail records. | `02`–`05` | None | — | Keep the component-local relationship structure. Validate with organization-scale data before deployment. |
| Application topology — Viewer | Viewer sees operational relationships and lifecycle state without mutation controls. | Pass. Viewer followed the relationship journey; edit controls were absent. | `11` | None | — | Preserve the role boundary while adding future detail. |
| Selected Logical Database | Registry and audit links identify and focus the selected child on the Database page. | Pass on desktop and mobile; target article is visible at the child anchor. | `05`, `10` | None | — | Retain the URL fragment and focus behavior. |
| Application list summary | Show owner, Environment, unique linked-record total, and access context. | Pass. The retained mobile acceptance snapshot shows 6 distinct records (1 Asset, 3 VMs, 2 Logical Databases). E2E derives the expected count from the current API relationship projection, so persisted fixture records do not create a false failure. | `01`, `07`, `12-mobile-access-summary.png` | None | Count depends on the current linked records. | Keep the count tied to actual topology; avoid a fixed fixture-size assertion. |
| Primary access context | A primary URL is identifiable by owning Environment and can be opened. | Pass. Desktop and mobile show `Primary access · UAT` with the address link. | `12-mobile-access-summary.png` | None | — | Keep Environment beside the address. |
| Asset lifecycle and responsibility | Primary/Shared relationship and archived state explain why the record appears. | Pass. A shared Asset includes responsible party; archived Asset scenario verified for Admin and Viewer. | `11-shared-asset-responsibility.png`; E2E assertion | None | — | Retain status and relationship labels. |
| Viewer credentials | Viewer can understand linked account context without reveal/copy controls. | Pass. Username, role, scope and masked password are visible; secret actions are absent. | `13-viewer-vm-credentials.png`, `14-viewer-database-credentials.png` | None | — | Keep account context distinct from secret actions. |
| Copy audit failure | If audit fails, the UI explains the failure and no clipboard write is attempted. | Pass for VM and Database with intercepted 503 responses and a test-only accessible write counter that remains zero. | `12-vm-copy-audit-failure.png`, `13-database-copy-audit-failure.png` | None | — | Keep audit-before-copy ordering and error feedback. |
| Asset credential edit | Editing unrelated Asset fields preserves a credential type that differs from Access Point metadata. | Pass. After save and reload, the visible account still shows type `OS`; earlier isolated API inspection checked stored node-label and method values. | E2E assertion in `asset-credential-metadata-preservation.spec.ts` | None | — | Keep the regression in the focused set. |
| Document orientation | Document detail shows its own title and breadcrumb after Application navigation; edit/save and onward navigation return to the correct state. | Pass. | `06-linked-document-admin-desktop.png`; header E2E assertions | None | — | Keep the pathname-synchronized header. |
| VM/Database acceptance | V1/V1.1 lifecycle, incomplete context, account scope, archive/restore, and Viewer restrictions work against seeded data. | Pass in focused selected suite. | V1 acceptance E2E assertions | None | — | Run full suite before a production release decision. |
| Empty access and completeness label | A missing access point is clearly distinguishable from profile/topology completeness. | Observed: detail says “No access points”; list shows “Profile & topology Complete 100%” and access count 0. Code defines completeness without access. The separate label scopes the metric, but the product owner should confirm that this is intentional. | `02`, `07`; `backend/src/data-quality/completeness.ts` | Minor open question | Metric definition is narrower than overall operational readiness. | Confirm whether V1 should keep access separate; do not silently change the evaluator. |

## 4. Outcome matrix

| Approach | Outcome | Evidence | Pros | Cons | Guidance |
|---|---|---|---|---|---|
| Codex in-app browser walkthrough | Observed key routes and the user-visible relationship hierarchy. | Screenshots `01`–`11`; manual browser observations. | Uses the requested Codex browser instead of the user’s Chrome profile. | No DevTools console/network diagnostic session. | Use again for human-oriented spot checks; add DevTools only if the user wants that diagnostic surface. |
| Playwright on local production build | 25/25 focused tests passed serially. | Focused E2E suite; screenshots `12` and `13` capture copy failures. | Repeats seeded role, lifecycle and error scenarios with semantic locators. | Not the full repository suite; one worker needed because shared test records are mutable. | Keep this targeted suite serial until data isolation is improved. |
| Isolated PostgreSQL seed | Deterministic Application, VM, Database and Document fixtures. | Final seed was explicitly directed to `sysops_ux_final_acceptance_20261107`, then the selected suite passed. | Provides a repeatable acceptance baseline. | `.env` defaults to a separate local development database; an earlier seed invocation upserted development fixtures there before the database split was identified. | Keep the database name explicit when seeding or testing; note fixture mutation and test order. |

## 5. What did not work and failure classification

1. **Direct `npx playwright` invocation without the project dotenv script** could not authenticate because the local API configuration was absent. **Classification: test harness limitation.** The repository command `npm run test:e2e -- --config=playwright.local-audit.config.ts` loads the expected local environment and worked.
2. **An 8-worker exploratory run** produced failures while several tests archived, restored, or promoted shared acceptance records; it also exposed duplicate accessible text in an account assertion. **Classification: test harness/data-isolation limitation.** After reseeding, locator scoping, and running one worker, the same selected suite passed 25/25. The 8-worker run is not counted as the final result.
3. **The first mobile summary assertion expected a fixed count of five while the observed topology contained six distinct records.** The snapshot and API projection show 1 Asset, 3 VMs, and 2 Logical Databases. **Classification: test expectation/fixture-state mismatch, not a product defect.** E2E now computes a type-qualified unique-ID total from the current API projection; the UI count matches it.
4. **The first seed command used the local `.env` database (`infrapilot_db`) instead of the running acceptance stack's isolated database.** It upserted development fixtures there and reset only the seed's named `vm-e2e-needs-context` fixture; the active audit stack was on a different database. The acceptance database was then seeded explicitly and verified by API before the final run. **Classification: environment-selection mistake, corrected.** Keep `DATABASE_URL` explicit for future seeding.
5. **The Document header assertion failed once in an earlier selected run.** It then passed six consecutive targeted repeats and the final selected 25-test run without a further source change. **Classification: intermittent, not reproduced; root cause unknown.** Keep the regression and recheck if it appears again.
6. **Full repository E2E and production infrastructure validation were not run.** **Classification: out of scope for this scoped pass.** These remain release-readiness work, not passing results.

No repeatable product failure was observed in the final selected scenarios. One earlier Document-header failure remains unexplained and is recorded above.

## 6. Evidence index

All paths are relative to `browser-uat-sysops-2026-11-08-final-evidence/`.

| Screenshot path | Scenario | What it proves | Caveats |
|---|---|---|---|
| `01-applications-admin-desktop.png` | Application list, Admin | Owner, Environment, access and unique linked-record summary. | Fixture count changes when acceptance scenarios add linked records. |
| `02-application-detail-admin-desktop.png` | Application topology | Named records grouped under Web/API with relation and lifecycle labels. | Seed data, not organization production data. |
| `03-linked-asset-admin-desktop.png` | Linked Asset | Asset detail and return context. | Representative record only. |
| `04-linked-vm-admin-desktop.png` | Linked VM | VM detail and Application return path. | No live vCenter action. |
| `05-linked-database-admin-desktop.png` | Selected Logical Database | Database detail opened with `registry` selected and focused. | No live database connection. |
| `06-linked-document-admin-desktop.png` | Document orientation | Correct Document header and Knowledge Base breadcrumb. | Seeded document. |
| `07-applications-admin-mobile-390.png` | Mobile Application list | Summary readable at 390px; six distinct linked records shown. | The visible count reflects the current acceptance topology. |
| `08-application-detail-admin-mobile-390.png` | Mobile topology | Component relationships at phone width. | One viewport only. |
| `09-linked-vm-admin-mobile-390.png` | Mobile VM | VM and linked account context. | Secret remains masked. |
| `10-linked-database-admin-mobile-390.png` | Mobile Database | Selected child context remains visible at phone width. | Long-name density not tested. |
| `11-application-detail-viewer-desktop.png` | Viewer role | Read-only Application detail. | Does not represent every Viewer permission. |
| `12-vm-copy-audit-failure.png` | VM copy failure | Error feedback is visible after audit endpoint returns 503. | The E2E write-count check is test-only instrumentation. |
| `13-database-copy-audit-failure.png` | Database copy failure | Error feedback is visible after audit endpoint returns 503. | The E2E write-count check is test-only instrumentation. |

## 7. Risks and recommended path forward

- Verify the grouped topology with a representative, denser organization dataset before an internal VM deployment.
- Add a held-chunk regression for the Asset lazy form and complete the loading, empty, and error state matrix for these six routes.
- Run the full E2E suite against isolated data, followed by deployment-specific DB, backup/recovery, and live integration checks.

This report is limited to the scoped local UAT; it is not a production deployment approval.
