## Parent

V1.1 Consistency, Data Integrity, and Realistic Acceptance

## Findings

CXR-001, CXR-002, DQ-001, DOC-002.

## What to build

Introduce one query-state decision layer for list/detail surfaces so request failure can never masquerade as empty/zero/not-found data.

States:

- Initial Loading
- Background Refreshing
- Ready
- True Empty
- Filtered Empty
- Error + Retry
- Forbidden
- Not Found

## Acceptance criteria

- [ ] Shared query-state component/hook distinguishes 404, 403, generic failure, empty success, and filtered-empty success.
- [ ] Applications List no longer turns a failed API request into `No applications found`.
- [ ] Asset, VM, Database, Source, User, Document, and Audit list migrations use the same decision contract.
- [ ] Application/Asset/VM/Database details do not redirect or render Not Found for an unrelated 500/network failure.
- [ ] Dashboard Overview failure produces an explicit error surface; summary counts are never replaced by zero merely because data is unavailable.
- [ ] Retry preserves current search/filter/page/URL state.
- [ ] Background refresh may retain last-known data but visibly reports refresh failure instead of presenting the stale data as freshly confirmed.
- [ ] Error surfaces do not leak raw stack traces, SQL, credentials, tokens, or sensitive request content.
- [ ] Browser tests intercept a representative 500/network failure and prove Error != Empty, then prove successful retry.

## Implementation notes

Use React Query state rather than duplicating status booleans in every page. Keep domain-specific empty copy configurable.

## Blocked by

None. Foundation ticket. Coordinate component composition with Ticket 01.
