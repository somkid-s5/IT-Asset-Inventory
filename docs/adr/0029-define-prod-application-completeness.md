# ADR 0029: Define PROD Application Completeness

- Status: Accepted
- Date: 2026-09-04

## Context

Dashboard and Data Quality warnings are useful only when the product has an explicit, achievable definition of complete Application context. Optional information must not create permanent false warnings.

## Decision

A PROD Application is complete when it has:

- a name and description;
- a Technical Owner and Business Unit;
- a PROD Environment;
- at least one Component;
- at least one related VM or physical Asset;
- at least one related Database, or an explicit `No Database` declaration.

Credentials, Application Access, and Documents are optional and do not affect completeness.

## Consequences

- Dashboard and Data Quality use the same completeness rule.
- Users can resolve a Database warning by recording an intentional `No Database` decision rather than creating placeholder data.
- UAT and TEST environments may be recorded with partial context without producing the PROD completeness warning.

