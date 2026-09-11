# System Consistency + Realistic E2E Audit — 2026-09-08

## Purpose

This audit is intentionally **discovery-only**. It records product, data-contract, lifecycle, scale, UI-consistency, and E2E gaps before another implementation wave begins. Findings in this document are not permission to patch the product ad hoc. The required order is:

1. accept one cross-system specification,
2. decompose it into ordered tickets,
3. implement tickets against that shared contract,
4. run realistic acceptance on an isolated environment.

Baseline: V1 release acceptance previously passed its defined release suite. This audit asks a different question: **does the product remain truthful, coherent, maintainable, and operable when users exercise fields and relationships across modules and when the dataset grows beyond the deterministic happy-path fixtures?**

Current work branch during audit: `fix/applications-environment-access-projection`.

The existing uncommitted Applications hotfix is treated as pre-existing work and is not expanded by this audit.

## Audit principles

- **Truth over convenience:** an API failure must never render as zero inventory or an empty registry.
- **Round-trip parity:** data entered in Create/Edit must be observable in Detail and, where operationally important, in List or Data Quality.
- **No phantom fields:** fields retained in API/schema but absent from supported UI need an explicit source-of-truth decision.
- **No hidden caps:** relation pickers, list searches, counts, and audit history must not silently operate on only the first N records.
- **No invented values:** read projections must not convert unknown/null values into real business states such as `ACTIVE`.
- **One relationship model:** cross-domain links must preserve metadata and enforce environment/lifecycle invariants.
- **One presentation language:** Status, Environment, Lifecycle, Data Quality, row actions, query states, and missing values must use shared product-level components and semantics.
- **Real E2E means real persistence:** route mocks are useful for UI-state tests but cannot substitute for Form → API → DB → refetch → Detail/Data Quality acceptance.

## Current dataset snapshot

The current working database was sampled to separate actual data corruption from latent contract risk.

Approximate current counts observed during the audit:

- Applications: 8
- Assets: 18
- VM Inventory: 27
- VM Discovery: 26
- Database Instances: 6
- Logical Databases: 9
- Documents: 9
- vCenter Sources: 2
- Application Access rows: 10
- Asset IP rows: 28
- Audit Logs: 86

Current-data invariant probes returned:

- Asset records with multiple Primary Application relationships: **0**
- VM records with multiple Primary Application relationships: **0**
- Component ↔ VM environment mismatches: **0**
- Component ↔ Database environment mismatches: **0**
- Database ↔ Host VM environment mismatches: **0**
- Active Components linked to archived VMs: **0**
- Orphan Application Access rows: **0**
- Application Access rows sampled: **10/10 currently carry both Application and Environment links**

This is important: several findings below are **latent integrity bugs**. The current TD-DEMO-style data is mostly clean; the code still permits invalid or ambiguous states to be created later.

## Finding register

Severity vocabulary:

- **P0** — security or destructive integrity risk.
- **P1** — operational trust, data-loss, inaccessible remediation, or materially misleading behavior.
- **P2** — scale, consistency, maintainability, or workflow friction that should be resolved before the next stable release.
- **P3** — cleanup/polish that should ride with a related ticket but does not block the release by itself.

### Cross-cutting query and presentation

#### CXR-001 — API failure can masquerade as empty inventory — P1

Observed pattern: several list queries use `data = []` plus `isLoading` but do not render a distinct `isError` state. Applications demonstrated the practical failure mode: a server error can produce a valid-looking `No applications found` state. Similar risk exists in Assets, Databases, VMs, vCenter Sources, Users, Documents, and Audit Logs.

Required direction: one shared query-state contract: Initial Loading, Refreshing, Success-With-Data, True Empty, Filtered Empty, Error + Retry, Forbidden, and Not Found.

#### CXR-002 — Detail errors are conflated with Not Found or redirect-away behavior — P2

Application Detail falls through to `Application not found` when no data is returned; Asset/VM/Database details redirect to their list after query errors. A 500, timeout, 403, and true 404 should not produce the same operator experience.

#### CXR-003 — No product-level Inventory Table contract exists — P2

Applications, Assets, VMs, Databases, Users, vCenter Sources, and Audit Logs compose primitives independently. Header density, sorting affordances, pagination, row navigation, mobile strategy, selected rows, and action placement vary by page.

#### CXR-004 — Status-family semantics are rendered independently — P2

There is no shared component for:

