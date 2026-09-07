# V1 Ticket Index

Parent specification: [GitHub #4](https://github.com/somkid-s5/IT-Asset-Inventory/issues/4)

All tickets have status `ready-for-agent`. Blocking issue references are recorded in each ticket body.

| Order | Ticket | GitHub |
| --- | --- | --- |
| 01 | Establish a green implementation baseline | [#5](https://github.com/somkid-s5/IT-Asset-Inventory/issues/5) |
| 02 | Rebuild the shared UI system and Dashboard summary | [#6](https://github.com/somkid-s5/IT-Asset-Inventory/issues/6) |
| 03 | Complete authentication, users, and audit journeys | [#7](https://github.com/somkid-s5/IT-Asset-Inventory/issues/7) |
| 04 | Deliver Application topology and access | [#8](https://github.com/somkid-s5/IT-Asset-Inventory/issues/8) |
| 05 | Connect Hardware Assets to Application topology | [#9](https://github.com/somkid-s5/IT-Asset-Inventory/issues/9) |
| 06 | Complete the vCenter and VM Inventory lifecycle | [#10](https://github.com/somkid-s5/IT-Asset-Inventory/issues/10) |
| 07 | Model Database Instances and Logical Databases | [#11](https://github.com/somkid-s5/IT-Asset-Inventory/issues/11) |
| 08 | Link canonical Documents and preserve direct sharing | [#12](https://github.com/somkid-s5/IT-Asset-Inventory/issues/12) |
| 09 | Deliver the Global Search Command Palette | [#13](https://github.com/somkid-s5/IT-Asset-Inventory/issues/13) |
| 10 | Unify Data Quality and Dashboard attention | [#14](https://github.com/somkid-s5/IT-Asset-Inventory/issues/14) |
| 11 | Generate the encrypted Sensitive Inventory Workbook | [#15](https://github.com/somkid-s5/IT-Asset-Inventory/issues/15) |
| 12 | Deploy the HTTPS IP-based Compose stack | [#16](https://github.com/somkid-s5/IT-Asset-Inventory/issues/16) |
| 13 | Integrate and verify V1 | [#17](https://github.com/somkid-s5/IT-Asset-Inventory/issues/17) |

## Execution frontier

1. Start with #5.
2. Continue through #6, #7, and #8.
3. After #8, #9 through #12 can proceed independently, subject to their recorded blockers.
4. #13 and #14 begin after the four inventory/document slices complete.
5. #15 begins after the credential-bearing inventory slices complete.
6. #16 can proceed after #5 and #7.
7. Final integration begins only after every preceding ticket is complete.

## Ticket 05 completeness gaps (2026-09-06)

The Product/Data/UX audit in `docs/agents/ASSET_GAP_AUDIT_2026-09-06.md` found Ticket 05 partially implemented. Before treating Hardware Assets as complete, execute these tracer slices:

- `05a-asset-governance-context.md` — close the Data Quality -> edit -> detail remediation loop.
- `05b-asset-operational-filters.md` — expose existing server-side owner/location/environment filtering as usable UI.
- `05c-asset-parent-picker.md` — make parent selection independent from the current paginated table page and validate hierarchy integrity.
- `05d-asset-domain-semantics-decision.md` — define authoritative Environment and lifecycle-vs-MA semantics.
- `05e-asset-semantics-cleanup.md` — apply the approved non-destructive UI semantics cleanup.
- `05f-slim-asset-list-and-complete-type-navigation.md` — slim the Asset list contract and expose every approved Asset type.
- `05g-asset-application-relation-contract.md` — make Primary/Shared Application Component relationships explicit and enforce the one-primary invariant across Asset and Application write paths.
- `05h-remove-legacy-asset-bulk-endpoints.md` — remove retired bulk import/update attack surface with no remaining UI consumer.
- `05i-explicit-accesspoint-credential-relations.md` — replace heuristic Access Point/Credential matching with an explicit many-to-many relationship.
- `05j-enforce-asset-identity-uniqueness.md` — enforce normalized Asset ID / Serial Number uniqueness with migration-safe validation.

Current verification status:
- 05a: static/unit complete; browser Data Quality remediation evidence pending runtime.
- 05b: static/unit complete; browser URL/filter evidence pending runtime.
- 05c: static/unit complete; 5/5 parent integrity/lookup tests pass; browser picker/navigation evidence pending runtime.
- 05d: decision recorded.
- 05e: frontend lint/typecheck pass.
- 05f: backend lint/build pass, Asset focused tests 9/9 pass, frontend lint/typecheck pass; browser type-navigation evidence pending runtime.
- 05g: Asset + Application relation invariant tests pass; combined focused suite 16/16 pass, backend build green, frontend lint/typecheck green; browser relation edit/detail/navigation evidence pending runtime.
- 05h: legacy bulk endpoints removed; backend lint/build and focused regression suite pass.
- 05i: explicit Access Point/Credential relation implemented; Asset and credential regression suites pass; runtime browser evidence pending.
- 05j: Asset ID / Serial Number uniqueness implemented with migration guard and focused identity tests; runtime migration execution remains environment-specific.

These are remediation slices under Ticket 05, not replacement product scope.

## Ticket 06 completeness gaps and remediation (2026-09-06)

The VM lifecycle audit in `docs/agents/VM_REAUDIT_2026-09-06.md` found source-of-truth, lifecycle, relationship, RBAC, promotion, and progressive-data-quality gaps. The following tracer slices were implemented under Ticket 06:

- `06a-vm-sync-source-of-truth-contract.md` — make vCenter facts authoritative and remove manual source-fact locks/overrides.
- `06b-vm-lifecycle-partial-curation.md` — make Discovery/Inventory edits patch-safe and keep lifecycle/sync metadata out of human curation.
- `06c-vm-application-relation-contract.md` — make VM Primary/Shared Application relationships explicit across VM and Application write paths.
- `06d-vcenter-source-rbac-safe-ui.md` — align Source RBAC/UI and prevent archived sources from syncing.
- `06e-lossless-vm-promotion.md` — make promotion one-way/lossless and reject destructive re-promotion.
- `06f-progressive-vm-promotion-and-data-quality.md` — allow incomplete promotion and surface missing business/Application context through Data Quality.

Current verification status:
- Backend VM/Application focused contracts: 22/22 pass across 11 suites before final lifecycle evidence.
- Stable identity / missing-source preservation / archive preservation: additional 3/3 pass.
- Backend build after final evidence: TSC 0 issues; 111 files compiled.
- VM frontend ESLint + TypeScript: pass.
- Deterministic seed fixtures: `vm-prod-01`, `svc_vm_e2e`, and resettable `vm-e2e-needs-context`.
- `e2e/vm-v1-acceptance.spec.ts`: Playwright compile/list gate passes and discovers Admin progressive-promotion, Admin relationship/credential/archive-restore, and Viewer read-only journeys.
- Full runtime browser + real/deterministic vCenter integration remains pending; Ticket 06 must not be marked fully done until that matrix is executed.

These are remediation slices under Ticket 06, not replacement product scope.

## Ticket 07 completeness gaps and remediation (2026-09-06)

The Database audit in `docs/agents/DATABASE_REAUDIT_2026-09-06.md` found identity/host, credential lifecycle, account scope, Logical Database navigation, lifecycle, list-scale, legacy topology-metadata, and Environment-semantics gaps. The following tracer slices were implemented under Ticket 07:

- `07a-database-identity-host-contract.md` — allow Host text / Asset / VM identity alternatives and progressive Database registration.
- `07b-database-account-secret-scope-contract.md` — preserve account identity/secrets, require explicit removal, and enforce Instance vs Logical-Database account scope.
- `07c-logical-database-application-navigation.md` — make Logical Database ↔ Application Component navigation visible in both directions.
- `07d-database-archive-rbac-persistence.md` — replace destructive Logical Database deletion with soft archive/restore and align credential/RBAC evidence.
- `07e-database-legacy-linkedapps-and-list-contract.md` — separate legacy operational client-IP metadata from canonical Application topology and slim the Database list contract.
- `07f-server-side-database-list.md` — replace the hidden 1000-row cap/client filtering with server-side pagination/search/filter/sort.
- `07g-database-environment-semantics.md` — enforce V1 `PROD/UAT/TEST` semantics for new writes while preserving legacy values non-destructively.

Current verification status:
- Database focused backend tests: 18/18 pass across 5 suites.
- Backend build: TSC 0 issues; 116 files compiled.
- Frontend Database ESLint + TypeScript: pass.
- `e2e/database-v1-acceptance.spec.ts`: Playwright compile/list gate passes and discovers progressive Needs Context, Admin topology/account/lifecycle, and Viewer read-only journeys.
- Runtime browser execution, real migration application, deterministic seed execution, and restart persistence remain pending; Ticket 07 must not be marked fully done until those environment-dependent gates pass.

These are remediation slices under Ticket 07, not replacement product scope.

## Ticket 08 completeness gaps and remediation (2026-09-06)

The Knowledge Document audit in `docs/agents/DOCUMENTS_REAUDIT_2026-09-06.md` found public-response overexposure, one-way inventory navigation, incomplete library search, dead/misleading public controls, and authoring-RBAC UI gaps. The following tracer slices were implemented under Ticket 08:

- `08a-public-document-known-link-boundary.md` — split authenticated full Document detail from the constrained anonymous known-link projection.
- `08b-canonical-document-inventory-navigation.md` — make canonical Document ↔ Application/Asset/VM/Database navigation work in both directions.
- `08c-authenticated-full-library-search.md` — replace recent-only filtering with authenticated full-library server-side Document search.
- `08d-document-authoring-public-safety.md` — align Viewer authoring UX with backend RBAC, remove unsupported public security claims/dead controls, and keep public access read-only.

Current verification status:
- Knowledge Base focused backend tests: 5/5 pass across 2 suites.
- Backend build: TSC 0 issues; 117 files compiled.
- Frontend Document ESLint + TypeScript: pass.
- `e2e/documents-v1-acceptance.spec.ts`: Playwright compile/list gate passes and discovers canonical-link/direct-share, public-image, and Viewer read-only journeys.
- Runtime Playwright/API execution, deterministic seed execution, restart persistence, and export regression remain pending; Ticket 08 must not be marked fully done until those environment-dependent gates pass.

These are remediation slices under Ticket 08, not replacement product scope.

## Ticket 09 completeness gaps and remediation (2026-09-06)

The Global Search audit in `docs/agents/SEARCH_REAUDIT_2026-09-06.md` found unsafe archive filtering, hidden Logical Database matches, duplicate client filtering, and indistinguishable loading/error/empty states. The following tracer slices were implemented under Ticket 09:

- `09a-global-search-safe-result-contract.md` — make backend results authoritative, exclude archived records correctly, expose Logical Databases as a distinct group, and keep result projections secret-safe.
- `09b-global-search-command-states-accessibility.md` — add explicit loading/error/retry/no-result states, focus/reset behavior, and server-authoritative Command filtering.
- `09c-global-search-responsive-browser-contract.md` — define deterministic desktop/tablet/mobile browser journeys for safe identifiers and navigation.

Current verification status:
- Search backend tests: 5/5 pass across 2 suites.
- Backend build: TSC 0 issues; 119 files compiled.
- Frontend GlobalSearch/shared Command ESLint + TypeScript: pass.
- `e2e/global-search-v1-acceptance.spec.ts`: Playwright compile/list gate passes and discovers desktop identifier/navigation, desktop request-state, tablet, and mobile journeys.
- Runtime browser execution against a seeded stack remains pending; Ticket 09 must not be marked fully done until that matrix is executed.

These are remediation slices under Ticket 09, not replacement product scope.

## Ticket 10 completeness gaps and remediation (2026-09-06)

The Data Quality/Dashboard audit in `docs/agents/DATA_QUALITY_REAUDIT_2026-09-06.md` found duplicated completeness rules, operational exceptions mixed into missing-context counts, and a Dashboard that violated ADR 0016 ordering with non-actionable decorative charts. The following tracer slices were implemented under Ticket 10:

- `10a-central-completeness-evaluator-contract.md` — centralize Application/Asset/VM/Database context evaluation and structured remediation reasons.
- `10b-dashboard-actionable-order-and-operational-attention.md` — restore Summary -> Needs Attention -> Recently Updated and keep operational exceptions separate from completeness.
- `10c-data-quality-transition-browser-contract.md` — define deterministic browser evidence for Dashboard ordering and four-domain incomplete-to-complete refetch transitions.

Current verification status:
- Central/domain focused backend tests: 12/12 pass across 4 suites.
- Backend build: TSC 0 issues; 122 files compiled after Ticket 10 changes.
- Dashboard + Data Quality ESLint/TypeScript: pass.
- `e2e/data-quality-v1-acceptance.spec.ts`: Playwright compile/list gate passes and discovers Dashboard integration and four-domain transition journeys.
- Deterministic operational fixtures: `dq-e2e-failed-vcenter` and `vm-e2e-deleted-in-vcenter`.
- Runtime browser execution, acceptance DB migration/seed execution, and restart persistence remain pending; Ticket 10 must not be marked fully done until those environment-dependent gates pass.

These are remediation slices under Ticket 10, not replacement product scope.

## Ticket 11 sensitive export hardening (2026-09-06)

The Sensitive Inventory Export re-audit in `docs/agents/EXPORT_REAUDIT_2026-09-06.md` found an existing encrypted export foundation but insufficient server-side passphrase confirmation, normalized relationship/account scope structure, and automated encryption proof. The following tracer slices were implemented under Ticket 11:

- `11a-sensitive-export-security-boundary.md` — enforce Admin-only generation, current-password re-authentication, server-side passphrase confirmation, no-store response handling, and safe post-generation audit logging.
- `11b-structured-encrypted-workbook-contract.md` — normalize Inventory/entity/relation/credential sheets and prove genuine XLSX file encryption with excluded-content checks.
- `11c-sensitive-export-browser-contract.md` — define deterministic Admin download/decrypt validation and Viewer restriction journeys.

Current verification status:
- Export backend tests: 4/4 pass across controller/service suites.
- Backend build: TSC 0 issues; 124 files compiled after Ticket 11 changes.
- Frontend export/sidebar ESLint + TypeScript: pass.
- `e2e/sensitive-inventory-export-v1-acceptance.spec.ts`: Playwright compile/list gate passes and discovers Admin download/decrypt and Viewer restriction journeys.
- Runtime browser download against the seeded acceptance stack remains pending; Ticket 11 must not be marked fully done until the environment-dependent gate passes.

These are remediation slices under Ticket 11, not replacement product scope.\n\n## Ticket 12 production deployment hardening (2026-09-07)\n\nThe deployment re-audit in `docs/agents/DEPLOYMENT_REAUDIT_2026-09-07.md` found a solid HTTPS/Compose foundation but development-only runtime residue, missing frontend/gateway health gates, stale bootstrap/certificate instructions, and no repeatable production config verifier. The following tracer slices were implemented under Ticket 12:\n\n- `12a-production-compose-runtime-contract.md` — bound production to PostgreSQL/Backend/Frontend/Caddy, remove development account inputs, keep PostgreSQL private, and enforce health-based startup ordering.\n- `12b-internal-tls-certificate-contract.md` — define Caddy internal-CA HTTPS, HTTP redirect, same-origin traffic, public-root-only distribution, and CA private-key handling.\n- `12c-deployment-bootstrap-health-persistence-contract.md` — define migration, one-time Administrator bootstrap, liveness/readiness, and restart-persistence acceptance.\n\nCurrent verification status:\n- Production Compose static verifier: pass.\n- Production Compose parser: pass; active services are exactly backend/frontend/gateway/postgres and PostgreSQL publishes no host port.\n- Backend/Frontend production Docker image builds: pass.\n- Caddy configuration validation in official container: pass.\n- Backend health/auth focused tests: 20/20 pass across 2 suites.\n- Backend build: TSC 0 issues; 124 files compiled at this gate.\n- Live HTTPS trust, fresh-database migration/bootstrap, and restart-persistence acceptance remain pending and are carried into Ticket 13.\n\nThese are remediation slices under Ticket 12, not replacement product scope.
