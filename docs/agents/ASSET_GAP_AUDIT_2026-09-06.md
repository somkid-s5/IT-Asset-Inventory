# Asset Gap Audit — 2026-09-06

Scope: V1 Ticket `docs/tickets/v1/05-connect-hardware-assets-to-applications.md` traced against Prisma, Asset API/service, Asset list/detail/dialog, Data Quality, and Asset E2E.

Auditor role: Product/Data + UX completeness. This is an evidence audit, not an architecture rewrite.

## Executive result

Ticket 05 is **PARTIALLY IMPLEMENTED / NOT ACCEPTABLE AS DONE**. The useful Access Point and archive flows exist, but several acceptance criteria are only superficially represented. The largest gap is not visual polish: important operational fields and relationships exist in persistence/API but are not usable from the primary Asset workflow.

## Findings

### A-01 — HIGH — Data Quality requires `owner`, but Asset UI gives the user no way to maintain it

Evidence:
- `backend/src/assets/assets.service.ts#getDataQualitySummary` flags `!asset.owner` as an issue.
- `backend/prisma/schema.prisma#Asset` stores `owner`, `department`, `responsibleParty`, and `vendor`.
- `backend/src/assets/dto/create-asset.dto.ts` accepts these governance fields.
- `frontend/src/components/AssetFormDialog.tsx` has state/payload support for owner/department/vendor but does not render matching controls; `responsibleParty` is not represented in the dialog state.
- `frontend/src/app/dashboard/assets/[id]/page.tsx` does not surface `owner`, `department`, `responsibleParty`, `vendor`, `dependencies`, or `environment` in the detail surface.

Operational impact: Data Quality can tell an admin to fix an Asset, but the normal Asset workflow cannot fix or even inspect the required context. This is a classic dead-end data path.

Recommended vertical slice: **Asset Governance Context** — editable owner/department/responsible party/vendor fields, detail display, permission handling, validation, Data Quality remediation link, and E2E proving issue -> edit -> issue cleared.

### A-02 — HIGH — Asset filters are implemented in the backend but absent from the UI

Evidence:
- `AssetsController.findAll` accepts `environment`, `owner`, and `location` filters.
- `AssetsService.findAll` applies those filters and indexes exist for several fields.
- `frontend/src/app/dashboard/assets/page.tsx` sends only search query, type, paging, sorting, and archived status.
- The page keeps a `columnFilters` state but has no operational controls wired to owner/location/environment.

Operational impact: once inventory grows, admins cannot answer routine questions such as "assets at DC X", "assets owned by team Y", or "PROD assets" without broad search/export. Backend capability is stranded and the list behaves like a demo-scale table.

Recommended vertical slice: **Asset Operational Filters** — explicit filters with URL/query persistence, reset/active-filter state, server-side filtering, empty/no-result states, and Playwright coverage.

### A-03 — HIGH — Parent Asset selection only sees the current paginated list

Evidence:
- `frontend/src/app/dashboard/assets/page.tsx` passes `availableParents={assets.map(...)}` to `AssetFormDialog`.
- `assets` is only the current server-paginated response (`pageSize` defaults to 20).

Operational impact: at realistic scale, valid parent assets disappear from the selector depending on the current list page/search/tab. Relationships become incomplete or wrong because the UI cannot select the actual parent.

Recommended vertical slice: **Searchable Asset Relationship Picker** — dedicated lightweight server query for eligible parent assets, search-as-you-type, exclusion of self, cycle prevention/validation, loading/no-result/error states, and E2E with >1 page of fixtures.

### A-04 — HIGH — Environment semantics do not match the approved V1 spec

Evidence:
- V1 spec states Environment is controlled `PROD`, `UAT`, `TEST` and is never inferred from names (`docs/specs/2026-09-04-v1-inventory-registry.md`).
- `Asset.environment` is a free-form nullable `String` in Prisma.
- `AssetFormDialog` exposes `PROD`, `UAT`, `DEV` and defaults new assets to `DEV`.

Operational impact: the product can silently manufacture incorrect environment context and store values outside the approved domain vocabulary. Relationships and filters cannot be trusted consistently across Applications/Assets/VMs/Databases.

Recommended vertical slice: **Normalize Environment Vocabulary** — agree whether physical Assets inherit Application Environment or retain optional curated context; then use one controlled vocabulary without silently defaulting unknown records.

### A-05 — HIGH — Asset lifecycle/status is conflated with MA contract state

Evidence:
- Prisma enum is lifecycle-like: `ACTIVE`, `INACTIVE`, `MAINTENANCE`, `DECOMMISSIONED`, `ARCHIVED`.
- Asset list and Asset dialog label `ACTIVE` as `Under MA` and `INACTIVE` as `MA Expired`.
- The Asset also separately stores `warrantyExpiration`, and Data Quality separately flags expired warranty.

Operational impact: an active server with an expired MA contract cannot be represented truthfully. Operational lifecycle and support-contract state are two different facts but currently share one field.

Recommended vertical slice: **Separate Operational Lifecycle from Support/MA State** — retain lifecycle status for operational state; model/derive MA/support status independently from explicit support dates/contract data. Migration requires product decision before implementation.

### A-06 — HIGH — Asset-to-Asset operational dependency remains free text

Evidence:
- `Asset.dependencies` is a nullable `String`.
- Structured relationships exist for Asset hierarchy and Application Component ↔ Asset links, but there is no typed Asset ↔ Asset connection model for operational topology.

