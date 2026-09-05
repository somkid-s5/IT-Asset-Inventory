# ADR 0006: Centralize Application Ownership

- Status: Accepted
- Date: 2026-09-04

## Context

The current inventory uses Owner, Department, and Business Unit inconsistently across Assets, VMs, and Databases. Repeating the same ownership data on every related record creates drift and unnecessary data entry.

## Decision

Application ownership is represented by two distinct fields:

- Technical Owner: the IT person or team responsible for operating the Application.
- Business Unit: the organization that owns or uses the Application.

Related VMs and Databases display the Application ownership through their relationships. They do not require duplicate ownership values. A record may retain an optional record-specific responsible party when operational responsibility genuinely differs.

## Consequences

- Application is the authoritative source for system ownership.
- Existing Owner, Department, and Business Unit values require review and mapping during migration.
- Product language and filters must distinguish Technical Owner from Business Unit.

