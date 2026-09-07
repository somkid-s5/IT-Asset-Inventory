# 10a — Central Completeness Evaluator Contract

## Purpose

Make one backend completeness contract authoritative for Application, Asset, VM, and Database context so API detail/list projections, Dashboard attention, and Data Quality cannot drift into different definitions of `Needs Context`.

## Contract

- Application completeness follows ADR 0029, including explicit PROD `No Database` resolution.
- Asset context reasons are owner, location, serial number, and at least one Access Point IP.
- Database context reasons are host identity, IP address, owner, Environment, backup policy, and at least one Database account.
- VM Discovery context reasons remain the accepted progressive setup fields.
- VM Inventory context reasons are owner, business unit, service role, criticality, and Application Component relationship.
- Every evaluator returns structured reasons with stable `code`, display `label`, remediation `guidance`, and `category`.
- `expired warranty` and `Deleted in vCenter` are operational reasons, not completeness failures.
- Archived records are excluded by active Data Quality summary queries.

## Trace

Central implementation: `backend/src/data-quality/completeness.ts`.

Consumers:
- Application detail + Data Quality summary
- Asset detail + Data Quality summary
- VM Discovery/Inventory projections + Data Quality summary
- Database list/detail + Data Quality summary
- Dashboard consumes the same domain Data Quality summary responses.

## Verification

- Pure evaluator tests cover ADR 0029 `No Database`, Asset warranty separation, VM deleted-source separation, Database reasons, and VM Discovery state.
- Focused service tests prove Asset/VM operational separation and Database List/Data Quality reason parity.
- Runtime browser transitions remain a Ticket 10 environment-dependent gate.