- record/lifecycle status,
- environment,
- VM power state,
- VM sync state,
- Data Quality state,
- Source health.

This creates inconsistent colors, wording, capitalization, and stale mappings. VM environment rendering still contains a `DEV` style even though V1 supports PROD/UAT/TEST.

#### CXR-005 — Missing/unknown values have no canonical display — P3

The product mixes blank strings, `--`, `Not recorded`, `Needs context`, and implicit defaults. Unknown, intentionally-not-applicable, and missing-required-context need distinct semantics.

#### CXR-006 — Row actions are inconsistent and some affordances are dead — P2

Examples:

- Applications use direct Archive/Restore text buttons.
- Assets use Edit icon + kebab menu.
- VMs use Details + Archive text buttons.
- vCenter Sources use three inline icon buttons.
- Users expose Reset as a standalone icon and Delete in a menu.
- Users and Databases keep row-selection state even though no meaningful bulk action consumes it.

Required direction: common View/Edit/More/Lifecycle action placement; no selection affordance without a supported action.

### Applications

#### APP-001 — Application List/Detail do not have a complete domain E2E journey — P1

The global V1 suite exercises Application indirectly through topology/Data Quality, but there is no dedicated realistic browser story that proves create → list → detail → edit → environment → component → access → credential → archive/restore round trips.

#### APP-002 — Application Access ownership is structurally ambiguous — P1

Current code/schema can represent Access attached to Application, Environment, or both. V1 semantics say Application Access belongs to an Application Environment. Current DB rows are clean, but the write model can still create divergent shapes and Environment deletion can create orphan risk depending on relation shape.

Required direction: every supported Application Access row has a required Application and required Environment, and the Environment must belong to that Application.

#### APP-003 — “Primary access” is inferred from array order — P2

Application List chooses the first access row rather than an explicit primary designation. Array/database ordering is not a business rule.

Required direction: explicit primary-access semantics per Environment, with a deterministic invariant.

#### APP-004 — Component Description is a write-contract field without supported UI — P2

`ApplicationComponent.description` exists in DTO/schema but Create/Edit Component UI does not provide it and Detail does not surface it. This is a round-trip mismatch.

#### APP-005 — Updating Component relationships can erase relation metadata — P1

Component update deletes and recreates Asset/VM links. Recreated relations derive relation type but do not preserve all existing relation metadata such as `responsibleParty`. A simple topology edit can therefore lose curated metadata.

#### APP-006 — Cross-environment topology is not rejected at the write boundary — P1

A PROD Component can currently be given IDs for a UAT/TEST VM or Logical Database because component writes validate existence/primary rules but not environment compatibility. Current DB probe found zero mismatches, but invalid states are permitted.

Required direction: VM and Logical Database environment must match the Component Environment. Physical Assets remain environment-neutral unless a later accepted contract says otherwise.

#### APP-007 — Topology option discovery is capped — P1

Application Detail requests Assets with `limit: 200` and VMs through an endpoint currently capped at 1000. Valid infrastructure can become impossible to link from UI when inventory grows.

### Assets

#### AST-001 — `osVersion` and `dependencies` are submitted fields without supported inputs — P1

Asset form state loads/submits both values, but the audited form has no normal user input for them. `dependencies` is also not presented on Asset Detail. This creates hidden/stale data behavior.

#### AST-002 — Asset Status is editable/listed but absent from the main Detail hierarchy — P2

Operators can set Status and see it on the List, but Asset Detail does not make the record lifecycle/status readily visible.

#### AST-003 — Asset `environment` remains in API/schema after UI semantics moved away from it — P2

V1 decided Asset Environment is not authoritative. The create DTO/schema still expose a string environment field. This zombie contract can reintroduce ambiguous environment ownership.

#### AST-004 — Top-level `manageType` overlaps Access Point method semantics — P2

Asset DTO/model retains top-level management metadata while the operational UI models method/version per Access Point. The source of truth is unclear and should be collapsed to one supported contract.

#### AST-005 — Asset type labels are not canonical — P3

`SP`, `Service Processor`, and related labels vary by surface.

#### AST-006 — Operational filters can target information that is difficult to verify in the table — P2

Owner and Location can be operational filters, but list visibility does not consistently expose the filtered context. Filtered results should show why a row matched or expose the relevant column/filter chip.

### Virtual Machines

#### VM-001 — Data Quality requires fields the Form does not let users edit — P1

