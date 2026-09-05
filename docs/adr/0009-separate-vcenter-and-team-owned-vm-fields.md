# ADR 0009: Separate vCenter-Owned and Team-Owned VM Fields

- Status: Accepted
- Date: 2026-09-04

## Context

VM Inventory combines discovered technical facts with operational context maintained by the System Administrator team. Synchronization must refresh changing vCenter facts without overwriting curated business information.

## Decision

vCenter owns and may refresh discovered technical fields, including:

- vCenter identity and VM name;
- power state;
- CPU and memory;
- guest operating system;
- discovered IP addresses;
- disks.

The team owns fields including:

- Application and Component relationships;
- Environment;
- Technical Owner and Business Unit;
- Criticality;
- Credentials;
- Notes and Documents.

vCenter synchronization must never overwrite team-owned fields.

## Consequences

- Field ownership must be explicit in API behavior and sync tests.
- The UI must distinguish refreshed facts from curated context where that distinction prevents user confusion.
- Conflicts or disappearance of vCenter facts result in reviewable state, not loss of team-owned data.

