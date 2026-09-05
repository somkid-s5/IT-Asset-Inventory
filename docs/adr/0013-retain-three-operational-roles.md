# ADR 0013: Retain Three Operational Roles

- Status: Accepted
- Date: 2026-09-04

## Context

The application is internal to the System Administrator team but stores sensitive credentials and operational records. The existing ADMIN, EDITOR, and VIEWER roles provide a simple basis for separating ordinary lookup, operational maintenance, and administrative actions.

## Decision

V1 retains three roles:

- VIEWER can view Inventory and Documents but cannot reveal credential values.
- EDITOR can create and update operational records and reveal credential values, but cannot manage users or perform protected destructive actions.
- ADMIN has full operational access, including user management and protected delete or archive actions.

Every credential reveal is recorded in the Audit Log. List, search, export, and ordinary detail responses never contain secret values.

## Consequences

- New Application and relationship APIs must follow the same permission matrix.
- UI actions must be hidden or disabled consistently with backend authorization.
- E2E acceptance journeys must exercise all three roles and verify restricted data projections.

