# 10b — Dashboard Actionable Order + Operational Attention

## Purpose

Bring the Dashboard back to accepted ADR 0016 instead of decorative health charts that do not resolve work.

## Required order

1. Summary
2. Needs Attention
3. Recently Updated

## Needs Attention

Context and operational exceptions share one actionable area but remain visibly distinct:

- Context: incomplete Application / Asset / VM / Database records from the centralized Data Quality summaries.
- Operational: VM Deleted in vCenter, Asset expired warranty/support context, and vCenter Source connection failures.
- Operational reasons never reduce completeness/readiness counts.
- Each row navigates to the exact record or the closest deterministic remediation workflow.

## Recently Updated

`GET /dashboard/overview` returns a safe lightweight merge of the latest non-archived Applications, Assets, VM Inventory records, and Database Instances. No credential, account, secret, or deep topology payload is included.

## UI cleanup

- Remove the non-actionable CMDB distribution chart and recorded-status gauge from the V1 Dashboard.
- Keep the Summary cards navigable.
- Keep Data Quality accessible from the Needs Attention section.

## Verification

- Backend build/typecheck validates the safe `recentlyUpdated` projection.
- Frontend lint/typecheck validates the ordered Dashboard surface.
- Deterministic seed fixtures provide one failed vCenter Source and one complete-context `DELETED_IN_VCENTER` VM for runtime operational-attention evidence.
