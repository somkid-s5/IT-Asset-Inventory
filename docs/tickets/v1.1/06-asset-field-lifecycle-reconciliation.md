## Parent

V1.1 Consistency, Data Integrity, and Realistic Acceptance

## Findings

AST-001, AST-002, AST-003, AST-004, AST-005, AST-006.

## What to build

Reconcile Asset Form/List/Detail/API so every retained field has one supported meaning and round trip.

## Acceptance criteria

- [ ] Decide `osVersion` and `dependencies` explicitly: retain with Form + Detail parity, or retire from supported writes with a safe compatibility plan.
- [ ] Asset Status is visible on Detail using the shared status component.
- [ ] Asset `environment` is removed from normal V1.1 writes after consumer/migration review; no UI invents or relies on it as authoritative.
- [ ] Per-Access-Point method is canonical; top-level `manageType` no longer competes as a user-authored source of truth.
- [ ] Asset Type display uses one canonical mapping including `Service Processor` for `SP`.
- [ ] Owner/Location filtering exposes active filter state and lets the user inspect matching values via visible/optional columns.
- [ ] Existing Access Point ↔ Credential explicit relationships remain unchanged and lossless.
- [ ] Primary/Shared Application relation invariant remains green.
- [ ] Data Quality Owner/Location/Serial/IP reasons each lead to an actual remediation control.
- [ ] Archive/Restore preserves access, relations, Documents, notes, attachments, and audit history.
- [ ] Existing Asset V1 browser journeys remain green after shared presentation migration.

## Blocked by

- Ticket 01
- Ticket 02

Use Ticket 03 for any relation-picker migration where applicable.
