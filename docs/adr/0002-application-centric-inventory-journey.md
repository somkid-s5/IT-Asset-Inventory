# ADR 0002: Make Applications the Primary Inventory Journey

- Status: Accepted
- Date: 2026-09-04

## Context

The System Administrator team needs to answer operational questions such as "Where does ERP Production run?" The current domain stores application names as free text across VM and database records. Free-text references cannot provide a trustworthy, navigable dependency view.

## Decision

An Application is a first-class inventory record and the primary entry point for understanding a system.

An Application view must show each of its environments and, for each environment, the related:

- virtual machines and physical assets;
- databases;
- credentials and access URLs;
- operational documents.

The relationship data must be structured and navigable rather than duplicated as unrelated free-text labels.

## Consequences

- Application relationships will replace the existing free-text `linkedApps` approach over a controlled migration period.
- Users must be able to navigate in both directions: from an Application to its infrastructure and from an infrastructure record back to its Applications.
- Search and detail-page acceptance journeys must include the question "Where does this production application run?"

