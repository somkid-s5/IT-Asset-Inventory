# ADR 0004: Standardize Operational Environments

- Status: Accepted
- Date: 2026-09-04

## Context

VMs, Applications, and Databases are predominantly production records. The team also operates UAT and TEST instances. Inconsistent free-text environment values make filtering and Application topology unreliable.

## Decision

The standard operational environments are:

- PROD
- UAT
- TEST

New VM, Application, and Database records default visibly to PROD because it is the common case. Users can explicitly select UAT or TEST. The system must not infer an environment from a record name.

Access Points inherit the operational context of the record they provide access to and do not require a second environment value.

## Consequences

- Environment filters and Application views use one consistent vocabulary.
- Existing non-standard values require review during migration rather than silent coercion.
- PROD remains visible in forms and detail views even when selected by default.

