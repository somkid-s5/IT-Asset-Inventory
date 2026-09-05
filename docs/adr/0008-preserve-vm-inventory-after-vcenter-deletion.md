# ADR 0008: Preserve VM Inventory After vCenter Deletion

- Status: Accepted
- Date: 2026-09-04

## Context

vCenter is the source used to discover current VMs, but the inventory contains operational context authored by the System Administrator team. Automatically deleting an inventory record when a VM disappears from vCenter would destroy useful history and team knowledge.

## Decision

When a previously inventoried VM is no longer returned by its vCenter source:

1. The inventory record is not deleted.
2. Its lifecycle state becomes `DELETED_IN_VCENTER`.
3. Team-authored details, Application relationships, credentials, and history remain intact.
4. A user may archive the record explicitly when it is no longer needed for normal lookup.

## Consequences

- vCenter synchronization never silently destroys team-authored VM inventory.
- Deleted and archived records remain distinguishable from active VMs.
- Default active views may hide archived records but must make deleted-in-vCenter records discoverable for review.

