## Parent

V1.1 Consistency, Data Integrity, and Realistic Acceptance

## Findings

REL-001, REL-002 and lifecycle/security findings across Applications, Assets, VMs, Databases, Sources, and Documents.

## What to build

Add one serialized integration matrix proving relationship invariants, RBAC, archive/restore preservation, and restart persistence across domains.

## Acceptance criteria

### Relationship integrity

- [ ] Same-Environment VM/Logical Database relationships succeed.
- [ ] Cross-Environment VM/Logical Database relationships are rejected server-side.
- [ ] Database ↔ Host VM Environment mismatch is rejected.
- [ ] One-primary Asset/VM invariants remain enforced.
- [ ] Retained relationship metadata survives unrelated topology edits.
- [ ] Archived resources cannot be newly selected as active relation targets.

### RBAC

- [ ] Viewer can read accepted Inventory/Documents but cannot mutate or reveal/copy secret values.
- [ ] Editor can perform accepted operational writes/reveals but cannot perform Admin-only lifecycle/user/export operations.
- [ ] Admin can perform accepted Archive/Restore/user/export operations.

### Archive/restore

- [ ] Application archive/restore preserves Environments, Components, Access, credentials, topology, and Documents.
- [ ] Asset archive/restore preserves Access Points, credential links, Application links, notes, attachments, and Documents.
- [ ] VM archive/restore preserves source identity, curated context, Guest Accounts, Application links, and Documents.
- [ ] Database archive/restore preserves Logical Databases, account scope, host, Application links, and Documents.
- [ ] Source archive blocks sync until Restore and preserves configured credentials.

### Persistence

- [ ] Force-recreate/restart services without deleting volumes.
- [ ] Re-read all created/edited entities and relationships after restart.
- [ ] Credential reveal still works for authorized role after restart and secrets never appear in ordinary projections.
- [ ] Ticket 13 invariant verifier remains green after restart.

## Blocked by

- Domain tickets 04, 06, 07, 09, 10, 11, 12
- Ticket 13
- Ticket 14
