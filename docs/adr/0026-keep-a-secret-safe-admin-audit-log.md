# ADR 0026: Keep a Secret-Safe Admin Audit Log

- Status: Accepted
- Date: 2026-09-04

## Context

The product stores operational inventory and permission-gated credentials. Administrators need traceability for sensitive and state-changing actions without creating a second source of secret exposure.

## Decision

Only Administrators can view Audit Logs.

Audit coverage includes:

- successful and failed login;
- create and update actions;
- archive and restore;
- vCenter synchronization;
- export;
- credential reveal and copy.

Each entry identifies the actor, action, target, and timestamp. Passwords, tokens, encryption keys, and other secret values are never written to audit details or application logs.

Audit records are not editable through product UI.

## Consequences

- All new Application workflows emit the appropriate audit events.
- Logging and exception handling require secret-sanitization tests.
- Viewer and Editor users cannot access Audit Log data through either UI or API.

