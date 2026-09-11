# V1.1 Consistency + Realistic Acceptance Ticket Index

Parent specification: `docs/specs/2026-09-08-v1.1-consistency-and-realistic-acceptance.md`

Discovery source: `docs/agents/SYSTEM_CONSISTENCY_AUDIT_2026-09-08.md`

## Operating rule

Do not treat the audit as an implementation checklist by itself. Agents implement only accepted tickets, and every ticket must follow the shared V1.1 contracts rather than inventing a page-local pattern.

No ticket authorizes destructive changes to the main database, production deployment, Git push, merge, or release publication.

## Ordered tickets

| Order | Ticket | Main findings |
| --- | --- | --- |
| 01 | Shared inventory presentation contract | CXR-003/004/005/006 |
| 02 | Shared query, error, and list-state contract | CXR-001/002, DQ-001 |
| 03 | Server-authoritative relation picker contract | APP-007, DOC-001/002, SCL-001 |
| 04 | Application integrity and access ownership | APP-002/003/004/005/006 |
| 05 | Application realistic E2E | APP-001 + Ticket 04 acceptance |
| 06 | Asset field and lifecycle reconciliation | AST-001..006 |
| 07 | VM curation and Data Quality remediation | VM-001/002/004/005/006/007, DQ-002/003 |
| 08 | VM server-side inventory scale | VM-003, SCL-002 |
| 09 | Database field and relationship reconciliation | DB-001..005, REL-001 |
| 10 | vCenter Source credential-preserving edit + audit | VCS-001..003, AUD-002 |
| 11 | Document relation-search hardening | DOC-001/002 |
| 12 | Users, Audit Logs, and Dashboard consistency/scale | AUD-001/002, USR-001/002, DQ-001 |
| 13 | Golden dataset + invariant verifier | REL-001/002 + current-data evidence |
| 14 | Cross-domain round-trip E2E matrix | DQ-002, CXR-001/002 + domain parity |
| 15 | Relationship, RBAC, archive, and persistence matrix | REL-001/002 + lifecycle/security regression |
| 16 | Dense-data release regression gate | SCL-002 + all historical caps |

## Dependency frontier

1. **01 and 02 are foundation tickets** and should be implemented before domain UI migrations.
2. **03 depends on 01/02** and becomes the shared picker/search primitive for Applications/Documents.
3. **04 depends on 01/02/03**; **05 depends on 04**.
4. **06 and 07 can begin after 01/02**; 07 may use 03 for relationship editing.
5. **08 depends on the shared list/query contract in 01/02**.
6. **09 depends on 01/02/03**.
7. **10 depends on 01/02** and coordinates audit taxonomy with 12.
8. **11 depends on 03**.
9. **12 depends on 01/02** and should coordinate shared audit-action vocabulary with 10.
10. **13 can begin in parallel once domain invariants in 04/06/07/09/10 are accepted.**
11. **14 and 15 start only after their domain implementation tickets are green.**
12. **16 is the final hardening gate after 03/08/12/13/14/15.**

## Agent execution policy

For every ticket:

- trace existing schema/service/API/UI/E2E before editing,
- preserve existing sound V1 behavior,
- add focused failing evidence before changing data contracts where practical,
- do not guess/backfill ambiguous production-like data,
- use isolated acceptance DBs for destructive migration testing,
- keep secret values out of logs/test output,
- run ticket-focused tests first,
- leave broader release verification to Tickets 14–16,
- record newly discovered gaps instead of silently expanding scope.

If an agent discovers a conflict with the parent spec, it must stop that slice and document the conflict rather than locally choosing a new semantic rule.
