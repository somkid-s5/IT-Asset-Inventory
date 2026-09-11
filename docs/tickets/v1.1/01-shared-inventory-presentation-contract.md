## Parent

V1.1 Consistency, Data Integrity, and Realistic Acceptance

## Findings

CXR-003, CXR-004, CXR-005, CXR-006, VCS-003, USR-002.

## What to build

Create the product-level presentation primitives that all inventory modules use instead of maintaining page-local interpretations of the same states/actions.

Minimum shared contracts:

- Inventory list/table shell
- standard row action placement
- Record Status badge
- Environment badge
- VM Lifecycle badge
- VM Power badge
- VM Sync badge
- Data Quality badge
- Source Health badge
- missing/unknown value formatter
- common date/time display helper
- common pagination/action toolbar grammar

This ticket is a structural consistency ticket, not a visual redesign.

## Acceptance criteria

- [ ] Applications, Assets, VM Inventory, Databases, vCenter Sources, Users, and Audit Logs can consume one shared list/table structural contract without losing domain-specific columns.
- [ ] Default row behavior is Detail navigation; Edit is standard for writable active records; More contains secondary/lifecycle actions; Archive/Restore is consistently placed and role-gated.
- [ ] Row-selection controls are not part of the shared shell by default.
- [ ] Environment supports exactly PROD/UAT/TEST in V1.1 presentation; no stale DEV mapping remains on accepted V1.1 surfaces.
- [ ] Record/lifecycle status is visually and semantically distinct from Environment, Sync, Power, and Data Quality.
- [ ] Missing values use one canonical formatter with accessible Unknown/Not applicable/Needs context semantics.
- [ ] Existing Light/Dark semantic tokens are reused; no new page-specific color system is introduced.
- [ ] Shared components are covered by focused frontend tests or representative Playwright evidence at desktop/tablet/mobile widths.
- [ ] Existing domain RBAC is preserved; shared UI never becomes the authorization boundary.

## Non-goals

- New product theme
- New business workflow
- Bulk actions
- Replacing shadcn/Tailwind

## Blocked by

None. Foundation ticket.
