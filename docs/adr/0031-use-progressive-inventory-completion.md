# ADR 0031: Use Progressive Inventory Completion

- Status: Accepted
- Date: 2026-09-04

## Context

The team may know that a Hardware Asset, VM, or Database exists before it knows all ownership, Application, or operational details. Blocking creation on unknown context would encourage guessed values or leave real infrastructure outside Inventory.

## Decision

Hardware Assets, VMs, and Databases may enter Inventory with only the minimum identifying fields required to distinguish the record.

- Missing business or operational context results in a `Needs Context` state.
- Data Quality lists the specific missing fields.
- Users can complete the record later.
- The system never invents missing values.

Minimum identifying fields are defined per inventory type in the product specification after the relevant domain boundary is confirmed.

## Consequences

- Create flows remain fast and honest about incomplete knowledge.
- Required-field validation focuses on identity and data integrity rather than completeness.
- Completeness rules must be centralized so forms, Dashboard, and Data Quality do not disagree.