VM Form state loads and submits `owner`, `businessUnit`, `slaTier`, and `criticality`, but the audited rendered curation form does not expose those four controls. VM inventory Data Quality requires Owner, Business Unit, Service Role, Criticality, and an Application Component.

This creates an impossible remediation loop: the system can tell an operator to fill a field that the supported UI does not allow them to fill.

#### VM-002 — VM Detail omits core curation fields — P1

The “Ownership & Usage” section primarily shows Description/Notes while Owner, Business Unit, SLA Tier, and Criticality are not visibly reconciled there. Sensitive Export does carry several of these fields, so export and normal UI disagree on what is operationally important.

#### VM-003 — VM Inventory and Discovery have silent 1000-row caps — P1

`findInventory()` and `findDiscoveries()` use `take: 1000`, and the frontend then performs search/filter/pagination client-side. At 1001 records, a valid VM can disappear from normal inventory workflows.

#### VM-004 — VM list Environment presentation contains stale DEV semantics — P2

Allowed V1 Environment is PROD/UAT/TEST; the local badge map contains `DEV` and no canonical TEST treatment.

#### VM-005 — Archived/non-active VM detail still exposes normal mutation affordances — P1

Edit visibility is role-based rather than consistently lifecycle-based. Archived records should be preserved/readable but normal mutation must be restricted according to a common lifecycle policy.

#### VM-006 — Missing-from-vCenter copy references unsupported permanent deletion — P3

Detail copy says “Archive or delete the record after review,” while ordinary permanent deletion is intentionally outside V1 product behavior.

#### VM-007 — Some Data Quality browser proof is route-mocked rather than persistence-backed — P1

The transition test is valuable for refetch UI behavior, but it does not prove the actual VM Form can write the required fields and clear the backend evaluator through real persistence.

### Databases

#### DB-001 — `responsibleParty` is backend/export data without supported normal UI — P2

The field exists in DTO/schema/export but is not reconciled through Database Form/List/Detail.

#### DB-002 — Database List invents ACTIVE when Status is absent — P1

The list uses an `ACTIVE` fallback for missing status. Unknown data must not be promoted to a real lifecycle state on read.

#### DB-003 — Database host/environment compatibility is not enforced — P1

Host validation proves that a VM exists but does not reject PROD Database → UAT/TEST Host VM (or the reverse). Current DB probe found zero mismatches, but invalid states are allowed.

#### DB-004 — Legacy `linkedApps` name disagrees with supported semantics — P2

The UI now correctly describes this as Operational Client IP Metadata, while the API/domain property name remains `linkedApps`. Canonical topology is Logical Database ↔ Component. Continued use of the misleading name increases accidental misuse.

#### DB-005 — Detail/Edit navigation pattern differs from other inventory domains — P2

Database editing is primarily list-driven while VM and Application details expose direct editing. The product needs one rule for where Edit lives rather than per-page history.

### vCenter Sources

#### VCS-001 — Edit + connection-test flow conflicts with preserved credentials — P1

Editing a Source loads username/password as blank in the UI, while backend update can preserve existing secrets. UI nevertheless requires a successful connection-test key before Save. A user changing only Notes/Sync Interval can be forced to re-enter credentials or fail the test unnecessarily.

Required direction: distinguish “credentials/end-point changed” from metadata-only edits. Re-test is mandatory only when connection-affecting fields change; secret values remain write-only and preserved when blank.

#### VCS-002 — Audit actions do not describe Source lifecycle truthfully — P1

Observed mappings include:

- Create Source → `VCENTER_SYNC`
- Update Source → `VCENTER_SYNC`
- Archive Source → `DELETE_SOURCE`
- Restore Source → `VCENTER_SYNC`

The enum already contains `CREATE_SOURCE` and `UPDATE_SOURCE`; archive/restore need explicit lifecycle semantics rather than being mislabeled as sync/delete.

#### VCS-003 — Source actions use a unique icon-only action grammar — P2

Sync/Edit/Archive/Restore placement differs from other resource lists and should be reconciled with the shared action contract while retaining Sync as a domain-specific primary action.

### Documents

#### DOC-001 — Document relation picker silently searches partial inventory — P1

KnowledgeDocumentLinks loads:

- Assets: first 200
- Databases: first 200
- VMs: endpoint currently capped at 1000

and then performs local search. Placeholder copy implies complete inventory search, but matching records beyond the cap cannot appear.

#### DOC-002 — Relation-picker request failure can resemble no matches — P2

The picker has loading awareness but no unified error/retry behavior for failed option queries.

