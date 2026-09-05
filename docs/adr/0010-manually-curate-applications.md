# ADR 0010: Manually Curate Applications and Components

- Status: Accepted
- Date: 2026-09-04

## Context

Application identity, project boundaries, and Component roles are business context. vCenter and infrastructure telemetry cannot determine those concepts reliably.

## Decision

In V1, the System Administrator team manually creates and maintains Applications, Environments, Components, and their infrastructure relationships.

V1 does not auto-discover Applications or Components from VM names, processes, network activity, tags, or external systems.

## Consequences

- Forms and linking journeys must make manual curation fast and clear.
- Data Quality workflows may identify missing Application context but must not invent or automatically assign it.
- Automated Application discovery remains out of scope for V1.

