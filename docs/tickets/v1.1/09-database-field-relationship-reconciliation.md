## Parent

V1.1 Consistency, Data Integrity, and Realistic Acceptance

## Findings

DB-001, DB-002, DB-003, DB-004, DB-005, REL-001, REL-002.

## What to build

Reconcile Database Form/List/Detail/API fields and enforce Database Environment compatibility with its VM host and Application topology.

## Acceptance criteria

- [ ] `responsibleParty` is either fully supported in Form/Detail/export or explicitly retired from supported writes after compatibility review.
- [ ] Null/unknown Database Status remains unknown; List never substitutes ACTIVE on read.
- [ ] Database Environment + Host VM Environment mismatch is rejected server-side on create and update.
- [ ] Host/environment changes are validated as one resulting state, not independently.
- [ ] Logical Database ↔ Application Component environment mismatch remains rejected through Ticket 04 shared topology rules.
- [ ] Archived host/topology candidates cannot be newly selected.
- [ ] Legacy `linkedApps` semantics migrate toward an explicit Operational Client IP Metadata API/property name; new UI/API copy does not imply canonical Application relationships.
- [ ] Database Detail exposes a standard Edit entry point for writable active records according to Ticket 01 action contract.
- [ ] Form/List/Detail round-trip all retained operations fields and account/logical DB scope.
- [ ] Existing credential reveal/copy/audit permissions remain green.
- [ ] Archive/Restore preserves Logical Databases, account scopes, host relationships, Application links, and Documents.

## Blocked by

- Ticket 01
- Ticket 02
- Ticket 03
- Ticket 04 relationship invariants where shared
