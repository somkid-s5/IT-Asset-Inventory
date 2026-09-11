## Parent

V1.1 Consistency, Data Integrity, and Realistic Acceptance

## Findings

APP-007, DOC-001, DOC-002, SCL-001.

## What to build

Replace bounded full-list relation option loading with one server-authoritative searchable relation-picker contract reusable by Application topology and Document linking.

## Acceptance criteria

- [ ] Picker API accepts resource kind, q, page/cursor, bounded page size, optional Environment/lifecycle eligibility filters, and returns total/hasMore metadata.
- [ ] Safe display projections contain no secret/account/password fields.
- [ ] Assets beyond row 200 are searchable/selectable.
- [ ] Databases beyond row 200 are searchable/selectable.
- [ ] VMs beyond row 1000 are searchable/selectable once Ticket 08 server-side VM listing is available.
- [ ] Existing selected IDs remain visible even when outside the current result page.
- [ ] Archived resources are excluded from new selection but retained selected archived links render as historical/Archived.
- [ ] Loading, error/retry, no-match, and selected states use Ticket 02 query semantics.
- [ ] Keyboard navigation and accessible labels work in the shared picker.
- [ ] Application topology and KnowledgeDocumentLinks migrate to this contract; no client-side “search the first N records” remains there.
- [ ] Dense-data browser evidence selects a record beyond each historical cap.

## Non-goals

- Global Search replacement
- Automatic relationship inference
- Bulk relationship import

## Blocked by

- Ticket 01 — shared presentation
- Ticket 02 — shared query states

Ticket 08 is required before final VM >1000 acceptance, but the shared API/component can be built earlier.
