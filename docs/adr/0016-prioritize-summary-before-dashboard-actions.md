# ADR 0016: Prioritize Summary Before Dashboard Actions

- Status: Accepted
- Date: 2026-09-04

## Context

The Dashboard must provide an immediate overview before presenting records that require work. Actionable lists are useful but should not displace the inventory summary at the top of the page.

## Decision

The Dashboard is ordered as follows:

1. Summary counts for active Applications, physical Assets, VMs, and Databases.
2. Needs Attention, including incomplete inventory, vCenter deletion or sync failures, and incomplete PROD Application context.
3. Recently updated records.

Charts or decorative metrics that do not lead to an actionable view are out of scope for V1.

## Consequences

- The first visible Dashboard section answers "What do we currently have?"
- Summary items should navigate to the corresponding filtered inventory view where practical.
- Needs Attention remains available below the summary and links to the record or Data Quality workflow that can resolve it.

