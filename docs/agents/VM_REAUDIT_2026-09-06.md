# VM Ticket 06 Re-Audit — 2026-09-06

Parent ticket: `docs/tickets/v1/06-complete-vcenter-vm-lifecycle.md`

## Verdict

**Code/data-contract status: PASS for the audited VM lifecycle scope.**

**Ticket 06 overall status: BROWSER / REAL-INTEGRATION ACCEPTANCE PENDING.**

The audited code no longer has a known blocker for the V1 source-of-truth, progressive promotion, curation, lifecycle, credential, or Application relationship contracts. Ticket 06 must not be marked fully complete until the runtime browser/integration matrix is executed against a running frontend/backend/database stack and a deterministic/mock or permitted vCenter source.

## Acceptance matrix

| Acceptance criterion | Status | Evidence |
| --- | --- | --- |
| Editor/Admin can add, test, edit, sync, archive permitted HTTPS vCenter Sources; Viewer gets safe read-only projection | CODE PASS / BROWSER PENDING | Source controller RBAC and Sources UI role gates align. Archived source cannot manual/auto sync. `vm.source-lifecycle.service.spec.ts`. `vm-v1-acceptance.spec.ts` includes Viewer surface checks. |
| Discovery identity is stable per source and repeated sync does not duplicate VMs | PASS | Prisma uniqueness `[sourceId, moid]`, sync uses `sourceId_moid` upsert, and `vm.lifecycle-preservation.service.spec.ts` verifies repeated sync uses the same stable identity. |
| VM can be promoted without Application context and enters Inventory as Needs Context | CODE PASS / BROWSER PENDING | `promoteDiscovery()` no longer requires Application context; inventory `discoveryState` includes Application relationship completeness. `vm.promotion-contract.service.spec.ts`, `vm.data-quality.service.spec.ts`, progressive journey in `vm-v1-acceptance.spec.ts`. |
| One Primary Application Component plus additional Shared relationships can be assigned later | CODE PASS / BROWSER PENDING | Structured `componentLinks` contract; one-primary validation; Application topology classifies duplicate VM usage as Shared. `vm.component-links.service.spec.ts`, `applications.vm-relations.service.spec.ts`. VM Form and Detail expose Primary/Shared semantics. |
| Sync refreshes vCenter-owned identity/name/power/CPU/memory/guest OS/IP/disk facts | PASS | Human field-lock override removed. `syncSourceData()` explicitly refreshes source facts. `vm.sync-contract.service.spec.ts`. |
| Sync never overwrites Application/Component/Environment/ownership/Criticality/credentials/notes/Documents | PASS | Curated fields are absent from sync update projection. `vm.sync-contract.service.spec.ts` asserts protected fields are not written. |
| Missing VM becomes `DELETED_IN_VCENTER` with Curated Context/history preserved | PASS | Missing-source sync update changes lifecycle/sync metadata only. `vm.lifecycle-preservation.service.spec.ts`. |
| Admin archive/restore preserves vCenter identity and relationships | CODE PASS / BROWSER PENDING | Archive/restore update lifecycle only; missing VM restores to `DELETED_IN_VCENTER`, not falsely ACTIVE. `vm.curation-contract.service.spec.ts`, `vm.lifecycle-preservation.service.spec.ts`. Runtime archive/restore journey exists in `vm-v1-acceptance.spec.ts`. |
| Guest credentials remain distinct from vCenter Source credentials and follow reveal/copy audit permissions | CODE PASS / BROWSER PENDING | Separate `VmGuestAccount` and source credential fields; reveal/copy audit contracts covered by `vm.guest-credentials.service.spec.ts`. VM Detail hides secret actions from Viewer. Seed provides encrypted `svc_vm_e2e`. |
| VM list/source/discovery/detail surfaces distinguish lifecycle from Data Quality | STATIC PASS / BROWSER PENDING | Discovery supports progressive promotion; lifecycle actions are separate; Data Quality reports `business context` and `application component`; role-aware controls added. Frontend lint/typecheck pass. |
| Deterministic integration/browser journeys cover source setup, sync, unknown promotion, later curation, drift refresh, deletion preservation, archive/restore, persistence | PARTIAL — RUNTIME REQUIRED | Deterministic seed fixtures and browser spec exist. Contract tests cover sync/drift/deletion/promotion/preservation. `vm-v1-acceptance.spec.ts` compiles and is discovered by Playwright, but runtime stack/vCenter journeys have not been executed in this control session. |

