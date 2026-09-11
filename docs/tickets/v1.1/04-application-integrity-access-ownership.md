## Parent

V1.1 Consistency, Data Integrity, and Realistic Acceptance

## Findings

APP-002, APP-003, APP-004, APP-005, APP-006, REL-001, REL-002.

## What to build

Harden Application Access and Component topology so the write boundary enforces the same semantics the UI communicates.

## Acceptance criteria

- [ ] Every supported Application Access row has required Application + Environment ownership.
- [ ] Service validation rejects an Environment that does not belong to the supplied Application.
- [ ] Existing valid rows are backfilled/validated before constraints tighten; ambiguous rows are reported rather than guessed.
- [ ] Access supports stable ordering and explicit `isPrimary` semantics.
- [ ] At most one Primary Access exists per Environment.
- [ ] Application List/Detail reads Primary Access explicitly; array order is never the primary rule.
- [ ] Component Description is editable and rendered in Detail.
- [ ] Component update preserves retained Asset/VM relation metadata including responsible party rather than delete/recreate data loss.
- [ ] PROD/UAT/TEST Component rejects VM Environment mismatch.
- [ ] Component rejects Logical Database whose parent Database Environment does not match.
- [ ] Archived VM/Database/Logical Database cannot be newly linked.
- [ ] Existing links to later-archived records remain visible as historical context.
- [ ] Focused migration/service/HTTP tests cover valid and invalid topology cases.
- [ ] No secret value enters ordinary Application projections or audit details.

## Migration safety

Run constraint/backfill proof only against isolated/acceptance database first. Do not modify the user's main database destructively.

## Blocked by

- Ticket 01
- Ticket 02
- Ticket 03
