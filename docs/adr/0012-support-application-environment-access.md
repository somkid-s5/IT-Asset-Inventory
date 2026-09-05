# ADR 0012: Support Application Environment Access

- Status: Accepted
- Date: 2026-09-04

## Context

An Application can have user-facing or administrative access that is not an operating-system, hardware-management, or database account. Storing that access against an unrelated infrastructure record would make lookup misleading.

## Decision

An Application Environment may contain Application Access records. Each record can describe:

- a purpose or label;
- a URL or other access address;
- an access method;
- one or more encrypted credentials.

Credential values use the existing permission-gated reveal and audit behavior. Application Access is separate from Asset, VM guest, and Database access but is presented together on the Application Environment view.

## Consequences

- The Application Environment becomes the complete operational entry point.
- Credentials remain associated with the resource they actually access.
- Application Access must not expose secret values in list, search, export, or ordinary detail responses.

