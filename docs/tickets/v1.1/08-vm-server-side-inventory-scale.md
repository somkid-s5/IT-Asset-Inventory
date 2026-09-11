## Parent

V1.1 Consistency, Data Integrity, and Realistic Acceptance

## Findings

VM-003, SCL-002.

## What to build

Replace VM Inventory/Discovery hidden `take: 1000` behavior and client-only full-dataset filtering with server-authoritative list contracts.

## Acceptance criteria

- [ ] Inventory endpoint supports page/cursor, bounded limit, q, lifecycle/view, environment, source where applicable, sortBy, and sortDir.
- [ ] Discovery endpoint supports page/cursor, bounded limit, q, state/source filters, and sorting required by the UI.
- [ ] Responses include total/hasMore and page metadata needed by Ticket 01 table shell.
- [ ] No normal VM list query has a silent completeness boundary at 1000.
- [ ] Search for VM record number >1000 returns the expected row.
- [ ] View counts for Active/Pending/Orphaned/Archived are server-derived and do not depend on only the current page.
- [ ] URL state can represent the selected VM view/search/filter state.
- [ ] Existing source-of-truth, lifecycle, promotion, and Data Quality behavior is preserved.
- [ ] List projections remain lightweight and secret-safe; detail-only relationships/accounts are not loaded for every row unless explicitly required.
- [ ] Focused backend performance/contract tests cover boundary pages and invalid paging parameters.

## Blocked by

- Ticket 01
- Ticket 02

Final >1000 browser proof is consumed by Ticket 16.
