# ADR 0025: Bootstrap One Admin Without Production Default Accounts

- Status: Accepted
- Date: 2026-09-04

## Context

V1 is an internal team product and does not require public account registration. Shipping known default accounts or passwords would create unnecessary setup ambiguity and credential risk.

## Decision

Production setup provides an explicit one-time path to create the first Administrator.

After bootstrap:

- only an Administrator can create or manage users through the Users workflow;
- no self-registration flow is available;
- no production default username or password is created;
- a newly created user's initial-password and forced-change behavior must be explicit in the Users workflow.

## Consequences

- Deployment readiness includes successfully bootstrapping and signing in as the first Administrator.
- Development sample users remain opt-in test fixtures and cannot be enabled in production.
- Registration-secret and default-password configuration that no longer serves the accepted flow can be removed during implementation.

