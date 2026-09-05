## Parent

#4 — Spec: V1 internal infrastructure inventory

## What to build

Deliver one centralized Data Quality model and the Dashboard Needs Attention section so incomplete Applications and Inventory records lead users directly to the action that resolves each issue.

## Acceptance criteria

- [ ] Central completeness evaluation produces the same state and missing-field reasons for API, Dashboard, and Data Quality views.
- [ ] Complete PROD Application follows ADR 0029, including the explicit `No Database` resolution.
- [ ] Assets, VMs, and Databases with unknown context remain valid and appear as `Needs Context` with exact guidance.
- [ ] VM `Deleted in vCenter` and vCenter Source sync failures appear as distinct operational attention items rather than incomplete-data fields.
- [ ] Dashboard order remains Summary first, Needs Attention second, and Recently Updated third.
- [ ] Every actionable row opens the exact record or workflow that can resolve it.
- [ ] Completing or intentionally resolving context removes the item without a full-page reload.
- [ ] Archived records do not pollute active attention counts unless an explicit archived filter is selected.
- [ ] Browser journeys prove incomplete-to-complete transitions for Application, Asset, VM, and Database records.

## Blocked by

- #9 — V1-05: Connect Hardware Assets to Application topology.
- #10 — V1-06: Complete the vCenter and VM Inventory lifecycle.
- #11 — V1-07: Model Database Instances and Logical Databases.
- #12 — V1-08: Link canonical Documents and preserve direct sharing.

