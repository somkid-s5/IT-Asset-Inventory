# ADR 0011: Link Canonical Documents to Inventory Records

- Status: Accepted
- Date: 2026-09-04

## Context

Operational documentation belongs in the shared Knowledge Base but must also be discoverable from the Application and infrastructure records where the team needs it. Copying document content into multiple records would create conflicting versions.

## Decision

Each Knowledge Base Document remains one canonical record. A Document may be linked to multiple:

- Applications;
- VMs;
- physical Assets;
- Databases.

Each related detail page shows links to the canonical Documents. Document content is not duplicated into inventory records.

## Consequences

- The team maintains one authoritative copy of each procedure or reference.
- Relationships must be navigable in both directions.
- Document permissions remain governed by the Knowledge Base access policy rather than copied per relationship.

