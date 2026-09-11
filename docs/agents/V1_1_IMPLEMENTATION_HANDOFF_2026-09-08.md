# V1.1 Implementation Handoff — 2026-09-08

## Phase status

**Discovery / to-spec / to-tickets: COMPLETE**

**Implementation and isolated release acceptance: COMPLETE for the current V1.1 scope**

The implementation, production Compose runtime, fresh migration/seed checks, dense boundary fixture, invariant verifier, and full browser matrix are recorded in [`V1_1_RELEASE_ACCEPTANCE_2026-09-11.md`](V1_1_RELEASE_ACCEPTANCE_2026-09-11.md). The working tree intentionally remains uncommitted; push, merge, deployment, and production approval remain explicit owner decisions.

The current branch contains the V1.1 implementation changes in addition to the earlier Applications environment-access projection hotfix. The release report is the current runtime evidence; the individual ticket checklists remain the detailed acceptance-contract source.

## Sources of truth

1. Specification: `docs/specs/2026-09-08-v1.1-consistency-and-realistic-acceptance.md`
2. Discovery evidence: `docs/agents/SYSTEM_CONSISTENCY_AUDIT_2026-09-08.md`
3. Ticket index/order: `docs/tickets/v1.1/README.md`
4. Individual work slices: `docs/tickets/v1.1/01-*.md` through `16-*.md`

If an individual ticket conflicts with the parent spec, the parent spec wins unless a later explicit decision is documented.

## Execution order

### Foundation wave

- 01 — Shared inventory presentation contract
- 02 — Shared query/error/list-state contract
- 03 — Server-authoritative relation picker

Do not allow domain agents to invent replacement local table/status/error/picker patterns before this wave settles.

### Domain wave

- 04 + 05 — Applications integrity + realistic E2E
- 06 — Assets parity/lifecycle
- 07 + 08 — VM curation/Data Quality + server-side scale
- 09 — Database parity/relationships
- 10 — vCenter Source edit/audit
- 11 — Documents relation search
- 12 — Users/Audit/Dashboard consistency + scale

Independent domain work may run in parallel only after its recorded foundation blockers are green.

### Verification wave

- 13 — Golden dataset + invariant verifier
- 14 — Cross-domain round-trip E2E
- 15 — Relationship/RBAC/archive/persistence matrix
- 16 — Dense-data release regression gate

## Hard rules for agents

- Do not patch findings directly from the audit without reading the corresponding ticket and parent spec.
- Do not weaken server-side invariants to make E2E pass.
- Do not manufacture PROD/ACTIVE/default context on reads.
- Do not replace request failures with empty arrays/zero counts.
- Do not use bounded first-N client lists as complete relation search.
- Do not expose secret values in list/detail/search/log/error/test output.
- Do not auto-repair ambiguous existing data. Report it and stop that migration slice.
- Do not destructively modify the user's main DB. Migration/backfill proof uses isolated acceptance databases first.
- Preserve current sound V1 behavior called out in the audit.
- No Git push/merge/deploy/release without explicit user permission.

## Verification policy

Each implementation ticket should run the smallest relevant tests first. Do not repeatedly run the entire release suite after every small patch.

Full-system release evidence belongs to Tickets 14–16 and must include fresh migrations, normal seed, dense boundary data, HTTPS, secure cookie, restart persistence, existing V1 regression, and the new V1.1 matrices.

## Discovery traceability QA

The audit currently contains **47 finding IDs** and automated document QA confirmed **47/47 are referenced by the V1.1 ticket set**. There are **16 ordered implementation/verification tickets**.

## Current repository safety note

No commit, push, merge, deployment, main-database reset, or production mutation was performed during the V1.1 discovery/spec/ticket phase.
