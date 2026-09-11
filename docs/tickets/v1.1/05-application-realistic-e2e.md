## Parent

V1.1 Consistency, Data Integrity, and Realistic Acceptance

## Findings

APP-001 plus runtime proof for Ticket 04.

## What to build

Add a dedicated persistence-backed Application browser acceptance story against the isolated real frontend/backend/PostgreSQL stack.

## Acceptance criteria

- [ ] Admin/Editor creates an Application with profile + initial Environment.
- [ ] Created values appear on List and Detail after real API/DB persistence.
- [ ] Ownership/description edits survive reload.
- [ ] Component Name + Description round-trip.
- [ ] Asset, same-Environment VM, and same-Environment Logical Database can be linked.
- [ ] Mismatched VM/Logical Database relationship is rejected and the UI reports the error safely.
- [ ] Primary Access + credential can be created, reloaded, edited, revealed/copied according to role, and audited.
- [ ] Primary Access remains deterministic after additional Access rows are added/reordered.
- [ ] Viewer cannot mutate or reveal secrets.
- [ ] Archive/Restore preserves topology, access, credential metadata, and Documents.
- [ ] 500 failure on the list/detail is proven distinct from empty/not-found using Ticket 02 semantics.
- [ ] Test is serial-safe and cleans up or uses deterministic isolated state; it does not depend on arbitrary developer DB history.

## Blocked by

- Ticket 04
- Ticket 01/02/03 transitively
