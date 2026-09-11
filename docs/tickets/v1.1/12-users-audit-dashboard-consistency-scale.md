## Parent

V1.1 Consistency, Data Integrity, and Realistic Acceptance

## Findings

AUD-001, AUD-002, USR-001, USR-002, DQ-001.

## What to build

Bring Users, Audit Logs, and Dashboard onto the shared list/query contracts and make Audit history server-authoritative beyond 100 rows.

## Acceptance criteria

### Users

- [ ] Remove row-selection controls/state because no supported bulk operation exists in V1.1.
- [ ] Role change, Password Reset, and Delete use a deliberate privileged-action layout consistent with Ticket 01.
- [ ] Current-user and last-admin safeguards remain server-enforced.
- [ ] User list request failure uses Ticket 02 Error + Retry rather than empty users.

### Audit Logs

- [ ] Frontend sends page/limit/search/sort/filter parameters to backend instead of paginating the first 100 rows locally.
- [ ] Backend supports the accepted server-authoritative query contract with bounded page size.
- [ ] Search can find an event older than row 100.
- [ ] Total count and page count describe the complete filtered server dataset.
- [ ] Summary metrics are either server-derived over their documented scope or clearly labeled page/filter-local; they must not imply global counts when calculated from one page.
- [ ] Archive/Restore actions across domains use explicit taxonomy where accepted by Ticket 10/domain migrations.
- [ ] Audit detail remains secret-safe.

### Dashboard

- [ ] Overview query failure shows explicit Error + Retry and never renders zero-valued summary cards as if inventory were empty.
- [ ] Data Quality query failure remains distinct from Overview failure.
- [ ] Refresh preserves last-known data only with clear stale/failure state.

## Blocked by

- Ticket 01
- Ticket 02

Coordinate audit action enum migration with Ticket 10 and domain tickets.
