## Parent
Ticket 05 — Connect Hardware Assets to Application topology

## Goal
Make the Asset list scale like an operational registry instead of returning detail-sized payloads for every row, while keeping all approved Asset types reachable.

## Required behavior
- `GET /api/assets` returns an explicit lightweight list projection only.
- Do not return notes, attachments, document bodies/links, credential records, patch detail, component-link detail, or custom metadata unless the list actually renders/needs them.
- Preserve fields required for identity, current table columns, search/navigation, hierarchy expansion, paging, and sorting.
- Detail endpoint remains the rich projection.
- Remove dead ordinary CSV/bulk-update frontend code that is no longer surfaced by Ticket 05 UX.
- Asset type navigation exposes SERVER, STORAGE, SWITCH, SP, and NETWORK without hiding valid types under All/Search.

## Acceptance evidence
- Backend contract test proves list projection and absence of sensitive/detail-only data.
- Frontend lint/typecheck green.
- Existing Asset list search/sort/pagination E2E remains compatible.
- Type navigation test covers SP and NETWORK reachability.

## Out of scope
- New Asset types.
- Detail endpoint redesign.
- General topology redesign.
