# Ticket 10 Data Quality + Dashboard Re-Audit — 2026-09-06

Scope: `docs/tickets/v1/10-unify-data-quality-and-dashboard-attention.md` after central completeness, operational-attention separation, and Dashboard V1-order remediation.

## Verdict

**CODE-COMPLETE FOR AUDITED SCOPE / RUNTIME BROWSER ACCEPTANCE PENDING**

The audited code now uses one centralized completeness implementation for Application, Asset, VM, and Database context. Operational exceptions are represented separately from completeness debt. The Dashboard follows ADR 0016 ordering and has a safe Recently Updated projection. Runtime Playwright execution against the seeded acceptance stack is still required before Ticket 10 is fully done.

## Acceptance trace

| Acceptance criterion | Status | Evidence |
| --- | --- | --- |
| Central evaluation produces the same state/reasons for API, Dashboard, and Data Quality | CODE PASS | `backend/src/data-quality/completeness.ts`; Application/Asset/VM/Database services consume it; Dashboard consumes the same domain Data Quality summaries as the Data Quality page. |
| Complete PROD Application follows ADR 0029 including `No Database` | CODE PASS | Central evaluator test explicitly proves `No Database` resolves the PROD Database requirement. |
| Assets, VMs, Databases with unknown context remain valid and show exact Needs Context guidance | CODE PASS / BROWSER PENDING | Central reason contracts + structured `reasons`; Database List uses same evaluator as DQ; VM Discovery is recomputed from central evaluator; Asset/VM/Database detail APIs expose centralized quality. |
| Deleted-in-vCenter and vCenter sync failure are operational attention, not missing fields | CODE PASS / BROWSER PENDING | VM evaluator returns `operationalReasons`; Asset warranty likewise separated; Dashboard adds failed Source attention from overview; deterministic operational fixtures added. |
| Dashboard order Summary -> Needs Attention -> Recently Updated | STATIC PASS / BROWSER PENDING | Dashboard rewritten to exactly those sections; previous non-actionable chart/gauge removed; Playwright order assertion added. |
| Every actionable row opens exact record/workflow | STATIC PASS / BROWSER PENDING | Domain-specific detail URLs; VM Discovery uses filtered Pending workflow; Source failure routes to vCenter Sources. |
| Resolving context removes item without full-page reload | BROWSER SPEC READY | Route-controlled Playwright journey flips all four domain summaries, clicks query refetch, and verifies a window marker survives. Runtime execution pending. |
| Archived records do not pollute active counts | CODE PASS | Domain Data Quality queries exclude archived records; Dashboard recent queries also exclude archived records. |
| Browser journeys prove incomplete-to-complete transitions for App/Asset/VM/DB | SPEC READY / RUNTIME PENDING | `frontend/e2e/data-quality-v1-acceptance.spec.ts` compiles/discovers Dashboard integration + four-domain transition journeys. |

## Central quality contract

All evaluators return:

- `complete`
- `needsContext`
- `completeness`
- `missingFields`
- `reasons[]` with stable `code`, `label`, `guidance`, `category: context`
- `operationalReasons[]` with stable code/label/guidance and `category: operational`

Operational conditions do not reduce completeness.

## Dashboard V1 contract

1. Summary cards
2. Needs Attention
   - context debt from the same four Data Quality summaries
   - operational VM / Asset conditions
   - vCenter Source connection failures
3. Recently Updated
   - latest non-archived Application / Asset / VM / Database records
   - lightweight, secret-safe projection

The prior CMDB distribution chart and recorded-status gauge were removed because ADR 0016 explicitly excludes non-actionable decorative metrics from V1.

## Verification snapshot

- Central + domain focused backend tests: **12/12 pass across 4 suites**.
- Backend build: **TSC 0 issues; 122 files compiled** after Ticket 10 seed/evaluator work.
- Dashboard + Data Quality frontend ESLint/TypeScript: pass.
- `e2e/data-quality-v1-acceptance.spec.ts`: Playwright compile/list gate passes and discovers both acceptance journeys.
- Deterministic operational fixtures: `dq-e2e-failed-vcenter`, `vm-e2e-deleted-in-vcenter`.

## Remaining environment gates

- Apply pending Prisma migrations to a disposable/acceptance database.
- Execute seed against that database.
- Start the acceptance stack using a channel that does not hold the Serena connector open.
- Execute the Ticket 10 Playwright journeys.
- Execute the serialized V1 integration story and restart-persistence checks before declaring V1 done.
