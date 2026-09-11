## Parent

V1.1 Consistency, Data Integrity, and Realistic Acceptance

## Findings

CXR-001, CXR-002, DQ-002 plus all domain field-parity findings.

## What to build

Create the persistence-backed cross-domain browser matrix that proves supported fields can be created/edited, survive reload, appear on Detail, and clear real Data Quality reasons.

## Acceptance criteria

- [ ] Runs against isolated real frontend/backend/PostgreSQL, not route-mocked persistence.
- [ ] Application round trip is covered by Ticket 05 and included in serialized integration.
- [ ] Asset round trip covers every retained field changed by Ticket 06 plus access/account/Application relations.
- [ ] VM round trip covers Owner, Business Unit, SLA, Role, Criticality, Purpose, Notes, Tags, relations, and Guest Accounts from Ticket 07.
- [ ] Database round trip covers every retained field from Ticket 09 plus host identity, Logical Databases, accounts, and operations fields.
- [ ] Data Quality remediation is proven against the real backend for Application, Asset, VM, and Database.
- [ ] A browser window marker/state proves refetch remediation does not require full application reload where the product promises in-place update.
- [ ] Representative List and Detail surfaces prove 500/network error is not Empty/Not Found and retry succeeds.
- [ ] Viewer read-only behavior is exercised for each inventory domain.
- [ ] Test evidence uses stable selectors/accessible names rather than CSS implementation details.
- [ ] Tests are deterministic and serialize stateful mutations where required.

## Blocked by

- Tickets 04–12 as applicable
- Ticket 13 fixture/invariant readiness recommended
