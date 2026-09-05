# ADR 0001: Focus V1 on Internal Infrastructure Inventory

- Status: Accepted
- Date: 2026-09-04

## Context

The product is intended for the internal System Administrator team. Its primary job is to make infrastructure information usable in daily operations:

- record physical hardware and its access layers;
- discover virtual machines from vCenter while preserving locally curated context;
- show which applications and production services run on which infrastructure;
- record databases and their application relationships;
- store operational documents;
- store credentials with appropriate access controls and auditability.

The repository currently also contains ticketing, client, and notification features. Those features broaden the product into a general ITSM platform without helping complete the core inventory workflow.

## Decision

V1 consists of:

1. Assets
2. Virtual Machines and vCenter sources
3. Applications and services
4. Databases
5. Credentials
6. Documents
7. Users and audit logs

Tickets, clients, and notifications are outside the V1 product and delivery scope. They must not appear in the V1 navigation or acceptance journey.

## Consequences

- Product copy and documentation must describe an internal infrastructure inventory, not an enterprise ITSM suite.
- V1 design and verification will prioritize complete inventory and lookup journeys.
- Existing out-of-scope data must be preserved until a separate, explicitly approved removal decision defines migration and rollback behavior.
- No new ticketing, client, or notification work will be accepted into V1.