## Remediation slices completed

- `06a-vm-sync-source-of-truth-contract.md`
  - Removed human source-fact locks.
  - vCenter facts are read-only in UI and authoritative on sync.
  - Removed human disk override from VM draft contract.
- `06b-vm-lifecycle-partial-curation.md`
  - Inventory and Discovery updates use PATCH semantics.
  - Human edits do not fake `lastSyncAt`, sync state, lifecycle, or source facts.
  - Restore respects missing-from-source state.
- `06c-vm-application-relation-contract.md`
  - Structured Primary/Shared relationship contract.
  - One-primary invariant enforced from VM and Application write paths.
  - VM Detail shows Application relationships.
- `06d-vcenter-source-rbac-safe-ui.md`
  - Viewer read-only; Editor/Admin source mutation permissions aligned.
  - Archived sources are excluded from auto/manual sync.
- `06e-lossless-vm-promotion.md`
  - Promotion is one-way and rejects already-promoted Discovery records.
  - Removed delete/recreate inventory behavior.
  - Partial promotion preserves curated Discovery context and encrypted accounts.
- `06f-progressive-vm-promotion-and-data-quality.md`
  - Incomplete Discovery can promote.
  - Missing Application Component is a Data Quality issue rather than a promotion blocker.
  - Discovery UI no longer manufactures `PROD` context or requires 100% completeness.

## Verification snapshot

Backend focused VM/Application contracts before the final lifecycle-evidence addition:

- 11 suites passed
- 22 tests passed
- TSC: 0 issues
- SWC build: 110 files compiled

Additional lifecycle evidence:

- `vm.lifecycle-preservation.service.spec.ts`: 3/3 passed
- Backend build after addition: TSC 0 issues, 111 files compiled

Frontend / browser compile gate:

- VM frontend ESLint: PASS
- Frontend TypeScript: PASS
- `e2e/vm-v1-acceptance.spec.ts`: PASS compile/list gate
- Playwright discovered Admin progressive promotion, Admin relationship/credential/archive-restore, and Viewer read-only journeys.

## Deterministic V1 fixtures

`backend/prisma/seed.ts` now provides:

- `vm-prod-01`
  - Treasury Registry / PROD / Web = PRIMARY
  - Treasury Registry / PROD / API = SHARED
  - encrypted guest account `svc_vm_e2e`
- `vm-e2e-needs-context`
  - resettable incomplete Discovery fixture
  - no invented Environment/Application context
  - intended to prove progressive promotion and Data Quality remediation

## Remaining gate before Ticket 06 is DONE

Run the browser/runtime matrix on a running test stack after reseeding:

1. Source setup/test/edit/sync/archive/restore with a deterministic permitted vCenter/mock source.
2. Progressive promotion of `vm-e2e-needs-context` and Data Quality verification.
3. Later curation that clears Needs Context without altering source facts.
4. Drift refresh where vCenter facts change but curated context remains.
5. Source deletion/missing VM -> `DELETED_IN_VCENTER` while relationships/credentials/Documents persist.
6. VM archive -> restore -> restart/reload persistence check.
7. Viewer read-only and Admin/Editor guest-secret reveal/copy audit behavior.

Until that runtime matrix is green, Ticket 06 remains **code-complete for audited scope, runtime acceptance pending**.
