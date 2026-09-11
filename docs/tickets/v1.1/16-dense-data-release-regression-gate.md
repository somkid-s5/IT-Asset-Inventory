## Parent

V1.1 Consistency, Data Integrity, and Realistic Acceptance

## Findings

SCL-002 plus all historical 100/200/1000 cap findings.

## What to build

Create the final dense-data boundary and release regression gate. This is separate from the small deterministic normal seed so ordinary development remains fast.

## Acceptance criteria

### Dense fixture

- [ ] Generated isolated dataset crosses the historical boundaries: >200 Assets, >200 Databases, >1000 VM Inventory records, >100 Audit Logs, and >1000 VM Discovery records where feasible.
- [ ] Fixture generation is deterministic/repeatable and does not contain real credentials or production data.
- [ ] Dense fixture can be created only against an explicitly selected acceptance/test DB.

### Boundary proof

- [ ] Asset beyond row 200 can be searched and selected in relation picker.
- [ ] Database beyond row 200 can be searched and selected in relation picker.
- [ ] VM beyond row 1000 can be found in normal VM Inventory and selected in relation picker.
- [ ] Discovery beyond row 1000 is reachable/searchable when that dense slice is enabled.
- [ ] Audit event older than the first 100 can be searched and paged to.
- [ ] Server totals/page counts remain correct at boundaries.
- [ ] No list/picker silently truncates without pagination metadata.

### Full release regression

- [ ] Ticket 13 invariant verifier passes on normal deterministic acceptance data.
- [ ] Ticket 14 cross-domain round-trip matrix passes.
- [ ] Ticket 15 relationship/RBAC/archive/persistence matrix passes.
- [ ] Existing V1 Playwright suite remains green.
- [ ] Backend tests/build pass.
- [ ] Frontend lint/type/build pass.
- [ ] Fresh migrations from zero pass.
- [ ] Fresh normal seed passes.
- [ ] HTTPS by IP, HTTP redirect, Secure/HttpOnly cookie, and gateway health remain green.
- [ ] Restart persistence remains green.
- [ ] `git diff --check` passes.
- [ ] Release report maps every V1.1 audit finding to a closed ticket/evidence or an explicit accepted exception.

## Safety

Dense generation and destructive acceptance setup are isolated only. Never point the generator at the user's main database or production-like persistent volume without explicit approval.

## Blocked by

Tickets 03, 08, 12, 13, 14, and 15 plus all domain tickets they depend on.