Operational impact: free text cannot answer "what depends on this switch/storage/server?", cannot render trustworthy topology, cannot validate endpoints/ports, and cannot support impact analysis. This directly limits the inventory's real operational value.

Recommended vertical slice: **Typed Infrastructure Relationships** — first define required relationship types and minimum fields (e.g. source asset, target asset, relation type; port/interface fields only where justified), then implement one tracer relationship end-to-end before expanding topology.

### A-07 — MEDIUM — Asset list payload is much heavier than the table needs

Evidence:
- `AssetsService.findAll` includes patch info, all IP allocations, parent/children, credential usernames, component links, document links, notes with authors, and attachments for every list row.
- Default table renders only identity/type/rack/serial/status plus actions.

Operational impact: list cost grows with notes, documents, attachments, credentials, and relationships even when those records are not displayed. This creates scale/performance risk and unnecessarily broadens list exposure.

Recommended vertical slice: **Slim Asset List Projection** — explicit list DTO/projection containing only list/filter/summary fields; detail endpoint remains rich. Add API contract and regression tests.

### A-08 — MEDIUM — Asset type navigation is incomplete

Evidence:
- `AssetType` handling supports `SERVER`, `STORAGE`, `SWITCH`, `SP`, `NETWORK`.
- `TABS` renders only All, Servers, Storage, Switches.
- URL initialization accepts SP and NETWORK, but ordinary users cannot select those categories from the tab UI.

Operational impact: navigation differs from the actual domain model and hides valid record types inside All/search.

Recommended vertical slice: **Complete Asset Type Navigation** — expose all approved types or replace fixed tabs with a scalable type filter if the vocabulary is expected to grow.

## Acceptance trace against Ticket 05

| Ticket 05 criterion | Audit state |
| --- | --- |
| List/search/filter/create/view/edit by role | **Partial** — search/type/paging exist; operational filters and governance editing incomplete |
| Minimum identity name + type | **Mostly present** |
| Honest progressive completion / exact missing guidance | **Partial** — Data Quality exists but owner remediation is dead-ended |
| Primary + additional Application relationships | **Needs deeper slice verification** |
| Host/Management Access Points | **Present enough to retain; not re-designed by this audit** |
| Explicit Access Point ↔ Credential relationship | **Present in current create/update flow; preserve** |
| Credential reveal permissions/audit | **Out of this focused audit; verify separately** |
| Archive/restore preserves relationships/history | **Flow exists; persistence acceptance still belongs to integration verification** |
| Remove legacy bulk import/update + ordinary CSV export | **Not met** — Asset list still contains bulk update/export related behavior and backend bulk import endpoints |
| Shared Asset List/Detail/Dialog templates | **Visual structure present, operational completeness not met** |
| Browser journeys for progressive creation/application linking/access/archive/persistence | **Partial** — existing Asset E2E covers list/search/paging/basic detail, but not the identified governance/filter/remediation gaps |

## Ranked remediation backlog

1. **Asset Governance Context + Data Quality remediation loop** (A-01)
2. **Searchable relationship picker independent of current page** (A-03)
3. **Operational filters wired end-to-end** (A-02)
4. **Normalize environment + lifecycle semantics** (A-04/A-05; product decision gate first)
5. **Typed infrastructure dependency relationship tracer slice** (A-06)
6. Slim Asset list projection (A-07)
7. Complete type navigation (A-08)
8. Verify/remove legacy bulk update/import/ordinary CSV behavior per Ticket 05
9. Verify Application relationship prominence/shared relationship behavior
10. Expand E2E to prove progressive completion and persistence, not only rendering/search

## Remediation progress — 2026-09-06

- A-01 Governance Context: **implemented** across create/edit/detail with focused persistence coverage; Data Quality browser remediation evidence remains pending because the dev stack is not running through this control channel.
- A-02 Operational Filters: **implemented** for server-side owner/location filters with URL persistence/reset behavior; browser evidence remains pending.
- A-03 Parent Picker: **implemented** with independent lightweight lookup plus unknown/self/cycle validation; focused hierarchy/lookup tests pass 5/5; browser evidence remains pending.
- A-04 Environment Semantics: **decision recorded** — Application Environment is authoritative (`PROD/UAT/TEST`); physical Asset environment is legacy optional context and is no longer silently defaulted to DEV.
- A-05 Lifecycle vs MA: **UI semantics corrected** — lifecycle labels no longer masquerade as MA/support status. A future support-contract model remains separate work if needed.
- A-07 Slim List Projection: **implemented** — Asset list uses an explicit lightweight projection and excludes credentials, IP allocations, notes, attachments, documents, component links, patch detail, and custom metadata. Focused contract tests protect the boundary.
- A-08 Type Navigation: **implemented** — SERVER, STORAGE, SWITCH, SP, and NETWORK are all directly reachable; SP/NETWORK realistic seed fixtures and E2E coverage were added.

## Gate decision

**Hardware Assets are materially improved but are not yet accepted as fully complete.** Static/unit gates for A-01/A-02/A-03/A-07/A-08 are green, while browser-runtime evidence is still pending. Parent Ticket 05 also still requires verification of Application relationship prominence, removal/retirement of legacy bulk/import endpoint behavior, and final persistence/integration coverage.

Rendering is not completion; acceptance requires the remaining traceability and runtime evidence.