### Audit Logs and Users

#### AUD-001 — Audit Log UI only operates on the first backend page — P1

Backend `findAll(page, limit)` paginates correctly. Frontend calls `/audit-logs` without page parameters, receives the default first 100 records, then performs search/sort/pagination locally.

At >100 records:

- Total Events becomes a first-page count,
- Today/Delete/Unique Actor summaries become partial,
- search cannot find older rows,
- frontend “pagination” is pagination within the first 100 records.

Current DB has 86 rows, so the defect is currently masked.

#### AUD-002 — Lifecycle audit taxonomy is inconsistent across domains — P1

Applications have explicit ARCHIVE/RESTORE actions while Assets, Databases, VMs, VM Discovery, and Sources often log archive/restore as UPDATE or DELETE. Audit history should answer “what happened” without parsing free-form details.

#### USR-001 — User row selection has no supported bulk action — P3

Selection checkboxes/state are visible but do not lead to a bulk workflow. Remove the affordance unless a deliberate bulk action enters scope.

#### USR-002 — User action placement differs from the shared resource pattern — P2

Password Reset, Role mutation, and Delete need one deliberate privileged-action layout rather than mixed icon/menu/select conventions.

### Dashboard / Data Quality

#### DQ-001 — Dashboard Overview failure can render trustworthy-looking zeroes — P1

Dashboard only gates the overview query on `isLoading`; summary cards use optional `?.` fallback to `0`. If Overview fails, the operator can see zero inventory instead of an explicit failed state.

#### DQ-002 — Data Quality remediation proof is not consistently end-to-end — P1

The centralized evaluator is a strong foundation, but the release must prove each missing-field reason has an actual edit control and that real saved data removes the reason without page reload. Route-controlled tests should remain supplemental.

#### DQ-003 — Data Quality vocabulary/casing varies by domain — P2

Stable reason codes exist in backend, but field labels and display casing vary (`System Name` vs `owner` etc.). UI should render a canonical human label while tests rely on stable codes where appropriate.

### Scale and relationship integrity

#### SCL-001 — Multiple UI pickers depend on full-list endpoints — P1

Application topology and Document linking download bounded datasets and search client-side. This pattern will recur if not replaced by one searchable relation-picker API contract.

#### SCL-002 — Dense-data acceptance is absent — P1

Current deterministic fixtures are excellent for repeatability but too small to expose the 200/1000/100 page-boundary defects. A dedicated dense fixture/generator is required.

#### REL-001 — Environment compatibility is a cross-domain invariant, not a UI hint — P1

At minimum:

- PROD Component ↔ PROD VM only,
- UAT Component ↔ UAT VM only,
- TEST Component ↔ TEST VM only,
- Component ↔ Logical Database must match Database Instance Environment,
- Database Host VM Environment must match Database Environment.

Violations must be rejected server-side and tested at HTTP/service boundaries.

#### REL-002 — Archive behavior requires one cross-domain policy — P1

Archive must preserve history/relationships but normal edit/link candidate behavior needs explicit rules. Active relationship pickers should not silently attach archived resources. Existing relationships to archived resources should remain visible as historical context and be clearly labeled.

## Existing strengths to preserve

The audit should not trigger a rewrite of areas that already have sound foundations:

- centralized completeness evaluators,
- explicit Asset Access Point ↔ Credential links,
- one-primary Application relation enforcement for Assets/VMs,
- VM source-of-truth separation between vCenter facts and curated context,
- progressive VM/Database creation,
- Logical Database lifecycle and scoped accounts,
- secret-safe Global Search projections,
- canonical Document relationships and restricted public known-link projection,
- genuinely encrypted Sensitive Inventory Export,
- isolated production-equivalent acceptance stack and persistence checks.

## Required specification outcome

The next specification must unify all findings above under these non-negotiable contracts:

1. Product-wide query state and error truthfulness.
2. Product-wide List/Detail/Action/Badge semantics.
3. Round-trip field parity and removal of zombie fields.
4. Server-authoritative searchable relation options with no silent cap.
5. Cross-environment and archive relationship invariants.
6. Explicit Application Access ownership and primary semantics.
7. Complete VM curation/remediation UI.
8. Server-side VM and Audit Log scale contracts.
9. Consistent source-edit credential preservation and audit taxonomy.
10. Real persistence-backed E2E plus a dense-data boundary suite.

Implementation must be ticketed from that specification rather than patching this audit directly.
