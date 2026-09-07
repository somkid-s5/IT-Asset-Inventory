# 10c — Data Quality Transition Browser Contract

## Purpose

Prove the V1 Data Quality interaction contract in the browser without coupling tests to concurrent mutation of shared inventory fixtures.

## Browser contract

- Dashboard renders sections in the accepted order: Summary -> Needs Attention -> Recently Updated.
- Deleted-in-vCenter VM and failed vCenter Source appear as Operational attention rather than Needs Context.
- Data Quality shows context reasons separately from operational reasons.
- Application, Asset, VM, and Database incomplete rows navigate to the correct record/workflow.
- Refreshing Data Quality after context is resolved removes the rows without a full-page reload.
- Archived records remain absent from active Data Quality/attention responses.

## Test strategy

- Real deterministic seed data is used for Dashboard operational-attention and Recently Updated evidence.
- A route-controlled Data Quality browser journey is used only to prove frontend transition/refetch behavior for all four domains without making shared Playwright fixtures race each other.
- Backend evaluator/service tests independently prove the real completeness calculations.

## Runtime gate

The Playwright specification must compile/discover now and execute against the acceptance stack before Ticket 10 can be marked fully done.
