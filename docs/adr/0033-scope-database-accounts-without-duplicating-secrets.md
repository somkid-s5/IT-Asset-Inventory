# ADR 0033: Scope Database Accounts Without Duplicating Secrets

- Status: Accepted
- Date: 2026-09-04

## Context

A Database Account may grant access to an entire Database Instance or only selected Logical Databases. Copying the same username and encrypted password into every Logical Database would create drift and make password changes unsafe.

## Decision

A Database Account belongs to one Database Instance and has one of two scopes:

- Instance-wide; or
- one or more selected Logical Databases within that Instance.

One credential record is retained even when it grants access to several Logical Databases.

## Consequences

- Password changes occur in one place.
- The Database Instance view can show the effective database scope of each account.
- Application views expose only the relevant Database Access metadata and permission-gated reveal action.

