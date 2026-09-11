## Parent

V1.1 Consistency, Data Integrity, and Realistic Acceptance

## Findings

VM-001, VM-002, VM-004, VM-005, VM-006, VM-007, DQ-002, DQ-003.

## What to build

Make VM curated context fully editable/visible and prove every VM Data Quality reason is genuinely remediable through the normal product workflow.

## Acceptance criteria

- [ ] VM Promotion/Edit exposes System Name, Environment, Owner, Business Unit, SLA Tier, Service Role, Criticality, Purpose/Description, Notes, Tags, Application relationships, and Guest Accounts.
- [ ] Existing values load correctly into Edit without overwriting vCenter-owned facts.
- [ ] VM Detail shows Owner, Business Unit, SLA Tier, Criticality, Service Role, Environment, Purpose, Notes, and relationships in one predictable curated-context area.
- [ ] Data Quality required fields exactly match supported controls.
- [ ] Environment presentation uses PROD/UAT/TEST canonical mapping with no DEV residue.
- [ ] ARCHIVED VM normal Detail is read-only; Admin gets Restore rather than ordinary Edit/Archive actions.
- [ ] DELETED_IN_VCENTER preserves curated context and uses accurate copy without unsupported permanent-delete language.
- [ ] Real browser flow promotes an incomplete VM, fills missing context, saves to DB, refetches Data Quality, and proves the real backend reason disappears without full app reload.
- [ ] Viewer remains read-only and cannot reveal Guest Account secrets.
- [ ] vCenter sync tests still prove source-owned facts refresh while curated fields remain unchanged.

## Blocked by

- Ticket 01
- Ticket 02
- Ticket 03 for shared Application relation picking where adopted
