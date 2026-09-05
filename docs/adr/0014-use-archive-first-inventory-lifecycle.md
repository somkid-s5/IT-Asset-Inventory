# ADR 0014: Use an Archive-First Inventory Lifecycle

- Status: Accepted
- Date: 2026-09-04

## Context

Inventory records retain operational history and relationships that remain useful after a system is retired. Permanent deletion from ordinary UI flows risks losing context and breaking dependency history.

## Decision

Applications, VMs, physical Assets, and Databases use Archive as their normal removal action.

- Archived records are excluded from default active lists.
- Archived records remain searchable through an explicit archived filter.
- An Administrator can restore an archived record.
- Archive and restore actions are audited.
- Permanent deletion is not available in ordinary product UI and is treated as a separate system-maintenance operation.

## Consequences

- Existing delete interactions for these inventory types require migration to archive behavior.
- Relationships and operational history survive retirement.
- Acceptance tests must verify archive, archived lookup, and restore without data loss.

